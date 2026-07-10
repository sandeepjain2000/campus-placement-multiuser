'use client';

import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import MultiSelectDropdown from '@/components/filters/MultiSelectDropdown';
import { JOB_STATUS_OPTIONS, SORT_OPTIONS } from './useStudentListFilters';

export default function StudentListFiltersPanel({
  search,
  setSearch,
  deptFilters,
  setDeptFilters,
  degreeFilters,
  setDegreeFilters,
  batchFilters,
  setBatchFilters,
  jobStatusFilters,
  setJobStatusFilters,
  sectionFilters,
  setSectionFilters,
  sectionFilterOptions,
  departmentOptions,
  degreeOptions,
  batchOptions = [],
  sortBy,
  setSortBy,
  sortOpen,
  setSortOpen,
  hasFilters,
  clearFilters,
  filteredCount,
  totalCount,
}) {
  const activeSort = SORT_OPTIONS.find((o) => o.value === sortBy);
  const searchActive = Boolean(String(search || '').trim());

  return (
    <div
      className={`card student-list-filters-panel${hasFilters ? ' is-filtered' : ''}`}
      style={{ padding: '1.25rem', marginBottom: '1.5rem' }}
    >
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div
          className={searchActive ? 'filter-multiselect filter-multiselect--active' : 'filter-multiselect'}
          style={{ position: 'relative', flex: '1 1 220px' }}
        >
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: searchActive ? 'var(--primary-600)' : 'var(--text-tertiary)',
              pointerEvents: 'none',
              transition: 'color 0.15s ease-out',
            }}
          />
          <input
            className={`form-input${searchActive ? ' is-filter-active' : ''}`}
            placeholder="Search by name, roll, batch, or degree…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
            aria-label="Search students"
          />
        </div>

        <MultiSelectDropdown
          label="Departments"
          emptyLabel="All Departments"
          options={departmentOptions}
          selected={deptFilters}
          onChange={setDeptFilters}
          minWidth={200}
        />

        <MultiSelectDropdown
          label="Degrees pursued"
          emptyLabel="All Degrees"
          options={degreeOptions}
          selected={degreeFilters}
          onChange={setDegreeFilters}
          minWidth={200}
        />

        <MultiSelectDropdown
          label="Job statuses"
          emptyLabel="All Job Statuses"
          options={JOB_STATUS_OPTIONS}
          selected={jobStatusFilters}
          onChange={setJobStatusFilters}
          minWidth={200}
        />

        <MultiSelectDropdown
          label="Batch"
          emptyLabel="All Batches"
          options={batchOptions}
          selected={batchFilters}
          onChange={setBatchFilters}
          minWidth={160}
        />

        <MultiSelectDropdown
          label="Profile sections"
          emptyLabel="All completion levels"
          options={sectionFilterOptions}
          selected={sectionFilters}
          onChange={setSectionFilters}
          minWidth={200}
        />

        {hasFilters && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={clearFilters}
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--danger-600)' }}
          >
            <X size={14} /> Clear filters
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {filteredCount} of {totalCount}
        </span>
      </div>

      <div
        style={{
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-default)',
        }}
      >
        <button
          type="button"
          onClick={() => setSortOpen((v) => !v)}
          aria-expanded={sortOpen}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--text-primary)',
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>
            Sort by
            {activeSort && !sortOpen ? (
              <span style={{ marginLeft: '0.5rem', fontWeight: 600, textTransform: 'none', letterSpacing: 0, color: 'var(--text-secondary)' }}>
                · {activeSort.label}
              </span>
            ) : null}
          </span>
          {sortOpen ? (
            <ChevronUp size={18} style={{ color: 'var(--text-tertiary)' }} aria-hidden />
          ) : (
            <ChevronDown size={18} style={{ color: 'var(--text-tertiary)' }} aria-hidden />
          )}
        </button>

        {sortOpen && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginTop: '0.75rem',
            }}
          >
            {SORT_OPTIONS.map((opt) => {
              const active = sortBy === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setSortBy(opt.value)}
                  style={{
                    background: active ? 'var(--primary-600)' : 'var(--bg-secondary)',
                    color: active ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${active ? 'var(--primary-600)' : 'var(--border-default)'}`,
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
