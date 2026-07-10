/**
 * Facebook Page feed posts (Meta Graph API). Server-only — do not import from client components.
 *
 * Required env (Vercel / .env.local, never NEXT_PUBLIC_*):
 * - FACEBOOK_PAGE_ID — numeric Page id you manage
 * - FACEBOOK_PAGE_ACCESS_TOKEN — Page access token with pages_manage_posts (and pages_read_engagement)
 *
 * Optional:
 * - FACEBOOK_GRAPH_API_VERSION — default v21.0
 *
 * Meta does not allow posting to a personal profile from a server app; use a Facebook Page
 * (your college page or a test Page where you are admin). Generate a Page token via
 * Graph API Explorer or the Page long-lived token flow.
 */

export function isFacebookPageShareConfigured() {
  const id = process.env.FACEBOOK_PAGE_ID?.trim();
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim();
  return Boolean(id && token);
}

function graphVersion() {
  let v = process.env.FACEBOOK_GRAPH_API_VERSION?.trim() || 'v21.0';
  if (!v.startsWith('v')) v = `v${v}`;
  return v;
}

/**
 * @param {{ message: string, link?: string }} opts
 * @returns {Promise<{ postId: string }>}
 */
export async function postToFacebookPageFeed({ message, link }) {
  if (!isFacebookPageShareConfigured()) {
    throw new Error('Facebook Page sharing is not configured (missing FACEBOOK_PAGE_ID or FACEBOOK_PAGE_ACCESS_TOKEN)');
  }

  const pageId = process.env.FACEBOOK_PAGE_ID.trim();
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN.trim();
  const v = graphVersion();

  const params = new URLSearchParams();
  params.set('message', message);
  params.set('access_token', accessToken);
  if (link && String(link).trim()) {
    params.set('link', String(link).trim());
  }

  const url = `https://graph.facebook.com/${v}/${encodeURIComponent(pageId)}/feed`;
  const res = await fetch(url, {
    method: 'POST',
    body: params,
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    const msg = data.error?.message || data.error?.error_user_msg || res.statusText || 'Facebook request failed';
    throw new Error(msg);
  }

  if (!data.id) {
    throw new Error('Facebook did not return a post id');
  }

  return { postId: String(data.id) };
}

export function formatDriveFacebookMessage({
  tenantName,
  company,
  role,
  dateStr,
  venue,
  driveType,
}) {
  const lines = [
    '📣 Placement drive',
    '',
    `${company || 'Company TBA'} — ${role || 'Role TBA'}`,
  ];
  if (dateStr) lines.push(`📅 ${dateStr}`);
  if (venue) lines.push(`📍 ${venue}`);
  if (driveType) {
    const t = String(driveType).toLowerCase();
    const label = t === 'virtual' || t === 'off_campus' ? t.replace('_', '-') : t;
    lines.push(`🏷 ${label}`);
  }
  lines.push('');
  lines.push(`— ${tenantName || 'Placement office'}`);
  return lines.join('\n');
}
