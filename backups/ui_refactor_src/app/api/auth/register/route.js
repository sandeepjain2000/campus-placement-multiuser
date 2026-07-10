import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query, transaction } from '@/lib/db';
import { validateRegistration, validatePhone } from '@/lib/validators';
import { slugify } from '@/lib/utils';
import { generateSurfaceToken, normalizeSurfaceTokenInput } from '@/lib/shardBinding';
import {
  notifyRegistrationSubmitted,
  notifyStudentRegistered,
} from '@/lib/registrationNotify';

export async function POST(request) {
  try {
    const body = await request.json();
    const { role, firstName, lastName, email, password, phone } = body;
    const allowedRoles = new Set(['college_admin', 'student', 'employer']);

    const validation = validateRegistration({
      email,
      password,
      firstName,
      role,
      campusBindingToken: body.campusBindingToken,
      department: body.department,
    });
    if (!validation.isValid) {
      return NextResponse.json({ error: Object.values(validation.errors)[0] }, { status: 400 });
    }
    if (phone && !validatePhone(phone)) {
      return NextResponse.json(
        { error: 'Enter a valid mobile number with country code (e.g. +1 4155550100 or +91 9876543210), or leave blank.' },
        { status: 400 }
      );
    }
    // Defense-in-depth: keep a route-level role allowlist even if validator logic changes later.
    if (!allowedRoles.has(role)) {
      return NextResponse.json({ error: 'Valid role is required' }, { status: 400 });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const bindingInput = normalizeSurfaceTokenInput(body.campusBindingToken);

    const result = await transaction(async (client) => {
      let tenantId = null;

      if (role === 'college_admin') {
        const collegeName = body.collegeFullName || `${firstName}'s College`;
        const slug = slugify(collegeName) + '-' + Date.now().toString(36);
        const tenantResult = await client.query(
          `INSERT INTO tenants (name, slug, city, state, email)
           VALUES ($1, $2, $3, $4, $5) RETURNING id, name`,
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
          `INSERT INTO users (tenant_id, email, password_hash, role, first_name, last_name, phone, is_verified, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, email, role`,
          [
            tenantId,
            email,
            passwordHash,
            role,
            firstName,
            lastName || '',
            phone || '',
            false,
            false,
          ]
        );

        return {
          user: userResult.rows[0],
          notify: { tenantName: collegeLabel, companyName: null },
        };
      }

      if (role === 'student') {
        const bind = await client.query(
          `SELECT ref_scope_id FROM shard_binding_pairs WHERE lower(surface_token) = lower($1)`,
          [bindingInput]
        );
        if (bind.rows.length === 0) {
          throw new Error('INVALID_CAMPUS_KEY');
        }
        tenantId = bind.rows[0].ref_scope_id;

        const userResult = await client.query(
          `INSERT INTO users (tenant_id, email, password_hash, role, first_name, last_name, phone, is_verified, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, email, role`,
          [
            tenantId,
            email,
            passwordHash,
            role,
            firstName,
            lastName || '',
            phone || '',
            false,
            true,
          ]
        );

        const user = userResult.rows[0];

        await client.query(
          `INSERT INTO student_profiles (user_id, tenant_id, roll_number, department, batch_year, graduation_year, is_verified)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            user.id,
            tenantId,
            body.rollNumber || '',
            body.department || '',
            parseInt(body.batchYear, 10) || new Date().getFullYear(),
            (parseInt(body.batchYear, 10) || new Date().getFullYear()) + 4,
            false,
          ]
        );

        const tname = await client.query(`SELECT name FROM tenants WHERE id = $1`, [tenantId]);
        return {
          user,
          studentNotify: {
            studentEmail: email,
            firstName,
            tenantId,
            collegeName: tname.rows[0]?.name || '',
          },
        };
      }

      if (role === 'employer') {
        const userResult = await client.query(
          `INSERT INTO users (tenant_id, email, password_hash, role, first_name, last_name, phone, is_verified, is_active)
           VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, email, role`,
          [email, passwordHash, role, firstName, lastName || '', phone || '', false, false]
        );

        const user = userResult.rows[0];
        const companySlug = slugify(body.companyName || firstName) + '-' + Date.now().toString(36);
        await client.query(
          `INSERT INTO employer_profiles (user_id, company_name, company_slug, industry, website)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            user.id,
            body.companyName || `${firstName}'s Company`,
            companySlug,
            body.industry || '',
            body.companyWebsite || '',
          ]
        );

        return {
          user,
          notify: {
            tenantName: null,
            companyName: body.companyName || `${firstName}'s Company`,
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

    if (result.studentNotify) {
      await notifyStudentRegistered(result.studentNotify);
    }

    const pendingPlatform = role === 'college_admin' || role === 'employer';

    return NextResponse.json(
      {
        message: pendingPlatform
          ? 'Registration received. Your account will be activated after platform approval.'
          : 'Account created successfully',
        pendingPlatformApproval: pendingPlatform,
        user: { id: userRow.id, email: userRow.email, role: userRow.role },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error.message === 'INVALID_CAMPUS_KEY') {
      return NextResponse.json(
        { error: 'Campus enrollment key was not recognized. Check with your institution.' },
        { status: 400 }
      );
    }
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
