import { describe, it, expect } from 'vitest';
import { buildDocUrl, extractFolderId, extractSlugFromTitle, parseDriveFileList } from './driveClient';

describe('buildDocUrl', () => {
  it('constructs a published URL from a document ID', () => {
    const url = buildDocUrl('1abc123def');
    expect(url).toBe('https://docs.google.com/document/d/1abc123def/pub');
  });

  it('throws on empty document ID', () => {
    expect(() => buildDocUrl('')).toThrow('docId must not be empty');
  });
});

describe('extractSlugFromTitle', () => {
  it('extracts slug from "Skywords December 2024"', () => {
    expect(extractSlugFromTitle('Skywords December 2024')).toBe('2024-12');
  });

  it('extracts slug from "Skywords January 2025"', () => {
    expect(extractSlugFromTitle('Skywords January 2025')).toBe('2025-01');
  });

  it('extracts slug from "DHPC Newsletter March 2026"', () => {
    expect(extractSlugFromTitle('DHPC Newsletter March 2026')).toBe('2026-03');
  });

  it('extracts slug from title with just month and year', () => {
    expect(extractSlugFromTitle('February 2025')).toBe('2025-02');
  });

  it('handles case-insensitive month names', () => {
    expect(extractSlugFromTitle('skywords JULY 2025')).toBe('2025-07');
  });

  it('returns null for unrecognised title format', () => {
    expect(extractSlugFromTitle('Meeting Notes')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractSlugFromTitle('')).toBeNull();
  });

  it('extracts all 12 months correctly', () => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    months.forEach((month, index) => {
      const expected = `2025-${String(index + 1).padStart(2, '0')}`;
      expect(extractSlugFromTitle(`${month} 2025`)).toBe(expected);
    });
  });
});

describe('extractFolderId', () => {
  it('extracts folder ID from a full Drive URL', () => {
    expect(extractFolderId('https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ'))
      .toBe('1aBcDeFgHiJkLmNoPqRsTuVwXyZ');
  });

  it('extracts folder ID from a URL with query params', () => {
    expect(extractFolderId('https://drive.google.com/drive/folders/1aBcDeFg?resourcekey=0-abc'))
      .toBe('1aBcDeFg');
  });

  it('extracts folder ID from a URL with trailing slash', () => {
    expect(extractFolderId('https://drive.google.com/drive/folders/1aBcDeFg/'))
      .toBe('1aBcDeFg');
  });

  it('returns a plain folder ID unchanged', () => {
    expect(extractFolderId('1aBcDeFgHiJkLmNoPqRsTuVwXyZ'))
      .toBe('1aBcDeFgHiJkLmNoPqRsTuVwXyZ');
  });

  it('throws on empty string', () => {
    expect(() => extractFolderId('')).toThrow('folder ID must not be empty');
  });

  it('throws on a URL with no folder ID segment', () => {
    expect(() => extractFolderId('https://drive.google.com/drive/folders/'))
      .toThrow('could not extract folder ID');
  });
});

describe('parseDriveFileList', () => {
  it('parses a valid files response', () => {
    const response = {
      files: [
        { id: 'doc1', name: 'Skywords January 2025', createdTime: '2025-01-01T00:00:00Z' },
        { id: 'doc2', name: 'Skywords February 2025', createdTime: '2025-02-01T00:00:00Z' },
      ],
    };
    const result = parseDriveFileList(response);
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe('doc1');
    expect(result[0]?.name).toBe('Skywords January 2025');
    expect(result[1]?.id).toBe('doc2');
  });

  it('returns empty array when files is empty', () => {
    expect(parseDriveFileList({ files: [] })).toHaveLength(0);
  });

  it('returns empty array when files is missing', () => {
    expect(parseDriveFileList({})).toHaveLength(0);
  });

  it('throws on null input', () => {
    expect(() => parseDriveFileList(null)).toThrow('expected object');
  });

  it('skips entries with missing id', () => {
    const response = {
      files: [
        { name: 'No ID Doc' },
        { id: 'doc1', name: 'Valid Doc' },
      ],
    };
    const result = parseDriveFileList(response);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('doc1');
  });
});
