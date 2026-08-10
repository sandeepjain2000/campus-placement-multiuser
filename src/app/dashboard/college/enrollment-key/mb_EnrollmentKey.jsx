'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import MobileHeader from '@/components/mobile/MobileHeader';
import { useToast } from '@/components/ToastProvider';
import { Copy, Users, CheckCircle2 } from 'lucide-react';
import { fetchJson } from '@/lib/fetchJson';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function mb_EnrollmentKey() {
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
    return () => { m = false; };
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
    <>
      <MobileHeader 
        title="Enrollment Key" 
        action={
          <Button render={<Link href="/dashboard/college/students" />} variant="ghost" size="icon-sm" aria-label="View students">
            <Users />
          </Button>
        }
      />
      
      <div className="animate-fadeIn flex flex-col gap-4 px-4 pt-4 pb-20">
        {loading ? (
          <Card><CardContent className="flex flex-col gap-3 py-6"><div className="skeleton h-12 rounded-md" /><div className="skeleton h-9 rounded-md" /></CardContent></Card>
        ) : key ? (
          <Card>
            <CardHeader>
              <CardTitle>Your campus key</CardTitle>
              <CardDescription>Students enter this value during registration.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="bg-muted border-border break-all rounded-md border px-4 py-3 text-center font-mono text-sm font-semibold">
                {key}
              </div>
              <Button type="button" onClick={copy}>
                <Copy data-icon="inline-start" /> Copy key
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card><CardContent className="text-muted-foreground py-10 text-center text-sm">No key is available for this campus.</CardContent></Card>
        )}

        <Card className="bg-muted/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm"><CheckCircle2 className="text-primary size-4" />How it works</CardTitle>
          </CardHeader>
          <CardContent>
          <ol className="text-muted-foreground m-0 list-decimal space-y-1 pl-5 text-xs leading-5">
            <li>Copy the key above.</li>
            <li>Send it to your students (e.g., via email or WhatsApp).</li>
            <li>Students paste it during their account registration.</li>
            <li>Their profile gets linked to your campus automatically.</li>
          </ol>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
