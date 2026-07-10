import { signOut as nextAuthSignOut } from 'next-auth/react';

/**
 * A wrapper around next-auth's signOut that dynamically redirects
 * the user back to the login screen they originally used (/sign-in vs /login).
 * 
 * @param {Object} options - Standard signOut options
 */
export async function signOut(options = {}) {
  let callbackUrl = '/sign-in';
  
  try {
    const source = sessionStorage.getItem('placementhub_login_source');
    if (source === '/login' || source === '/sign-in') {
      callbackUrl = source;
    }
  } catch (e) {
    // ignore sessionStorage errors
  }

  // Preserve any forced query params if provided in the original options
  const existingCallback = options.callbackUrl || '';
  if (existingCallback.includes('?force=1')) {
    callbackUrl += '?force=1';
  } else if (existingCallback.includes('?error=stale')) {
    callbackUrl += '?error=stale';
  }

  return nextAuthSignOut({
    ...options,
    callbackUrl,
  });
}
