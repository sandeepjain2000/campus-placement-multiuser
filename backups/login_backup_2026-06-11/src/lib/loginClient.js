/**
 * Client helpers for the login form (autofill + post–sign-in session cookie).
 */

/** One-shot prefill from /demo-accounts (avoids sticky ?email=admin@iitm.edu in the URL). */
export const LOGIN_PREFILL_EMAIL_KEY = 'placementhub_login_prefill_email';

export function setLoginPrefillEmail(email) {
  if (typeof window === 'undefined') return;
  try {
    const v = String(email || '').trim();
    if (v) sessionStorage.setItem(LOGIN_PREFILL_EMAIL_KEY, v);
    else sessionStorage.removeItem(LOGIN_PREFILL_EMAIL_KEY);
  } catch {
    /* private mode */
  }
}

export function consumeLoginPrefillEmail() {
  if (typeof window === 'undefined') return '';
  try {
    const v = sessionStorage.getItem(LOGIN_PREFILL_EMAIL_KEY) || '';
    if (v) sessionStorage.removeItem(LOGIN_PREFILL_EMAIL_KEY);
    return v.trim();
  } catch {
    return '';
  }
}

/** Read email/password from the form DOM (works when the browser autofills without firing React onChange). */
export function readLoginFormValues(form) {
  if (!form) {
    return { email: '', password: '' };
  }
  const emailEl = form.elements.namedItem('email');
  const passwordEl = form.elements.namedItem('password');
  const email = String(emailEl?.value ?? '').trim();
  const password = String(passwordEl?.value ?? '');
  return { email, password };
}

/** Write credentials into the login form (demo cards, URL prefill). */
export function writeLoginFormValues(form, { email = '', password = '' } = {}) {
  if (!form) return;
  const emailEl = form.elements.namedItem('email');
  const passwordEl = form.elements.namedItem('password');
  if (emailEl && 'value' in emailEl) emailEl.value = email;
  if (passwordEl && 'value' in passwordEl) passwordEl.value = password;
}

/** After credentials signIn(redirect:false), wait until the session cookie is readable. */
export async function waitForAuthSession(maxMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch('/api/auth/session', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const sess = await res.json().catch(() => ({}));
      if (sess?.user?.role) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}
