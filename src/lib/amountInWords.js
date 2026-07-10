const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function wordsUnder100(n) {
  if (n <= 0) return '';
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return one ? `${TENS[ten]} ${ONES[one]}`.trim() : TENS[ten];
}

function wordsUnder1000(n) {
  if (n <= 0) return '';
  if (n < 100) return wordsUnder100(n);
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const head = `${ONES[hundred]} Hundred`;
  return rest ? `${head} ${wordsUnder100(rest)}`.trim() : head;
}

/**
 * Convert a whole INR amount to Indian English words (Lakh / Crore grouping).
 * @param {number|string|null|undefined} amount
 * @param {{ suffix?: string }} [options]
 * @returns {string} e.g. "Ten Lakh Rupees" or "" when empty/invalid
 */
export function formatIndianAmountInWords(amount, { suffix = 'Rupees' } = {}) {
  if (amount === '' || amount == null) return '';
  const n = Math.floor(Number(amount));
  if (!Number.isFinite(n) || n < 0) return '';
  if (n === 0) return suffix ? `Zero ${suffix}` : 'Zero';

  const parts = [];
  let remaining = n;

  const crore = Math.floor(remaining / 10000000);
  if (crore) {
    parts.push(`${wordsUnder1000(crore)} Crore`);
    remaining %= 10000000;
  }

  const lakh = Math.floor(remaining / 100000);
  if (lakh) {
    parts.push(`${wordsUnder1000(lakh)} Lakh`);
    remaining %= 100000;
  }

  const thousand = Math.floor(remaining / 1000);
  if (thousand) {
    parts.push(`${wordsUnder1000(thousand)} Thousand`);
    remaining %= 1000;
  }

  if (remaining) {
    parts.push(wordsUnder1000(remaining));
  }

  const phrase = parts.join(' ').replace(/\s+/g, ' ').trim();
  return suffix ? `${phrase} ${suffix}` : phrase;
}

/**
 * Combine optional package CTC and free-text breakup for drive storage.
 * @param {string|number|null|undefined} packageAmount
 * @param {string|null|undefined} details
 * @param {(n: number) => string} formatCurrencyFn
 */
export function buildDriveCtcBreakup(packageAmount, details, formatCurrencyFn) {
  const detailText = String(details ?? '').trim();
  const raw = packageAmount === '' || packageAmount == null ? '' : String(packageAmount).trim();
  if (!raw) return detailText || null;

  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) return detailText || null;

  const words = formatIndianAmountInWords(amount);
  const header = `Package: ${formatCurrencyFn(amount)} (${words})`;
  return detailText ? `${header}\n${detailText}` : header;
}
