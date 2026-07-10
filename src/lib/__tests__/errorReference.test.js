/** @jest-environment node */

const {
  formatErrorReference,
  appendErrorReference,
  errorMessageFromApiBody,
} = require('@/lib/errorReference');

describe('errorReference', () => {
  it('formats UUID to 8-char uppercase reference', () => {
    expect(formatErrorReference('11111111-2222-3333-4444-555555555555')).toBe('11111111');
  });

  it('appends reference once', () => {
    const msg = appendErrorReference('Failed to save', { reference: 'AABBCCDD' });
    expect(msg).toBe('Failed to save [Ref: AABBCCDD]');
    expect(appendErrorReference(msg, { reference: 'AABBCCDD' })).toBe(msg);
  });

  it('reads message and reference from API body', () => {
    const msg = errorMessageFromApiBody(
      { error: 'Tenant missing', reference: 'DEADBEEF' },
      'Fallback',
    );
    expect(msg).toBe('Tenant missing [Ref: DEADBEEF]');
  });
});
