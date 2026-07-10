/**
 * Fetch a CSV from an authenticated API route and trigger a browser download.
 * @param {string} url
 * @param {string} filename fallback if Content-Disposition has no filename
 */
export async function downloadCsvFromApi(url, filename) {
  const res = await fetch(url);
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition');
  let name = filename;
  const m = cd && cd.match(/filename="?([^";]+)"?/i);
  if (m?.[1]) name = m[1];
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = u;
  a.download = name;
  a.click();
  URL.revokeObjectURL(u);
}
