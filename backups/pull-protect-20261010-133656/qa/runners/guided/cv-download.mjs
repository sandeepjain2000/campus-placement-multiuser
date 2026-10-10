/**
 * Download employer-facing CVs via API (label-based filenames) into qa/data/downloads/cvs/.
 */
import fs from 'fs';
import path from 'path';
import { DATA_ROOT } from './paths.mjs';

export const CV_DOWNLOAD_ROOT = path.join(DATA_ROOT, 'downloads', 'cvs');

function sanitizeFileStem(name) {
  return String(name || 'CV')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 40)
    .trim() || 'CV';
}

function extensionFromResponse(response, fallback = '.pdf') {
  const headers = response.headers();
  const cd = headers['content-disposition'] || headers['Content-Disposition'] || '';
  const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(cd);
  if (match?.[1]) {
    const ext = path.extname(decodeURIComponent(match[1].trim()));
    if (ext && ext.length <= 13) return ext.toLowerCase();
  }
  const ct = String(headers['content-type'] || headers['Content-Type'] || '').toLowerCase();
  if (ct.includes('pdf')) return '.pdf';
  if (ct.includes('openxmlformats-officedocument.wordprocessingml')) return '.docx';
  if (ct.includes('msword')) return '.doc';
  return fallback.startsWith('.') ? fallback : `.${fallback}`;
}

function resolveDownloadUrl(baseUrl, resumeUrl) {
  const raw = String(resumeUrl || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${baseUrl.replace(/\/$/, '')}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

/**
 * @param {import('playwright').Page} page
 * @param {string} baseUrl
 * @param {{
 *   outDir?: string,
 *   tabs?: string[],
 *   limit?: number,
 *   marker?: string | null,
 *   studentNameContains?: string | null,
 * }} [options]
 */
export async function downloadEmployerApplicationCvs(page, baseUrl, options = {}) {
  const tabs = options.tabs || ['internships', 'drives', 'jobs', 'projects'];
  const limit = Math.max(1, Number(options.limit) || 10);
  const marker = options.marker ? String(options.marker).trim() : '';
  const studentNeedle = options.studentNameContains
    ? String(options.studentNameContains).trim().toLowerCase()
    : '';

  const outDir =
    options.outDir ||
    path.join(CV_DOWNLOAD_ROOT, new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19));
  fs.mkdirSync(outDir, { recursive: true });

  const saved = [];
  const seen = new Set();

  for (const tab of tabs) {
    const listUrl = `${baseUrl.replace(/\/$/, '')}/api/employer/applications?tab=${encodeURIComponent(tab)}`;
    const listRes = await page.request.get(listUrl);
    if (!listRes.ok()) {
      console.warn(`    (skip tab ${tab}: list API ${listRes.status()})`);
      continue;
    }

    const payload = await listRes.json().catch(() => ({}));
    const items = Array.isArray(payload.items) ? payload.items : [];

    for (const app of items) {
      if (!app.hasResume || !app.resumeUrl) continue;
      if (marker && app.openingTitle && !String(app.openingTitle).includes(marker)) continue;
      if (
        studentNeedle &&
        !String(app.studentName || '').toLowerCase().includes(studentNeedle)
      ) {
        continue;
      }

      const dedupeKey = `${app.studentProfileId || ''}:${app.id || ''}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const downloadUrl = resolveDownloadUrl(baseUrl, app.resumeUrl);
      const fileRes = await page.request.get(downloadUrl, { maxRedirects: 8 });
      if (!fileRes.ok()) {
        console.warn(`    (skip CV ${app.id}: download ${fileRes.status()})`);
        continue;
      }

      const body = await fileRes.body();
      if (!body || body.length < 128) {
        console.warn(`    (skip CV ${app.id}: response too small — likely HTML error page)`);
        continue;
      }

      const ext = extensionFromResponse(fileRes, '.pdf');
      const labelStem = sanitizeFileStem(app.cvLabel || app.resumeFileName || app.studentName || 'CV');
      const fileName = `${labelStem}-${tab}-${String(app.id || 'app').slice(0, 8)}${ext}`;
      const filePath = path.join(outDir, fileName);
      fs.writeFileSync(filePath, body);

      const entry = {
        fileName,
        filePath,
        tab,
        applicationId: app.id,
        studentName: app.studentName,
        cvLabel: app.cvLabel || app.resumeFileName || null,
        openingTitle: app.openingTitle || null,
        bytes: body.length,
      };
      saved.push(entry);
      console.log(`    ✓ ${fileName} (${entry.bytes} bytes) — ${app.studentName || 'student'}`);

      if (saved.length >= limit) break;
    }
    if (saved.length >= limit) break;
  }

  const manifest = {
    downloadedAt: new Date().toISOString(),
    outDir,
    count: saved.length,
    items: saved,
  };
  fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  return manifest;
}

/**
 * @param {import('playwright').Page} page
 * @param {string} baseUrl
 * @param {{ outDir?: string, limit?: number }} [options]
 */
export async function downloadStudentOwnCvs(page, baseUrl, options = {}) {
  const limit = Math.max(1, Number(options.limit) || 10);
  const outDir =
    options.outDir ||
    path.join(CV_DOWNLOAD_ROOT, `student-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`);
  fs.mkdirSync(outDir, { recursive: true });

  const listRes = await page.request.get(`${baseUrl.replace(/\/$/, '')}/api/student/cvs`);
  if (listRes.status() === 503) {
    return { outDir, count: 0, items: [], note: 'student_cvs table not migrated (099)' };
  }
  if (!listRes.ok()) {
    throw new Error(`GET /api/student/cvs failed (${listRes.status()})`);
  }

  const payload = await listRes.json().catch(() => ({}));
  const items = (Array.isArray(payload.items) ? payload.items : []).filter((c) => !c.archivedAt);
  const saved = [];

  for (const cv of items.slice(0, limit)) {
    const viewUrl = `${baseUrl.replace(/\/$/, '')}/api/student/cvs/${encodeURIComponent(cv.id)}/view`;
    const fileRes = await page.request.get(viewUrl, { maxRedirects: 8 });
    if (!fileRes.ok()) continue;
    const body = await fileRes.body();
    if (!body || body.length < 128) continue;

    const ext = extensionFromResponse(fileRes, '.pdf');
    const fileName = `${sanitizeFileStem(cv.label)}${ext}`;
    const filePath = path.join(outDir, fileName);
    fs.writeFileSync(filePath, body);
    saved.push({ fileName, filePath, cvId: cv.id, label: cv.label, bytes: body.length });
    console.log(`    ✓ ${fileName} (${body.length} bytes)`);
  }

  const manifest = {
    downloadedAt: new Date().toISOString(),
    outDir,
    count: saved.length,
    items: saved,
  };
  fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}
