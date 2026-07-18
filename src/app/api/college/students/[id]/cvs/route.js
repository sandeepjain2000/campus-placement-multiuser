/**
 * Legacy path — Vercel may omit App Router segments named `cvs/`.
 * Prefer `/api/college/students/:id/student-cv-list`.
 * next.config rewrites `/api/college/students/:id/cvs` → student-cv-list.
 */
export { GET, dynamic, revalidate } from '../student-cv-list/route';
