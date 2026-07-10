const { sniffFileKind, validateBufferContentType } = require('@/lib/fileMagicBytes');

function buf(bytes) {
  return Uint8Array.from(bytes);
}

describe('sniffFileKind', () => {
  it('detects PDF', () => {
    expect(sniffFileKind(buf([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e]))).toBe('pdf');
  });

  it('detects PNG', () => {
    expect(
      sniffFileKind(buf([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])),
    ).toBe('png');
  });

  it('detects DOCX zip', () => {
    const header = buf([0x50, 0x4b, 0x03, 0x04]);
    const tail = new TextEncoder().encode('word/document.xml');
    const combined = new Uint8Array(header.length + tail.length);
    combined.set(header);
    combined.set(tail, header.length);
    expect(sniffFileKind(combined)).toBe('docx');
  });
});

describe('validateBufferContentType', () => {
  it('rejects PDF renamed as PNG', () => {
    const pdf = buf([0x25, 0x50, 0x44, 0x46, 0x2d]);
    const result = validateBufferContentType(pdf, 'image/png');
    expect(result.ok).toBe(false);
  });

  it('rejects PNG renamed as PDF', () => {
    const png = buf([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const result = validateBufferContentType(png, 'application/pdf');
    expect(result.ok).toBe(false);
  });

  it('accepts matching PDF', () => {
    const pdf = buf([0x25, 0x50, 0x44, 0x46, 0x2d]);
    const result = validateBufferContentType(pdf, 'application/pdf');
    expect(result.ok).toBe(true);
    expect(result.contentType).toBe('application/pdf');
  });
});
