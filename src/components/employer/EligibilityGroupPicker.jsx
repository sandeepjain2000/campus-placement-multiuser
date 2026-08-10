'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { formatCommaList, parseCommaList } from '@/lib/internshipPostingMeta';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

const fetcher = (url) => fetch(url).then((r) => r.json());

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function isAllBranches(value) {
  const t = normalizeToken(value);
  return t === 'all' || t === 'all branches' || t === 'all eligible branches' || t === 'any';
}

function matchGroup(token, groups) {
  const norm = normalizeToken(token);
  return groups.find(
    (g) =>
      normalizeToken(g.name) === norm ||
      normalizeToken(g.code) === norm ||
      normalizeToken(g.code).replace(/_/g, ' ') === norm,
  );
}

function parseEligibleBranchValue(value, groups) {
  const tokens = parseCommaList(value);
  if (!tokens.length || tokens.some(isAllBranches)) {
    return { selectedNames: new Set(), customTokens: [] };
  }
  const selectedNames = new Set();
  const customTokens = [];
  for (const token of tokens) {
    const match = matchGroup(token, groups);
    if (match) selectedNames.add(match.name);
    else customTokens.push(token);
  }
  return { selectedNames, customTokens };
}

/**
 * Multi-select placement eligibility groups (Computer Science, Electronics, …).
 * Stores human-readable group names in a comma-separated string for eligible_branches.
 *
 * @param {{ value: string; onChange: (value: string) => void; style?: React.CSSProperties }} props
 */
export default function EligibilityGroupPicker({ value, onChange, style }) {
  const { data, isLoading } = useSWR('/api/academic-taxonomy', fetcher);
  const groups = useMemo(() => {
    const rows = Array.isArray(data?.eligibilityGroups) ? data.eligibilityGroups : [];
    return rows.filter((g) => g.code !== 'all_branches');
  }, [data?.eligibilityGroups]);

  const { selectedNames, customTokens } = useMemo(
    () => parseEligibleBranchValue(value, groups),
    [value, groups],
  );

  const emitValue = (namesSet, custom) => {
    const parts = [...namesSet, ...custom];
    onChange(parts.length ? formatCommaList(parts) : '');
  };

  const toggleGroup = (group) => {
    const next = new Set(selectedNames);
    if (next.has(group.name)) next.delete(group.name);
    else next.add(group.name);
    emitValue(next, customTokens);
  };

  const openToAll = !parseCommaList(value).length || parseCommaList(value).some(isAllBranches);

  if (!groups.length && !isLoading) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="CSE, ECE, IT — or All for every branch"
      />
    );
  }

  return (
    <Field style={style}>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={openToAll ? 'default' : 'outline'}
          title="No branch filter — every student is eligible"
          onClick={() => onChange('')}
        >
          All branches
        </Button>
        {groups.map((g) => {
          const active = selectedNames.has(g.name);
          return (
            <Button
              key={g.code}
              type="button"
              size="sm"
              variant={active ? 'default' : 'outline'}
              disabled={isLoading}
              onClick={() => toggleGroup(g)}
            >
              {g.name}
            </Button>
          );
        })}
      </div>
      <Input
        value={formatCommaList(customTokens)}
        onChange={(e) => emitValue(selectedNames, parseCommaList(e.target.value))}
        placeholder="Optional: add custom branch names (comma-separated)"
        aria-label="Eligible branches (custom)"
      />
      <FieldDescription>
        Use <strong>All branches</strong> for no filter. Pick groups above and/or type legacy codes (CSE, ECE) below.
      </FieldDescription>
    </Field>
  );
}
