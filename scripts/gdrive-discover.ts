import { readFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { authenticate } from './lib/googleAuth';
import { listDocsInFolder, buildDocUrl, extractSlugFromTitle } from './lib/driveClient';
import type { DriveDoc } from './lib/driveClient';
import { parseCsvContent, formatCsvRow } from './lib/csv';
import type { CsvRow } from './lib/csv';
import type { IssueStatus } from '../src/types/Registry';

interface CliArgs {
  readonly folderId: string;
  readonly status: IssueStatus;
  readonly dryRun: boolean;
}

function parseArgs(argv: readonly string[]): CliArgs {
  let folderId: string | null = null;
  let status: IssueStatus = 'published';
  let dryRun = false;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;

    if (arg.startsWith('--folder-id=')) {
      folderId = arg.slice('--folder-id='.length);
    } else if (arg === '--folder-id' && i + 1 < argv.length) {
      i++;
      folderId = argv[i] ?? null;
    } else if (arg.startsWith('--status=')) {
      const val = arg.slice('--status='.length);
      if (val !== 'published' && val !== 'pre-release' && val !== 'frozen') {
        throw new Error(`Invalid status "${val}". Expected: published, pre-release, or frozen`);
      }
      status = val;
    } else if (arg === '--dry-run') {
      dryRun = true;
    }
  }

  if (folderId === null || folderId.length === 0) {
    throw new Error(
      'Missing required --folder-id argument.\n' +
      'Usage: npm run gdrive:discover -- --folder-id=<FOLDER_ID> [--status=published] [--dry-run]',
    );
  }

  return { folderId, status, dryRun };
}

function buildTitleFromSlug(slug: string): string {
  const match = slug.match(/^(\d{4})-(\d{2})$/);
  if (match === null) return slug;

  const year = match[1];
  const monthNum = match[2];
  if (year === undefined || monthNum === undefined) return slug;

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const monthIndex = parseInt(monthNum, 10) - 1;
  const monthName = months[monthIndex];
  if (monthName === undefined) return slug;

  return `${monthName} ${year}`;
}

function findExistingDocIds(rows: readonly CsvRow[]): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    const match = row.docUrl.match(/\/document\/d\/([^/]+)\//);
    if (match !== null && match[1] !== undefined) {
      ids.add(match[1]);
    }
  }
  return ids;
}

function findNewDocs(
  driveDocs: readonly DriveDoc[],
  existingIds: ReadonlySet<string>,
): readonly DriveDoc[] {
  return driveDocs.filter((doc) => !existingIds.has(doc.id));
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const projectRoot = join(import.meta.dirname, '..');
  const csvPath = join(projectRoot, 'issues.csv');
  const credentialsDir = join(projectRoot, 'scripts', '.credentials');

  process.stderr.write('Authenticating with Google Drive...\n');
  const auth = await authenticate(credentialsDir, projectRoot);

  process.stderr.write(`Listing documents in folder ${args.folderId}...\n`);
  const driveDocs = await listDocsInFolder(auth, args.folderId);
  process.stderr.write(`Found ${driveDocs.length} documents in folder\n`);

  const csvContent = readFileSync(csvPath, 'utf-8');
  const existingRows = parseCsvContent(csvContent);
  const existingIds = findExistingDocIds(existingRows);

  const newDocs = findNewDocs(driveDocs, existingIds);

  process.stderr.write(`Already in CSV: ${existingRows.length}\n`);
  process.stderr.write(`New documents: ${newDocs.length}\n`);

  if (newDocs.length === 0) {
    process.stderr.write('Nothing to add.\n');
    return;
  }

  const newRows: CsvRow[] = [];
  for (const doc of newDocs) {
    const slug = extractSlugFromTitle(doc.name);
    if (slug === null) {
      process.stderr.write(`  Skipping "${doc.name}" — cannot extract month/year from title\n`);
      continue;
    }

    const row: CsvRow = {
      slug,
      title: buildTitleFromSlug(slug),
      docUrl: buildDocUrl(doc.id),
      status: args.status,
    };

    process.stderr.write(`  ${doc.name} -> slug: ${slug}, url: ${row.docUrl}\n`);
    newRows.push(row);
  }

  if (newRows.length === 0) {
    process.stderr.write('No parseable documents to add.\n');
    return;
  }

  if (args.dryRun) {
    process.stderr.write('\nDry run — no changes made. Remove --dry-run to append to CSV.\n');
    return;
  }

  for (const row of newRows) {
    appendFileSync(csvPath, `${formatCsvRow(row)}\n`, 'utf-8');
  }

  process.stderr.write(`\nAppended ${newRows.length} rows to issues.csv\n`);
  process.stderr.write('Next steps:\n');
  process.stderr.write('  1. Review issues.csv\n');
  process.stderr.write('  2. Run: npm run cache\n');
  process.stderr.write('  3. Run: npm run freeze\n');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`ERROR: ${message}\n`);
  process.exit(1);
});
