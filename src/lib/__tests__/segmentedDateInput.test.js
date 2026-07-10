const {
  applySegmentBackspace,
  composeYmd,
  partsFromValue,
} = require('@/components/form/SegmentedDateInput');

describe('SegmentedDateInput helpers', () => {
  it('parses and composes YYYY-MM-DD', () => {
    expect(partsFromValue('2026-06-15')).toEqual({
      year: '2026',
      month: '06',
      day: '15',
    });
    expect(
      composeYmd({
        day: '15',
        month: '06',
        year: '2026',
      }),
    ).toBe('2026-06-15');
  });

  it('backspace on year clears year first', () => {
    const parts = { day: '15', month: '06', year: '2026' };
    expect(applySegmentBackspace('year', parts)).toEqual({
      parts: { day: '15', month: '06', year: '' },
      focus: 'year',
    });
  });

  it('second backspace on empty year moves to month and clears it', () => {
    const parts = { day: '15', month: '06', year: '' };
    expect(applySegmentBackspace('year', parts)).toEqual({
      parts: { day: '15', month: '', year: '' },
      focus: 'month',
    });
  });

  it('third backspace on empty month moves to day and clears it', () => {
    const parts = { day: '15', month: '', year: '' };
    expect(applySegmentBackspace('month', parts)).toEqual({
      parts: { day: '', month: '', year: '' },
      focus: 'day',
    });
  });
});
