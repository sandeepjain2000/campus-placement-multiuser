/** Next.js route segment config for placement list/detail APIs (avoid stale UI after purge).
 *  Route files must use literal exports — Next.js cannot parse re-exported values:
 *    export const dynamic = 'force-dynamic';
 *    export const revalidate = 0;
 */
export const placementReadRoute = {
  dynamic: 'force-dynamic',
  revalidate: 0,
};

/** API prefixes that must never serve cached placement data. */
export const PLACEMENT_API_PREFIXES = [
  '/api/student',
  '/api/employer',
  '/api/college',
  '/api/admin',
  '/api/demo',
  '/api/notifications',
  '/api/user/data-export',
  '/api/hiring-assessment',
];

export function isPlacementApiPath(pathname) {
  return PLACEMENT_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
