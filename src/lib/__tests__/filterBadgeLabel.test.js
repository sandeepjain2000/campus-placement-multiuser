import {
  countApplicationStatusPills,
  formatFilterBadgeLabel,
  formatFilterBadgeLabelParen,
  shouldShowFilterCount,
} from '../filterBadgeLabel';

describe('filterBadgeLabel', () => {
  it('shouldShowFilterCount is false for zero and non-numbers', () => {
    expect(shouldShowFilterCount(0)).toBe(false);
    expect(shouldShowFilterCount('0')).toBe(false);
    expect(shouldShowFilterCount(null)).toBe(false);
    expect(shouldShowFilterCount(undefined)).toBe(false);
    expect(shouldShowFilterCount('')).toBe(false);
    expect(shouldShowFilterCount(3)).toBe(true);
  });

  it('formatFilterBadgeLabel omits zero counts', () => {
    expect(formatFilterBadgeLabel('Applied', 0)).toBe('Applied');
    expect(formatFilterBadgeLabel('Applied', 2)).toBe('Applied 2');
  });

  it('formatFilterBadgeLabelParen omits zero counts', () => {
    expect(formatFilterBadgeLabelParen('All', 0)).toBe('All');
    expect(formatFilterBadgeLabelParen('All', 5)).toBe('All (5)');
  });

  it('countApplicationStatusPills excludes withdrawn from All', () => {
    const pills = [
      { key: '', label: 'All' },
      { key: 'applied', label: 'Applied' },
      { key: 'withdrawn', label: 'Withdrawn' },
    ];
    const items = [
      { status: 'applied' },
      { status: 'withdrawn' },
      { status: 'shortlisted' },
    ];
    expect(countApplicationStatusPills(items, pills)).toEqual({
      '': 2,
      applied: 1,
      withdrawn: 1,
    });
  });
});
