import { describe, it, expect } from 'vitest';
import { parseCsvRow, parseCsvContent } from './csv';

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
