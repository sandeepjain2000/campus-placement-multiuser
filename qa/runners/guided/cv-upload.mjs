/**
 * Upload labelled sample CVs from docs/CVs/ via student API.
 * QA/agent testing only — docs/CVs is not exposed in the product UI.
 */
import fs from 'fs';
import path from 'path';
import { REPO_ROOT } from './paths.mjs';

export const SAMPLE_CV_DIR = path.join(REPO_ROOT, 'docs', 'CVs');
export const SAMPLE_CV_MANIFEST = path.join(SAMPLE_CV_DIR, 'manifest.json');

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export function loadSampleCvManifest() {
  if (!fs.existsSync(SAMPLE_CV_MANIFEST)) {
    throw new Error(`Missing ${SAMPLE_CV_MANIFEST}`);
  }
  const data = JSON.parse(fs.readFileSync(SAMPLE_CV_MANIFEST, 'utf8'));
  const items = Array.isArray(data.items) ? data.items : [];
  if (!items.length) throw new Error('Sample CV manifest has no items');
  return items;
}

/**
 * @param {import('playwright').Page} page
 * @param {string} baseUrl
 * @param {{
 *   files?: { file: string, label: string }[],
 *   firstAsDefault?: boolean,
 *   skipExistingLabels?: boolean,
 * }} [options]
 */
export async function uploadSampleCvs(page, baseUrl, options = {}) {
  const items = options.files || loadSampleCvManifest();
  const firstAsDefault = options.firstAsDefault !== false;
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
      existingLabels = new Set(
        rows.filter((r) => !r.archivedAt).map((r) => String(r.label || '').trim()),
      );
    }
  }

  const uploaded = [];
  const skipped = [];

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const fileName = String(item.file || '').trim();
    const label = String(item.label || '').trim();
    if (!fileName || !label) {
      throw new Error(`Invalid manifest row: ${JSON.stringify(item)}`);
    }
    if (label.length > 20) {
      throw new Error(`Label too long (${label.length}): "${label}"`);
    }

    if (existingLabels.has(label)) {
      skipped.push({ fileName, label, reason: 'already active' });
      console.log(`    ○ skip "${label}" — already on profile`);
      continue;
    }

    const filePath = path.join(SAMPLE_CV_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Sample CV not found: ${filePath}`);
    }

    const buffer = fs.readFileSync(filePath);
    const makeDefault = firstAsDefault && uploaded.length === 0 && !existingLabels.size;

    let res = await page.request.post(`${apiBase}/api/student/cv-upload`, {
      multipart: {
        file: {
          name: fileName,
          mimeType: DOCX_MIME,
          buffer,
        },
        label,
        set_as_default: makeDefault ? '1' : '0',
      },
    });
    if (res.status() === 404) {
      res = await page.request.post(`${apiBase}/api/student/cvs/upload`, {
        multipart: {
          file: {
            name: fileName,
            mimeType: DOCX_MIME,
            buffer,
          },
          label,
          set_as_default: makeDefault ? '1' : '0',
        },
      });
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok()) {
      throw new Error(json.error || `Upload failed for ${fileName} (${res.status()})`);
    }

    uploaded.push({ fileName, label, id: json.item?.id, isDefault: Boolean(json.item?.isDefault) });
    existingLabels.add(label);
    console.log(`    ✓ ${label} ← ${fileName}${makeDefault ? ' (default)' : ''}`);
  }

  return { uploaded, skipped, sampleDir: SAMPLE_CV_DIR };
}
