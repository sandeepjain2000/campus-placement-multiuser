'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Building2, Settings2 } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import EmployerCampusTargetPicker from '@/components/employer/EmployerCampusTargetPicker';
import { getConstraintAllowlist } from '@/lib/employerPostingCampusConstraints';

const fetcher = async (url) => {
  const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
};

function buildSelectionFromAllowlist(allowlist, approvedCampuses) {
  const allowed = new Set((allowlist || []).map(String));
  const sel = {};
  for (const c of approvedCampuses) {
    sel[c.id] = allowed.has(String(c.id));
  }
  return sel;
}

export default function EmployerSettingsPage() {
  const { addToast } = useToast();
  const { data: campusData, isLoading: campusesLoading } = useSWR('/api/employer/campuses', fetcher, {
    revalidateOnFocus: true,
  });
  const {
    data: constraintsData,
    error: constraintsError,
    isLoading: constraintsLoading,
    mutate: mutateConstraints,
  } = useSWR('/api/employer/posting-campus-constraints', fetcher, { revalidateOnFocus: true });

  const approvedCampuses = useMemo(
    () =>
      (campusData?.colleges || []).filter(
        (c) => String(c.approval_status || '').toLowerCase() === 'approved',
      ),
    [campusData],
  );

  const categories = constraintsData?.categories || [];
  const savedConstraints = constraintsData?.constraints || {};

  const [draftRestricted, setDraftRestricted] = useState({});
  const [draftSelection, setDraftSelection] = useState({});
  const [savingCategory, setSavingCategory] = useState(null);

  useEffect(() => {
    if (!categories.length) return;
    const restricted = {};
    const selection = {};
    for (const cat of categories) {
      const allowlist = getConstraintAllowlist(savedConstraints, cat.id);
      restricted[cat.id] = Boolean(allowlist?.length);
      selection[cat.id] = buildSelectionFromAllowlist(allowlist, approvedCampuses);
    }
    setDraftRestricted(restricted);
    setDraftSelection(selection);
  }, [categories, savedConstraints, approvedCampuses]);

  const saveCategory = useCallback(
    async (categoryId) => {
      setSavingCategory(categoryId);
      try {
        const restricted = draftRestricted[categoryId] === true;
        const tenantIds = Object.entries(draftSelection[categoryId] || {})
          .filter(([, on]) => on)
          .map(([id]) => id);

        const res = await fetch('/api/employer/posting-campus-constraints', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            category: categoryId,
            restricted,
            tenantIds,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Save failed');

        await mutateConstraints();
        addToast(
          restricted
            ? 'Campus limit saved for this posting type.'
            : 'All approved colleges are now eligible for this posting type.',
          'success',
        );
      } catch (e) {
        addToast(e.message || 'Could not save campus limits', 'error');
      } finally {
        setSavingCategory(null);
      }
    },
    [addToast, draftRestricted, draftSelection, mutateConstraints],
  );

  const loading = campusesLoading || constraintsLoading;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings2 size={22} strokeWidth={1.75} style={{ color: 'var(--primary-500)', flexShrink: 0 }} />
            Employer settings
          </h1>
          <p className="text-secondary" style={{ margin: 0 }}>
            Limit which approved colleges can receive each type of posting. When unrestricted, all approved tie-ups
            remain eligible.
          </p>
        </div>
      </div>

      {constraintsError ? (
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'var(--danger-500)' }}>
          <p className="text-sm" style={{ margin: 0 }}>
            Could not load campus posting limits: {constraintsError.message}
          </p>
        </div>
      ) : null}

      {!loading && approvedCampuses.length === 0 ? (
        <div
          className="card"
          style={{ marginBottom: '1rem', background: 'var(--warning-50)', border: '1px solid var(--warning-200)' }}
        >
          <p className="text-sm" style={{ margin: 0 }}>
            <strong>No approved college partnerships yet.</strong> Request campus access first, then return here to
            narrow posting targets per category.
          </p>
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {loading ? (
          <div className="card">
            <p className="text-sm text-secondary" style={{ margin: 0 }}>
              Loading settings…
            </p>
          </div>
        ) : (
          categories.map((cat) => {
            const restricted = draftRestricted[cat.id] === true;
            const selection = draftSelection[cat.id] || {};
            return (
              <div key={cat.id} className="card">
                <div className="card-header" style={{ alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 className="card-title" style={{ marginBottom: '0.35rem' }}>
                      {cat.label}
                    </h3>
                    <p className="text-sm text-secondary" style={{ margin: 0 }}>
                      {cat.description}
                    </p>
                  </div>
                  <span
                    className={`badge ${restricted ? 'badge-indigo' : 'badge-gray'}`}
                    style={{ flexShrink: 0 }}
                  >
                    {restricted ? 'Limited' : 'All approved'}
                  </span>
                </div>

                <label
                  className="text-sm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={restricted}
                    disabled={!approvedCampuses.length || savingCategory === cat.id}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setDraftRestricted((p) => ({ ...p, [cat.id]: next }));
                      if (next && !Object.values(selection).some(Boolean)) {
                        setDraftSelection((p) => ({
                          ...p,
                          [cat.id]: buildSelectionFromAllowlist(
                            getConstraintAllowlist(savedConstraints, cat.id) ||
                              approvedCampuses.slice(0, 1).map((c) => c.id),
                            approvedCampuses,
                          ),
                        }));
                      }
                    }}
                  />
                  Limit to selected colleges only
                </label>

                {restricted ? (
                  <EmployerCampusTargetPicker
                    campuses={approvedCampuses}
                    selection={selection}
                    onSelectionChange={(next) =>
                      setDraftSelection((p) => ({
                        ...p,
                        [cat.id]: next,
                      }))
                    }
                    label={
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Building2 size={14} aria-hidden />
                        Eligible colleges
                      </span>
                    }
                    required
                    hint="Only these approved campuses will appear when publishing this posting type."
                    emptyMessage="No approved campuses available."
                  />
                ) : (
                  <p className="text-sm text-secondary" style={{ margin: '0 0 0.75rem' }}>
                    All {approvedCampuses.length} approved college
                    {approvedCampuses.length === 1 ? '' : 's'} can receive {cat.label.toLowerCase()}.
                  </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={!approvedCampuses.length || savingCategory === cat.id}
                    onClick={() => void saveCategory(cat.id)}
                  >
                    {savingCategory === cat.id ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
