'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { formatDate } from '@/lib/utils';
import CompanyNameLink from '@/components/CompanyNameLink';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getJobTypeMeta, getCollegeStatusMeta, stipendLabel } from './internshipRowUtils';
import PostingEligibilitySection from '@/components/student/PostingEligibilitySection';
import { FileText, Image as ImageIcon, ExternalLink, Paperclip } from 'lucide-react';

function DetailField({ label, children }) {
  return (
    <div className="bg-muted/50 rounded-lg border px-3.5 py-3">
      <div className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">{label}</div>
      <div className="text-foreground text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function attachIcon(contentType) {
  if (contentType?.startsWith('image/')) return <ImageIcon className="size-4 shrink-0 text-violet-500" aria-hidden />;
  return <FileText className="size-4 shrink-0 text-red-500" aria-hidden />;
}

async function attachFetcher(url) {
  const res = await fetch(url, { cache: 'no-store', credentials: 'include' });
  if (res.status === 404) return { attachments: [] };
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function CollegeAttachmentsList({ jobId }) {
  const { data, isLoading, error } = useSWR(
    jobId ? `/api/student/projects/${jobId}/attachments` : null,
    attachFetcher,
    { revalidateOnFocus: false },
  );
  const attachments = Array.isArray(data?.attachments) ? data.attachments : [];

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading attachments…</p>;
  if (error) return <p className="text-muted-foreground text-sm">Could not load attachments.</p>;
  if (!attachments.length) return <p className="text-muted-foreground text-sm">No attachments uploaded for this posting.</p>;

  return (
    <ul className="flex flex-col gap-2">
      {attachments.map((a) => (
        <li key={a.id} className="bg-muted/40 flex items-center gap-3 rounded-lg border px-3 py-2.5">
          <span className="text-muted-foreground">{attachIcon(a.content_type)}</span>
          <div className="min-w-0 flex-1">
            <p className="text-foreground m-0 truncate text-sm font-medium">{a.original_filename}</p>
            <p className="text-muted-foreground m-0 text-xs">{formatFileSize(a.file_size_bytes)}</p>
          </div>
          <a
            href={`/api/s3/view?url=${encodeURIComponent(a.file_url)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 shrink-0"
            aria-label={`Open ${a.original_filename}`}
          >
            <ExternalLink className="size-4" />
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function InternshipDetailModal({ row, onClose, busy, onApprove, onReject }) {
  const [tab, setTab] = useState('info');
  if (!row) return null;

  const typeMeta = getJobTypeMeta(row.job_type);
  const campusMeta = getCollegeStatusMeta(row.college_status);
  const status = String(row.college_status || 'pending').toLowerCase();
  const canApprove = status === 'pending' || status === 'rejected';
  const canReject = status === 'pending';
  const isApproved = status === 'approved';

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="sm:max-w-xl gap-4" showCloseButton>
        <DialogHeader className="gap-3 pr-8">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={typeMeta.tone} showDot>{typeMeta.label}</StatusBadge>
            <StatusBadge tone={campusMeta.tone} showDot>{campusMeta.label}</StatusBadge>
            <Badge variant="outline">Employer published</Badge>
          </div>
          <div>
            <DialogTitle id="college-internship-detail-title" className="text-xl font-semibold">
              {row.title}
            </DialogTitle>
            <DialogDescription className="mt-1.5">
              <CompanyNameLink name={row.company_name} website={row.website} />
            </DialogDescription>
          </div>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="w-full gap-3">
          <TabsList variant="line" className="h-auto w-full justify-start gap-1 bg-transparent p-0">
            <TabsTrigger value="info" className="px-3 py-1.5 text-sm data-active:shadow-none">
              Info
            </TabsTrigger>
            <TabsTrigger value="attachments" className="flex items-center gap-1.5 px-3 py-1.5 text-sm data-active:shadow-none">
              <Paperclip className="size-3.5" />
              Attachments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-0 outline-none">
            <div className="grid max-h-[min(55vh,26rem)] gap-3 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <DetailField label="Stipend">{stipendLabel(row.salary_min, row.salary_max)}</DetailField>
                <DetailField label="Min CGPA">{row.min_cgpa != null ? Number(row.min_cgpa) : '—'}</DetailField>
                <DetailField label="Openings">{row.vacancies ?? '—'}</DetailField>
                <DetailField label="Posted">{row.created_at ? formatDate(row.created_at) : '—'}</DetailField>
                <DetailField label="Campus approval">
                  {campusMeta.label}
                  {row.college_approved_at ? ` · ${formatDate(row.college_approved_at)}` : ''}
                </DetailField>
                {row.rejection_reason ? <DetailField label="Rejection note">{row.rejection_reason}</DetailField> : null}
              </div>

              <PostingEligibilitySection
                opportunity={{
                  minCgpa: row.min_cgpa != null ? Number(row.min_cgpa) : null,
                  status: 'published',
                }}
                audience="college"
              />

              <DetailField label="Description">{row.description?.trim() ? row.description : '—'}</DetailField>

              {row.skills_required?.length ? (
                <DetailField label="Skills">
                  <div className="flex flex-wrap gap-1.5">
                    {row.skills_required.filter(Boolean).map((s) => (
                      <StatusBadge key={s} tone="gray">{s}</StatusBadge>
                    ))}
                  </div>
                </DetailField>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="attachments" className="mt-0 outline-none">
            <div className="max-h-[min(55vh,26rem)] overflow-y-auto pr-1">
              {isApproved
                ? <CollegeAttachmentsList jobId={row.id} />
                : <p className="text-muted-foreground text-sm">Attachments are visible after the listing is approved.</p>
              }
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:justify-between">
          <p className="text-muted-foreground m-0 flex-1 text-left text-sm">
            {canApprove || canReject
              ? status === 'pending'
                ? 'Students cannot apply until you approve this listing for your campus.'
                : 'This listing was rejected. Approve it to make it visible to students.'
              : 'This listing is already approved and visible to students on your campus.'}
          </p>
          <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
            {canReject ? (
              <Button type="button" variant="outline" size="sm" disabled={busy}
                onClick={() => onReject?.(row.id)}
                className="border-destructive/30 text-destructive hover:bg-destructive/10">
                Reject
              </Button>
            ) : null}
            {canApprove ? (
              <Button type="button" size="sm" disabled={busy} onClick={() => onApprove?.(row.id)}>
                {busy ? 'Approving…' : 'Approve for campus'}
              </Button>
            ) : null}
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
