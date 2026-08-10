import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { verifyLoginCaptcha, verifyCaptchaGate } from '@/lib/simpleCaptcha';
import { newId } from '@/lib/ids';
import { ROLE_HOME } from '@/lib/roleHome';

/**
 * Internship Portal auth — Credentials only. No Google/OAuth provider.
 * "Continue with Google" on registration is a dummy UI step handled entirely
 * client-side + by /api/ip/auth/register-candidate; it never touches next-auth.
 */

async function queryWithRetry(text, params, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await query(text, params);
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 150 * (i + 1)));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}

async function recordLoginEvent({ userId, email, role, success }) {
  try {
    await query(
      `INSERT INTO ip_login_events (id, user_id, email, role, success)
       VALUES ($1,$2,$3,$4,$5)`,
      [newId('ip_login'), userId || null, email, role || null, success],
    );
  } catch (e) {
    console.error('[ip auth] login event write failed', e.message);
  }
}

export const authOptions = {
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
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }
        const captchaOk =
          verifyCaptchaGate(credentials.captchaToken) ||
          verifyLoginCaptcha(credentials.captchaToken, credentials.captchaAnswer);
        if (!captchaOk) {
          const answerEmpty = !String(credentials.captchaAnswer ?? '').trim();
          throw new Error(
            answerEmpty
              ? 'Verification answer is required'
              : !credentials.captchaToken
                ? 'Verification question is required'
                : 'Captcha verification failed — refresh the question and try again',
          );
        }
        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        let result;
        try {
          result = await queryWithRetry(
            `SELECT id, email, password_hash, role, name, active, profile_complete
             FROM ip_users
             WHERE lower(email) = $1
             LIMIT 1`,
            [email],
          );
        } catch (error) {
          console.error('[IP Auth] DB error', error.message);
          throw new Error('Unable to sign in right now. Please try again.');
        }

        const user = result.rows[0];
        if (!user || user.active === false) {
          await recordLoginEvent({ email, success: false });
          throw new Error('Invalid email or password');
        }

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) {
          await recordLoginEvent({ userId: user.id, email, role: user.role, success: false });
          throw new Error('Invalid email or password');
        }

        await recordLoginEvent({ userId: user.id, email, role: user.role, success: true });
        await query(`UPDATE ip_users SET last_login_at = now() WHERE id = $1`, [user.id]);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          profileComplete: user.profile_complete,
        };
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 60 * 60 * 12 },
  pages: {
    signIn: '/',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.role) {
        token.role = user.role;
        token.uid = user.id;
        token.profileComplete = user.profileComplete;
        if (user.name) token.name = user.name;
        return token;
      }
      // Refresh profileComplete on subsequent requests so gates reflect latest state.
      if (token?.uid) {
        try {
          const row = await queryWithRetry(
            `SELECT role, profile_complete, active FROM ip_users WHERE id = $1 LIMIT 1`,
            [token.uid],
          );
          if (row.rows[0] && row.rows[0].active !== false) {
            token.profileComplete = row.rows[0].profile_complete;
            token.role = row.rows[0].role;
          }
        } catch {
          /* keep existing token on transient error */
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid;
        session.user.role = token.role;
        session.user.profileComplete = Boolean(token.profileComplete);
        if (token.name) session.user.name = token.name;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export { ROLE_HOME };
