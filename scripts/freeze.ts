import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Issue, Registry } from '../src/types/Registry';
import { parseCsvContent } from './lib/csv';
import type { CsvRow } from './lib/csv';
import { readCachedDoc } from './lib/cache';
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

function buildRegistry(rows: readonly CsvRow[]): Registry {
  const issues: readonly Issue[] = rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    docUrl: row.docUrl,
    status: row.status,
  }));
  return { issues };
}

function main(): void {
  const projectRoot = join(import.meta.dirname, '..');
  const csvPath = join(projectRoot, 'issues.csv');
  const docsRoot = join(projectRoot, 'docs');
  const publicDir = join(projectRoot, 'public');
  const issuesDir = join(publicDir, 'issues');

  process.stderr.write('Reading issues.csv\n');
  const rows = parseCsv(csvPath);
  process.stderr.write(`Found ${rows.length} issues\n`);

  mkdirSync(issuesDir, { recursive: true });

  const frozenRows = rows.filter((row) => row.status === 'frozen');
  process.stderr.write(`Freezing ${frozenRows.length} frozen issues from cache\n`);

  for (const row of frozenRows) {
    freezeIssue(row, docsRoot, issuesDir);
  }

  const registry: Registry = buildRegistry(rows);
  const registryPath = join(publicDir, 'registry.json');
  writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf-8');
  process.stderr.write(`Written: ${registryPath}\n`);

  process.stderr.write(`Done. Registry has ${registry.issues.length} issues, ${frozenRows.length} frozen.\n`);
}

try {
  main();
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`ERROR: ${message}\n`);
  process.exit(1);
}
