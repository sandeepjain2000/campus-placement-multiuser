'use client';

import { useMemo, useState } from 'react';
import { Building2, Check, MapPin, Search } from 'lucide-react';
import EntityLogo from '@/components/EntityLogo';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

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
    <Field className={compact ? 'gap-2' : 'gap-3'}>
      {label ? (
        <FieldLabel htmlFor={searchVisible ? `${fieldId}-search` : undefined}>
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </FieldLabel>
      ) : null}
      {hint ? <FieldDescription>{hint}</FieldDescription> : null}

      {campuses.length > 0 ? (
        <div className="employer-campus-picker-toolbar">
          {searchVisible ? (
            <div className="employer-campus-picker-search">
              <Search size={16} className="employer-campus-picker-search-icon" aria-hidden />
              <Input
                id={`${fieldId}-search`}
                type="search"
                className="pl-9"
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={allFilteredSelected || filtered.length === 0}
              onClick={selectFiltered}
            >
              {query.trim() ? 'Select matching' : 'Select all'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={noneFilteredSelected}
              onClick={clearFiltered}
            >
              Clear
            </Button>
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
            <Button type="button" variant="ghost" size="sm" onClick={() => setQuery('')}>
              Clear search
            </Button>
          </div>
        ) : (
          filtered.map((campus) => {
            const checked = Boolean(selection[campus.id]);
            const location = campusLocationLabel(campus);
            return (
              <Button
                key={campus.id}
                type="button"
                role="checkbox"
                aria-checked={checked}
                variant="outline"
                className={`employer-campus-picker-card h-auto min-h-0 min-w-0 items-center justify-start overflow-hidden whitespace-normal ${checked ? 'is-selected border-primary bg-primary/5 ring-primary/20 ring-2' : ''}`}
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
              </Button>
            );
          })
        )}
      </div>
    </Field>
  );
}
