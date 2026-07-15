import { formatIndianAmountInWords, formatIndianSalaryRangeInWords } from '@/lib/amountInWords';
import { formatSalaryRange, formatSalaryRangeParts } from '@/lib/utils';

describe('formatIndianAmountInWords', () => {
  it('returns empty for blank or invalid values', () => {
    expect(formatIndianAmountInWords('')).toBe('');
    expect(formatIndianAmountInWords(null)).toBe('');
    expect(formatIndianAmountInWords('abc')).toBe('');
  });

  it('formats lakh and crore amounts in Indian English', () => {
    expect(formatIndianAmountInWords(40000)).toBe('Forty Thousand Rupees');
    expect(formatIndianAmountInWords(1000000)).toBe('Ten Lakh Rupees');
    expect(formatIndianAmountInWords(1500000)).toBe('Fifteen Lakh Rupees');
    expect(formatIndianAmountInWords(10000000)).toBe('One Crore Rupees');
    expect(formatIndianAmountInWords(12500000)).toBe('One Crore Twenty Five Lakh Rupees');
  });

  it('supports custom suffix text', () => {
    expect(formatIndianAmountInWords(40000, { suffix: 'Rupees per month' })).toBe(
      'Forty Thousand Rupees per month',
    );
  });
});

describe('formatIndianSalaryRangeInWords', () => {
  it('formats min–max bands', () => {
    expect(formatIndianSalaryRangeInWords(100000, 200000)).toBe(
      'One Lakh Rupees to Two Lakh Rupees',
    );
    expect(formatIndianSalaryRangeInWords(100000, null)).toBe('From One Lakh Rupees');
  });
});

describe('formatSalaryRangeParts', () => {
  it('keeps numbers and words separate for drive CTC display', () => {
    const parts = formatSalaryRangeParts(100000, 200000);
    expect(parts.numeric).toContain('1,00,000');
    expect(parts.numeric).toContain('2,00,000');
    expect(parts.numeric).not.toMatch(/Lakh/);
    expect(parts.words).toBe('One Lakh Rupees to Two Lakh Rupees');
    expect(formatSalaryRange(100000, 200000)).toBe(parts.numeric);
  });
});
