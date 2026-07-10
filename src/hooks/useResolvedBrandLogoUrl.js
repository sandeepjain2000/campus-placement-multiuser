'use client';

import { useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { resolveBrandLogoUrl } from '@/lib/resolveBrandLogoUrl';

const settingsFetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load settings');
  return json;
};

/**
 * Fresh logo for dashboard chrome — loads employer/college profile when needed
 * and keeps the JWT session in sync after uploads.
 */
export function useResolvedBrandLogoUrl() {
  const { data: session, update: updateSession } = useSession();
  const role = session?.user?.role;

  const { data: collegeSettings, isLoading: collegeLoading } = useSWR(
    role === 'college_admin' ? '/api/college/settings' : null,
    settingsFetcher,
  );
  const { data: employerProfileData, isLoading: employerLoading } = useSWR(
    role === 'employer' ? '/api/employer/profile' : null,
    settingsFetcher,
  );

  const profileLoaded =
    role === 'employer' ? !employerLoading : role === 'college_admin' ? !collegeLoading : true;

  const logoUrl = useMemo(
    () =>
      resolveBrandLogoUrl({
        role,
        employerProfile: employerProfileData?.profile,
        collegeSettings,
        sessionUser: session?.user,
        profileLoaded,
      }),
    [role, employerProfileData?.profile, collegeSettings, session?.user, profileLoaded],
  );

  useEffect(() => {
    if (!role || role === 'super_admin' || !profileLoaded || !logoUrl) return;
    if (session?.user?.brandLogoUrl === logoUrl) return;
    updateSession({ brandLogoUrl: logoUrl });
  }, [role, profileLoaded, logoUrl, session?.user?.brandLogoUrl, updateSession]);

  return logoUrl;
}
