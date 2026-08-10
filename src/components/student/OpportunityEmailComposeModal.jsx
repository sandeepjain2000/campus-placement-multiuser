'use client';

import { useEffect, useMemo, useState } from 'react';
import { Mail, Send } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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

  const open = list.length > 0;

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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !sending) onClose?.();
      }}
    >
      <DialogContent className="sm:max-w-lg gap-4" showCloseButton={!sending}>
        <DialogHeader>
          <DialogTitle id="opportunity-email-compose-title">
            Email {list.length === 1 ? `this ${label}` : `${list.length} ${label}s`}
          </DialogTitle>
          <DialogDescription>Compose before opening your mail client or sending from the system.</DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[min(62vh,28rem)] gap-4 overflow-y-auto pr-1">
          <Field className="gap-2">
            <FieldLabel htmlFor="opportunity-email-to">To</FieldLabel>
            <Input
              id="opportunity-email-to"
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="you@college.edu, friend@example.com"
              autoComplete="email"
            />
            <FieldDescription>Defaults to your account email. Add more recipients separated by commas.</FieldDescription>
          </Field>

          <Field className="gap-2">
            <FieldLabel htmlFor="opportunity-email-subject">Subject</FieldLabel>
            <Input
              id="opportunity-email-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </Field>

          {list.length === 1 && list[0]?.id ? (
            <div className="bg-muted/50 rounded-lg border px-3.5 py-3 text-sm">
              <div className="mb-1.5 font-semibold">Links included in message</div>
              <div className="break-all leading-relaxed">
                <div>
                  <span className="text-muted-foreground">Public job post: </span>
                  {publicJobPostUrl(list[0].id, origin)}
                </div>
                <div>
                  <span className="text-muted-foreground">Post questions: </span>
                  {publicJobQuestionsUrl(list[0].id, origin)}
                </div>
              </div>
            </div>
          ) : null}

          <Field className="gap-2">
            <FieldLabel htmlFor="opportunity-email-body">Message</FieldLabel>
            <Textarea
              id="opportunity-email-body"
              rows={12}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="leading-relaxed"
            />
          </Field>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="secondary" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={!hasRecipients || sending}
              onClick={openMailClient}
            >
              <Mail data-icon="inline-start" />
              Open in email app
            </Button>
            <Button
              type="button"
              disabled={!hasRecipients || sending}
              onClick={() => void sendFromSystem()}
            >
              <Send data-icon="inline-start" />
              {sending ? 'Sending…' : 'Send email'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
