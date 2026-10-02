import type { CsvRow } from './csv';

const MONTH_NAME_FORMAT = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' });

const SLUG_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export interface NextIssue {
  readonly slug: string;
  readonly title: string;
}

interface IssueMonth {
  readonly year: number;
  readonly month: number;
}

function parseSlug(slug: string): IssueMonth {
  const match = SLUG_PATTERN.exec(slug);
  if (match === null || match[1] === undefined || match[2] === undefined) {
    throw new Error(`Invalid issue slug "${slug}": expected YYYY-MM`);
  }
  return { year: Number(match[1]), month: Number(match[2]) };
}

function monthIndex(issue: IssueMonth): number {
  return issue.year * 12 + (issue.month - 1);
}

/** The issue month following the latest slug in issues.csv (disabled rows included: their month is taken). */
export function nextIssue(rows: readonly CsvRow[]): NextIssue {
  if (rows.length === 0) {
    throw new Error('Cannot determine next issue: issues.csv has no rows');
  }

  const latest = Math.max(...rows.map((row) => monthIndex(parseSlug(row.slug))));
  const next = latest + 1;
  const year = Math.floor(next / 12);
  const month = (next % 12) + 1;
  const monthName = MONTH_NAME_FORMAT.format(new Date(Date.UTC(year, month - 1)));

  return { slug: `${year}-${String(month).padStart(2, '0')}`, title: `${monthName} ${year}` };
}
