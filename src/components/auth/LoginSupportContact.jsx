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
} from 'lucide-react';
import { validateEmail } from '@/lib/validators';
import { PLATFORM_SETTINGS_DEFAULTS } from '@/lib/platformSettingsDefaults';
import { buildPublicSupportConfig } from '@/lib/supportContact';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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

  return (
    <>
      <Card className="mt-5 gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle>Contact support</CardTitle>
          <CardDescription>
          Sandbox demo: call, send a typed message to{' '}
          <strong className="font-mono text-xs">{config.notificationInboxEmail}</strong>, or
          use demo chat.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-5">

        <div className="flex w-full flex-wrap items-center gap-2">
          {config.supportPhone ? (
            <Button
              variant="outline"
              size="sm"
              className="w-fit max-w-full shrink-0 justify-start"
              render={<a href={tel || undefined} title={`Call ${config.supportPhone}`} />}
              nativeButton={false}
            >
              <Phone data-icon="inline-start" />
              <span className="truncate">Phone {config.supportPhone}</span>
            </Button>
          ) : null}

          <Button
            type="button"
            variant={emailOpen ? 'default' : 'outline'}
            size="sm"
            className="w-fit shrink-0"
            onClick={() => setEmailOpen((v) => !v)}
            aria-expanded={emailOpen}
            title="Send email to inbox"
          >
            <Mail data-icon="inline-start" />
            Email
            {emailOpen ? <ChevronUp data-icon="inline-end" /> : <ChevronDown data-icon="inline-end" />}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit shrink-0"
            onClick={() => setChatOpen(true)}
            title="Demo support chat"
          >
            <MessageCircle data-icon="inline-start" />
            Chat
          </Button>
        </div>

        {emailOpen ? (
          <form
            onSubmit={sendSupportEmail}
            className="mt-1 flex flex-col gap-3 rounded-lg border bg-muted/30 p-4"
          >
              <p className="m-0 text-xs leading-relaxed text-muted-foreground">
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
            <Field>
              <FieldLabel htmlFor="support-reply-email" className="text-xs">
                Your email
              </FieldLabel>
              <Input
                id="support-reply-email"
                type="email"
                placeholder="you@college.edu"
                value={replyEmail}
                onChange={(e) => setReplyEmail(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="support-subject" className="text-xs">
                Subject
              </FieldLabel>
              <Input
                id="support-subject"
                placeholder="Cannot sign in"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="support-message" className="text-xs">
                Message
              </FieldLabel>
              <Textarea
                id="support-message"
                rows={4}
                placeholder="Describe your issue…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </Field>
            {error ? (
              <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
            ) : null}
            {feedback ? (
              <Alert><AlertDescription>{feedback}</AlertDescription></Alert>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={sending}>
                <Send data-icon="inline-start" />
                {sending ? 'Sending…' : 'Send message'}
              </Button>
              {hideExternalInboxLinks ? null : (
                <Button
                  size="sm"
                  variant="ghost"
                  render={<a href={config.yopmailWebmailUrl} target="_blank" rel="noopener noreferrer" />}
                  nativeButton={false}
                >
                  <ExternalLink data-icon="inline-start" />
                  Open YOPmail inbox
                </Button>
              )}
            </div>
          </form>
        ) : null}
        </CardContent>
      </Card>

      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="flex max-h-[70vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
            <DialogHeader className="border-b px-5 py-4">
              <DialogTitle id="login-support-chat-title">Demo support chat</DialogTitle>
              <DialogDescription>Simulated replies — use email form for delivery to YOPmail</DialogDescription>
            </DialogHeader>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 py-4">
              {chatLines.map((line, i) => (
                <div
                  key={`${line.role}-${i}`}
                  className={
                    line.role === 'user'
                      ? 'max-w-[88%] self-end rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground'
                      : 'max-w-[88%] self-start rounded-lg border bg-muted px-3 py-2 text-sm'
                  }
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
            >
              <DialogFooter className="flex-row border-t px-5 py-4">
              <Input
                placeholder="Type a message…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                autoComplete="off"
                className="flex-1"
              />
              <Button type="submit" size="sm">
                Send
              </Button>
              </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
