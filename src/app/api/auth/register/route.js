import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query, transaction } from '@/lib/db';
import { validateRegistration } from '@/lib/validators';
import { slugify } from '@/lib/utils';
import { generateSurfaceToken, normalizeSurfaceTokenInput } from '@/lib/shardBinding';
import { notifyRegistrationSubmitted } from '@/lib/registrationNotify';
import { newEmailVerificationToken, sendSignupVerificationEmail } from '@/lib/emailVerification';
import {
  assertCollegeNameAvailable,
  assertEmployerNameAvailable,
  formatCollegeNameInUseMessage,
  formatEmployerNameInUseMessage,
  normalizeOrganizationName,
} from '@/lib/organizationNames';
import { assertEmailAvailable, formatEmailDifferentTenantMessage, formatEmailInUseMessage } from '@/lib/userEmail';
import { getPostRegistrationLoginPath } from '@/lib/postRegistrationRedirect';
import { verifyLoginCaptcha } from '@/lib/simpleCaptcha';
import { isDemoDataApiEnabled } from '@/lib/demoDataAccess';
import { ensureIitmTieUpForEmployer } from '@/lib/employerIitmTieUp';

async function __platform_POST(request) {
  try {
    const body = await request.json();
    const { role, firstName, lastName, password, phone, captchaToken, captchaAnswer } = body;
    const email = String(body.email || '').trim().toLowerCase();
    const allowedRoles = new Set(['college_admin', 'employer']);

    if (!verifyLoginCaptcha(captchaToken, captchaAnswer)) {
      return NextResponse.json(
        { error: 'Verification failed or expired. Answer the question again and retry.' },
        { status: 400 },
      );
    }

    if (body.role === 'student') {
      return NextResponse.json(
        {
          error:
            'Student self-registration is disabled. Your college adds students to the master list — check your email for login instructions from PlacementHub.',
        },
        { status: 403 },
      );
    }

    const validation = validateRegistration({
      email,
      password,
      firstName,
      lastName,
      role,
      phone,
      campusBindingToken: body.campusBindingToken,
      departmentId: body.departmentId,
      batchYear: body.batchYear,
    });
    if (!validation.isValid) {
      return NextResponse.json({ error: Object.values(validation.errors)[0] }, { status: 400 });
    }
    // Defense-in-depth: keep a route-level role allowlist even if validator logic changes later.
    if (!allowedRoles.has(role)) {
      return NextResponse.json({ error: 'Valid role is required' }, { status: 400 });
    }



    const passwordHash = await bcrypt.hash(password, 10);
    const bindingInput = normalizeSurfaceTokenInput(body.campusBindingToken);
    const verifyToken = newEmailVerificationToken();
    const verifyExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const result = await transaction(async (client) => {
      let tenantId = null;

      if (role === 'college_admin') {
        await assertEmailAvailable(client, email);

        const collegeName = normalizeOrganizationName(
          body.collegeFullName || `${firstName}'s College`,
        );
        await assertCollegeNameAvailable(client, collegeName);
        const slug = slugify(collegeName) + '-' + Date.now().toString(36);
        const tenantResult = await client.query(
          `INSERT INTO tenants (name, slug, city, state, email, communication_email)
           VALUES ($1, $2, $3, $4, $5, $5) RETURNING id, name`,
          [collegeName, slug, body.city || '', body.state || '', email]
        );
        tenantId = tenantResult.rows[0].id;
        const collegeLabel = tenantResult.rows[0].name;

        await client.query(`INSERT INTO college_settings (tenant_id) VALUES ($1)`, [tenantId]);

        const token = generateSurfaceToken();
        await client.query(
          `INSERT INTO shard_binding_pairs (ref_scope_id, surface_token) VALUES ($1, $2)`,
          [tenantId, token]
        );

        const userResult = await client.query(
          `INSERT INTO users (tenant_id, email, communication_email, password_hash, role, first_name, last_name, phone, is_verified, is_active, email_verification_token, email_verification_expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id, email, role`,
          [
            tenantId,
            email,
            email,
            passwordHash,
            role,
            firstName,
            lastName || '',
            phone || '',
            false,
            false,
            verifyToken,
            verifyExpires,
          ]
        );

        return {
          user: userResult.rows[0],
          notify: { tenantName: collegeLabel, companyName: null },
        };
      }

      if (role === 'employer') {
        await assertEmailAvailable(client, email);

        const userResult = await client.query(
          `INSERT INTO users (tenant_id, email, communication_email, password_hash, role, first_name, last_name, phone, is_verified, is_active, email_verification_token, email_verification_expires_at)
           VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id, email, role`,
          [
            email,
            email,
            passwordHash,
            role,
            firstName,
            lastName || '',
            phone || '',
            false,
            false,
            verifyToken,
            verifyExpires,
          ]
        );

        const user = userResult.rows[0];
        const companyName = normalizeOrganizationName(body.companyName || `${firstName}'s Company`);
        await assertEmployerNameAvailable(client, companyName);
        const companySlug = slugify(companyName) + '-' + Date.now().toString(36);
        const employerRes = await client.query(
          `INSERT INTO employer_profiles (user_id, company_name, company_slug, industry, website)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [
            user.id,
            companyName,
            companySlug,
            body.industry || '',
            body.companyWebsite || '',
          ]
        );

        if (isDemoDataApiEnabled()) {
          await ensureIitmTieUpForEmployer(client, employerRes.rows[0].id);
        }

        return {
          user,
          notify: {
            tenantName: null,
            companyName,
          },
        };
      }

      throw new Error('UNSUPPORTED_ROLE');
    });

    const userRow = result.user;

    if (result.notify) {
      await notifyRegistrationSubmitted({
        role,
        email,
        firstName,
        tenantName: result.notify.tenantName,
        companyName: result.notify.companyName,
      });
    }

    try {
      await sendSignupVerificationEmail({
        to: email,
        firstName,
        token: verifyToken,
        role,
      });
    } catch (mailErr) {
      console.error('Verification email failed:', mailErr);
    }

    const pendingPlatform = role === 'college_admin' || role === 'employer';

    return NextResponse.json(
      {
        message: pendingPlatform
          ? 'Check your email to verify your address. After verification, our team can approve your account.'
          : 'Check your email to verify your address. You can sign in only after you click the verification link.',
        pendingPlatformApproval: pendingPlatform,
        requiresEmailVerification: true,
        nextUrl: getPostRegistrationLoginPath({ pendingPlatformApproval: pendingPlatform }),
        user: { id: userRow.id, email: userRow.email, role: userRow.role },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error.message === 'EMAIL_EXISTS') {
      return NextResponse.json(
        { error: formatEmailInUseMessage(error.existing, { email }) },
        { status: 409 }
      );
    }
    if (error.message === 'EMAIL_DIFFERENT_TENANT') {
      return NextResponse.json(
        { error: formatEmailDifferentTenantMessage(email) },
        { status: 409 }
      );
    }
    if (error.message === 'INVALID_CAMPUS_KEY') {
      return NextResponse.json(
        { error: 'Campus enrollment key was not recognized. Check with your institution.' },
        { status: 400 }
      );
    }
    if (error.message === 'COLLEGE_NAME_EXISTS') {
      return NextResponse.json(
        { error: formatCollegeNameInUseMessage(error.existing) },
        { status: 409 },
      );
    }
    if (error.message === 'EMPLOYER_NAME_EXISTS') {
      return NextResponse.json(
        { error: formatEmployerNameInUseMessage(error.existing) },
        { status: 409 },
      );
    }
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_auth_register' });
export const POST = __platformApiHandlers.POST;
