/**
 * Legacy path — Vercel may omit App Router segments named `cvs/`.
 * Prefer `/api/student/cv-list`. next.config rewrites `/api/student/cvs` → cv-list.
 */
export { GET } from '../cv-list/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
