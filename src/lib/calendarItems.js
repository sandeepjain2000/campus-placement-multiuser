import { toDateOnlyString } from '@/lib/dateOnly';
import { formatStatus } from '@/lib/utils';

/** Resolve college calendar category for filters: placement | imported | program */
export function resolveCollegeEventCategory(event) {
  if (!event || typeof event !== 'object') return 'program';
  if (event.category === 'placement' || event.category === 'imported' || event.category === 'program') {
    return event.category;
  }
  if (event.source === 'placement_drive' || event.event_type === 'placement_drive' || event.type === 'placement_drive') {
    return 'placement';
  }
  if (event.source === 'imported' || (event.source_uid && String(event.source_uid).trim())) {
    return 'imported';
  }
  return 'program';
}

/** Normalize college API events to CampusCalendarGrid items. */
export function collegeEventsToCalendarItems(events) {
  return (Array.isArray(events) ? events : []).map((e) => {
    const date =
      e.date ||
      toDateOnlyString(e.start_date) ||
      (e.startDate instanceof Date ? toDateOnlyString(e.startDate) : '');
    const endDate =
      toDateOnlyString(e.end_date) ||
      toDateOnlyString(e.endDate) ||
      date;
    const category = resolveCollegeEventCategory(e);
    const eventType = e.type || e.event_type || 'other';
    const imported = category === 'imported';
    const blockingType = eventType === 'exam' || eventType === 'holiday' || Boolean(e.is_blocking ?? e.isBlocking);
    return {
      id: e.id,
      date,
      endDate,
      title: e.title || 'Event',
      // Keep exam/holiday types for clash + color; mark other imports as "imported"
      type: imported && !blockingType ? 'imported' : eventType,
      category,
      imported,
      isBlocking: blockingType,
      meta: imported
        ? `Imported · ${formatStatus(eventType)}`
        : category === 'placement'
          ? 'Placement'
          : formatStatus(eventType),
    };
  });
}

/** Normalize student API events to CampusCalendarGrid items. */
export function studentEventsToCalendarItems(events) {
  return (Array.isArray(events) ? events : []).map((e, i) => ({
    id: e.id ?? `student-ev-${i}`,
    date: String(e.date || '').slice(0, 10),
    title: e.title || 'Event',
    type: e.type || 'drive',
    meta: e.status ? formatStatus(e.status) : undefined,
  }));
}

/** Normalize infrastructure bookings to CampusCalendarGrid items. */
export function infrastructureBookingsToCalendarItems(bookings) {
  return (Array.isArray(bookings) ? bookings : []).map((b) => {
    const start = b.startTime || b.start_time;
    const end = b.endTime || b.end_time;
    const time = start && end ? `${start} – ${end}` : start || end || undefined;
    return {
      id: b.id,
      date: String(b.date || '').slice(0, 10),
      title: b.company || 'Booking',
      type: 'booking',
      time,
      meta: b.description || undefined,
    };
  });
}
