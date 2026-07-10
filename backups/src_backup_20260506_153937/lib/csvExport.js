/**
 * RFC 4180–style CSV helpers with Excel-friendly UTF-8 BOM.
 */

export function escapeCsvField(value) {
  if (value == null || value === '') return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * @param {string[]} headers
 * @param {string[][]} rows — each row is an array of cell values in header order
 */
export function rowsToCsv(headers, rows) {
  const lines = [
    headers.map(escapeCsvField).join(','),
    ...rows.map((row) => row.map(escapeCsvField).join(',')),
  ];
  return lines.join('\n');
}

/**
 * @param {string} filename — with or without .csv
 * @param {string} csvString — raw CSV body (no BOM); BOM is prepended here
 */
export function downloadCsv(filename, csvString) {
  const name = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  const blob = new Blob([`\uFEFF${csvString}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCsvFromRows(filename, headers, rows) {
  downloadCsv(filename, rowsToCsv(headers, rows));
}

/**
 * Parse CSV text into header row + data rows (RFC 4180 quotes, UTF-8 BOM stripped from first header).
 * @param {string} text
 * @returns {{ headers: string[]; rows: string[][] }}
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const s = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      if (row.some((cell) => String(cell).trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  row.push(field);
  if (row.some((cell) => String(cell).trim() !== '')) rows.push(row);

  if (rows.length === 0) return { headers: [], rows: [] };
  const headers = rows[0].map((h) => String(h).trim());
  const dataRows = rows.slice(1).filter((r) => r.some((cell) => String(cell).trim() !== ''));
  return { headers, rows: dataRows };
}
