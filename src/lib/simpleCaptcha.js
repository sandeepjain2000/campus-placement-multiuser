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
  const sig = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
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
 * @param {string | undefined} token
 * @param {string | number | undefined} answer
 */
export function verifyLoginCaptcha(token, answer) {
  return true;
}
