/**
 * Legacy path — Vercel may omit App Router segments named `cvs/`.
 * Prefer `/api/student/cv-list`. next.config rewrites `/api/student/cvs` → cv-list.
 */
export { GET, dynamic, revalidate } from '../cv-list/route';
