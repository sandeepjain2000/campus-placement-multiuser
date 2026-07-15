import { validateStudentAvatarFileAsync } from '@/lib/studentAvatarUpload';

/**
 * College admin uploads a student profile photo via the app server.
 * @param {string} studentId - student_profiles.id
 * @param {File} file
 * @returns {Promise<{ ok: true, avatar_url: string, viewUrl?: string } | { ok: false, error: string, hint?: string }>}
 */
export async function uploadCollegeStudentAvatarViaServer(studentId, file) {
  const id = String(studentId || '').trim();
  if (!id) {
    return { ok: false, error: 'Student id is required.' };
  }

  const validated = await validateStudentAvatarFileAsync(file);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const formData = new FormData();
  formData.append('file', file, file.name);

  const res = await fetch(`/api/college/students/${encodeURIComponent(id)}/avatar/upload`, {
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
    avatar_url: json.avatar_url,
    fileUrl: json.fileUrl,
    viewUrl: json.viewUrl,
  };
}
