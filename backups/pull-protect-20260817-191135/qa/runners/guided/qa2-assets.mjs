/**
 * QA assets under qa2/ — sample CVs (PDF) and profile photos.
 */
import fs from 'fs';
import path from 'path';
import { REPO_ROOT } from './paths.mjs';

export const QA2_ROOT = path.join(REPO_ROOT, 'qa2');
export const QA2_CV_DIR = path.join(QA2_ROOT, 'CVs');
export const QA2_PROFILE_DIR = path.join(QA2_ROOT, 'profilepics');

const PDF_MIME = 'application/pdf';

function loadManifest(dir) {
  const manifestPath = path.join(dir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return [];
  const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return Array.isArray(data.items) ? data.items : [];
}

function guessMime(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.pdf') return PDF_MIME;
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'application/octet-stream';
}

export function listQa2Cvs() {
  const items = loadManifest(QA2_CV_DIR);
  if (items.length) return items;
  return fs
    .readdirSync(QA2_CV_DIR)
    .filter((f) => f.endsWith('.pdf'))
    .map((file, i) => ({ file, label: `CV ${i + 1}`.slice(0, 20) }));
}

export function listQa2ProfilePhotos() {
  const items = loadManifest(QA2_PROFILE_DIR);
  if (items.length) return items;
  return fs
    .readdirSync(QA2_PROFILE_DIR)
    .filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f))
    .map((file) => ({ file, mimeType: guessMime(file) }));
}

/**
 * @param {import('playwright').Page} page
 * @param {string} baseUrl
 */
export async function uploadQa2Cvs(page, baseUrl, options = {}) {
  const items = options.items || listQa2Cvs();
  const skipExistingLabels = options.skipExistingLabels !== false;
  const apiBase = baseUrl.replace(/\/$/, '');

  let existingLabels = new Set();
  if (skipExistingLabels) {
    const listRes = await page.request.get(`${apiBase}/api/student/cvs`);
    if (listRes.status() === 503) {
      throw new Error('student_cvs not ready — run npm run db:migrate:099 first');
    }
    if (listRes.ok()) {
      const listJson = await listRes.json().catch(() => ({}));
      const rows = Array.isArray(listJson.items) ? listJson.items : [];
      existingLabels = new Set(rows.filter((r) => !r.archivedAt).map((r) => String(r.label || '').trim()));
    }
  }

  const uploaded = [];
  const skipped = [];

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const fileName = String(item.file || '').trim();
    const label = String(item.label || '').trim();
    if (!fileName || !label) throw new Error(`Invalid CV manifest row: ${JSON.stringify(item)}`);
    if (label.length > 20) throw new Error(`Label too long (${label.length}): "${label}"`);

    if (existingLabels.has(label)) {
      skipped.push({ fileName, label, reason: 'already active' });
      continue;
    }

    const filePath = path.join(QA2_CV_DIR, fileName);
    if (!fs.existsSync(filePath)) throw new Error(`Sample CV not found: ${filePath}`);

    const buffer = fs.readFileSync(filePath);
    const makeDefault = options.firstAsDefault !== false && uploaded.length === 0 && !existingLabels.size;

    let res = await page.request.post(`${apiBase}/api/student/cv-upload`, {
      multipart: {
        file: { name: fileName, mimeType: PDF_MIME, buffer },
        label,
        set_as_default: makeDefault ? '1' : '0',
      },
    });
    if (res.status() === 404) {
      res = await page.request.post(`${apiBase}/api/student/cvs/upload`, {
        multipart: {
          file: { name: fileName, mimeType: PDF_MIME, buffer },
          label,
          set_as_default: makeDefault ? '1' : '0',
        },
      });
    }

    const json = await res.json().catch(() => ({}));
    if (res.status() === 503 || /storage|s3|aws|cloud storage|credentials/i.test(String(json.error || ''))) {
      return { uploaded, skipped, storageSkipped: true, reason: json.error || 'Cloud storage not configured' };
    }
    if (!res.ok()) throw new Error(json.error || `Upload failed for ${fileName} (${res.status()})`);

    uploaded.push({ fileName, label, id: json.item?.id, isDefault: Boolean(json.item?.isDefault) });
    existingLabels.add(label);
  }

  return { uploaded, skipped, storageSkipped: false };
}

/**
 * @param {import('playwright').Page} page
 * @param {string} baseUrl
 */
export async function uploadQa2ProfilePhoto(page, baseUrl, options = {}) {
  const photos = listQa2ProfilePhotos();
  if (!photos.length) throw new Error(`No profile photos in ${QA2_PROFILE_DIR}`);

  const pick = options.file
    ? photos.find((p) => p.file === options.file) || { file: options.file, mimeType: guessMime(options.file) }
    : photos[0];

  const filePath = path.join(QA2_PROFILE_DIR, pick.file);
  if (!fs.existsSync(filePath)) throw new Error(`Profile photo not found: ${filePath}`);

  const buffer = fs.readFileSync(filePath);
  const mimeType = pick.mimeType || guessMime(pick.file);
  const apiBase = baseUrl.replace(/\/$/, '');

  const res = await page.request.post(`${apiBase}/api/student/profile/avatar/upload`, {
    multipart: {
      file: { name: pick.file, mimeType, buffer },
    },
  });
  const json = await res.json().catch(() => ({}));

  if (res.status() === 503 || /storage|s3|aws|cloud storage|credentials/i.test(String(json.error || ''))) {
    return { ok: false, storageSkipped: true, reason: json.error || json.hint || 'Cloud storage not configured' };
  }
  if (!res.ok()) throw new Error(json.error || `Avatar upload failed (${res.status()})`);

  return {
    ok: true,
    file: pick.file,
    avatar_url: json.avatar_url || json.viewUrl || json.fileUrl,
  };
}
