'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { fetchJson } from '@/lib/fetchJson';

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
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      {/* Glassmorphic Hero */}
      <div style={{
        position: 'relative', background: 'var(--banner-gradient)',
        borderRadius: 'var(--radius-xl)', padding: '2.5rem', color: 'white', overflow: 'hidden',
        marginBottom: '2rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem'
      }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%)', borderRadius: '50%' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ color: '#ffffff', fontSize: '2.25rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>🔑 Student Enrollment Key</h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)', margin: 0, maxWidth: 500 }}>
            Share this key through official channels. Students paste it when creating a PlacementHub account to link to your campus.
          </p>
        </div>
        <Link href="/dashboard/college/students" className="btn" style={{ position: 'relative', zIndex: 1, background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}>
          Students →
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
