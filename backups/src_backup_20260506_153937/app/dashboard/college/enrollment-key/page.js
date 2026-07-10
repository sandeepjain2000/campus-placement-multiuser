'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';

export default function CollegeEnrollmentKeyPage() {
  const { addToast } = useToast();
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let m = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/college/enrollment-ledger');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load');
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
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Student enrollment key</h1>
          <p>
            Share this value only through official channels. Students paste it when they create a PlacementHub account so
            they are linked to your campus.
          </p>
        </div>
        <Link href="/dashboard/college/students" className="btn btn-secondary btn-sm">
          Students
        </Link>
      </div>

      <div className="card" style={{ maxWidth: 640, padding: '1.25rem' }}>
        {loading ? (
          <div className="skeleton" style={{ height: 24, width: '80%' }} />
        ) : key ? (
          <>
            <div
              className="font-mono"
              style={{
                fontSize: '0.9rem',
                wordBreak: 'break-all',
                padding: '0.75rem 1rem',
                background: 'var(--surface-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                marginBottom: '1rem',
              }}
            >
              {key}
            </div>
            <button type="button" className="btn btn-primary" onClick={copy}>
              Copy key
            </button>
          </>
        ) : (
          <p className="text-secondary">No key is available for this campus.</p>
        )}
      </div>
    </div>
  );
}
