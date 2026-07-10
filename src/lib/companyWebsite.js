/** Normalize employer website values for safe external links. */
export function toCompanyWebsiteUrl(website) {
  if (website == null) return null;
  const raw = String(website).trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^\/\//.test(raw)) return `https:${raw}`;
  return `https://${raw.replace(/^\/+/, '')}`;
}
