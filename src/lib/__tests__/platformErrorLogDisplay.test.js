const {
  contextLabel,
  enrichErrorLogRow,
  formatFullErrorLog,
  formatLogReference,
  postgresHintFromLog,
} = require('@/lib/platformErrorLogDisplay');

describe('platformErrorLogDisplay', () => {
  const sample = {
    id: '11111111-2222-3333-4444-555555555555',
    created_at: '2026-06-12T10:00:00.000Z',
    severity: 'error',
    context: 'employer_drive_list',
    status_code: 500,
    error_code: '42703',
    user_message: 'Failed to load placement drives',
    error_message: 'column d.is_deleted does not exist',
    user_email: 'hr@test.com',
    user_name: 'Meera Nair',
    details: {
      route: '/api/employer/drives',
      requestMethod: 'GET',
      stack: 'Error: column d.is_deleted\n    at query',
      pgHint: 'A required database column is missing — run pending migrations on the server.',
    },
  };

  it('formats short reference from uuid', () => {
    expect(formatLogReference(sample.id)).toBe('11111111');
  });

  it('labels known contexts', () => {
    expect(contextLabel('employer_drive_list')).toMatch(/placement drive/i);
  });

  it('enriches row with display fields', () => {
    const row = enrichErrorLogRow(sample);
    expect(row.reference).toBe('11111111');
    expect(row.route).toBe('/api/employer/drives');
    expect(row.postgres_hint).toMatch(/column is missing/i);
  });

  it('includes stack and route in full export', () => {
    const json = JSON.parse(formatFullErrorLog(sample));
    expect(json.reference).toBe('11111111');
    expect(json.route).toBe('/api/employer/drives');
    expect(json.stack).toMatch(/column d.is_deleted/);
  });

  it('infers postgres hint from error code when not in details', () => {
    const hint = postgresHintFromLog({ error_code: '42P01', error_message: 'relation "x" does not exist' });
    expect(hint).toMatch(/table is missing/i);
  });
});
