'use client';

import { useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { RotateCcw, Star, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { getInitials, timeAgo } from '@/lib/utils';
import AlertsInboxSkeleton from '@/components/AlertsInboxSkeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const fetcher = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load notifications');
  return data;
};

async function invalidateAllNotificationCaches(mutate, globalMutate) {
  await mutate();
  await globalMutate((k) => typeof k === 'string' && k.startsWith('/api/notifications'));
}

function StarToggleButton({ starred, onToggle }) {
  return (
    <button
      type="button"
      className={`alerts-star-btn${starred ? ' is-starred' : ''}`}
      aria-label={starred ? 'Remove star' : 'Star this alert'}
      title={starred ? 'Remove star' : 'Star this alert'}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      <Star size={20} strokeWidth={2} aria-hidden fill={starred ? 'currentColor' : 'none'} />
    </button>
  );
}

export default function AlertsEmailPage() {
  const { addToast } = useToast();
  const { mutate: globalMutate } = useSWRConfig();
  const [mailbox, setMailbox] = useState('inbox');
  const swrKey = `/api/notifications?mailbox=${encodeURIComponent(mailbox)}`;
  const { data, error, isLoading, mutate } = useSWR(swrKey, fetcher);
  const emails = useMemo(
    () =>
      Array.isArray(data?.notifications)
        ? data.notifications.map((n) => ({
            id: n.id,
            sender: n.type ? `System ${n.type}` : 'Placement Portal',
            subject: n.title || 'Notification',
            snippet: n.message || '',
            preview:
              String(n.message || '').length > 50
                ? `${String(n.message).slice(0, 50)}…`
                : String(n.message || ''),
            time: timeAgo(n.created_at),
            read: Boolean(n.is_read),
            starred: Boolean(n.is_starred),
          }))
        : [],
    [data],
  );
  const [openEmailId, setOpenEmailId] = useState(null);
  const [confirmTrashId, setConfirmTrashId] = useState(null);

  const requestMoveToTrash = (id) => {
    setConfirmTrashId(id);
  };

  const cancelMoveToTrash = () => {
    setConfirmTrashId(null);
  };

  const moveToTrash = async (id) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trashIds: [id] }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Could not move to trash');
      setOpenEmailId((cur) => (cur === id ? null : cur));
      setConfirmTrashId(null);
      addToast('Moved to Trash.', 'success');
      await invalidateAllNotificationCaches(mutate, globalMutate);
    } catch (e) {
      addToast(e.message || 'Could not move to trash.', 'warning');
    }
  };

  const restoreFromTrash = async (id) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restoreIds: [id] }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Could not restore');
      setOpenEmailId((cur) => (cur === id ? null : cur));
      addToast('Restored to Inbox.', 'success');
      await invalidateAllNotificationCaches(mutate, globalMutate);
    } catch (e) {
      addToast(e.message || 'Could not restore.', 'warning');
    }
  };

  const toggleStar = async (id, currentlyStarred) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentlyStarred ? { unstarIds: [id] } : { starIds: [id] }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Could not update star');
      addToast(currentlyStarred ? 'Removed from Starred.' : 'Added to Starred.', 'success');
      if (currentlyStarred && mailbox === 'starred') {
        setOpenEmailId((cur) => (cur === id ? null : cur));
      }
      await invalidateAllNotificationCaches(mutate, globalMutate);
    } catch (e) {
      addToast(e.message || 'Could not update star.', 'warning');
    }
  };

  const deleteForever = async (id) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Could not delete');
      setOpenEmailId((cur) => (cur === id ? null : cur));
      addToast('Alert deleted permanently.', 'success');
      await invalidateAllNotificationCaches(mutate, globalMutate);
    } catch (e) {
      addToast(e.message || 'Could not delete.', 'warning');
    }
  };

  const emptyTrash = async () => {
    if (!window.confirm('Permanently delete all alerts in Trash? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emptyTrash: true }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Could not empty trash');
      setOpenEmailId(null);
      addToast('Trash emptied.', 'success');
      await invalidateAllNotificationCaches(mutate, globalMutate);
    } catch (e) {
      addToast(e.message || 'Could not empty trash.', 'warning');
    }
  };

  const handleOpen = async (id) => {
    setOpenEmailId(openEmailId === id ? null : id);
    if (mailbox === 'trash') return;
    const row = emails.find((e) => e.id === id);
    if (row?.read) return;
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      if (res.ok) {
        await invalidateAllNotificationCaches(mutate, globalMutate);
      }
    } catch {
      // Keep drawer behavior even if marking as read fails.
    }
  };

  if (isLoading) {
    return <AlertsInboxSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-6"><AlertDescription>{error.message || 'Could not load inbox alerts.'}</AlertDescription></Alert>
    );
  }

  return (
    <div className="animate-fadeIn alerts-inbox-root flex flex-col gap-6 p-6">
      <header className="flex shrink-0 flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-medium text-muted-foreground">Notifications</p><h1 className="text-3xl font-bold tracking-tight">Inbox &amp; alerts</h1>
          <p className="mt-1 max-w-4xl text-sm text-muted-foreground">
            {mailbox === 'inbox' &&
              'System notifications and event alerts from your PlacementHub inbox. In demo environments, each alert is also copied to placementhub@yopmail.com for QA. Use the star button on each row to save important alerts.'}
            {mailbox === 'starred' && 'Alerts you marked with a star for quick access.'}
            {mailbox === 'trash' &&
              'Alerts in Trash are removed from your inbox. Restore or delete them permanently.'}
          </p></div>
        <div className="flex flex-wrap gap-2">
          {mailbox === 'trash' && emails.length > 0 ? (
            <Button type="button" variant="destructive" onClick={emptyTrash}>
              Empty trash
            </Button>
          ) : null}
        </div>
      </header>

      <Card className="alerts-inbox-card">
        <div className="alerts-inbox-nav">
          <Button
            type="button"
            variant={mailbox === 'inbox' ? 'secondary' : 'ghost'}
            className="justify-start"
            onClick={() => {
              setMailbox('inbox');
              setOpenEmailId(null);
            }}
          >
            📥 Inbox{' '}
            <Badge
              className="ml-auto"
              aria-label={`${Number(data?.unreadCount || 0)} unread`}
            >
              {Number(data?.unreadCount || 0)}
            </Badge>
          </Button>
          <Button
            type="button"
            variant={mailbox === 'starred' ? 'secondary' : 'ghost'}
            className="justify-start"
            onClick={() => {
              setMailbox('starred');
              setOpenEmailId(null);
            }}
          >
            <Star
              size={16}
              aria-hidden
              style={{ marginRight: '0.35rem', verticalAlign: 'text-bottom' }}
              fill={mailbox === 'starred' ? 'currentColor' : 'none'}
            />
            Starred
            <Badge
              variant="secondary"
              className="ml-1"
              aria-label={`${Number(data?.starredCount || 0)} starred`}
            >
              {Number(data?.starredCount || 0)}
            </Badge>
          </Button>

          <Button
            type="button"
            variant={mailbox === 'trash' ? 'secondary' : 'ghost'}
            className="justify-start"
            onClick={() => {
              setMailbox('trash');
              setOpenEmailId(null);
            }}
          >
            🗑️ Trash
          </Button>
        </div>

        <div className="alerts-inbox-list">
          <div className="alerts-inbox-list-summary">
            {mailbox === 'trash' ? (
              <span>
                <strong>{Number(data?.trashCount || 0)}</strong> total
              </span>
            ) : (
              <>
                <span>
                  <strong>
                    {mailbox === 'starred'
                      ? Number(data?.starredUnreadCount || 0)
                      : Number(data?.unreadCount || 0)}
                  </strong>{' '}
                  unread
                </span>
                <span aria-hidden style={{ color: 'var(--text-tertiary)' }}>
                  ·
                </span>
                <span>
                  <strong>
                    {mailbox === 'starred'
                      ? Number(data?.starredCount || 0)
                      : Number(data?.inboxCount || 0)}
                  </strong>{' '}
                  total
                </span>
              </>
            )}
          </div>
          <div className="alerts-inbox-list-inner">
          {emails.map((email) => (
            <div key={email.id} style={{ minWidth: 0, maxWidth: '100%' }}>
              <div
                className="alerts-inbox-row"
                data-unread={mailbox !== 'trash' && !email.read ? 'true' : 'false'}
                onClick={() => handleOpen(email.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpen(email.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="alerts-inbox-row-star">
                  <StarToggleButton
                    starred={email.starred}
                    onToggle={() => void toggleStar(email.id, email.starred)}
                  />
                </div>
                <div className="alerts-inbox-row-body">
                  <div className="alerts-inbox-row-sender">{email.sender}</div>
                  <div className="alerts-inbox-row-preview">
                    <strong>{email.subject}</strong>
                    <span className="alerts-inbox-row-snippet">{email.preview}</span>
                  </div>
                </div>
                <div className="alerts-inbox-row-actions">
                  {mailbox !== 'trash' ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Move to trash"
                      title="Move to trash"
                      onClick={(e) => {
                        e.stopPropagation();
                        requestMoveToTrash(email.id);
                      }}
                    >
                      <Trash2 size={18} strokeWidth={2} aria-hidden />
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Restore to inbox"
                        title="Restore to inbox"
                        onClick={(e) => {
                          e.stopPropagation();
                          restoreFromTrash(email.id);
                        }}
                      >
                        <RotateCcw size={18} strokeWidth={2} aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon-sm"
                        aria-label="Delete permanently"
                        title="Delete permanently"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Permanently delete this alert?')) deleteForever(email.id);
                        }}
                      >
                        <Trash2 size={18} strokeWidth={2} aria-hidden />
                      </Button>
                    </>
                  )}
                </div>
                <div className="alerts-inbox-row-time">{email.time}</div>
              </div>

              {confirmTrashId === email.id && mailbox !== 'trash' ? (
                <div
                  role="alert"
                  className="alerts-trash-confirm"
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    alignItems: 'center',
                    padding: '0.65rem 1rem',
                    margin: '0 0.5rem 0.35rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--danger-200, #fecaca)',
                    background: 'var(--danger-50, #fef2f2)',
                  }}
                >
                  <span className="text-sm" style={{ flex: '1 1 12rem', color: 'var(--danger-800, #991b1b)' }}>
                    Move this alert to Trash?
                  </span>
                  <Button type="button" variant="outline" size="sm" onClick={cancelMoveToTrash}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => void moveToTrash(email.id)}
                  >
                    Move to trash
                  </Button>
                </div>
              ) : null}

              {openEmailId === email.id && (
                <div className="alerts-inbox-detail">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{email.subject}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {mailbox !== 'trash' ? (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStar(email.id, email.starred)}
                          >
                            <Star
                              size={16}
                              aria-hidden
                              fill={email.starred ? 'currentColor' : 'none'}
                              style={{ marginRight: '0.35rem', verticalAlign: 'text-bottom' }}
                            />
                            {email.starred ? 'Unstar' : 'Star'}
                          </Button>
                          {confirmTrashId === email.id ? (
                            <div
                              role="alert"
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '0.5rem',
                                alignItems: 'center',
                                padding: '0.65rem 0.75rem',
                                marginBottom: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--danger-200, #fecaca)',
                                background: 'var(--danger-50, #fef2f2)',
                              }}
                            >
                              <span className="text-sm" style={{ flex: '1 1 12rem', color: 'var(--danger-800, #991b1b)' }}>
                                Move this alert to Trash?
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={cancelMoveToTrash}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => void moveToTrash(email.id)}
                              >
                                Move to trash
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => requestMoveToTrash(email.id)}
                            >
                              Move to trash
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          <Button type="button" variant="outline" size="sm" onClick={() => restoreFromTrash(email.id)}>
                            Restore to inbox
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (window.confirm('Permanently delete this alert?')) deleteForever(email.id);
                            }}
                          >
                            Delete permanently
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="avatar">{getInitials(email.sender)}</div>
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {email.sender}
                        {data?.notificationSenderEmail ? (
                          <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>
                            {' '}
                            &lt;{data.notificationSenderEmail}&gt;
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}> (in-app notification)</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>to me</div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>{email.time}</div>
                  </div>
                  <div style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                    {email.snippet}
                    {'\n\n'}
                    Log into your dashboard to take action on this alert.
                    {'\n\n'}
                    --{'\n'}
                    PlacementHub Auto-Mailer
                  </div>
                </div>
              )}
            </div>
          ))}
          {emails.length === 0 && (
            <div style={{ padding: '2rem', color: 'var(--text-secondary)', minWidth: '100%' }}>
              {mailbox === 'trash' && 'Trash is empty.'}
              {mailbox === 'starred' && 'No starred alerts yet. Star messages from your inbox to find them here.'}
              {mailbox === 'inbox' && 'No alerts yet.'}
            </div>
          )}
          </div>
        </div>
      </Card>
    </div>
  );
}
