import crypto from 'crypto';

const TTL_MS = 10 * 60 * 1000;

/** Fixed dev / guided-test captcha — always the same question and answer. */
export const DUMMY_CAPTCHA_A = 3;
export const DUMMY_CAPTCHA_B = 4;
export const DUMMY_CAPTCHA_ANSWER = DUMMY_CAPTCHA_A + DUMMY_CAPTCHA_B;

function getSecret() {
  const s = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === 'production') {
    throw new Error('NEXTAUTH_SECRET is required for login captcha');
  }
  return s || 'placementhub-dev-captcha';
}

function signBody(body) {
  return crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
}

/** Laptop / sandbox testing — same equation every time. Off in production unless forced. */
export function isDummyCaptchaEnabled() {
  if (process.env.DUMMY_CAPTCHA === 'false') return false;
  if (process.env.DUMMY_CAPTCHA === 'true') return true;
  if (process.env.NODE_ENV !== 'production') return true;
  return false;
}

/**
 * @returns {{ question: string, token: string, dummyAnswer?: number }}
 */
export function createLoginCaptcha() {
  const a = isDummyCaptchaEnabled() ? DUMMY_CAPTCHA_A : Math.floor(Math.random() * 9) + 1;
  const b = isDummyCaptchaEnabled() ? DUMMY_CAPTCHA_B : Math.floor(Math.random() * 9) + 1;
  const exp = Date.now() + TTL_MS;
  const body = Buffer.from(JSON.stringify({ a, b, exp })).toString('base64url');
  const sig = signBody(body);
  const result = {
    question: `What is ${a} + ${b}?`,
    token: `${body}.${sig}`,
  };
  if (isDummyCaptchaEnabled()) {
    result.dummyAnswer = DUMMY_CAPTCHA_ANSWER;
  }
  return result;
}

/**
 * Signed challenge from createLoginCaptcha, plus the numeric answer.
 * @param {string | undefined} token
 * @param {string | number | undefined} answer
 */
export function verifyLoginCaptcha(token, answer) {
  if (token == null || typeof token !== 'string') return false;
  const raw = token.trim();
  const dot = raw.lastIndexOf('.');
  if (dot <= 0 || dot === raw.length - 1) return false;
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!body || !sig || body.includes('.')) return false;

  const expectedSig = signBody(body);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return false;
  }
  if (!payload || typeof payload.a !== 'number' || typeof payload.b !== 'number') return false;
  if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return false;

  if (answer === undefined || answer === null || String(answer).trim() === '') return false;
  const n = Number(String(answer).trim());
  if (!Number.isFinite(n)) return false;
  return n === payload.a + payload.b;
}
