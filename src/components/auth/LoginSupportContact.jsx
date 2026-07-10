'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Mail,
  MessageCircle,
  Phone,
  Send,
  X,
} from 'lucide-react';
import { validateEmail } from '@/lib/validators';
import { PLATFORM_SETTINGS_DEFAULTS } from '@/lib/platformSettingsDefaults';
import { buildPublicSupportConfig } from '@/lib/supportContact';

const DEFAULT_CONFIG = buildPublicSupportConfig(PLATFORM_SETTINGS_DEFAULTS);

function phoneTelHref(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : '';
}

const DUMMY_CHAT_REPLIES = [
  'Thanks for reaching out. This is a demo support chat — messages are not stored.',
  'For login or password issues, use **Send email** above. Your message goes to the YOPmail demo inbox.',
  'System notification emails also arrive at placementhub@yopmail.com — open YOPmail with that mailbox name.',
  'Need step-by-step help? Use **Help documentation** below demo accounts or the Help button (bottom-right).',
];

export default function LoginSupportContact({ hideExternalInboxLinks = false } = {}) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [emailOpen, setEmailOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [replyEmail, setReplyEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatLines, setChatLines] = useState([
    { role: 'bot', text: 'Hi — this is demo support chat. Ask anything about signing in or type a short message.' },
  ]);
  const chatEndRef = useRef(null);
  const replyIdx = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/site-config')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d) return;
        setConfig({
          supportEmail: d.supportEmail || DEFAULT_CONFIG.supportEmail,
          supportPhone: d.supportPhone || DEFAULT_CONFIG.supportPhone,
          notificationInboxEmail: d.notificationInboxEmail || DEFAULT_CONFIG.notificationInboxEmail,
          yopmailWebmailUrl: d.yopmailWebmailUrl || DEFAULT_CONFIG.yopmailWebmailUrl,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (chatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatLines, chatOpen]);

  const sendSupportEmail = async (e) => {
    e.preventDefault();
    setError('');
    setFeedback('');
    if (!validateEmail(replyEmail)) {
      setError('Enter your email address so we can identify your request.');
      return;
    }
    if (!subject.trim()) {
      setError('Add a short subject.');
      return;
    }
    if (message.trim().length < 10) {
      setError('Please write at least 10 characters in your message.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/public/support-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyEmail, subject: subject.trim(), message: message.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not send. Try YOPmail or call support.');
        return;
      }
      setFeedback(data.message || 'Message sent. Open YOPmail to view the demo inbox.');
      setSubject('');
      setMessage('');
    } catch {
      setError('Network error. Try again or open YOPmail directly.');
    } finally {
      setSending(false);
    }
  };

  const sendChatLine = useCallback(() => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');
    setChatLines((prev) => [...prev, { role: 'user', text }]);
    const botText = DUMMY_CHAT_REPLIES[replyIdx.current % DUMMY_CHAT_REPLIES.length];
    replyIdx.current += 1;
    window.setTimeout(() => {
      setChatLines((prev) => [...prev, { role: 'bot', text: botText.replace(/\*\*/g, '') }]);
    }, 500);
  }, [chatInput]);

  const tel = phoneTelHref(config.supportPhone);

  const actionBtnStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    flex: '1 1 0',
    minWidth: 0,
    padding: '0.55rem 0.5rem',
    fontWeight: 600,
    fontSize: '0.8125rem',
    textDecoration: 'none',
  };

  return (
    <>
      <div
        className="login-support-contact"
        style={{
          marginTop: '1.25rem',
          padding: '1rem 1.25rem',
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Contact support
        </p>
        <p style={{ margin: '0.35rem 0 0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Sandbox demo: call, send a typed message to{' '}
          <strong style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{config.notificationInboxEmail}</strong>, or
          use demo chat.
        </p>

        <div
          className="login-support-actions-row"
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'nowrap',
            gap: '0.5rem',
            width: '100%',
          }}
        >
          {config.supportPhone ? (
            <a
              href={tel || undefined}
              className="btn btn-secondary btn-sm"
              style={actionBtnStyle}
              title="Call support"
            >
              <Phone size={16} aria-hidden style={{ flexShrink: 0 }} />
              <span className="login-support-action-label login-support-phone-short">Phone</span>
              <span className="login-support-action-label login-support-phone-full">{config.supportPhone}</span>
            </a>
          ) : null}

          <button
            type="button"
            className={`btn btn-sm ${emailOpen ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setEmailOpen((v) => !v)}
            style={actionBtnStyle}
            aria-expanded={emailOpen}
            title="Send email to inbox"
          >
            <Mail size={16} aria-hidden style={{ flexShrink: 0 }} />
            <span className="login-support-action-label">Email</span>
            {emailOpen ? <ChevronUp size={14} style={{ flexShrink: 0 }} /> : <ChevronDown size={14} style={{ flexShrink: 0 }} />}
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setChatOpen(true)}
            style={actionBtnStyle}
            title="Demo support chat"
          >
            <MessageCircle size={16} aria-hidden style={{ flexShrink: 0 }} />
            <span className="login-support-action-label">Chat</span>
          </button>
        </div>

        {emailOpen ? (
          <form
            onSubmit={sendSupportEmail}
            style={{
              marginTop: '0.75rem',
              padding: '0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}
          >
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                Sends a real email to <strong>{config.notificationInboxEmail}</strong> (same inbox as drive alerts).
                {hideExternalInboxLinks ? (
                  <> After sending, check that inbox for a subject starting with <strong>[PlacementHub] Login support</strong>.</>
                ) : (
                  <>
                    {' '}
                    After sending, open{' '}
                    <a href={config.yopmailWebmailUrl} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>
                      YOPmail
                    </a>{' '}
                    and refresh — look for subject starting with <strong>[PlacementHub] Login support</strong>.
                  </>
                )}
              </p>
            <div>
              <label className="form-label" htmlFor="support-reply-email" style={{ fontSize: '0.75rem' }}>
                Your email
              </label>
              <input
                id="support-reply-email"
                type="email"
                className="form-input"
                placeholder="you@college.edu"
                value={replyEmail}
                onChange={(e) => setReplyEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="support-subject" style={{ fontSize: '0.75rem' }}>
                Subject
              </label>
              <input
                id="support-subject"
                className="form-input"
                placeholder="Cannot sign in"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="support-message" style={{ fontSize: '0.75rem' }}>
                Message
              </label>
              <textarea
                id="support-message"
                className="form-input"
                rows={4}
                placeholder="Describe your issue…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>
            {error ? (
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--danger-600)' }}>{error}</p>
            ) : null}
            {feedback ? (
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--success-700)' }}>{feedback}</p>
            ) : null}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={sending} style={{ display: 'inline-flex', gap: '0.35rem' }}>
                <Send size={14} aria-hidden />
                {sending ? 'Sending…' : 'Send message'}
              </button>
              {hideExternalInboxLinks ? null : (
                <a
                  href={config.yopmailWebmailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                  style={{ display: 'inline-flex', gap: '0.35rem' }}
                >
                  <ExternalLink size={14} aria-hidden />
                  Open YOPmail inbox
                </a>
              )}
            </div>
          </form>
        ) : null}
      </div>

      {chatOpen ? (
        <>
          <button
            type="button"
            aria-label="Close chat"
            onClick={() => setChatOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1300,
              background: 'rgba(15,23,42,0.35)',
              border: 'none',
              cursor: 'pointer',
            }}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-support-chat-title"
            style={{
              position: 'fixed',
              right: 0,
              bottom: 0,
              left: 0,
              maxHeight: 'min(420px, 70vh)',
              zIndex: 1301,
              background: 'var(--bg-primary)',
              borderTop: '1px solid var(--border-default)',
              boxShadow: '0 -8px 24px rgba(0,0,0,0.12)',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
            }}
          >
            <header
              style={{
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--border-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
              }}
            >
              <div>
                <h2 id="login-support-chat-title" style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                  Demo support chat
                </h2>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                  Simulated replies — use email form for delivery to YOPmail
                </p>
              </div>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setChatOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </header>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {chatLines.map((line, i) => (
                <div
                  key={`${line.role}-${i}`}
                  style={{
                    alignSelf: line.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '88%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8125rem',
                    lineHeight: 1.45,
                    background: line.role === 'user' ? 'var(--primary-600)' : 'var(--bg-secondary)',
                    color: line.role === 'user' ? '#fff' : 'var(--text-primary)',
                    border: line.role === 'user' ? 'none' : '1px solid var(--border-default)',
                  }}
                >
                  {line.text}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendChatLine();
              }}
              style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-default)', display: 'flex', gap: '0.5rem' }}
            >
              <input
                className="form-input"
                placeholder="Type a message…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                autoComplete="off"
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary btn-sm">
                Send
              </button>
            </form>
          </aside>
        </>
      ) : null}

      <style>{`
        .login-support-action-label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .login-support-phone-full {
          display: none;
        }
        @media (min-width: 520px) {
          .login-support-phone-short {
            display: none;
          }
          .login-support-phone-full {
            display: inline;
          }
        }
        @media (max-width: 380px) {
          .login-support-actions-row {
            flex-wrap: wrap !important;
          }
          .login-support-actions-row .btn {
            flex: 1 1 calc(33.333% - 0.35rem) !important;
            min-width: 5.5rem !important;
          }
        }
      `}</style>
    </>
  );
}
