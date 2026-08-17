'use client';

import { useEffect, useMemo, useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  buildAdminPlacementListingEmailBody,
  buildAdminPlacementListingEmailSubject,
  normalizeEmailRecipients,
  openAdminPlacementListingEmail,
} from '@/lib/adminPlacementListingEmail';
import { publicJobPostUrl, publicJobQuestionsUrl } from '@/lib/opportunityPublicLinks';

export default function AdminPlacementListingEmailComposeModal({
  rows = [],
  defaultTo = '',
  onClose,
}) {
  const { addToast } = useToast();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const list = useMemo(() => (rows || []).filter(Boolean), [rows]);

  const initialSubject = useMemo(() => buildAdminPlacementListingEmailSubject(list), [list]);
  const initialBody = useMemo(
    () => buildAdminPlacementListingEmailBody(list, { origin }),
    [list, origin],
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

  const singlePosting = list.length === 1 && list[0]?.source === 'posting' && list[0]?.id;

  const openMailClient = () => {
    const recipients = normalizeEmailRecipients(to);
    if (!recipients) {
      addToast('Enter at least one recipient email.', 'warning');
      return;
    }
    openAdminPlacementListingEmail(list, {
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
      const res = await fetch('/api/admin/placement-listings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipients,
          subject: subject.trim() || initialSubject,
          body: body.trim() || initialBody,
          listingKeys: list.map((row) => `${row.source}:${row.id}`).filter(Boolean),
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

  const hasRecipients = Boolean(normalizeEmailRecipients(to));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="max-h-[92vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Email {list.length === 1 ? 'this listing' : `${list.length} listings`}
          </DialogTitle>
          <DialogDescription>Compose a message and send it from PlacementHub or your email app.</DialogDescription>
        </DialogHeader>

        <FieldGroup className="max-h-[62vh] overflow-y-auto pr-1">
          <Field>
            <FieldLabel htmlFor="admin-listing-email-to">
              To
            </FieldLabel>
            <Input
              id="admin-listing-email-to"
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="you@example.com, colleague@example.com"
              autoComplete="email"
            />
            <FieldDescription>
              Defaults to your account email. Separate multiple recipients with commas.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="admin-listing-email-subject">
              Subject
            </FieldLabel>
            <Input
              id="admin-listing-email-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </Field>

          {singlePosting ? (
            <div className="bg-muted rounded-lg border p-3 text-xs">
              <div className="mb-1 font-semibold">Public links included in message</div>
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

          <Field>
            <FieldLabel htmlFor="admin-listing-email-body">
              Message
            </FieldLabel>
            <Textarea
              id="admin-listing-email-body"
              rows={12}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-52 leading-relaxed"
            />
          </Field>
        </FieldGroup>

        <DialogFooter className="flex-wrap sm:justify-between">
          <Button type="button" variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!hasRecipients || sending}
              onClick={openMailClient}
            >
              <Mail data-icon="inline-start" aria-hidden />
              Open in email app
            </Button>
            <Button
              type="button"
              disabled={!hasRecipients || sending}
              onClick={() => void sendFromSystem()}
            >
              <Send data-icon="inline-start" aria-hidden />
              {sending ? 'Sending…' : 'Send email'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
