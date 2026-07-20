import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import { parseIcsCalendar } from '@/lib/icsParse';
import {
  defaultBlockingForEventType,
  detectDriveClashesForEventBatch,
  formatClashSummary,
} from '@/lib/calendarClashDetection';
import { hasColumn } from '@/lib/migrationReady';
import { toDateOnlyString } from '@/lib/dateOnly';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MAX_ICS_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['exam', 'holiday', 'festival', 'placement_drive', 'interview_slot', 'workshop', 'other']);

async function readIcsText(request) {
  const contentType = String(request.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return { error: 'Upload an .ics calendar file.', status: 400 };
    }
    if (file.size > MAX_ICS_BYTES) {
      return { error: 'ICS file is too large (max 5 MB).', status: 400 };
    }
    const name = String(file.name || '').toLowerCase();
    if (name && !name.endsWith('.ics') && !name.endsWith('.ical')) {
      return { error: 'Upload a .ics or .ical file.', status: 400 };
    }
    const icsText = await file.text();
    const fromDate = String(form.get('fromDate') || '').trim() || null;
    const toDate = String(form.get('toDate') || '').trim() || null;
    const markBlocking = String(form.get('markBlocking') || '') === 'true';
    const expandRrule = String(form.get('expandRrule') || 'true') !== 'false';
    const dryRun = String(form.get('dryRun') || '') === 'true';
    return { icsText, fromDate, toDate, markBlocking, expandRrule, dryRun };
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.icsText !== 'string') {
    return { error: 'ICS content is required.', status: 400 };
  }
  if (Buffer.byteLength(body.icsText, 'utf8') > MAX_ICS_BYTES) {
    return { error: 'ICS content is too large (max 5 MB).', status: 400 };
  }
  return {
    icsText: body.icsText,
    fromDate: String(body.fromDate || '').trim() || null,
    toDate: String(body.toDate || '').trim() || null,
    markBlocking: Boolean(body.markBlocking),
    expandRrule: body.expandRrule !== false,
    dryRun: Boolean(body.dryRun),
  };
}

async function __platform_POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'college_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const tenantId = session.user.tenantId || session.user.tenant_id;
  if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

  const parsedBody = await readIcsText(request);
  if (parsedBody.error) {
    return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status || 400 });
  }

  const { icsText, fromDate, toDate, markBlocking, expandRrule, dryRun } = parsedBody;
  if (!String(icsText || '').includes('BEGIN:VCALENDAR')) {
    return NextResponse.json({ error: 'File does not look like a valid .ics calendar.' }, { status: 400 });
  }

  const parsed = parseIcsCalendar(icsText, {
    fromDate: fromDate || toDateOnlyString(new Date()),
    toDate,
    expandRrule,
  });

  if (!parsed.events.length) {
    return NextResponse.json({
      success: true,
      imported: 0,
      skipped: parsed.skipped,
      parsed: parsed.parsed,
      calendarName: parsed.calendarName,
      message: 'No events matched the import filters.',
      preview: [],
    });
  }

  const preview = parsed.events.slice(0, 8).map((e) => ({
    title: e.title,
    startDate: e.startDate,
    endDate: e.endDate,
    eventType: e.eventType,
  }));

  const clashCandidates = parsed.events.map((ev) => ({
    title: ev.title,
    eventType: ALLOWED_TYPES.has(ev.eventType) ? ev.eventType : 'other',
    startDate: ev.startDate,
    endDate: ev.endDate || ev.startDate,
    isBlocking: markBlocking ? true : defaultBlockingForEventType(ev.eventType),
  }));
  const clashPreview = await detectDriveClashesForEventBatch(query, tenantId, clashCandidates);
  const clashSummary = formatClashSummary(clashPreview.clashes);

  if (dryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      wouldImport: parsed.events.length,
      skipped: parsed.skipped,
      parsed: parsed.parsed,
      calendarName: parsed.calendarName,
      timezone: parsed.timezone,
      preview,
      driveClashes: clashPreview.clashes,
      clashByEvent: clashPreview.byEvent.slice(0, 8),
      warning: clashSummary || null,
      hasDriveClashes: clashPreview.clashes.length > 0,
    });
  }

  const hasSourceUid = await hasColumn('college_calendar', 'source_uid');

  let existingUids = new Set();
  if (hasSourceUid) {
    const existing = await query(
      `SELECT source_uid FROM college_calendar
       WHERE tenant_id = $1::uuid AND source_uid IS NOT NULL`,
      [tenantId],
    );
    existingUids = new Set(existing.rows.map((r) => String(r.source_uid)));
  } else {
    const existing = await query(
      `SELECT title, start_date::text AS start_date FROM college_calendar WHERE tenant_id = $1::uuid`,
      [tenantId],
    );
    existingUids = new Set(
      existing.rows.map((r) => `${String(r.title).toLowerCase()}|${String(r.start_date).slice(0, 10)}`),
    );
  }

  const toInsert = [];
  let duplicate = 0;
  for (const ev of parsed.events) {
    const eventType = ALLOWED_TYPES.has(ev.eventType) ? ev.eventType : 'other';
    const dedupeKey = hasSourceUid
      ? ev.uid
      : `${ev.title.toLowerCase()}|${ev.startDate}`;
    if (existingUids.has(dedupeKey)) {
      duplicate += 1;
      continue;
    }
    existingUids.add(dedupeKey);
    const isBlocking = markBlocking ? true : defaultBlockingForEventType(eventType);
    toInsert.push({
      title: ev.title,
      eventType,
      startDate: ev.startDate,
      endDate: ev.endDate || ev.startDate,
      isBlocking,
      description: ev.description || null,
      sourceUid: ev.uid,
    });
  }

  let imported = 0;
  if (toInsert.length) {
    await transaction(async (client) => {
      const chunkSize = 100;
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize);
        if (hasSourceUid) {
          const values = [];
          const params = [];
          chunk.forEach((row, idx) => {
            const o = idx * 8;
            values.push(
              `($${o + 1}::uuid, $${o + 2}, $${o + 3}, $${o + 4}::date, $${o + 5}::date, $${o + 6}, $${o + 7}, $${o + 8})`,
            );
            params.push(
              tenantId,
              row.title,
              row.eventType,
              row.startDate,
              row.endDate,
              row.isBlocking,
              row.description,
              row.sourceUid,
            );
          });
          const res = await client.query(
            `INSERT INTO college_calendar
               (tenant_id, title, event_type, start_date, end_date, is_blocking, description, source_uid)
             VALUES ${values.join(', ')}
             ON CONFLICT (tenant_id, source_uid) DO NOTHING`,
            params,
          );
          imported += res.rowCount || 0;
        } else {
          const values = [];
          const params = [];
          chunk.forEach((row, idx) => {
            const o = idx * 7;
            values.push(
              `($${o + 1}::uuid, $${o + 2}, $${o + 3}, $${o + 4}::date, $${o + 5}::date, $${o + 6}, $${o + 7})`,
            );
            params.push(
              tenantId,
              row.title,
              row.eventType,
              row.startDate,
              row.endDate,
              row.isBlocking,
              row.description,
            );
          });
          const res = await client.query(
            `INSERT INTO college_calendar
               (tenant_id, title, event_type, start_date, end_date, is_blocking, description)
             VALUES ${values.join(', ')}`,
            params,
          );
          imported += res.rowCount || 0;
        }
      }
    });
  }

  return NextResponse.json({
    success: true,
    imported,
    duplicates: duplicate,
    skipped: parsed.skipped,
    parsed: parsed.parsed,
    calendarName: parsed.calendarName,
    timezone: parsed.timezone,
    preview,
    driveClashes: clashPreview.clashes,
    clashByEvent: clashPreview.byEvent.slice(0, 8),
    warning: clashSummary || null,
    hasDriveClashes: clashPreview.clashes.length > 0,
    message:
      imported > 0
        ? `Imported ${imported} event${imported === 1 ? '' : 's'} from calendar.${
            clashSummary ? ` ${clashSummary}` : ''
          }`
        : duplicate > 0
          ? 'All matching events were already on your calendar.'
          : 'No events were imported.',
  });
}

const __platformApiHandlers = withApiHandlers(
  { POST: __platform_POST },
  { context: 'api_college_calendar_import' },
);
export const POST = __platformApiHandlers.POST;
