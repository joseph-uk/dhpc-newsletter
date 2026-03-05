import { describe, it, expect } from 'vitest';
import { parseCsvRow, parseCsvContent, formatCsvRow, isActiveRow } from './csv';

describe('parseCsvRow', () => {
  it('parses a valid CSV row', () => {
    const row = parseCsvRow('2025-01,January 2025,https://docs.google.com/doc/pub,frozen', 2);
    expect(row.slug).toBe('2025-01');
    expect(row.title).toBe('January 2025');
    expect(row.docUrl).toBe('https://docs.google.com/doc/pub');
    expect(row.status).toBe('frozen');
  });

  it('trims whitespace from fields', () => {
    const row = parseCsvRow(' 2025-01 , January 2025 , https://example.com , frozen ', 2);
    expect(row.slug).toBe('2025-01');
    expect(row.title).toBe('January 2025');
    expect(row.docUrl).toBe('https://example.com');
    expect(row.status).toBe('frozen');
  });

  it('accepts all valid statuses', () => {
    expect(parseCsvRow('a,b,c,frozen', 1).status).toBe('frozen');
    expect(parseCsvRow('a,b,c,published', 1).status).toBe('published');
    expect(parseCsvRow('a,b,c,pre-release', 1).status).toBe('pre-release');
  });

  it('throws on too few fields', () => {
    expect(() => parseCsvRow('a,b,c', 3)).toThrow('CSV line 3: expected 4 fields, got 3');
  });

  it('throws on missing slug', () => {
    expect(() => parseCsvRow(',title,url,frozen', 2)).toThrow('CSV line 2: missing slug');
  });

  it('throws on missing title', () => {
    expect(() => parseCsvRow('slug,,url,frozen', 2)).toThrow('CSV line 2: missing title');
  });

  it('throws on missing doc_url', () => {
    expect(() => parseCsvRow('slug,title,,frozen', 2)).toThrow('CSV line 2: missing doc_url');
  });

  it('throws on missing status', () => {
    expect(() => parseCsvRow('slug,title,url,', 2)).toThrow('CSV line 2: missing status');
  });

  it('throws on invalid status', () => {
    expect(() => parseCsvRow('slug,title,url,draft', 2)).toThrow('invalid status "draft"');
  });

  it('accepts disabled:reason status', () => {
    const row = parseCsvRow('2025-01,January 2025,https://example.com,disabled:duplicate', 2);
    expect(row.status).toBe('disabled:duplicate');
  });

  it('accepts disabled with any reason string', () => {
    const row = parseCsvRow('a,b,c,disabled:old-draft', 1);
    expect(row.status).toBe('disabled:old-draft');
  });

  it('rejects bare "disabled" without a reason', () => {
    expect(() => parseCsvRow('a,b,c,disabled', 1)).toThrow('invalid status');
  });
});

describe('isActiveRow', () => {
  it('returns true for published status', () => {
    expect(isActiveRow({ slug: 'a', title: 'b', docUrl: 'c', status: 'published' })).toBe(true);
  });

  it('returns true for frozen status', () => {
    expect(isActiveRow({ slug: 'a', title: 'b', docUrl: 'c', status: 'frozen' })).toBe(true);
  });

  it('returns false for disabled status', () => {
    expect(isActiveRow({ slug: 'a', title: 'b', docUrl: 'c', status: 'disabled:duplicate' })).toBe(false);
  });
});

describe('parseCsvContent', () => {
  it('parses valid CSV content with header', () => {
    const content = 'slug,title,doc_url,status\n2025-01,Jan,https://example.com,frozen\n2025-02,Feb,https://example.com,published';
    const rows = parseCsvContent(content);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.slug).toBe('2025-01');
    expect(rows[1]?.slug).toBe('2025-02');
  });

  it('skips blank lines', () => {
    const content = 'slug,title,doc_url,status\n2025-01,Jan,https://example.com,frozen\n\n';
    const rows = parseCsvContent(content);
    expect(rows).toHaveLength(1);
  });

  it('throws on empty content', () => {
    expect(() => parseCsvContent('')).toThrow('CSV content is empty');
  });

  it('throws on wrong header', () => {
    expect(() => parseCsvContent('wrong,header\na,b')).toThrow('CSV header mismatch');
  });

  it('returns empty array when only header present', () => {
    const rows = parseCsvContent('slug,title,doc_url,status\n');
    expect(rows).toHaveLength(0);
  });
});

describe('formatCsvRow', () => {
  it('formats a row as comma-separated values', () => {
    const result = formatCsvRow({
      slug: '2025-01',
      title: 'January 2025',
      docUrl: 'https://docs.google.com/doc/pub',
      status: 'frozen',
    });
    expect(result).toBe('2025-01,January 2025,https://docs.google.com/doc/pub,frozen');
  });

  it('round-trips through parse and format', () => {
    const line = '2025-03,March 2025,https://example.com/pub,published';
    const row = parseCsvRow(line, 1);
    expect(formatCsvRow(row)).toBe(line);
  });
});
