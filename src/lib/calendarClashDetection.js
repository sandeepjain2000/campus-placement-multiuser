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

export async function findBlockingCalendarEvents(dbQuery, tenantId, startDate, endDate, { excludeCalendarId } = {}) {
  const params = [tenantId, startDate, endDate];
  let excludeClause = '';
  if (excludeCalendarId) {
    params.push(excludeCalendarId);
    excludeClause = ` AND id <> $${params.length}::uuid`;
  }
  const res = await dbQuery(
    `SELECT id, title, event_type, start_date, end_date, is_blocking, description
     FROM college_calendar
     WHERE tenant_id = $1::uuid
       AND (event_type = 'exam' OR is_blocking = true)
       AND start_date <= $3::date
       AND COALESCE(end_date, start_date) >= $2::date
       ${excludeClause}
     ORDER BY start_date ASC`,
    params,
  );
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
  return {
    kind: 'calendar',
    id: row.id,
    title: row.title,
    eventType: row.event_type,
    startDate: toDateOnlyString(row.start_date),
    endDate: toDateOnlyString(row.end_date || row.start_date),
    isBlocking: Boolean(row.is_blocking),
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

/** True when a calendar event period overlaps any active drive dates in range. */
export function eventRangeOverlapsDriveDates(eventStart, eventEnd, driveDates) {
  const end = toDateOnlyString(eventEnd || eventStart);
  const start = toDateOnlyString(eventStart);
  return (Array.isArray(driveDates) ? driveDates : []).some((d) =>
    periodsOverlap(start, end, d, d),
  );
}

export function formatClashSummary(clashes, { bufferDays = 0 } = {}) {
  if (!Array.isArray(clashes) || !clashes.length) return '';
  const parts = clashes.slice(0, 3).map((c) => {
    if (c.kind === 'drive') {
      return `${c.title} (${c.driveDate})`;
    }
    const range =
      c.startDate === c.endDate ? c.startDate : `${c.startDate} – ${c.endDate}`;
    return `${c.title} (${range})`;
  });
  const suffix = clashes.length > 3 ? ` and ${clashes.length - 3} more` : '';
  const bufferNote =
    bufferDays > 0 ? ` Buffer rule: ±${bufferDays} day(s) from placement rules.` : '';
  return `Conflicts with: ${parts.join('; ')}${suffix}.${bufferNote}`;
}
