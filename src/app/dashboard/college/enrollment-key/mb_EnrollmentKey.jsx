'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import MobileHeader from '@/components/mobile/MobileHeader';
import { useToast } from '@/components/ToastProvider';
import { Key, Copy, Users, CheckCircle2 } from 'lucide-react';
import { fetchJson } from '@/lib/fetchJson';

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
          <Link href="/dashboard/college/students" className="btn btn-ghost btn-sm" style={{ padding: '0.4rem', color: 'var(--primary-600)' }}>
            <Users size={18} />
          </Link>
        }
      />
      
      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>
        
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem', textAlign: 'center', background: 'var(--banner-gradient)', color: 'white' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Key size={24} />
          </div>
          <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem', fontWeight: 800 }}>Student Key</h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
            Share this key with your students so they can link their accounts to your campus.
          </p>
        </div>

        {loading ? (
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="skeleton" style={{ height: 48, borderRadius: '8px' }} />
            <div className="skeleton" style={{ height: 40, borderRadius: '8px' }} />
          </div>
        ) : key ? (
          <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border-default)' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label className="text-xs text-secondary mb-1 block">Your Campus Key</label>
              <div 
                className="font-mono" 
                style={{ 
                  background: 'var(--surface-elevated)', 
                  padding: '1rem', 
                  borderRadius: '8px', 
                  fontSize: '1rem', 
                  textAlign: 'center',
                  fontWeight: 600,
                  wordBreak: 'break-all',
                  border: '1px dashed var(--primary-300)',
                  color: 'var(--primary-700)'
                }}
              >
                {key}
              </div>
            </div>
            
            <button type="button" className="btn btn-primary" onClick={copy} style={{ width: '100%', justifyContent: 'center' }}>
              <Copy size={16} style={{ marginRight: '0.5rem' }} /> Copy Key
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No key is available for this campus.</p>
          </div>
        )}

        <div className="card" style={{ padding: '1rem', background: 'var(--bg-secondary)', border: 'none', marginTop: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <CheckCircle2 size={16} style={{ color: 'var(--success-600)' }} />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>How it works</span>
          </div>
          <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <li>Copy the key above.</li>
            <li>Send it to your students (e.g., via email or WhatsApp).</li>
            <li>Students paste it during their account registration.</li>
            <li>Their profile gets linked to your campus automatically.</li>
          </ol>
        </div>

      </div>
    </>
  );
}
