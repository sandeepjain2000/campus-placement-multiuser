'use client';

import { useMemo, useState } from 'react';
import { Building2, Check, MapPin, Search } from 'lucide-react';
import EntityLogo from '@/components/EntityLogo';

/** @param {Record<string, boolean> | null | undefined} selection */
export function countSelectedTenantIds(selection) {
  return Object.values(selection || {}).filter(Boolean).length;
}

/** @param {Record<string, boolean> | null | undefined} selection */
export function selectedTenantIdsFromMap(selection) {
  return Object.entries(selection || {})
    .filter(([, on]) => on)
    .map(([id]) => id);
}

function campusLocationLabel(campus) {
  const parts = [campus?.city, campus?.state].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

/**
 * Multi-select campus picker for publish / visibility flows (card tiles, not raw checkboxes).
 *
 * @param {{
 *   campuses?: Array<{ id: string, name?: string, city?: string, state?: string, slug?: string, logo_url?: string }>;
 *   selection?: Record<string, boolean>;
 *   onSelectionChange: (next: Record<string, boolean>) => void;
 *   label?: React.ReactNode;
 *   required?: boolean;
 *   hint?: string;
 *   emptyMessage?: string;
 *   compact?: boolean;
 *   showSearch?: boolean;
 *   id?: string;
 * }} props
 */
export default function EmployerCampusTargetPicker({
  campuses = [],
  selection = {},
  onSelectionChange,
  label,
  required = false,
  hint,
  emptyMessage = 'No approved campuses. Request access from the campus directory first.',
  compact = false,
  showSearch = true,
  id: fieldId = 'employer-campus-target-picker',
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return campuses;
    return campuses.filter((c) => {
      const hay = [c.name, c.city, c.state, c.slug].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [campuses, query]);

  const selectedCount = countSelectedTenantIds(selection);
  const filteredSelectedCount = filtered.filter((c) => selection[c.id]).length;
  const allFilteredSelected = filtered.length > 0 && filteredSelectedCount === filtered.length;
  const noneFilteredSelected = filteredSelectedCount === 0;

  const toggleCampus = (campusId) => {
    onSelectionChange({ ...selection, [campusId]: !selection[campusId] });
  };

  const selectFiltered = () => {
    const next = { ...selection };
    for (const c of filtered) next[c.id] = true;
    onSelectionChange(next);
  };

  const clearFiltered = () => {
    const next = { ...selection };
    for (const c of filtered) next[c.id] = false;
    onSelectionChange(next);
  };

  const searchVisible = showSearch && campuses.length > 3;

  return (
    <div className={`employer-campus-picker${compact ? ' employer-campus-picker--compact' : ''}`}>
      {label ? (
        <label className="form-label employer-campus-picker-label" htmlFor={searchVisible ? `${fieldId}-search` : undefined}>
          {label}
          {required ? <span className="required"> *</span> : null}
        </label>
      ) : null}
      {hint ? <p className="employer-campus-picker-hint">{hint}</p> : null}

      {campuses.length > 0 ? (
        <div className="employer-campus-picker-toolbar">
          {searchVisible ? (
            <div className="employer-campus-picker-search">
              <Search size={16} className="employer-campus-picker-search-icon" aria-hidden />
              <input
                id={`${fieldId}-search`}
                type="search"
                className="form-input employer-campus-picker-search-input"
                placeholder="Search campuses…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search campuses"
              />
            </div>
          ) : null}
          <div className="employer-campus-picker-actions">
            <span className="employer-campus-picker-count" aria-live="polite">
              <strong>{selectedCount}</strong>
              <span className="text-tertiary"> / {campuses.length} selected</span>
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={allFilteredSelected || filtered.length === 0}
              onClick={selectFiltered}
            >
              {query.trim() ? 'Select matching' : 'Select all'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={noneFilteredSelected}
              onClick={clearFiltered}
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}

      <div
        className="employer-campus-picker-grid"
        role="group"
        aria-label={typeof label === 'string' ? label : 'Target campuses'}
      >
        {campuses.length === 0 ? (
          <div className="employer-campus-picker-empty">
            <Building2 size={22} aria-hidden className="text-tertiary" />
            <p>{emptyMessage}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="employer-campus-picker-empty">
            <p>No campuses match &ldquo;{query.trim()}&rdquo;.</p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQuery('')}>
              Clear search
            </button>
          </div>
        ) : (
          filtered.map((campus) => {
            const checked = Boolean(selection[campus.id]);
            const location = campusLocationLabel(campus);
            return (
              <button
                key={campus.id}
                type="button"
                role="checkbox"
                aria-checked={checked}
                className={`employer-campus-picker-card${checked ? ' is-selected' : ''}`}
                onClick={() => toggleCampus(campus.id)}
              >
                <span className="employer-campus-picker-card-check" aria-hidden>
                  {checked ? <Check size={14} strokeWidth={3} /> : null}
                </span>
                <EntityLogo
                  name={campus.name}
                  logoUrl={campus.logo_url}
                  size="sm"
                  shape="rounded"
                  className="employer-campus-picker-card-logo"
                />
                <span className="employer-campus-picker-card-body">
                  <span className="employer-campus-picker-card-name">{campus.name}</span>
                  {location ? (
                    <span className="employer-campus-picker-card-meta">
                      <MapPin size={12} aria-hidden />
                      {location}
                    </span>
                  ) : campus?.slug ? (
                    <span className="employer-campus-picker-card-meta text-tertiary">
                      {campus.slug}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
