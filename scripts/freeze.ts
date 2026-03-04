import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import { parseDocument } from '../src/services/docParserCore';
import type { DocData } from '../src/types/DocData';
import type { Issue, IssueStatus, Registry } from '../src/types/Registry';

const VALID_STATUSES: readonly string[] = ['pre-release', 'published', 'frozen'] satisfies readonly IssueStatus[];

function isIssueStatus(value: string): value is IssueStatus {
  return VALID_STATUSES.includes(value);
}

interface CsvRow {
  readonly slug: string;
  readonly title: string;
  readonly docUrl: string;
  readonly status: IssueStatus;
}

function parseCsvRow(line: string, lineNumber: number): CsvRow {
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
  if (!isIssueStatus(trimmedStatus)) {
    throw new Error(
      `CSV line ${lineNumber}: invalid status "${trimmedStatus}", expected one of: ${VALID_STATUSES.join(', ')}`,
    );
  }

  return {
    slug: slug.trim(),
    title: title.trim(),
    docUrl: docUrl.trim(),
    status: trimmedStatus,
  };
}

function parseCsv(csvPath: string): readonly CsvRow[] {
  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    throw new Error(`CSV file is empty: ${csvPath}`);
  }

  const header = lines[0];
  if (header === undefined || header !== 'slug,title,doc_url,status') {
    throw new Error(`CSV header mismatch: expected "slug,title,doc_url,status", got "${header ?? '(empty)'}"`);
  }

  return lines.slice(1).map((line, idx) => parseCsvRow(line, idx + 2));
}

function createSanitize(jsdomWindow: InstanceType<typeof JSDOM>['window']): (html: string) => string {
  const purify = DOMPurify(jsdomWindow);
  return (html: string): string => purify.sanitize(html);
}

async function fetchDocHtml(docUrl: string): Promise<string> {
  const response = await fetch(docUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to fetch "${docUrl}": HTTP ${response.status} ${response.statusText}`);
  }
  return response.text();
}

async function freezeIssue(row: CsvRow, outputDir: string, sanitize: (html: string) => string): Promise<void> {
  process.stderr.write(`  Freezing ${row.slug} from ${row.docUrl}\n`);

  const html = await fetchDocHtml(row.docUrl);
  const dom = new JSDOM(html);
  const docData: DocData = parseDocument(dom.window.document, sanitize);

  const outputPath = join(outputDir, `${row.slug}.json`);
  writeFileSync(outputPath, JSON.stringify(docData, null, 2), 'utf-8');

  process.stderr.write(`  Written: ${outputPath}\n`);
}

function buildRegistry(rows: readonly CsvRow[]): Registry {
  const issues: readonly Issue[] = rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    docUrl: row.docUrl,
    status: row.status,
  }));
  return { issues };
}

async function main(): Promise<void> {
  const projectRoot = join(import.meta.dirname, '..');
  const csvPath = join(projectRoot, 'issues.csv');
  const publicDir = join(projectRoot, 'public');
  const issuesDir = join(publicDir, 'issues');

  process.stderr.write('Reading issues.csv\n');
  const rows = parseCsv(csvPath);
  process.stderr.write(`Found ${rows.length} issues\n`);

  mkdirSync(issuesDir, { recursive: true });

  const jsdomWindow = new JSDOM('').window;
  const sanitize = createSanitize(jsdomWindow);

  const frozenRows = rows.filter((row) => row.status === 'frozen');
  process.stderr.write(`Freezing ${frozenRows.length} frozen issues\n`);

  for (const row of frozenRows) {
    await freezeIssue(row, issuesDir, sanitize);
  }

  const registry: Registry = buildRegistry(rows);
  const registryPath = join(publicDir, 'registry.json');
  writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf-8');
  process.stderr.write(`Written: ${registryPath}\n`);

  process.stderr.write(`Done. Registry has ${registry.issues.length} issues, ${frozenRows.length} frozen.\n`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`ERROR: ${message}\n`);
  process.exit(1);
});
