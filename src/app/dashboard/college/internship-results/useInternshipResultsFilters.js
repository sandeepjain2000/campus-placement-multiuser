'use client';

import { useMemo, useState } from 'react';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';

export function useInternshipResultsFilters(results) {
  const [companyId, setCompanyId] = useState('');
  const [jobId, setJobId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');

  const scoped = useMemo(() => {
    return results.filter((row) => {
      if (companyId && String(row.companyId) !== companyId) return false;
      if (jobId && String(row.jobId) !== jobId) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      if (branchFilter && row.branch !== branchFilter) return false;
      if (batchFilter && String(row.batchYear) !== batchFilter) return false;
      return true;
    });
  }, [results, companyId, jobId, statusFilter, branchFilter, batchFilter]);

  const {
    search,
    setSearch,
    sort,
    setSort,
    filtered,
    filteredCount,
    totalCount,
    hasActiveFilters: hasSearchSort,
    clearFilters: clearSearchSort,
  } = useDataTableQuery(scoped, {
    getSearchText: (row) =>
      [row.studentName, row.rollNumber, row.systemId, row.companyName, row.openingTitle, row.branch, row.status]
        .filter(Boolean)
        .join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

  const internshipOptions = useMemo(() => {
    if (!companyId) return results;
    return results.filter((r) => String(r.companyId) === companyId);
  }, [results, companyId]);

  const uniqueInternships = useMemo(() => {
    const map = new Map();
    for (const row of internshipOptions) {
      if (row.jobId) {
        map.set(String(row.jobId), {
          id: row.jobId,
          title: row.openingTitle,
          companyName: row.companyName,
        });
      }
    }
    return [...map.values()].sort((a, b) =>
      `${a.companyName} ${a.title}`.localeCompare(`${b.companyName} ${b.title}`),
    );
  }, [internshipOptions]);

  const hasActiveFilters =
    hasSearchSort || Boolean(companyId || jobId || statusFilter || branchFilter || batchFilter);

  const clearFilters = () => {
    setCompanyId('');
    setJobId('');
    setStatusFilter('');
    setBranchFilter('');
    setBatchFilter('');
    clearSearchSort();
  };

  return {
    companyId,
    setCompanyId: (value) => {
      setCompanyId(value);
      setJobId('');
    },
    jobId,
    setJobId,
    statusFilter,
    setStatusFilter,
    branchFilter,
    setBranchFilter,
    batchFilter,
    setBatchFilter,
    search,
    setSearch,
    sort,
    setSort,
    filtered,
    filteredCount,
    totalCount: scoped.length,
    hasActiveFilters,
    clearFilters,
    uniqueInternships,
  };
}
