'use client';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { getInitials, timeAgo } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';

const fetcher = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load notifications');
  return data;
};

export default function AlertsEmailPage() {
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/notifications', fetcher);
  const emails = useMemo(
    () =>
      Array.isArray(data?.notifications)
        ? data.notifications.map((n) => ({
            id: n.id,
            sender: n.type ? `System ${n.type}` : 'Placement Portal',
            subject: n.title || 'Notification',
            snippet: n.message || '',
            time: timeAgo(n.created_at),
            read: Boolean(n.is_read),
          }))
        : [],
    [data],
  );
  const [openEmailId, setOpenEmailId] = useState(null);
  const [mailbox, setMailbox] = useState('inbox');

  const showNotReady = (label) => {
    addToast(`${label} is not available yet in this build.`, 'info');
  };

  const handleOpen = async (id) => {
    setOpenEmailId(openEmailId === id ? null : id);
    const row = emails.find((e) => e.id === id);
    if (row?.read) return;
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      if (res.ok) {
        mutate();
      }
    } catch {
      // Keep drawer behavior even if marking as read fails.
    }
  };

  if (isLoading) {
    return <div className="skeleton skeleton-card" style={{ height: 240, margin: '2rem' }} />;
  }

  if (error) {
    return (
      <div className="animate-fadeIn" style={{ padding: '2rem', color: 'var(--danger-600)' }}>
        <p>{error.message || 'Could not load inbox alerts.'}</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <div className="page-header-left">
          <h1>📨 Inbox & Alerts</h1>
          <p>System notifications, event coordination, and alerts.</p>
        </div>
        <button className="btn btn-primary" onClick={() => showNotReady('Compose alert')}>Compose Alert</button>
      </div>

      <div className="card" style={{ flex: 1, padding: 0, display: 'flex', overflow: 'hidden' }}>
        
        {/* Left Sidebar Menu */}
        <div style={{ width: '250px', borderRight: '1px solid var(--border)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-secondary)' }}>
          <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', background: mailbox === 'inbox' ? 'var(--primary-100)' : undefined, color: mailbox === 'inbox' ? 'var(--primary-700)' : 'var(--text-secondary)', fontWeight: mailbox === 'inbox' ? 600 : 400 }} onClick={() => setMailbox('inbox')}>
            📥 Inbox <span className="badge badge-accent" style={{ marginLeft: 'auto' }}>{Number(data?.unreadCount || 0)}</span>
          </button>
          <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', color: 'var(--text-secondary)' }} onClick={() => { setMailbox('starred'); showNotReady('Starred'); }}>
            ⭐ Starred
          </button>
          <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', color: 'var(--text-secondary)' }} onClick={() => { setMailbox('sent'); showNotReady('Sent mailbox'); }}>
            📤 Sent
          </button>
          <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', color: 'var(--text-secondary)' }} onClick={() => { setMailbox('trash'); showNotReady('Trash'); }}>
            🗑️ Trash
          </button>
        </div>

        {/* Center Inbox List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {emails.map(email => (
            <div key={email.id} style={{ borderBottom: '1px solid var(--border)' }}>
              
              <div 
                className="hover-bg-secondary"
                onClick={() => handleOpen(email.id)}
                style={{ 
                  display: 'flex', alignItems: 'center', padding: '1rem 1.5rem', cursor: 'pointer',
                  background: !email.read ? 'white' : 'var(--bg-secondary)',
                  fontWeight: !email.read ? 700 : 400
                }}
              >
                <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
                  <input type="checkbox" onClick={e => e.stopPropagation()} />
                </div>
                <div style={{ width: '40px', display: 'flex', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                  ⭐
                </div>
                <div style={{ flex: '0 0 200px', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {email.sender}
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{email.subject}</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {email.snippet}
                  </span>
                </div>
                <div style={{ flex: '0 0 80px', textAlign: 'right', fontSize: '0.8rem', color: !email.read ? 'var(--primary-600)' : 'var(--text-secondary)' }}>
                  {email.time}
                </div>
              </div>

              {/* Email Expansion Area */}
              {openEmailId === email.id && (
                <div style={{ padding: '2rem 4rem', background: 'var(--card-bg)', borderBottom: '2px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{email.subject}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => showNotReady('Reply')}>Reply</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => showNotReady('Forward')}>Forward</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="avatar">{getInitials(email.sender)}</div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{email.sender} <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>&lt;alerts@placementhub.edu&gt;</span></div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>to me, ccf-admin</div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>{email.time}</div>
                  </div>
                  <div style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                    {email.snippet}{'\n\n'}
                    Log into your dashboard to take action on this alert.
                    {'\n\n'}
                    -- {'\n'}
                    PlacementHub Auto-Mailer
                  </div>
                </div>
              )}

            </div>
          ))}
          {emails.length === 0 && (
            <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>
              No alerts yet.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
