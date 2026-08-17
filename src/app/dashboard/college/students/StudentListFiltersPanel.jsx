'use client';

import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import MultiSelectDropdown from '@/components/filters/MultiSelectDropdown';
import { JOB_STATUS_OPTIONS, SORT_OPTIONS } from './useStudentListFilters';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

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

  return (
    <Card size="sm" className={hasFilters ? 'ring-primary/20' : undefined}>
      <CardContent className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, roll, batch, or degree…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-destructive"
          >
            <X data-icon="inline-start" /> Clear filters
          </Button>
        )}

        <span className="ml-auto text-sm font-medium text-muted-foreground">
          {filteredCount} of {totalCount}
        </span>
      </div>

      <Separator />
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setSortOpen((v) => !v)}
          aria-expanded={sortOpen}
          className="w-full justify-between"
        >
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sort by
            {activeSort && !sortOpen ? (
              <span className="ml-2 normal-case tracking-normal text-foreground">
                · {activeSort.label}
              </span>
            ) : null}
          </span>
          {sortOpen ? (
            <ChevronUp aria-hidden />
          ) : (
            <ChevronDown aria-hidden />
          )}
        </Button>

        {sortOpen && (
          <div className="mt-3 flex flex-wrap gap-2">
            {SORT_OPTIONS.map((opt) => {
              const active = sortBy === opt.value;
              return (
                <Button
                  key={opt.value}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  onClick={() => setSortBy(opt.value)}
                >
                  {opt.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>
      </CardContent>
    </Card>
  );
}
