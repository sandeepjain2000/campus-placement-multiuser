/**
 * Client-side helper to verify captcha before login/register continues.
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function verifyCaptchaAnswer(captchaToken, captchaAnswer) {
  try {
    const res = await fetch('/api/auth/captcha/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ captchaToken, captchaAnswer }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      return { ok: true };
    }
    return {
      ok: false,
      error: data.error || 'Verification failed. Check your answer and try again.',
    };
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.' };
  }
}
