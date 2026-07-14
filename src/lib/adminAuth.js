import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isUuid } from '@/lib/tenantContext';

export { isUuid };

export async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'super_admin') {
    return { error: 'Unauthorized', status: 401, session: null };
  }
  return { session, error: null, status: null };
}
