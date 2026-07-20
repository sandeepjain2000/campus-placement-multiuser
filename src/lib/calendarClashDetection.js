import { toDateOnlyString, parseYmdToLocalDate } from '@/lib/dateOnly';
import { periodsOverlap } from '@/lib/academicYearTenant';
import { AND_DRIVE_NOT_DELETED } from '@/lib/softDeleteSql';

/** Academic program types colleges can add to avoid drive clashes. */
export const COLLEGE_PROGRAM_EVENT_TYPES = [
  { value: 'exam', label: 'Exam / End-semester', blocksDrives: true },
  { value: 'workshop', label: 'Workshop / Training', blocksDrives: false },
  { value: 'festival', label: 'Festival / Campus event', blocksDrives: false },
  { value: 'holiday', label: 'Holiday (no placements)', blocksDrives: true },
  { value: 'other', label: 'Other academic program', blocksDrives: false },
];

const ACTIVE_DRIVE_STATUSES = ['requested', 'approved', 'scheduled', 'in_progress'];
const BLOCKING_EVENT_TYPES = new Set(['exam', 'holiday']);

export function addDaysToYmd(ymd, days) {
  const d = parseYmdToLocalDate(String(ymd || '').slice(0, 10));
  if (!d) return String(ymd || '').slice(0, 10);
  d.setDate(d.getDate() + Number(days) || 0);
  return toDateOnlyString(d);
}

export function defaultBlockingForEventType(eventType) {
  const row = COLLEGE_PROGRAM_EVENT_TYPES.find((t) => t.value === eventType);
  return Boolean(row?.blocksDrives);
}

/** Whether a college_calendar row should warn against placement drives. */
export function isDriveBlockingCalendarRow(row) {
  if (!row) return false;
  if (row.is_blocking === true || row.isBlocking === true) return true;
  const type = String(row.event_type || row.eventType || row.type || '').toLowerCase();
  return BLOCKING_EVENT_TYPES.has(type);
}

export async function loadBufferDays(dbQuery, tenantId) {
  try {
    const res = await dbQuery(
      `SELECT COALESCE(buffer_days_between_drives, 0) AS buffer_days
       FROM college_settings WHERE tenant_id = $1::uuid LIMIT 1`,
      [tenantId],
    );
    return Math.max(0, Number(res.rows[0]?.buffer_days) || 0);
  } catch {
    return 0;
  }
}

/**
 * Blocking academic / imported calendar events overlapping [startDate, endDate].
 * Includes exams, holidays, explicitly blocking rows, and imported rows of those kinds.
 */
export async function findBlockingCalendarEvents(dbQuery, tenantId, startDate, endDate, { excludeCalendarId } = {}) {
  const params = [tenantId, startDate, endDate];
  let excludeClause = '';
  if (excludeCalendarId) {
    params.push(excludeCalendarId);
    excludeClause = ` AND id <> $${params.length}::uuid`;
  }

  // source_uid may be missing before migration 112 — query without it first, then enrich.
  let res;
  try {
    res = await dbQuery(
      `SELECT id, title, event_type, start_date, end_date, is_blocking, description, source_uid
       FROM college_calendar
       WHERE tenant_id = $1::uuid
         AND (
           event_type IN ('exam', 'holiday')
           OR is_blocking = true
         )
         AND start_date <= $3::date
         AND COALESCE(end_date, start_date) >= $2::date
         ${excludeClause}
       ORDER BY start_date ASC`,
      params,
    );
  } catch (err) {
    if (!/source_uid/i.test(String(err?.message || ''))) throw err;
    res = await dbQuery(
      `SELECT id, title, event_type, start_date, end_date, is_blocking, description,
              NULL::text AS source_uid
       FROM college_calendar
       WHERE tenant_id = $1::uuid
         AND (
           event_type IN ('exam', 'holiday')
           OR is_blocking = true
         )
         AND start_date <= $3::date
         AND COALESCE(end_date, start_date) >= $2::date
         ${excludeClause}
       ORDER BY start_date ASC`,
      params,
    );
  }
  return res.rows;
}

export async function findPlacementDrivesInRange(
  dbQuery,
  tenantId,
  startDate,
  endDate,
  { excludeDriveId, statuses = ACTIVE_DRIVE_STATUSES } = {},
) {
  const params = [tenantId, startDate, endDate, statuses];
  let excludeClause = '';
  if (excludeDriveId) {
    params.push(excludeDriveId);
    excludeClause = ` AND d.id <> $${params.length}::uuid`;
  }
  const res = await dbQuery(
    `SELECT d.id, d.title, d.drive_date, d.status, ep.company_name
     FROM placement_drives d
     LEFT JOIN employer_profiles ep ON ep.id = d.employer_id
     WHERE d.tenant_id = $1::uuid
       AND d.drive_date >= $2::date
       AND d.drive_date <= $3::date
       AND d.status = ANY($4::varchar[])
       ${AND_DRIVE_NOT_DELETED}
       ${excludeClause}
     ORDER BY d.drive_date ASC`,
    params,
  );
  return res.rows;
}

function mapCalendarClash(row) {
  const imported = Boolean(row.source_uid && String(row.source_uid).trim());
  return {
    kind: 'calendar',
    id: row.id,
    title: row.title,
    eventType: row.event_type,
    startDate: toDateOnlyString(row.start_date),
    endDate: toDateOnlyString(row.end_date || row.start_date),
    isBlocking: Boolean(row.is_blocking) || isDriveBlockingCalendarRow(row),
    imported,
    source: imported ? 'imported' : 'program',
  };
}

function mapDriveClash(row) {
  const company = row.company_name ? `${row.company_name} — ` : '';
  return {
    kind: 'drive',
    id: row.id,
    title: `${company}${row.title || 'Placement drive'}`,
    driveDate: toDateOnlyString(row.drive_date),
    status: row.status,
  };
}

/** Clashes when approving a drive on driveDate (includes buffer days from college rules). */
export async function detectDriveApprovalClashes(dbQuery, tenantId, driveDate, { excludeDriveId } = {}) {
  const date = toDateOnlyString(driveDate);
  if (!date) return { clashes: [], bufferDays: 0 };

  const bufferDays = await loadBufferDays(dbQuery, tenantId);
  const rangeStart = addDaysToYmd(date, -bufferDays);
  const rangeEnd = addDaysToYmd(date, bufferDays);

  const calendarRows = await findBlockingCalendarEvents(dbQuery, tenantId, rangeStart, rangeEnd);
  const clashes = calendarRows.map(mapCalendarClash);

  return { clashes, bufferDays, rangeStart, rangeEnd, driveDate: date };
}

/** Clashes when adding/updating a college calendar program in a date range. */
export async function detectCalendarProgramClashes(
  dbQuery,
  tenantId,
  startDate,
  endDate,
  { excludeCalendarId, includeRequestedDrives = true } = {},
) {
  const start = toDateOnlyString(startDate);
  const end = toDateOnlyString(endDate || startDate);
  if (!start || !end) return { clashes: [], drives: [] };

  const statuses = includeRequestedDrives
    ? ACTIVE_DRIVE_STATUSES
    : ACTIVE_DRIVE_STATUSES.filter((s) => s !== 'requested');

  const drives = await findPlacementDrivesInRange(dbQuery, tenantId, start, end, {
    excludeDriveId: null,
    statuses,
  });

  return {
    clashes: drives.map(mapDriveClash),
    drives: drives.map(mapDriveClash),
    startDate: start,
    endDate: end,
  };
}

/**
 * Detect drive clashes for a batch of calendar events (e.g. ICS import preview).
 * Only checks events that would block placements (exam / holiday / isBlocking).
 */
export async function detectDriveClashesForEventBatch(dbQuery, tenantId, events) {
  const blockers = (Array.isArray(events) ? events : []).filter((ev) =>
    isDriveBlockingCalendarRow({
      event_type: ev.eventType || ev.event_type,
      is_blocking: ev.isBlocking ?? ev.is_blocking,
    }),
  );
  if (!blockers.length) return { clashes: [], byEvent: [] };

  /** @type {Map<string, object>} */
  const driveMap = new Map();
  const byEvent = [];

  for (const ev of blockers) {
    const start = toDateOnlyString(ev.startDate || ev.start_date);
    const end = toDateOnlyString(ev.endDate || ev.end_date || start);
    if (!start) continue;
    const result = await detectCalendarProgramClashes(dbQuery, tenantId, start, end);
    for (const d of result.clashes) {
      driveMap.set(String(d.id), d);
    }
    if (result.clashes.length) {
      byEvent.push({
        title: ev.title,
        startDate: start,
        endDate: end,
        eventType: ev.eventType || ev.event_type,
        clashes: result.clashes,
      });
    }
  }

  return {
    clashes: [...driveMap.values()],
    byEvent,
  };
}

/** True when a calendar event period overlaps any active drive dates in range. */
export function eventRangeOverlapsDriveDates(eventStart, eventEnd, driveDates) {
  const end = toDateOnlyString(eventEnd || eventStart);
  const start = toDateOnlyString(eventStart);
  return (Array.isArray(driveDates) ? driveDates : []).some((d) =>
    periodsOverlap(start, end, d, d),
  );
}

/**
 * Client-side: find placement vs blocking/imported overlaps from calendar grid items.
 * @param {Array<{ id: unknown, date: string, title: string, type?: string, category?: string, isBlocking?: boolean }>} items
 */
export function findPlacementImportedClashesFromItems(items) {
  const list = Array.isArray(items) ? items : [];
  const placements = list.filter((i) => i.category === 'placement' || i.type === 'placement_drive');
  const blockers = list.filter((i) => {
    if (i.category === 'placement' || i.type === 'placement_drive') return false;
    return isDriveBlockingCalendarRow({
      event_type: i.type,
      is_blocking: i.isBlocking,
    });
  });

  /** @type {Array<{ driveId: unknown, driveTitle: string, driveDate: string, eventId: unknown, eventTitle: string, eventDate: string, imported: boolean, eventType: string }>} */
  const clashes = [];
  for (const drive of placements) {
    const driveDate = toDateOnlyString(drive.date);
    if (!driveDate) continue;
    for (const ev of blockers) {
      const start = toDateOnlyString(ev.date);
      const end = toDateOnlyString(ev.endDate || ev.date);
      if (!start) continue;
      if (!periodsOverlap(start, end || start, driveDate, driveDate)) continue;
      clashes.push({
        driveId: drive.id,
        driveTitle: drive.title || 'Placement drive',
        driveDate,
        eventId: ev.id,
        eventTitle: ev.title || 'Calendar event',
        eventDate: start === (end || start) ? start : `${start} – ${end}`,
        imported: ev.category === 'imported' || Boolean(ev.imported),
        eventType: ev.type || 'other',
      });
    }
  }
  return clashes;
}

export function formatClashSummary(clashes, { bufferDays = 0 } = {}) {
  if (!Array.isArray(clashes) || !clashes.length) return '';
  const parts = clashes.slice(0, 3).map((c) => {
    if (c.kind === 'drive') {
      return `${c.title} (${c.driveDate})`;
    }
    const range =
      c.startDate === c.endDate ? c.startDate : `${c.startDate} – ${c.endDate}`;
    const importedTag = c.imported ? 'Imported ' : '';
    const typeTag =
      c.eventType === 'exam' ? 'exam' : c.eventType === 'holiday' ? 'holiday' : 'blocked date';
    return `${importedTag}${typeTag}: ${c.title} (${range})`;
  });
  const suffix = clashes.length > 3 ? ` and ${clashes.length - 3} more` : '';
  const bufferNote =
    bufferDays > 0 ? ` Buffer rule: ±${bufferDays} day(s) from placement rules.` : '';
  return `Conflicts with: ${parts.join('; ')}${suffix}.${bufferNote}`;
}
