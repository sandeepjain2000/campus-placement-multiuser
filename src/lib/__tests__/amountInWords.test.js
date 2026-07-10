import { formatIndianAmountInWords } from '@/lib/amountInWords';

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
