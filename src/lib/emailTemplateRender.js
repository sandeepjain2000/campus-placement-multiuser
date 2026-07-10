/**
 * Replace {{placeholders}} in a template string. Unknown keys become empty string.
 * @param {string} template
 * @param {Record<string, string | number | null | undefined>} vars
 */
export function applyEmailTemplate(template, vars) {
  if (template == null) return '';
  let out = String(template);
  for (const [key, raw] of Object.entries(vars)) {
    const val = raw == null ? '' : String(raw);
    const re = new RegExp(`\\{\\{\\s*${escapeRegExp(key)}\\s*\\}\\}`, 'g');
    out = out.replace(re, val);
  }
  out = out.replace(/\{\{[\s\S]*?\}\}/g, '');
  return out;
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
