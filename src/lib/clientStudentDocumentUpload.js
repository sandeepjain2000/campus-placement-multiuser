import { validateStudentDocumentFileForTypeAsync } from '@/lib/studentDocumentUpload';

/**
 * Upload a student document through the app server (recommended — avoids S3 CORS issues).
 * @param {File} file
 * @param {{ documentType?: string, setAsPrimaryResume?: boolean }} [opts]
 * @returns {Promise<{ ok: true, document: object, fileUrl: string } | { ok: false, error: string, hint?: string }>}
 */
export async function uploadStudentDocumentViaServer(file, opts = {}) {
  const documentType = opts.documentType || 'resume';
  const validated = await validateStudentDocumentFileForTypeAsync(file, documentType);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const formData = new FormData();
  formData.append('file', file, validated.fileName);
  formData.append('document_type', documentType);
  if (opts.setAsPrimaryResume) {
    formData.append('set_as_primary', '1');
  }

  const res = await fetch('/api/student/documents/upload', {
    method: 'POST',
    body: formData,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: json.error || 'Upload failed',
      hint: json.hint,
    };
  }

  return {
    ok: true,
    document: json.document,
    fileUrl: json.fileUrl,
  };
}
