import {
  FCFS_TRACKS,
  isFcfsHiringSelect,
  isFcfsApplicationSelected,
  fcfsTrackFromApplicationsTab,
  fcfsTrackFromAssessmentKind,
} from '../campusFcfsSelection';

describe('campusFcfsSelection', () => {
  it('maps application tabs to tracks', () => {
    expect(fcfsTrackFromApplicationsTab('internships')).toBe('internship');
    expect(fcfsTrackFromApplicationsTab('drives')).toBe('placement');
    expect(fcfsTrackFromApplicationsTab('jobs')).toBe('jobs');
    expect(fcfsTrackFromApplicationsTab('projects')).toBeNull();
  });

  it('maps assessment kinds to tracks', () => {
    expect(fcfsTrackFromAssessmentKind('internship')).toBe('internship');
    expect(fcfsTrackFromAssessmentKind('drive')).toBe('placement');
    expect(fcfsTrackFromAssessmentKind('jobs')).toBe('jobs');
    expect(fcfsTrackFromAssessmentKind('projects')).toBeNull();
  });

  it('detects select signals', () => {
    expect(isFcfsHiringSelect('select')).toBe(true);
    expect(isFcfsHiringSelect('Select')).toBe(true);
    expect(isFcfsHiringSelect('Shortlist')).toBe(false);
    expect(isFcfsApplicationSelected('selected')).toBe(true);
  });

  it('defines three FCFS tracks', () => {
    expect(FCFS_TRACKS).toEqual(['internship', 'placement', 'jobs']);
  });
});
