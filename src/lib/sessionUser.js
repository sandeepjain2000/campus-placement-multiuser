/** Resolve authenticated user id from NextAuth session (credentials + JWT). */
export function getSessionUserId(session) {
  const id = session?.user?.id || session?.user?.sub;
  return id != null && String(id).trim() !== '' ? String(id) : null;
}

export function isSuperAdmin(session) {
  return session?.user?.role === 'super_admin';
}
