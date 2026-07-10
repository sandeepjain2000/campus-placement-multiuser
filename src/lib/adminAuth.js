import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

export async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'super_admin') {
    return { error: 'Unauthorized', status: 401, session: null };
  }
  return { session, error: null, status: null };
}
