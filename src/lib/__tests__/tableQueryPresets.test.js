import { sortRows, SORT_DATE_DESC, SORT_DATE_ASC, SORT_NAME_ASC } from '@/lib/dataTableQuery';
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

  it('sorts Newest/Oldest using alternate date keys (archivedAt, start_date, uploaded_at, …)', () => {
    const rows = [
      { id: 'a', archivedAt: '2026-01-01' },
      { id: 'b', start_date: '2026-03-01' },
      { id: 'c', uploaded_at: '2026-02-01' },
      { id: 'd', eventDate: '2026-04-01' },
      { id: 'e', upload_created_at: '2026-02-15' },
      { id: 'f', updatedAt: '2026-01-15' },
      { id: 'g', internshipStartDate: '2026-05-01' },
    ];
    expect(sortRows(rows, 'date_desc', { date_desc: SORT_DATE_DESC.compare }).map((r) => r.id)).toEqual([
      'g',
      'd',
      'b',
      'e',
      'c',
      'f',
      'a',
    ]);
    expect(sortRows(rows, 'date_asc', { date_asc: SORT_DATE_ASC.compare }).map((r) => r.id)).toEqual([
      'a',
      'f',
      'c',
      'e',
      'b',
      'd',
      'g',
    ]);
  });

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

  it('sorts Name using alternate identity keys (candidate_name, companyName, first_name, …)', () => {
    const rows = [
      { id: 'hire', candidate_name: 'Zara Khan' },
      { id: 'upload', original_file_name: 'alpha-batch.csv' },
      { id: 'request', company_name: 'Mumbai Corp' },
      { id: 'sponsor', companyName: 'Beta Co' },
      { id: 'doc', document_name: 'id-proof.pdf' },
      { id: 'profile', first_name: 'Sam', last_name: 'Lee' },
      { id: 'audit', actor_name: 'Admin User' },
      { id: 'report', student: 'Riya Patel' },
      { id: 'export', status: 'ready', format: 'csv' },
    ];
    const sorted = sortRows(rows, 'name_asc', { name_asc: SORT_NAME_ASC.compare });
    expect(sorted.map((r) => r.id)).toEqual([
      'audit',
      'upload',
      'sponsor',
      'doc',
      'request',
      'export',
      'report',
      'profile',
      'hire',
    ]);
  });

  it('prefers name over alternate keys when both exist', () => {
    const rows = [
      { id: '1', name: 'Zenith', candidate_name: 'AAA' },
      { id: '2', name: 'Alpha', company_name: 'ZZZ' },
    ];
    expect(sortRows(rows, 'name_asc', { name_asc: SORT_NAME_ASC.compare }).map((r) => r.id)).toEqual([
      '2',
      '1',
    ]);
  });
});
