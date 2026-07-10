'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Bell } from 'lucide-react';
import { getNotificationIconTitle } from '@/lib/appVersion';

const fetcher = (url) => fetch(url).then((r) => {
  if (!r.ok) throw new Error('Failed to load');
  return r.json();
});

function timeAgo(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function iconForType(type) {
  switch (type) {
    case 'drive':
      return '🎯';
    case 'offer':
      return '🏆';
    case 'application':
      return '🧑‍💻';
    case 'success':
      return '✅';
    case 'warning':
      return '⚠️';
    case 'error':
      return '⛔';
    default:
      return '📣';
  }
}

export default function NotificationDropdown() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const { data, error, isLoading, mutate } = useSWR('/api/notifications', fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 90000,
  });

  const unreadCount = data?.unreadCount ?? 0;
  const list = data?.notifications ?? [];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const markAllRead = useCallback(async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      mutate();
    } catch {
      /* ignore */
    }
  }, [mutate]);

  const markOneRead = useCallback(
    async (id) => {
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [id] }),
        });
        mutate();
      } catch {
        /* ignore */
      }
    },
    [mutate],
  );

  const title = getNotificationIconTitle();

  return (
    <div className="dropdown" style={{ position: 'relative' }} ref={wrapRef}>
      <style jsx>{`
        @keyframes notifFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .notif-stagger {
          animation: notifFadeIn 0.4s ease backwards;
        }
      `}</style>
      <button
        className="btn btn-ghost btn-icon notification-bell"
        onClick={() => setOpen((v) => !v)}
        type="button"
        title={title}
        aria-label={title}
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 ? <span className="notification-dot" aria-label={`${unreadCount} unread`} /> : null}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Notifications</h4>
            <button type="button" className="btn btn-ghost btn-sm" onClick={markAllRead} disabled={!unreadCount}>
              Mark all read
            </button>
          </div>
          <div className="notification-list">
            {isLoading && (
              <div className="notification-item" style={{ cursor: 'default' }}>
                <div className="text-sm text-secondary" style={{ padding: '0.5rem 0' }}>Loading…</div>
              </div>
            )}
            {error && (
              <div className="notification-item" style={{ cursor: 'default' }}>
                <div className="text-sm text-secondary">Could not load notifications.</div>
              </div>
            )}
            {!isLoading && !error && list.length === 0 && (
              <div className="notification-item" style={{ cursor: 'default' }}>
                <div className="text-sm text-secondary">No notifications yet.</div>
              </div>
            )}
            {list.map((n, i) => (
              <div
                key={n.id}
                className={`notification-item notif-stagger ${n.is_read ? '' : 'unread'}`}
                style={{ animationDelay: `${i * 0.08}s` }}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (!n.is_read) markOneRead(n.id);
                  if (n.link) {
                    setOpen(false);
                    router.push(n.link);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!n.is_read) markOneRead(n.id);
                    if (n.link) {
                      setOpen(false);
                      router.push(n.link);
                    }
                  }
                }}
              >
                <div className="notification-icon stats-card-icon green" style={{ width: 36, height: 36, fontSize: '0.875rem' }}>
                  {iconForType(n.type)}
                </div>
                <div className="notification-content">
                  <div className="notification-title">{n.title}</div>
                  <div className="notification-message">{n.message}</div>
                  <div className="notification-time">{timeAgo(n.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '0.65rem 1rem', borderTop: '1px solid var(--border-default)' }}>
            <Link href="/dashboard/alerts" className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={() => setOpen(false)}>
              Open alerts inbox
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
