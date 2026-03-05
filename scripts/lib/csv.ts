import type { IssueStatus } from '../../src/types/Registry';

export type CsvStatus = IssueStatus | `disabled:${string}`;

const VALID_STATUSES: readonly string[] = ['pre-release', 'published', 'frozen'] satisfies readonly IssueStatus[];

function isValidCsvStatus(value: string): value is CsvStatus {
  if (VALID_STATUSES.includes(value)) return true;
  if (value.startsWith('disabled:') && value.length > 'disabled:'.length) return true;
  return false;
}

export interface CsvRow {
  readonly slug: string;
  readonly title: string;
  readonly docUrl: string;
  readonly status: CsvStatus;
}

export function isActiveRow(row: CsvRow): row is CsvRow & { readonly status: IssueStatus } {
  return !row.status.startsWith('disabled:');
}

export function parseCsvRow(line: string, lineNumber: number): CsvRow {
  const parts = line.split(',');
  if (parts.length < 4) {
    throw new Error(`CSV line ${lineNumber}: expected 4 fields, got ${parts.length}: "${line}"`);
  }

  const slug = parts[0];
  const title = parts[1];
  const docUrl = parts[2];
  const status = parts[3];

  if (slug === undefined || slug.trim() === '') {
    throw new Error(`CSV line ${lineNumber}: missing slug`);
  }
  if (title === undefined || title.trim() === '') {
    throw new Error(`CSV line ${lineNumber}: missing title`);
  }
  if (docUrl === undefined || docUrl.trim() === '') {
    throw new Error(`CSV line ${lineNumber}: missing doc_url`);
  }
  if (status === undefined || status.trim() === '') {
    throw new Error(`CSV line ${lineNumber}: missing status`);
  }

  const trimmedStatus = status.trim();
  if (!isValidCsvStatus(trimmedStatus)) {
    throw new Error(
      `CSV line ${lineNumber}: invalid status "${trimmedStatus}", expected one of: ${VALID_STATUSES.join(', ')} or disabled:<reason>`,
    );
  }

  const validatedStatus: CsvStatus = trimmedStatus;
  return {
    slug: slug.trim(),
    title: title.trim(),
    docUrl: docUrl.trim(),
    status: validatedStatus,
  };
}

export function formatCsvRow(row: CsvRow): string {
  return `${row.slug},${row.title},${row.docUrl},${row.status}`;
}

export function parseCsvContent(content: string): readonly CsvRow[] {
  const lines = content.split('\n').filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    throw new Error('CSV content is empty');
  }

  const header = lines[0];
  if (header === undefined || header !== 'slug,title,doc_url,status') {
    throw new Error(`CSV header mismatch: expected "slug,title,doc_url,status", got "${header ?? '(empty)'}"`);
  }

  return lines.slice(1).map((line, idx) => parseCsvRow(line, idx + 2));
}
