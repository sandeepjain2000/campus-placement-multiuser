'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { stopAdminImpersonation } from '@/lib/adminImpersonationClient';

/**
 * Sticky notice while Super Admin is proxy-logged into a tenant account.
 * @param {{ tenantName?: string | null, email?: string | null }} props
 */
export default function ImpersonationBanner({ tenantName, email }) {
  const [exiting, setExiting] = useState(false);
  const [error, setError] = useState('');

  const who = [tenantName, email].filter(Boolean).join(' · ') || 'another account';

  const onExit = async () => {
    setError('');
    setExiting(true);
    const result = await stopAdminImpersonation();
    if (!result.ok) {
      setError(result.error || 'Exit failed');
      setExiting(false);
    }
  };

  return (
    <Alert className="mb-4 border-amber-500/40 bg-amber-500/10" data-testid="impersonation-banner">
      <AlertTitle>Working as {who}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>Actions are audited under your Super Admin account. Exit when finished.</span>
        <div className="flex flex-wrap items-center gap-2">
          {error ? <span className="text-destructive text-sm">{error}</span> : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={exiting}
            onClick={() => void onExit()}
            data-testid="impersonation-exit"
          >
            <LogOut data-icon="inline-start" aria-hidden />
            {exiting ? 'Exiting…' : 'Exit to Super Admin'}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
