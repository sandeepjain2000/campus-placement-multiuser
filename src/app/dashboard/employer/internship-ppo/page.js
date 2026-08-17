'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Award } from 'lucide-react';
import PageLoading from '@/components/PageLoading';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { SORT_DATE_ASC, SORT_DATE_DESC } from '@/lib/dataTableQuery';
import { useToast } from '@/components/ToastProvider';
import { employerPpoStatusLabel } from '@/lib/internshipPpo';
import { templateMatchesEventTab } from '@/lib/offerEventType';
import { formatDate, formatStatus } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import { StatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';

const PPO_SORT_OPTIONS = [
  {
    value: 'name_asc',
    label: 'Student (A → Z)',
    compare: (a, b) =>
      String(a?.studentName ?? '').localeCompare(String(b?.studentName ?? ''), undefined, {
        sensitivity: 'base',
      }),
  },
  {
    value: 'name_desc',
    label: 'Student (Z → A)',
    compare: (a, b) =>
      String(b?.studentName ?? '').localeCompare(String(a?.studentName ?? ''), undefined, {
        sensitivity: 'base',
      }),
  },
  SORT_DATE_DESC,
  SORT_DATE_ASC,
];

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load');
  return json;
};

export default function EmployerInternshipPpoPage() {
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/employer/internship-ppo', fetcher);
  const { data: templatesData } = useSWR('/api/employer/offer-templates', fetcher);
  const [busyId, setBusyId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [generatingId, setGeneratingId] = useState(null);
  const [employerNotes, setEmployerNotes] = useState('');
  const [templateId, setTemplateId] = useState('');

  const items = Array.isArray(data?.items) ? data.items : [];
  const summary = data?.summary || { total: 0, withPpo: 0, awaitingStudent: 0, accepted: 0, jobOfferIssued: 0 };
  const templates = (templatesData?.templates || templatesData?.items || [])
    .filter((t) => t.is_active !== false)
    .filter((t) => templateMatchesEventTab(t, 'internship'));

  const {
    search,
    setSearch,
    sort,
    setSort,
    filtered,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(items, {
    getSearchText: (r) =>
      [r.studentName, r.rollNumber, r.openingTitle, employerPpoStatusLabel(r.ppo?.status)].filter(Boolean).join(' '),
    sortOptions: PPO_SORT_OPTIONS,
    defaultSort: 'name_asc',
  });

  const postAction = async (programApplicationId, payload) => {
    setBusyId(programApplicationId);
    try {
      const res = await fetch('/api/employer/internship-ppo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programApplicationId, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Action failed');
      addToast(json.message || 'Saved.', 'success');
      setConfirmingId(null);
      setGeneratingId(null);
      setEmployerNotes('');
      setTemplateId('');
      await mutate();
    } catch (e) {
      addToast(e.message || 'Action failed', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const statLine = useMemo(
    () =>
      `${summary.withPpo} of ${summary.total} intern(s) with PPO activity · ${summary.awaitingStudent} awaiting student · ${summary.jobOfferIssued} job offer(s) issued`,
    [summary],
  );

  if (isLoading) return <PageLoading message="Loading interns…" variant="skeleton-card" />;

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Award size={26} aria-hidden />
            Internship PPO
          </h1>
          <p className="text-secondary" style={{ margin: '0.35rem 0 0', lineHeight: 1.55 }}>
            Pre-Placement Offer (PPO) is a <strong>full-time job offer after internship</strong> based on performance — not
            the internship selection offer (use <Link href="/dashboard/employer/offers">Offers → Internship</Link> for that).
            Confirm PPO per intern on or after the internship start date; after the student accepts, generate a PPO job offer
            from an offer template.
          </p>
          <p className="text-sm text-tertiary" style={{ margin: '0.35rem 0 0' }}>{statLine}</p>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive"><AlertTitle>Could not load interns</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>
      ) : null}

      {!templates.length ? (
        <Alert className="mb-4">
          <AlertDescription>
            Create at least one{' '}
            <Link href="/dashboard/employer/offer-templates">job offer template</Link> before generating formal offers
            after PPO acceptance.
          </AlertDescription>
        </Alert>
      ) : null}

      <DataTableToolbar
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
        sortOptions={PPO_SORT_OPTIONS}
        filteredCount={filteredCount}
        totalCount={totalCount}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filtered.map((row) => {
          const isBusy = busyId === row.programApplicationId;
          const isConfirming = confirmingId === row.programApplicationId;
          const isGenerating = generatingId === row.programApplicationId;
          const ppoStatus = row.ppo?.status;
          const statusLabel = employerPpoStatusLabel(ppoStatus);

          return (
            <Card key={row.programApplicationId}>
              <CardHeader className="flex-row justify-between gap-4">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  marginBottom: '0.75rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{row.studentName}</div>
                  <div className="text-sm text-secondary">{row.rollNumber || row.systemId}</div>
                  <div className="text-sm" style={{ marginTop: '0.35rem' }}>
                    {row.openingTitle}
                  </div>
                  {row.internshipStartDate ? (
                    <div className="text-xs text-tertiary" style={{ marginTop: '0.25rem' }}>
                      Internship start: {formatDate(row.internshipStartDate)}
                    </div>
                  ) : null}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <StatusBadge status={row.applicationStatus} showDot>
                    {formatStatus(row.applicationStatus) || 'Applied'}
                  </StatusBadge>
                  {row.ppo ? (
                    <StatusBadge status={ppoStatus} showDot>{statusLabel || '—'}</StatusBadge>
                  ) : (
                    <StatusBadge tone="gray" showDot>No PPO yet</StatusBadge>
                  )}
                </div>
              </div>
              </CardHeader>
              <CardContent>

              {row.ppoNotAvailableReason && !row.ppo ? (
                <p className="text-sm text-secondary" style={{ margin: '0 0 0.75rem' }}>
                  {row.ppoNotAvailableReason}
                </p>
              ) : null}

              {row.ppo?.employerNotes ? (
                <p className="text-sm" style={{ margin: '0 0 0.75rem', whiteSpace: 'pre-wrap' }}>
                  <strong>Your note:</strong> {row.ppo.employerNotes}
                </p>
              ) : null}

              {row.ppo?.offerId ? (
                <p className="text-sm text-secondary" style={{ margin: '0 0 0.75rem' }}>
                  Job offer issued — manage on{' '}
                  <Link href="/dashboard/employer/offers">Offers</Link>.
                </p>
              ) : null}

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {row.canConfirmPpo && !isConfirming ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => {
                      setConfirmingId(row.programApplicationId);
                      setGeneratingId(null);
                      setEmployerNotes(row.ppo?.employerNotes || '');
                    }}
                  >
                    Confirm PPO
                  </Button>
                ) : null}

                {row.canRevokePpo ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => {
                      if (!window.confirm('Revoke this PPO? You can confirm again later if allowed.')) return;
                      postAction(row.programApplicationId, { action: 'revoke' });
                    }}
                  >
                    Revoke PPO
                  </Button>
                ) : null}

                {row.canGenerateJobOffer && !isGenerating ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={isBusy || !templates.length}
                    onClick={() => {
                      setGeneratingId(row.programApplicationId);
                      setConfirmingId(null);
                      setTemplateId('');
                    }}
                  >
                    Generate job offer
                  </Button>
                ) : null}
              </div>

              {isConfirming ? (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <Field>
                  <FieldLabel htmlFor={`ppo-notes-${row.programApplicationId}`}>
                    Optional note to student
                  </FieldLabel>
                  <Textarea
                    id={`ppo-notes-${row.programApplicationId}`}
                    rows={3}
                    maxLength={2000}
                    value={employerNotes}
                    onChange={(e) => setEmployerNotes(e.target.value)}
                    placeholder="Context about the PPO (not the job offer letter)."
                  />
                  </Field>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isBusy}
                      onClick={() =>
                        postAction(row.programApplicationId, { action: 'confirm', employerNotes })
                      }
                    >
                      Confirm & notify student
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => {
                        setConfirmingId(null);
                        setEmployerNotes('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}

              {isGenerating ? (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <Field>
                  <FieldLabel htmlFor={`ppo-template-${row.programApplicationId}`}>
                    Job offer template
                  </FieldLabel>
                  <AdminFilterSelect
                    id={`ppo-template-${row.programApplicationId}`}
                    className="w-full"
                    value={templateId}
                    onValueChange={setTemplateId}
                    items={[
                      { label: 'Select template…', value: 'all' },
                      ...templates.map((t) => ({
                        label: `${t.name} — ${t.job_title} (₹${Number(t.salary || 0).toLocaleString('en-IN')})`,
                        value: t.id,
                      })),
                    ]}
                  />
                  <FieldDescription>
                    CTC and letter content come from the template you choose — not from the PPO step.
                  </FieldDescription>
                  </Field>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isBusy || !templateId}
                      onClick={() =>
                        postAction(row.programApplicationId, {
                          action: 'generate-offer',
                          templateId,
                        })
                      }
                    >
                      Generate offer
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => {
                        setGeneratingId(null);
                        setTemplateId('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
              </CardContent>
            </Card>
          );
        })}

        {!error && filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">
            No selected or in-progress interns yet.
          </CardContent></Card>
        ) : null}
      </div>
    </div>
  );
}
