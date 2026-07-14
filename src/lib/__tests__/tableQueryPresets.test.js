import { sortRows } from '@/lib/dataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';

function comparatorsFrom(options) {
  return Object.fromEntries(options.map((o) => [o.value, o.compare]));
}

describe('COMMON_SORT_OPTIONS', () => {
  const pendingLikeRows = [
    { id: '1', label: 'Zenith College', createdAt: '2026-01-01' },
    { id: '2', label: 'Alpha Industries', createdAt: '2026-03-01' },
    { id: '3', label: 'Mumbai Tech', createdAt: '2026-02-01' },
  ];

  const comparators = comparatorsFrom(COMMON_SORT_OPTIONS);

  it('sorts Name (A → Z) using label when name/title are absent', () => {
    const sorted = sortRows(pendingLikeRows, 'name_asc', comparators);
    expect(sorted.map((r) => r.label)).toEqual([
      'Alpha Industries',
      'Mumbai Tech',
      'Zenith College',
    ]);
  });

  it('sorts Name (Z → A) using label when name/title are absent', () => {
    const sorted = sortRows(pendingLikeRows, 'name_desc', comparators);
    expect(sorted.map((r) => r.label)).toEqual([
      'Zenith College',
      'Mumbai Tech',
      'Alpha Industries',
    ]);
  });

  it('still sorts Name using name when present', () => {
    const rows = [
      { id: '1', name: 'Zenith' },
      { id: '2', name: 'Alpha' },
      { id: '3', name: 'Mumbai' },
    ];
    expect(sortRows(rows, 'name_desc', comparators).map((r) => r.name)).toEqual([
      'Zenith',
      'Mumbai',
      'Alpha',
    ]);
  });
});
