import {
  classifyOfferEventType,
  countOfferEventTypes,
  normalizeOfferEventType,
  templateMatchesEventTab,
} from '../offerEventType';

describe('offerEventType', () => {
  it('normalizes event type values', () => {
    expect(normalizeOfferEventType('internship')).toBe('internship');
    expect(normalizeOfferEventType('invalid')).toBe('drive');
  });

  it('classifies offers by linkage', () => {
    expect(classifyOfferEventType({ offer_kind: 'ppo_job' })).toBe('internship');
    expect(classifyOfferEventType({ offer_kind: 'internship_offer' })).toBe('internship');
    expect(classifyOfferEventType({ program_application_id: 'pa-1' })).toBe('internship');
    expect(classifyOfferEventType({ drive_id: 'd-1' })).toBe('drive');
    expect(classifyOfferEventType({})).toBe('alumni_jobs');
  });

  it('matches templates to tabs', () => {
    expect(templateMatchesEventTab({ eventType: 'internship' }, 'internship')).toBe(true);
    expect(templateMatchesEventTab({ event_type: 'drive' }, 'alumni_jobs')).toBe(false);
  });

  it('counts by event type', () => {
    const offers = [{ drive_id: '1' }, { offer_kind: 'ppo_job' }, {}];
    expect(countOfferEventTypes(offers, classifyOfferEventType)).toEqual({
      internship: 1,
      drive: 1,
      alumni_jobs: 1,
    });
  });
});
