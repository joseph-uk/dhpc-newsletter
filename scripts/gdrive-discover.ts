import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { authenticate } from './lib/googleAuth';
import { listDocsInFolder, buildDocUrl, extractFolderId, extractSlugFromTitle } from './lib/driveClient';
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
  let folderInput: string | null = null;
  let status: IssueStatus = 'published';
  let dryRun = false;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;

    if (arg.startsWith('--folder=')) {
      folderInput = arg.slice('--folder='.length);
    } else if (arg === '--folder' && i + 1 < argv.length) {
      i++;
      folderInput = argv[i] ?? null;
    } else if (arg.startsWith('--folder-id=')) {
      folderInput = arg.slice('--folder-id='.length);
    } else if (arg === '--folder-id' && i + 1 < argv.length) {
      i++;
      folderInput = argv[i] ?? null;
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

  if (folderInput === null || folderInput.length === 0) {
    throw new Error(
      'Missing required --folder argument.\n' +
      'Usage: npm run gdrive:discover -- --folder=<URL_OR_ID> [--status=published] [--dry-run]',
    );
  }

  const folderId = extractFolderId(folderInput);
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

  if (args.dryRun) {
    process.stderr.write(`\nDry run — ${newRows.length} new rows would be added. Remove --dry-run to write.\n`);
    return;
  }

  const allRows = [...existingRows, ...newRows];
  allRows.sort((a, b) => a.slug.localeCompare(b.slug));

  const csvLines = ['slug,title,doc_url,status', ...allRows.map(formatCsvRow)];
  writeFileSync(csvPath, csvLines.join('\n') + '\n', 'utf-8');

  if (newRows.length > 0) {
    process.stderr.write(`\nAdded ${newRows.length} rows to issues.csv (${allRows.length} total, sorted)\n`);
    process.stderr.write('Next steps:\n');
    process.stderr.write('  1. Review issues.csv\n');
    process.stderr.write('  2. Run: npm run cache\n');
    process.stderr.write('  3. Run: npm run freeze\n');
  } else {
    process.stderr.write(`\nNo new rows. CSV sorted (${allRows.length} entries).\n`);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`ERROR: ${message}\n`);
  process.exit(1);
});
