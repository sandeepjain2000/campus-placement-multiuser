'use client';

import { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Send,
} from 'lucide-react';
import { validateEmail } from '@/lib/validators';
import { PLATFORM_SETTINGS_DEFAULTS } from '@/lib/platformSettingsDefaults';
import { buildPublicSupportConfig, PLACEMENTHUB_SUPPORT_GMAIL } from '@/lib/supportContact';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const DEFAULT_CONFIG = buildPublicSupportConfig(PLATFORM_SETTINGS_DEFAULTS);

function whatsAppHref(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : '';
}

export default function LoginSupportContact() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [emailOpen, setEmailOpen] = useState(false);
  const [replyEmail, setReplyEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

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
        setError(data.error || 'Could not send. Call or email support.');
        return;
      }
      setFeedback(data.message || 'Message sent.');
      setSubject('');
      setMessage('');
    } catch {
      setError('Network error. Try again, or call or email support.');
    } finally {
      setSending(false);
    }
  };

  const whatsApp = whatsAppHref(config.supportPhone);

  return (
    <>
      <Card className="mt-5 gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle>Contact support</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-5">

        <div className="flex w-full flex-wrap items-center gap-2">
          {config.supportPhone ? (
            <Button
              variant="outline"
              size="sm"
              className="w-fit max-w-full shrink-0 justify-start"
              render={<a href={whatsApp || undefined} target="_blank" rel="noopener noreferrer" title={`WhatsApp number ${config.supportPhone}`} />}
              nativeButton={false}
            >
              <Phone data-icon="inline-start" />
              <span className="truncate">WhatsApp number {config.supportPhone}</span>
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
        </div>

        {emailOpen ? (
          <form
            onSubmit={sendSupportEmail}
            className="mt-1 flex flex-col gap-3 rounded-lg border bg-muted/30 p-4"
          >
              <p className="m-0 text-xs leading-relaxed text-muted-foreground">
                Sends a message to{' '}
                {config.supportEmail
                  && config.supportEmail.toLowerCase() !== PLACEMENTHUB_SUPPORT_GMAIL.toLowerCase() ? (
                    <>
                      <strong>{config.supportEmail}</strong>
                      {' and '}
                    </>
                  ) : null}
                <strong>{PLACEMENTHUB_SUPPORT_GMAIL}</strong>.
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
            </div>
          </form>
        ) : null}
        </CardContent>
      </Card>
    </>
  );
}
