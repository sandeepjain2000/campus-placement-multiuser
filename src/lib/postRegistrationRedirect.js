/**
 * Login path after a successful self-registration (always in-app, never external).
 * @param {{ pendingPlatformApproval?: boolean }} opts
 */
export function getPostRegistrationLoginPath({ pendingPlatformApproval = false } = {}) {
  return pendingPlatformApproval
    ? '/login?registered=pending-platform'
    : '/login?registered=true';
}

/**
 * Hard navigation so the user cannot remain on /register or follow the home logo to /.
 * @param {{ pendingPlatformApproval?: boolean, nextUrl?: string }} opts
 */
export function redirectToLoginAfterRegistration({
  pendingPlatformApproval = false,
  nextUrl,
} = {}) {
  if (typeof window === 'undefined') return;
  const path =
    typeof nextUrl === 'string' && nextUrl.startsWith('/login')
      ? nextUrl
      : getPostRegistrationLoginPath({ pendingPlatformApproval });
  window.location.replace(path);
}
