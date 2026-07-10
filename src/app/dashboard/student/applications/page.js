import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ALUMNI_MY_JOBS_PATH } from '@/lib/alumniRoutes';

/**
 * /dashboard/student/applications → default per-type list (alumni jobs vs placement drives).
 */
export default async function StudentApplicationsRedirect() {
  const session = await getServerSession(authOptions);
  if (session?.user?.isAlumni) {
    redirect(ALUMNI_MY_JOBS_PATH);
  }
  redirect('/dashboard/student/applications/drives');
}
