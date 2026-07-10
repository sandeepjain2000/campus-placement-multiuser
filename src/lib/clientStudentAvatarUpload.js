import { validateStudentAvatarFileAsync } from '@/lib/studentAvatarUpload';

/**
 * Upload profile photo through the app server (avoids browser→S3 CORS issues).
 * @param {File} file
 * @returns {Promise<{ ok: true, avatar_url: string } | { ok: false, error: string, hint?: string }>}
 */
export async function uploadStudentAvatarViaServer(file) {
  const validated = await validateStudentAvatarFileAsync(file);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const formData = new FormData();
  formData.append('file', file, file.name);

  const res = await fetch('/api/student/profile/avatar/upload', {
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

  return { ok: true, avatar_url: json.avatar_url, fileUrl: json.fileUrl, viewUrl: json.viewUrl };
}
