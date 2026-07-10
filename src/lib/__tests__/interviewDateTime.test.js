const {
  combineYmdAndTimeToLocalDate,
  normalizeTimeHm,
  validateInterviewDateTime,
  validateInterviewDateTimeOrError,
} = require('@/lib/dateOnly');

function todayYmd() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function tomorrowYmd() {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

describe('validateInterviewDateTime', () => {
  it('rejects past dates', () => {
    const result = validateInterviewDateTime('2020-01-01', '10:00', { allowPast: false });
    expect(result.ok).toBe(false);
  });

  it('rejects today with a time that has already passed', () => {
    const today = todayYmd();
    const result = validateInterviewDateTime(today, '00:01', { allowPast: false });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/future/i);
  });

  it('accepts tomorrow at a valid time', () => {
    const result = validateInterviewDateTime(tomorrowYmd(), '10:30', { allowPast: false });
    expect(result.ok).toBe(true);
    expect(result.value.time).toBe('10:30');
  });

  it('allows unchanged slots when allowPast is true', () => {
    const result = validateInterviewDateTime('2020-01-01', '09:00', { allowPast: true });
    expect(result.ok).toBe(true);
  });

  it('normalizes time to HH:MM', () => {
    expect(normalizeTimeHm('9:05:00')).toBe('09:05');
  });

  it('combines date and time in local timezone', () => {
    const dt = combineYmdAndTimeToLocalDate('2030-06-15', '14:30');
    expect(dt.getFullYear()).toBe(2030);
    expect(dt.getMonth()).toBe(5);
    expect(dt.getDate()).toBe(15);
    expect(dt.getHours()).toBe(14);
    expect(dt.getMinutes()).toBe(30);
  });

  it('returns null error helper when valid', () => {
    expect(validateInterviewDateTimeOrError(tomorrowYmd(), '11:00')).toBeNull();
  });
});
