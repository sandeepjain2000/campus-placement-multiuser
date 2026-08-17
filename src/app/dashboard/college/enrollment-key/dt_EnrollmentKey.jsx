'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { fetchJson } from '@/lib/fetchJson';
import { Copy, KeyRound, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CollegeEnrollmentKeyPage() {
  const { addToast } = useToast();
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let m = true;
    (async () => {
      setLoading(true);
      try {
        const json = await fetchJson('/api/college/enrollment-ledger', { credentials: 'same-origin' });
        if (m) setKey(json.enrollmentKey || '');
      } catch (e) {
        if (m) addToast(e.message || 'Failed', 'error');
      } finally {
        if (m) setLoading(false);
      }
    })();
    return () => {
      m = false;
    };
  }, [addToast]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(key);
      addToast('Copied to clipboard', 'success');
    } catch {
      addToast('Could not copy', 'error');
    }
  };

  return (
    <div className="animate-fadeIn flex max-w-3xl flex-col gap-6 pb-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <KeyRound className="text-muted-foreground size-7" strokeWidth={1.5} />
            Student enrollment key
          </h1>
          <p className="text-muted-foreground m-0 text-sm">
            Share this key through official channels so students can link their account to your campus.
          </p>
        </div>
        <Button render={<Link href="/dashboard/college/students" />} variant="outline">
          <Users data-icon="inline-start" />
          Students
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campus key</CardTitle>
          <CardDescription>Students enter this value during account registration.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
        {loading ? (
          <div className="skeleton h-12 w-full rounded-md" />
        ) : key ? (
          <>
            <div className="bg-muted border-border break-all rounded-md border px-4 py-3 font-mono text-sm">
              {key}
            </div>
            <Button type="button" className="w-fit" onClick={copy}>
              <Copy data-icon="inline-start" />
              Copy key
            </Button>
          </>
        ) : (
          <p className="text-muted-foreground m-0 text-sm">No key is available for this campus.</p>
        )}
        </CardContent>
      </Card>
    </div>
  );
}
