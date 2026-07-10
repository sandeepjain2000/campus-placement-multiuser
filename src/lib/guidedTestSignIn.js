import { encode } from 'next-auth/jwt';
import { authOptions } from './auth';
import { createLoginCaptcha, DUMMY_CAPTCHA_ANSWER } from './simpleCaptcha';
import { DEMO_LOGINS, DEMO_SEED_PASSWORD, SEEDED_EMPLOYER_CREDENTIALS } from './demoLogins';
import { getGuidedState } from './guidedRunnerDb';
import { isGuidedRunnerFeatureEnabled } from './guidedRunnerConfig';
import { getDashboardPath } from './utils';
import { JWT_SESSION_MAX_AGE_SECONDS } from './sessionPolicy';

const ALLOWED_EMAILS = new Set(
  [...DEMO_LOGINS, ...SEEDED_EMPLOYER_CREDENTIALS]
    .map((d) => String(d?.email || '').trim().toLowerCase())
    .filter(Boolean),
);

export function isGuidedTestSignInEnabled() {
  if (!isGuidedRunnerFeatureEnabled()) return false;
  if (process.env.NODE_ENV === 'production' && process.env.GUIDED_TEST_SIGN_IN !== 'true') return false;
  return true;
}

/**
 * Dev-only sign-in for guided playbooks — requires an active guided session in SQLite.
 * @param {string} email
 * @param {string} [password]
 */
export async function performGuidedTestSignIn(email, password = DEMO_SEED_PASSWORD) {
  if (!isGuidedTestSignInEnabled()) {
    return { ok: false, error: 'Guided test sign-in is disabled in this environment.' };
  }

  const { session } = getGuidedState();
  if (!session?.active) {
    return { ok: false, error: 'Start a guided playbook first (npm run test:guided:playbook).' };
  }

  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !ALLOWED_EMAILS.has(normalized)) {
    return { ok: false, error: 'That email is not allowed for guided test sign-in.' };
  }

  const credentialsProvider = authOptions.providers.find((p) => p.type === 'credentials');
  const authorize = credentialsProvider?.options?.authorize;
  if (typeof authorize !== 'function') {
    return { ok: false, error: 'Credentials sign-in is unavailable.' };
  }

  const captcha = createLoginCaptcha();
  let user;
  try {
    user = await authorize({
      email: normalized,
      password: String(password),
      captchaToken: captcha.token,
      captchaAnswer: String(DUMMY_CAPTCHA_ANSWER),
    });
  } catch (err) {
    return { ok: false, error: err?.message || 'Sign-in failed.' };
  }

  if (!user?.id || !user?.role) {
    return { ok: false, error: 'Invalid credentials.' };
  }

  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    return { ok: false, error: 'Server auth secret is not configured.' };
  }

  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      communication_email: user.communication_email || user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: user.tenantName,
      tenantSlug: user.tenantSlug,
      avatar: user.avatar,
      logoUrl: user.avatar,
      brandLogoUrl: user.brandLogoUrl ?? null,
      studentPlacementVerified: user.studentPlacementVerified,
    },
    secret: secret || 'placementhub-dev-captcha',
    maxAge: JWT_SESSION_MAX_AGE_SECONDS,
  });

  return {
    ok: true,
    token,
    redirectTo: getDashboardPath(user.role),
    role: user.role,
    email: user.email,
  };
}
