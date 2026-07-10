'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { Briefcase, FolderDot, GraduationCap, Target } from 'lucide-react';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { ExportCsvSplitButton } from '@/components/export/ExportCsvSplitButton';
import { HiringResultBreakdown } from '@/components/assessment/HiringResultBreakdown';
import { useToast } from '@/components/ToastProvider';
import { pickRepresentativeAssessmentRows, buildAssessmentSummary } from '@/lib/assessmentHiringViewShared';
import { toCsvIsoDate } from '@/lib/csvExport';
import { shouldShowFilterCount } from '@/lib/filterBadgeLabel';

const KIND_TABS = [
  { id: 'internship', label: 'Internship', icon: GraduationCap },
  { id: 'drive', label: 'Drive', icon: Target },
  { id: 'projects', label: 'Projects', icon: FolderDot },
];

export default function EmployerHiringAssessmentPage() {
  const { addToast } = useToast();
  const [campusesLoading, setCampusesLoading] = useState(true);
  const [approvedCampuses, setApprovedCampuses] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [kindTab, setKindTab] = useState('internship');
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setCampusesLoading(true);
      try {
        const res = await fetch('/api/employer/campuses');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load campuses');
        const list = Array.isArray(json.colleges) ? json.colleges : [];
        const approved = list.filter((c) => String(c.approval_status || '').toLowerCase() === 'approved');
        if (!mounted) return;
        setApprovedCampuses(approved);
        if (approved.length && !selectedTenantId) {
          setSelectedTenantId(approved[0].id);
        }
      } catch (e) {
        if (!mounted) return;
        setApprovedCampuses([]);
        addToast(e.message || 'Could not load campuses', 'error');
      } finally {
        if (mounted) setCampusesLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedTenantId) {
      setPayload(null);
      return;
    }
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/employer/hiring-assessment-view?tenantId=${encodeURIComponent(selectedTenantId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load');
        if (!mounted) return;
        setPayload(json);
      } catch (e) {
        if (!mounted) return;
        setPayload(null);
        addToast(e.message || 'Could not load assessment view', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedTenantId, addToast]);

  const allRows = Array.isArray(payload?.rows) ? payload.rows : [];

  const kindCounts = useMemo(() => {
    const counts = { internship: 0, jobs: 0, drive: 0, projects: 0 };
    for (const r of pickRepresentativeAssessmentRows(allRows)) {
      const k = r.opportunity_kind;
      if (k && counts[k] !== undefined) counts[k] += 1;
    }
    return counts;
  }, [allRows]);

  const scopedRows = useMemo(
    () => allRows.filter((r) => r.opportunity_kind === kindTab),
    [allRows, kindTab],
  );

  const baseDisplayRows = useMemo(() => pickRepresentativeAssessmentRows(scopedRows), [scopedRows]);

  const summary = useMemo(() => buildAssessmentSummary(scopedRows), [scopedRows]);

  const {
    search,
    setSearch,
    sort,
    setSort,
    filtered: displayRows,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(baseDisplayRows, {
    getSearchText: (r) =>
      [r.system_id, r.roll_number, r.candidate_name, r.original_file_name, r.remarks].filter(Boolean).join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'name_asc',
  });

  const getCsv = useCallback(
    (_scope) => ({
      headers: [
        'upload_file',
        'upload_at',
        'campus',
        'system_id',
        'roll_number',
        'candidate_name',
        'employer_company',
        'hiring_result',
        'submission_status',
        'remarks',
      ],
      rows: displayRows.map((r) => [
        r.original_file_name ?? '',
        toCsvIsoDate(r.upload_created_at),
        r.tenant_name ?? '',
        r.system_id ?? '',
        r.roll_number ?? '',
        r.candidate_name ?? '',
        r.employer_company ?? '',
        r.hiring_result ?? '',
        r.submission_status ?? 'draft',
        r.remarks ?? '',
      ]),
    }),
    [displayRows],
  );

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Hiring Results Dashboard</h1>
        </div>
        <div className="page-header-actions">
          <ExportCsvSplitButton
            filenameBase={`hiring_results_${kindTab}`}
            currentCount={displayRows.length}
            fullCount={displayRows.length}
            getRows={getCsv}
          />
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="form-group" style={{ marginBottom: 0, maxWidth: '70ch' }}>
          <label className="form-label" htmlFor="hiring-results-campus">
            Campus
          </label>
          <select
            id="hiring-results-campus"
            className="form-select"
            value={selectedTenantId}
            disabled={campusesLoading || approvedCampuses.length === 0}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            style={{ maxWidth: '70ch' }}
          >
            {approvedCampuses.length === 0 ? (
              <option value="">{campusesLoading ? 'Loading…' : 'No approved campuses'}</option>
            ) : (
              approvedCampuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.city ? ` (${c.city})` : ''}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Opportunity type"
        style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}
      >
        {KIND_TABS.map((t) => {
          const Icon = t.icon;
          const active = kindTab === t.id;
          const n = kindCounts[t.id] ?? 0;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setKindTab(t.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.25rem',
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: '0.9rem',
                transition: 'background 0.2s ease-out, color 0.2s ease-out, box-shadow 0.2s ease-out',
                border: 'none',
                cursor: 'pointer',
                background: active ? 'var(--primary-600)' : 'var(--bg-secondary)',
                color: active ? 'white' : 'var(--text-secondary)',
                boxShadow: active ? '0 4px 10px rgba(79, 70, 229, 0.25)' : 'none',
              }}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 1.75} aria-hidden />
              {t.label}
              {shouldShowFilterCount(n) ? (
                <span
                  style={{
                    opacity: 0.85,
                    fontSize: '0.75rem',
                    background: active ? 'rgba(255,255,255,0.25)' : 'var(--bg-primary)',
                    borderRadius: '999px',
                    padding: '0.1rem 0.45rem',
                    fontWeight: 700,
                    color: active ? 'white' : 'var(--text-tertiary)',
                  }}
                >
                  {n}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="skeleton skeleton-card" style={{ height: 200 }} />
      ) : (
        <>
          <div className="grid grid-3" style={{ marginBottom: '1.25rem' }}>
            <div className="stats-card">
              <div className="stats-card-value">{summary.uniqueStudentCount ?? 0}</div>
              <div className="stats-card-label">Total students</div>
              <div className="text-xs text-tertiary" style={{ marginTop: '0.25rem' }}>
                Distinct students (this campus · {KIND_TABS.find((t) => t.id === kindTab)?.label})
                {summary.totalResultRows > 0 ? (
                  <>
                    <br />
                    {summary.totalResultRows} row{summary.totalResultRows === 1 ? '' : 's'} across uploads
                  </>
                ) : null}
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-card-value">{summary.uploadsCount}</div>
              <div className="stats-card-label">Upload batches</div>
              <div className="text-xs text-tertiary" style={{ marginTop: '0.25rem' }}>
                Distinct CSV uploads represented
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-card-value">{summary.withHiringResult ?? 0}</div>
              <div className="stats-card-label">With hiring result</div>
              <div className="text-xs text-tertiary" style={{ marginTop: '0.25rem' }}>
                {summary.withoutHiringResult ?? 0} with no decision yet
              </div>
            </div>
          </div>

          <HiringResultBreakdown summary={summary} />

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>
              Detail
            </h3>
            {totalCount > 0 ? (
              <DataTableToolbar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search roll, candidate, or file…"
                sort={sort}
                onSortChange={setSort}
                sortOptions={COMMON_SORT_OPTIONS}
                filteredCount={filteredCount}
                totalCount={totalCount}
                hasActiveFilters={hasActiveFilters}
                onClear={clearFilters}
                style={{ marginBottom: '1rem' }}
              />
            ) : null}
            <div className="table-container" style={{ overflowX: 'auto', border: 'none' }}>
              <table className="data-table" style={{ minWidth: 900 }}>
                <thead>
                  <tr>
                    <th>File</th>
                    <th>System ID</th>
                    <th>Roll</th>
                    <th>Candidate</th>
                    <th>Hiring result</th>
                    <th>Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.length === 0 && totalCount > 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-secondary">
                        No rows match your search.
                      </td>
                    </tr>
                  ) : null}
                  {displayRows.map((r) => (
                    <tr key={r.id}>
                      <td className="text-xs">{r.original_file_name || '—'}</td>
                      <td className="font-mono text-sm">{r.system_id || '—'}</td>
                      <td className="font-mono text-sm">{r.roll_number || '—'}</td>
                      <td className="text-sm">{r.candidate_name || '—'}</td>
                      <td className="text-sm">{r.hiring_result || '—'}</td>
                      <td className="text-sm">
                        <span className="badge badge-secondary" style={{ textTransform: 'capitalize' }}>
                          {r.submission_status || 'draft'}
                        </span>
                      </td>
                      <td className="text-sm" style={{ maxWidth: 220 }}>
                        {r.remarks || '—'}
                      </td>
                    </tr>
                  ))}
                  {totalCount === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center text-secondary">
                        No assessment rows for this campus and type yet. Upload a CSV under{' '}
                        <Link href="/dashboard/employer/assessment-uploads">Assessment uploads</Link>.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
