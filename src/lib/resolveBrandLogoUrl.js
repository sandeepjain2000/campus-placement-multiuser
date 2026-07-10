import { isBrowserLoadableAssetUrl } from '@/lib/clientAssetUrl';

export function pickBrowserAssetUrl(...candidates) {
  for (const candidate of candidates) {
    const value = String(candidate ?? '').trim();
    if (isBrowserLoadableAssetUrl(value)) return value;
  }
  return null;
}

/**
 * Resolve the logo shown in dashboard chrome (header, sidebar, hub).
 * Prefer fresh tenant/profile API data over JWT session values set at login.
 */
export function resolveBrandLogoUrl({
  role,
  employerProfile,
  collegeSettings,
  sessionUser,
  profileLoaded = true,
}) {
  if (role === 'employer') {
    const fromApi = pickBrowserAssetUrl(employerProfile?.logo_url);
    if (fromApi) return fromApi;
    if (profileLoaded) {
      return pickBrowserAssetUrl(sessionUser?.brandLogoUrl);
    }
    return null;
  }

  if (role === 'college_admin') {
    const fromApi = pickBrowserAssetUrl(collegeSettings?.logoUrl);
    if (fromApi) return fromApi;
    if (profileLoaded) {
      return pickBrowserAssetUrl(sessionUser?.brandLogoUrl);
    }
    return null;
  }

  if (role === 'super_admin') {
    return pickBrowserAssetUrl(sessionUser?.avatar);
  }

  return pickBrowserAssetUrl(sessionUser?.brandLogoUrl);
}
