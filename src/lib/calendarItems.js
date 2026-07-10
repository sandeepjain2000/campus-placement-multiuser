import { toDateOnlyString } from '@/lib/dateOnly';
import { formatStatus } from '@/lib/utils';

/** Normalize college API events to CampusCalendarGrid items. */
export function collegeEventsToCalendarItems(events) {
  return (Array.isArray(events) ? events : []).map((e) => {
    const date =
      e.date ||
      toDateOnlyString(e.start_date) ||
      (e.startDate instanceof Date ? toDateOnlyString(e.startDate) : '');
    return {
      id: e.id,
      date,
      title: e.title || 'Event',
      type: e.type || e.event_type || 'other',
      meta: formatStatus(e.type || e.event_type || 'other'),
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
