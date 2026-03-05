import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Issue, Registry } from '../src/types/Registry';
import { parseCsvContent, isActiveRow } from './lib/csv';
import type { CsvRow } from './lib/csv';
import { readCachedDoc, readCacheMeta, hasCachedDoc } from './lib/cache';
import { buildDeploymentUrlMap, rewriteDocDataImages } from './lib/contentRewriter';

function parseCsv(csvPath: string): readonly CsvRow[] {
  const content = readFileSync(csvPath, 'utf-8');
  return parseCsvContent(content);
}

function listImageFiles(imagesDir: string): readonly string[] {
  if (!existsSync(imagesDir)) return [];
  return readdirSync(imagesDir);
}

function copyImages(sourceDir: string, destDir: string): number {
  const files = listImageFiles(sourceDir);
  if (files.length === 0) return 0;

  mkdirSync(destDir, { recursive: true });
  for (const file of files) {
    copyFileSync(join(sourceDir, file), join(destDir, file));
  }
  return files.length;
}

function freezeIssue(row: CsvRow, docsRoot: string, issuesDir: string): void {
  process.stderr.write(`  Freezing ${row.slug} from cache\n`);

  const doc = readCachedDoc(docsRoot, row.slug);

  const imagesSourceDir = join(docsRoot, row.slug, 'images');
  const imageFiles = listImageFiles(imagesSourceDir);

  if (imageFiles.length > 0) {
    const urlMap = buildDeploymentUrlMap(imageFiles, row.slug);
    const rewrittenDoc = rewriteDocDataImages(doc, urlMap);
    const outputPath = join(issuesDir, `${row.slug}.json`);
    writeFileSync(outputPath, JSON.stringify(rewrittenDoc, null, 2), 'utf-8');

    const imagesDestDir = join(issuesDir, row.slug, 'images');
    const copied = copyImages(imagesSourceDir, imagesDestDir);
    process.stderr.write(`    Copied ${copied} images\n`);
  } else {
    const outputPath = join(issuesDir, `${row.slug}.json`);
    writeFileSync(outputPath, JSON.stringify(doc, null, 2), 'utf-8');
  }

  process.stderr.write(`    Done\n`);
}

function getContentHash(docsRoot: string, slug: string): string {
  const meta = readCacheMeta(docsRoot, slug);
  if (meta === null) {
    throw new Error(`No cache meta for "${slug}". Run 'npm run cache' first.`);
  }
  return meta.contentHash;
}

function buildRegistry(rows: readonly CsvRow[], docsRoot: string): Registry {
  const issues: readonly Issue[] = rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    docUrl: row.docUrl,
    status: row.status,
    contentHash: getContentHash(docsRoot, row.slug),
  }));
  return { issues };
}

function main(): void {
  const projectRoot = join(import.meta.dirname, '..');
  const csvPath = join(projectRoot, 'issues.csv');
  const docsRoot = join(projectRoot, 'data');
  const publicDir = join(projectRoot, 'public');
  const issuesDir = join(publicDir, 'issues');

  process.stderr.write('Reading issues.csv\n');
  const allCsvRows = parseCsv(csvPath);
  const rows = allCsvRows.filter(isActiveRow);
  process.stderr.write(`Found ${rows.length} active issues (${allCsvRows.length - rows.length} disabled)\n`);

  mkdirSync(issuesDir, { recursive: true });

  const cachedRows = rows.filter((row) => hasCachedDoc(docsRoot, row.slug));
  const skippedCount = rows.length - cachedRows.length;

  if (skippedCount > 0) {
    process.stderr.write(`Skipping ${skippedCount} issues without cached data (run 'npm run cache' to fetch)\n`);
  }

  process.stderr.write(`Freezing ${cachedRows.length} issues from cache\n`);

  for (const row of cachedRows) {
    freezeIssue(row, docsRoot, issuesDir);
  }

  const registry: Registry = buildRegistry(cachedRows, docsRoot);
  const registryPath = join(publicDir, 'registry.json');
  writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf-8');
  process.stderr.write(`Written: ${registryPath}\n`);

  process.stderr.write(`Done. Registry has ${registry.issues.length} issues.\n`);
}

try {
  main();
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`ERROR: ${message}\n`);
  process.exit(1);
}
