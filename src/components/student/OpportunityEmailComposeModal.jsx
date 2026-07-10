'use client';

import { useEffect, useMemo, useState } from 'react';
import { Mail, Send, X } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import {
  buildOpportunityEmailBody,
  buildOpportunityEmailSubject,
  normalizeEmailRecipients,
  openOpportunityEmail,
} from '@/lib/studentOpportunityEmail';
import {
  publicJobPostUrl,
  publicJobQuestionsUrl,
} from '@/lib/opportunityPublicLinks';

/**
 * Compose job/internship share email before opening the mail client.
 */
export default function OpportunityEmailComposeModal({
  rows = [],
  kind = 'job',
  defaultTo = '',
  onClose,
}) {
  const { addToast } = useToast();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const list = useMemo(() => (rows || []).filter(Boolean), [rows]);

  const initialSubject = useMemo(
    () => buildOpportunityEmailSubject(list, { kind }),
    [list, kind],
  );
  const initialBody = useMemo(
    () => buildOpportunityEmailBody(list, { kind, origin }),
    [list, kind, origin],
  );

  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setTo(defaultTo);
    setSubject(initialSubject);
    setBody(initialBody);
  }, [defaultTo, initialSubject, initialBody, list]);

  if (!list.length) return null;

  const openMailClient = () => {
    const recipients = normalizeEmailRecipients(to);
    if (!recipients) return;
    openOpportunityEmail(list, {
      kind,
      to: recipients,
      subject: subject.trim() || initialSubject,
      body: body.trim() || initialBody,
      origin,
    });
    onClose?.();
  };

  const sendFromSystem = async () => {
    const recipients = normalizeEmailRecipients(to);
    if (!recipients) {
      addToast('Enter at least one recipient email.', 'warning');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/student/opportunity-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          to: recipients,
          subject: subject.trim() || initialSubject,
          body: body.trim() || initialBody,
          jobIds: list.map((row) => row.id).filter(Boolean),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast(data.error || 'Could not send email', 'error');
        return;
      }
      addToast(`Email sent to ${(data.sentTo || []).join(', ')}`, 'success');
      onClose?.();
    } catch {
      addToast('Network error while sending email', 'error');
    } finally {
      setSending(false);
    }
  };

  const label = kind === 'job' ? 'job' : 'internship';
  const hasRecipients = Boolean(normalizeEmailRecipients(to));

  return (
    <div className="modal-overlay modal-overlay-solid" role="presentation" onClick={onClose}>
      <div
        className="modal modal-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="opportunity-email-compose-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="opportunity-email-compose-title" className="modal-title">
            Email {list.length === 1 ? `this ${label}` : `${list.length} ${label}s`}
          </h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div
          className="modal-body"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            maxHeight: 'min(62vh, 560px)',
            overflowY: 'auto',
          }}
        >
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="opportunity-email-to">
              To
            </label>
            <input
              id="opportunity-email-to"
              className="form-input"
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="you@college.edu, friend@example.com"
              autoComplete="email"
            />
            <p className="text-xs text-secondary" style={{ margin: '0.35rem 0 0' }}>
              Defaults to your account email. Add more recipients separated by commas.
            </p>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="opportunity-email-subject">
              Subject
            </label>
            <input
              id="opportunity-email-subject"
              className="form-input"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {list.length === 1 && list[0]?.id ? (
            <div
              style={{
                padding: '0.75rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-secondary)',
                fontSize: '0.8125rem',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Links included in message</div>
              <div style={{ wordBreak: 'break-all', lineHeight: 1.5 }}>
                <div>
                  <span className="text-secondary">Public job post: </span>
                  {publicJobPostUrl(list[0].id, origin)}
                </div>
                <div>
                  <span className="text-secondary">Post questions: </span>
                  {publicJobQuestionsUrl(list[0].id, origin)}
                </div>
              </div>
            </div>
          ) : null}

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="opportunity-email-body">
              Message
            </label>
            <textarea
              id="opportunity-email-body"
              className="form-input"
              rows={12}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ fontFamily: 'inherit', lineHeight: 1.5 }}
            />
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={sending}>
            Cancel
          </button>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginLeft: 'auto' }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!hasRecipients || sending}
              onClick={openMailClient}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Mail size={16} aria-hidden />
              Open in email app
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!hasRecipients || sending}
              onClick={() => void sendFromSystem()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Send size={16} aria-hidden />
              {sending ? 'Sending…' : 'Send email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
