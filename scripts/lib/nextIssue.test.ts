import { describe, it, expect } from 'vitest';
import { nextIssue } from './nextIssue';
import type { CsvRow } from './csv';

function row(slug: string, status: CsvRow['status'] = 'published'): CsvRow {
  return { slug, title: 'irrelevant', docUrl: 'https://docs.google.com/document/d/x/pub', status };
}

describe('nextIssue', () => {
  it('returns the month after the latest issue', () => {
    expect(nextIssue([row('2026-08'), row('2026-09')])).toEqual({ slug: '2026-10', title: 'October 2026' });
  });

  it('uses the latest slug regardless of row order', () => {
    expect(nextIssue([row('2026-09'), row('2025-12'), row('2026-03')])).toEqual({
      slug: '2026-10',
      title: 'October 2026',
    });
  });

  it('rolls December over into January of the next year', () => {
    expect(nextIssue([row('2026-12')])).toEqual({ slug: '2027-01', title: 'January 2027' });
  });

  it('counts disabled rows, because their month is already taken', () => {
    expect(nextIssue([row('2026-09'), row('2026-10', 'disabled:duplicate')])).toEqual({
      slug: '2026-11',
      title: 'November 2026',
    });
  });

  it('skips gaps by following the latest issue, not filling holes', () => {
    expect(nextIssue([row('2026-01'), row('2026-06')])).toEqual({ slug: '2026-07', title: 'July 2026' });
  });

  it('throws when there are no issues to follow', () => {
    expect(() => nextIssue([])).toThrow('Cannot determine next issue: issues.csv has no rows');
  });

  it('throws on a malformed slug, naming it', () => {
    expect(() => nextIssue([row('2026-9')])).toThrow('Invalid issue slug "2026-9": expected YYYY-MM');
  });

  it('throws on an out-of-range month', () => {
    expect(() => nextIssue([row('2026-13')])).toThrow('Invalid issue slug "2026-13": expected YYYY-MM');
  });
});
