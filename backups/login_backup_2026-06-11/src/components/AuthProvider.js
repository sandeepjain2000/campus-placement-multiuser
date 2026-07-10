'use client';
import { SessionProvider } from 'next-auth/react';
import { SWRConfig } from 'swr';
import SessionLifetimeGuard from '@/components/SessionLifetimeGuard';

export default function AuthProvider({ children }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <SessionLifetimeGuard>
        <SWRConfig
          value={{
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
          }}
        >
          {children}
        </SWRConfig>
      </SessionLifetimeGuard>
    </SessionProvider>
  );
}
