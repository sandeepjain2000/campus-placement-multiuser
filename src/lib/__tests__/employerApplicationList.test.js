import {
  dedupeEmployerApplicationItems,
  employerMayUpdateApplicationStatus,
  normalizeEmployerApplicationStatus,
  shouldNotifyStudentSelectionOnStatusChange,
} from '../employerApplicationList';

describe('employerApplicationList', () => {
  it('normalizes per-opening application status', () => {
    expect(normalizeEmployerApplicationStatus('Selected')).toBe('selected');
    expect(normalizeEmployerApplicationStatus('WITHDRAWN')).toBe('withdrawn');
    expect(normalizeEmployerApplicationStatus('')).toBe('applied');
    expect(normalizeEmployerApplicationStatus('bogus')).toBe('applied');
  });

  it('dedupes items by sourceKind and application id', () => {
    const items = [
      { id: 'a1', sourceKind: 'program', status: 'applied', jobId: 'j1', openingTitle: 'Role A' },
      { id: 'a1', sourceKind: 'program', status: 'selected', jobId: 'j1', openingTitle: 'Role A' },
      { id: 'a2', sourceKind: 'program', status: 'withdrawn', jobId: 'j2', openingTitle: 'Role B' },
    ];
    const out = dedupeEmployerApplicationItems(items);
    expect(out).toHaveLength(2);
    expect(out[0].status).toBe('applied');
    expect(out[1].status).toBe('withdrawn');
  });

  it('keeps distinct statuses for the same candidate across openings', () => {
    const items = [
      { id: 'a1', sourceKind: 'program', status: 'selected', jobId: 'j1' },
      { id: 'a2', sourceKind: 'program', status: 'withdrawn', jobId: 'j2' },
      { id: 'a3', sourceKind: 'program', status: 'applied', jobId: 'j3' },
    ];
    expect(dedupeEmployerApplicationItems(items)).toEqual(items);
  });

  it('blocks updates to withdrawn applications', () => {
    expect(employerMayUpdateApplicationStatus('withdrawn', 'selected')).toEqual({
      ok: false,
      error: 'Withdrawn applications cannot be updated.',
    });
    expect(employerMayUpdateApplicationStatus('shortlisted', 'selected')).toEqual({ ok: true });
  });

  it('notifies selection only on first transition to selected', () => {
    expect(shouldNotifyStudentSelectionOnStatusChange('shortlisted', 'selected')).toBe(true);
    expect(shouldNotifyStudentSelectionOnStatusChange('Selected', 'selected')).toBe(false);
    expect(shouldNotifyStudentSelectionOnStatusChange('selected', 'selected')).toBe(false);
    expect(shouldNotifyStudentSelectionOnStatusChange('shortlisted', 'rejected')).toBe(false);
  });
});
