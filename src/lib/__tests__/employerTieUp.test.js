import {
  isEmployerTieUpActive,
  isEmployerTieUpRevoked,
  displayEmployerTieUpStatus,
  canRequestEmployerTieUp,
  canReinstateEmployerTieUp,
  sqlEmployerTieUpIsActive,
} from '../employerTieUp';

describe('employerTieUp', () => {
  it('identifies active tie-up', () => {
    expect(isEmployerTieUpActive('approved')).toBe(true);
    expect(isEmployerTieUpActive('revoked')).toBe(false);
  });

  it('treats blacklisted as revoked', () => {
    expect(isEmployerTieUpRevoked('blacklisted')).toBe(true);
    expect(isEmployerTieUpRevoked('revoked')).toBe(true);
    expect(displayEmployerTieUpStatus('blacklisted')).toBe('revoked');
  });

  it('allows re-request after revoke', () => {
    expect(canRequestEmployerTieUp('revoked')).toBe(true);
    expect(canRequestEmployerTieUp('approved')).toBe(false);
    expect(canRequestEmployerTieUp(null)).toBe(true);
  });

  it('allows reinstate only when revoked', () => {
    expect(canReinstateEmployerTieUp('revoked')).toBe(true);
    expect(canReinstateEmployerTieUp('approved')).toBe(false);
  });

  it('emits active SQL fragment', () => {
    expect(sqlEmployerTieUpIsActive('ea')).toBe("ea.status = 'approved'");
  });
});
