'use client';

import Link from 'next/link';
import useSWR from 'swr';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { Users, ClipboardList } from 'lucide-react';
import { downloadCollegeOffersTemplate } from '@/lib/collegeOffersCsvTemplate';
import { COLLEGE_OFFERS_ALL_STUDENTS_CSV_FILENAME } from '@/lib/offersAssessmentStarterCsv';
import { downloadCsvFromApi } from '@/lib/downloadCsvFromApi';
import { formatCurrency, formatDate, formatStatus, getStatusColor } from '@/lib/utils';
import { swrFetcher } from '@/lib/fetchJson';
import { MAX_CSV_UPLOAD_BYTES, PLATFORM_SETTINGS_DEFAULTS } from '@/lib/platformSettingsDefaults';

const MAX_CSV_BYTES = MAX_CSV_UPLOAD_BYTES;

export function summarizeCsvErrors(errors) {
  const list = Array.isArray(errors) ? errors : [];
  if (!list.length) return '';
  const groups = new Map();
  for (const e of list) {
    const msg = String(e?.message || 'Unknown error').trim();
    const line = Number(e?.line || 0);
    if (!groups.has(msg)) groups.set(msg, []);
    groups.get(msg).push(line);
  }
  const top = [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3)
    .map(([msg, lines]) => {
      const preview = lines.slice(0, 3).filter((n) => Number.isFinite(n) && n > 0).join(', ');
      return `${msg} (${lines.length} row${lines.length > 1 ? 's' : ''}${preview ? `, lines: ${preview}` : ''})`;
    });
  return top.join(' | ');
}

export function useCollegeOffersUploadActions({ addToast, onUploadSuccess }) {
  const downloadAssessmentStarter = async () => {
    try {
      await downloadCsvFromApi('/api/college/offers/assessment-starter', COLLEGE_OFFERS_ALL_STUDENTS_CSV_FILENAME);
      addToast('Template lists every student on your master list.', 'success');
    } catch (e) {
      addToast(e.message || 'Download failed', 'error');
    }
  };

  const onUploadCsv = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const lowerName = String(file.name || '').toLowerCase();
    if (!lowerName.endsWith('.csv')) {
      addToast('Please upload a .csv file.', 'warning');
      return;
    }
    if (file.size > MAX_CSV_BYTES) {
      addToast(`CSV must be ${PLATFORM_SETTINGS_DEFAULTS.maxUploadSizeMb || 5} MB or smaller.`, 'warning');
      return;
    }
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/college/offers/upload', { method: 'POST', credentials: 'same-origin', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Upload failed');
      const { accepted, errors } = json;
      addToast(
        `Imported ${accepted} row(s).${errors?.length ? ` ${errors.length} issue(s).` : ''}`,
        accepted ? 'success' : 'warning',
      );
      if (errors?.length) {
        addToast(summarizeCsvErrors(errors), 'error');
      }
      await onUploadSuccess?.();
    } catch (err) {
      addToast(err.message || 'Upload failed', 'error');
    }
  };

  return { downloadAssessmentStarter, onUploadCsv, downloadBlankTemplate: downloadCollegeOffersTemplate };
}

export function CollegeOffersUploadMeta({ compact = false }) {
  const { data, error, isLoading } = useSWR('/api/college/offers/upload-meta', swrFetcher, {
    revalidateOnFocus: true,
  });

  const summary = data?.summary || { total: 0, accepted: 0, pending: 0, rejected: 0 };
  const recent = Array.isArray(data?.recentOffers) ? data.recentOffers : [];
  const {
    search,
    setSearch,
    sort,
    setSort,
    filtered: displayRecent,
    filteredCount,
    totalCount: recentTotalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(recent, {
    getSearchText: (o) => [o.student_name, o.roll_number, o.company_name, o.job_title, o.status].filter(Boolean).join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

  if (isLoading) {
    return <div className="skeleton skeleton-card" style={{ height: compact ? 88 : 120, marginBottom: '1rem' }} />;
  }

  if (error) {
    return (
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem', borderColor: 'var(--danger-200)', background: 'var(--danger-50)' }}>
        <p style={{ margin: 0, color: 'var(--danger-700)', fontSize: '0.875rem' }}>{error.message}</p>
      </div>
    );
  }

  return (
    <>
      <div
        className="card"
        style={{
          marginBottom: '1rem',
          padding: compact ? '1rem' : '1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          border: '1px solid var(--border-default)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 140 }}>
          <Users size={18} style={{ color: 'var(--primary-600)' }} aria-hidden />
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.1 }}>{data?.studentsWithRoll ?? 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Students with roll no.</div>
          </div>
        </div>
        <div style={{ width: 1, height: 36, background: 'var(--border-default)' }} aria-hidden />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 140 }}>
          <ClipboardList size={18} style={{ color: 'var(--primary-600)' }} aria-hidden />
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.1 }}>{summary.total}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Offers on file · {summary.pending} pending
            </div>
          </div>
        </div>
        {data?.assessmentPrefillCount > 0 ? (
          <>
            <div style={{ width: 1, height: 36, background: 'var(--border-default)' }} aria-hidden />
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: 280, lineHeight: 1.45 }}>
              <strong>{data.assessmentPrefillCount}</strong> students can prefill <code>company_name</code> from your latest{' '}
              <Link href="/dashboard/college/hiring-assessment" className="link-inline">assessment upload</Link>.
            </p>
          </>
        ) : null}
        <Link href="/dashboard/college/offers" className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}>
          View all offers
        </Link>
      </div>

      {recentTotalCount > 0 ? (
        <div className="card" style={{ marginBottom: '1rem', padding: 0, overflow: 'hidden', border: '1px solid var(--border-default)' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
            <h2 className="card-title" style={{ margin: 0, fontSize: '1rem' }}>Recent offers</h2>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Latest on your campus — edit on <Link href="/dashboard/college/offers">Offers</Link>.
            </p>
          </div>
          <DataTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search student, company, or role…"
            sort={sort}
            onSortChange={setSort}
            sortOptions={COMMON_SORT_OPTIONS}
            filteredCount={filteredCount}
            totalCount={recentTotalCount}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
            style={{ margin: '0 1rem', border: 'none', borderBottom: '1px solid var(--border-default)', borderRadius: 0 }}
          />
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: '1.25rem' }}>Student</th>
                  <th>Company</th>
                  <th>Role</th>
                  <th>CTC</th>
                  <th>Status</th>
                  <th style={{ paddingRight: '1.25rem' }}>Added</th>
                </tr>
              </thead>
              <tbody>
                {displayRecent.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-secondary">No offers match your search.</td>
                  </tr>
                ) : null}
                {displayRecent.map((o) => (
                  <tr key={o.id}>
                    <td style={{ paddingLeft: '1.25rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{o.student_name || '—'}</div>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{o.roll_number || '—'}</div>
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>{o.company_name || '—'}</td>
                    <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{o.job_title || '—'}</td>
                    <td style={{ fontSize: '0.875rem' }}>{o.salary ? formatCurrency(o.salary) : '—'}</td>
                    <td>
                      <span className={`badge badge-${getStatusColor(o.status)} badge-dot`} style={{ fontSize: '0.7rem' }}>
                        {formatStatus(o.status)}
                      </span>
                    </td>
                    <td style={{ paddingRight: '1.25rem', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                      {o.created_at ? formatDate(o.created_at) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          className="card"
          style={{
            marginBottom: '1rem',
            padding: '1.25rem',
            border: '1px dashed var(--border-default)',
            background: 'var(--bg-secondary)',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            No offers on file yet. Download a template below, fill in <code>roll_number</code>, <code>company_name</code>, and{' '}
            <code>job_title</code>, then upload — or add rows on the <Link href="/dashboard/college/offers">Offers</Link> screen.
          </p>
        </div>
      )}
    </>
  );
}

