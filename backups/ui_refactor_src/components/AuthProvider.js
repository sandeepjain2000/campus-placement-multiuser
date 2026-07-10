'use client';
import { SessionProvider } from 'next-auth/react';
import { SWRConfig } from 'swr';

export default function AuthProvider({ children }) {
  return (
    <SessionProvider>
      <SWRConfig
        value={{
          revalidateOnFocus: true,
          revalidateOnReconnect: true,
        }}
      >
        {children}
      </SWRConfig>
    </SessionProvider>
  );
}
