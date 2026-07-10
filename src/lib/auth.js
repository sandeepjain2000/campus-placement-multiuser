import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { query } from './db';
import { SEED_DEMO_STUDENT_USER_IDS } from './seedDemoStudentIds';
import { verifyLoginCaptcha } from './simpleCaptcha';
import {
  JWT_SESSION_MAX_AGE_SECONDS,
  SESSION_COOKIE_NAME,
  sessionTokenCookieOptions,
} from './sessionPolicy';

function isTransientDbError(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return (
    code === 'ECONNREFUSED'
    || code === 'ETIMEDOUT'
    || code === 'ECONNRESET'
    || code === '57P01'
    || code === '53300'
    || message.includes('timeout')
    || message.includes('connection terminated')
    || message.includes('connection refused')
    || message.includes('too many clients')
  );
}

async function queryWithLoginRetry(text, params, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await query(text, params);
    } catch (error) {
      lastError = error;
      if (i < attempts - 1 && isTransientDbError(error)) {
        await new Promise((resolve) => {
          setTimeout(resolve, 150 * (i + 1));
        });
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export const authOptions = {
  cookies: {
    sessionToken: {
      name: SESSION_COOKIE_NAME,
      options: sessionTokenCookieOptions(),
    },
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        captchaToken: { label: 'Captcha token', type: 'text' },
        captchaAnswer: { label: 'Captcha answer', type: 'text' },
      },
      async authorize(credentials) {
        console.log(`[NextAuth Authorize] Initiated credential verification for email: ${credentials?.email}`);
        if (!credentials?.email || !credentials?.password) {
          console.warn('[NextAuth Authorize] Validation failed: Missing email or password');
          throw new Error('Email and password are required');
        }

        if (!verifyLoginCaptcha(credentials.captchaToken, credentials.captchaAnswer)) {
          console.warn(`[NextAuth Authorize] Captcha verification failed for email: ${credentials.email}`);
          throw new Error('Incorrect verification answer. Click refresh beside the question and try again.');
        }

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        let result;
        try {
          console.log(`[NextAuth Authorize] Querying database for user: ${email}`);
          result = await queryWithLoginRetry(
            `SELECT u.*, t.name as tenant_name, t.slug as tenant_slug, t.logo_url as tenant_logo_url,
                    ep.logo_url AS employer_logo_url,
                    sp.is_verified AS student_placement_verified,
                    COALESCE(sp.is_alumni, false) AS student_is_alumni
             FROM users u
             LEFT JOIN tenants t ON u.tenant_id = t.id
             LEFT JOIN employer_profiles ep ON ep.user_id = u.id
             LEFT JOIN student_profiles sp ON sp.user_id = u.id
             WHERE u.email = $1`,
            [email],
          );
        } catch (error) {
          console.error('[NextAuth Authorize] Database query error during authorize:', error);
          throw new Error('Unable to sign in right now. Please try again in a moment.');
        }

        const user = result.rows[0];
        if (!user) {
          console.warn(`[NextAuth Authorize] Account not found in database for email: ${email}`);
          throw new Error('Account not found. Please check your email or register.');
        }

        console.log(`[NextAuth Authorize] User found (ID: ${user.id}, Role: ${user.role}). Comparing password hashes...`);
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
          console.warn(`[NextAuth Authorize] Password mismatch for email: ${email}`);
          throw new Error(
            'Incorrect password. If your college just created your account, please check your email for the temporary password or use Forgot Password.',
          );
        }

        console.log(`[NextAuth Authorize] Password verified. Checking activation status and email verification...`);
        if (!user.email_verified_at) {
          console.warn(`[NextAuth Authorize] Email address is not verified for email: ${email}`);
          throw new Error(
            'Please verify your email address before signing in. Check your inbox for the verification link from PlacementHub.',
          );
        }

        if (!user.is_active) {
          console.warn(`[NextAuth Authorize] User account is inactive. role=${user.role}, email=${email}`);
          if (['college_admin', 'placement_committee', 'employer'].includes(user.role)) {
            if (user.registration_rejected_at) {
              const hint = user.registration_rejection_note
                ? ` ${user.registration_rejection_note}`
                : '';
              console.warn(`[NextAuth Authorize] Registration rejected. Rejection note: ${hint}`);
              throw new Error(`Your registration was not approved.${hint}`);
            }
            throw new Error(
              'Your account is pending approval by the platform team. You will be able to sign in after activation.',
            );
          }
          throw new Error('This account is inactive. Contact support if you need help.');
        }

        try {
          console.log(`[NextAuth Authorize] Updating last_login time for user ID: ${user.id}`);
          await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
        } catch (error) {
          console.error('[NextAuth Authorize] Authentication last_login update failed:', error);
        }

        let fallbackTenantName = user.tenant_name;
        if (!fallbackTenantName) {
          if (user.role === 'employer') {
            if (user.email.includes('techcorp')) fallbackTenantName = 'TechCorp Solutions';
            else if (user.email.includes('infosys')) fallbackTenantName = 'Infosys Limited';
            else fallbackTenantName = 'Corporate Partner';
          } else if (user.role === 'college_admin' || user.role === 'placement_committee') {
            if (user.email.includes('iitm')) fallbackTenantName = 'IIT Madras';
            else if (user.email.includes('nitt')) fallbackTenantName = 'NIT Trichy';
            else if (user.email.includes('bits')) fallbackTenantName = 'BITS Pilani';
            else fallbackTenantName = user.role === 'placement_committee' ? 'Placement Committee' : 'College Admin';
          }
        }

        const brandLogoUrl =
          user.role === 'employer' ? user.employer_logo_url || null : user.tenant_logo_url || null;

        return {
          id: user.id,
          email: user.email,
          communication_email: user.communication_email || user.email,
          name: `${user.first_name} ${user.last_name || ''}`.trim(),
          role: user.role,
          tenantId: user.tenant_id,
          tenantName: fallbackTenantName,
          tenantSlug: user.tenant_slug,
          avatar: user.avatar_url,
          brandLogoUrl,
          studentPlacementVerified:
            user.role === 'student'
              ? Boolean(user.student_placement_verified) || SEED_DEMO_STUDENT_USER_IDS.has(user.id)
              : undefined,
          isAlumni: user.role === 'student' ? Boolean(user.student_is_alumni) : undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.communication_email = user.communication_email || user.email;
        token.name = user.name;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.tenantName = user.tenantName;
        token.tenantSlug = user.tenantSlug;
        token.avatar = user.avatar;
        token.logoUrl = user.avatar;
        token.brandLogoUrl = user.brandLogoUrl ?? null;
        token.studentPlacementVerified = user.studentPlacementVerified;
        token.isAlumni = user.isAlumni;
      }
      if (trigger === 'update' && session?.avatar !== undefined) {
        token.avatar = session.avatar;
        token.logoUrl = session.avatar;
      }
      if (trigger === 'update' && session?.brandLogoUrl !== undefined) {
        token.brandLogoUrl = session.brandLogoUrl || null;
      }
      if (token?.id) {
        try {
          const refreshed = await query(
            `SELECT first_name, last_name FROM users WHERE id = $1::uuid LIMIT 1`,
            [token.id],
          );
          const row = refreshed.rows[0];
          if (row) {
            token.name = `${row.first_name || ''} ${row.last_name || ''}`.trim() || token.name;
          }
        } catch {
          /* keep cached name on transient DB errors */
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.communication_email = token.communication_email || token.email;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.tenantId = token.tenantId;
        session.user.tenant_id = token.tenantId ?? null;
        session.user.tenantName = token.tenantName;
        session.user.tenantSlug = token.tenantSlug;
        session.user.avatar = token.avatar;
        session.user.logoUrl = token.logoUrl;
        session.user.brandLogoUrl = token.brandLogoUrl ?? null;
        session.user.studentPlacementVerified = token.studentPlacementVerified;
        session.user.isAlumni = token.isAlumni;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    // JWT cap while the browser session cookie is present (cookie clears on browser close).
    maxAge: JWT_SESSION_MAX_AGE_SECONDS,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
