/** @jest-environment node */

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

const { query } = require('@/lib/db');
const {
  buildPlatformErrorResponse,
  writePlatformErrorLog,
  formatErrorReference,
  logApiResponseIfFailure,
} = require('@/lib/platformErrorLog');
const { PLATFORM_ERROR_CONTEXT } = require('@/lib/platformErrorContext');

describe('platformErrorLog CRUD failure logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    query.mockResolvedValue({ rows: [{ id: '11111111-2222-3333-4444-555555555555' }] });
  });

  it('writes a log entry for 500 server errors', async () => {
    const err = new Error('column d.is_deleted does not exist');
    err.code = '42703';

    const { status, body } = await buildPlatformErrorResponse(err, {
      context: PLATFORM_ERROR_CONTEXT.EMPLOYER_DRIVE_LIST,
      defaultMessage: 'Failed to load placement drives',
      sessionUser: { id: 'user-1', email: 'hr@test.com' },
      request: new Request('https://example.com/api/employer/drives'),
    });

    expect(status).toBe(500);
    expect(query).toHaveBeenCalledTimes(1);
    expect(String(query.mock.calls[0][0])).toContain('INSERT INTO platform_error_logs');
    expect(body.reference).toBe(formatErrorReference('11111111-2222-3333-4444-555555555555'));
    expect(body.userMessage).toMatch(/Failed to load placement drives/);
    expect(body.userMessage).toMatch(/migration/i);
    const details = JSON.parse(query.mock.calls[0][1][9]);
    expect(details.route).toBe('/api/employer/drives');
    expect(details.requestMethod).toBe('GET');
    expect(details.pgHint).toMatch(/column is missing/i);
  });

  it('writes a warning log for 403 client errors (except 401)', async () => {
    const err = new Error('No approved partnership with this campus');
    err.statusCode = 403;

    const { status, body } = await buildPlatformErrorResponse(err, {
      context: PLATFORM_ERROR_CONTEXT.EMPLOYER_DRIVE_CREATE,
      defaultMessage: 'Failed to create drive',
    });

    expect(status).toBe(403);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][1][0]).toBe('warning');
    expect(body.error).toMatch(/No approved partnership/);
    expect(body.reference).toBe(formatErrorReference('11111111-2222-3333-4444-555555555555'));
    expect(body.error).toMatch(/\[Ref: 11111111\]/);
  });

  it('writes an info log for 401 unauthorized', async () => {
    const err = new Error('Unauthorized');
    err.statusCode = 401;

    const { status } = await buildPlatformErrorResponse(err, {
      context: PLATFORM_ERROR_CONTEXT.EMPLOYER_CALENDAR,
      defaultMessage: 'Failed to load calendar events',
    });

    expect(status).toBe(401);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][1][0]).toBe('info');
  });

  it('covers employer CRUD context keys', () => {
    const crudContexts = [
      'EMPLOYER_DRIVE_LIST',
      'EMPLOYER_DRIVE_GET',
      'EMPLOYER_DRIVE_CREATE',
      'EMPLOYER_DRIVE_UPDATE',
      'EMPLOYER_DRIVE_CANCEL',
      'EMPLOYER_JOB_LIST',
      'EMPLOYER_JOB_CREATE',
      'EMPLOYER_JOB_UPDATE',
      'EMPLOYER_PROFILE_READ',
      'EMPLOYER_PROFILE_UPDATE',
      'EMPLOYER_CAMPUS_LIST',
      'EMPLOYER_CAMPUS_REQUEST',
      'EMPLOYER_APPLICATION_LIST',
      'EMPLOYER_APPLICATION_UPDATE',
      'EMPLOYER_CALENDAR',
      'EMPLOYER_DASHBOARD',
    ];
    for (const key of crudContexts) {
      expect(PLATFORM_ERROR_CONTEXT[key]).toBeTruthy();
    }
  });

  it('writePlatformErrorLog returns null and does not throw when table missing', async () => {
    query.mockRejectedValueOnce(Object.assign(new Error('relation does not exist'), { code: '42P01' }));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const id = await writePlatformErrorLog({
      context: PLATFORM_ERROR_CONTEXT.EMPLOYER_DRIVE_LIST,
      error: new Error('test'),
      statusCode: 500,
    });

    expect(id).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('logApiResponseIfFailure attaches reference to 403 JSON responses', async () => {
    const { NextResponse } = require('next/server');
    const request = new Request('https://example.com/api/clarifications', { method: 'POST' });
    const response = NextResponse.json({ error: 'Tenant context missing' }, { status: 403 });

    const out = await logApiResponseIfFailure(request, response, {
      context: 'api_clarifications',
    });

    expect(out.status).toBe(403);
    const body = await out.json();
    expect(body.reference).toBe(formatErrorReference('11111111-2222-3333-4444-555555555555'));
    expect(body.error).toMatch(/Tenant context missing/);
    expect(body.error).toMatch(/\[Ref: 11111111\]/);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
