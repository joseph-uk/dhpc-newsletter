import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import { readFileSync } from 'node:fs';
import { parseDocument } from '../src/services/docParserCore';
import { parseCsvContent } from './lib/csv';
import type { CsvRow } from './lib/csv';
import { readCacheMeta, writeCacheMeta, writeCachedDoc, writeRawHtml, isCacheStale } from './lib/cache';
import type { CacheMeta } from './lib/cache';
import { extractImageUrls, rewriteDocDataImages } from './lib/contentRewriter';
import { downloadAllImages } from './lib/imageDownloader';

const TTL_FROZEN = Infinity;
const TTL_PUBLISHED = 24 * 60 * 60 * 1000;
const TTL_PRERELEASE = 60 * 60 * 1000;

function getTtl(status: CsvRow['status']): number {
  switch (status) {
    case 'frozen': return TTL_FROZEN;
    case 'published': return TTL_PUBLISHED;
    case 'pre-release': return TTL_PRERELEASE;
  }
}

function shouldRefresh(meta: CacheMeta | null, row: CsvRow, force: boolean): boolean {
  if (force) return true;
  if (meta === null) return true;
  if (row.status === 'frozen') return false;
  return isCacheStale(meta, getTtl(row.status));
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

function collectAllImageUrls(doc: import('../src/types/DocData').DocData): readonly string[] {
  const urls: string[] = [];
  for (const section of doc.sections) {
    urls.push(...extractImageUrls(section.content));
    for (const sub of section.subsections) {
      urls.push(...extractImageUrls(sub.content));
    }
  }
  return [...new Set(urls)];
}

async function cacheIssue(row: CsvRow, docsRoot: string, sanitize: (html: string) => string): Promise<void> {
  process.stderr.write(`  Caching ${row.slug} from ${row.docUrl}\n`);

  const html = await fetchDocHtml(row.docUrl);
  writeRawHtml(docsRoot, row.slug, html);

  const dom = new JSDOM(html);
  const docData = parseDocument(dom.window.document, sanitize);

  const imageUrls = collectAllImageUrls(docData);
  const imagesDir = join(docsRoot, row.slug, 'images');

  let urlMap = new Map<string, string>();
  if (imageUrls.length > 0) {
    process.stderr.write(`    Downloading ${imageUrls.length} images\n`);
    urlMap = new Map(await downloadAllImages(imageUrls, imagesDir));
  }

  const rewrittenDoc = rewriteDocDataImages(docData, urlMap);
  writeCachedDoc(docsRoot, row.slug, rewrittenDoc);

  const meta: CacheMeta = {
    slug: row.slug,
    docUrl: row.docUrl,
    fetchedAt: new Date().toISOString(),
    issueStatus: row.status,
    imageCount: imageUrls.length,
  };
  writeCacheMeta(docsRoot, row.slug, meta);

  process.stderr.write(`    Done: ${imageUrls.length} images cached\n`);
}

function parseArgs(argv: readonly string[]): { force: boolean; slug: string | null } {
  let force = false;
  let slug: string | null = null;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--force') {
      force = true;
    } else if (arg === '--slug' && i + 1 < argv.length) {
      i++;
      slug = argv[i] ?? null;
    }
  }

  return { force, slug };
}

async function main(): Promise<void> {
  const { force, slug } = parseArgs(process.argv);
  const projectRoot = join(import.meta.dirname, '..');
  const csvPath = join(projectRoot, 'issues.csv');
  const docsRoot = join(projectRoot, 'docs');

  process.stderr.write('Reading issues.csv\n');
  const csvContent = readFileSync(csvPath, 'utf-8');
  const allRows = parseCsvContent(csvContent);

  const rows = slug !== null
    ? allRows.filter((row) => row.slug === slug)
    : [...allRows];

  if (slug !== null && rows.length === 0) {
    throw new Error(`Issue "${slug}" not found in issues.csv`);
  }

  process.stderr.write(`Processing ${rows.length} issues${force ? ' (forced refresh)' : ''}\n`);

  const jsdomWindow = new JSDOM('').window;
  const sanitize = createSanitize(jsdomWindow);

  let cached = 0;
  let skipped = 0;

  for (const row of rows) {
    const meta = readCacheMeta(docsRoot, row.slug);
    if (!shouldRefresh(meta, row, force)) {
      process.stderr.write(`  Skipping ${row.slug} (cached, fresh)\n`);
      skipped++;
      continue;
    }
    await cacheIssue(row, docsRoot, sanitize);
    cached++;
  }

  process.stderr.write(`Done. Cached: ${cached}, Skipped: ${skipped}\n`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`ERROR: ${message}\n`);
  process.exit(1);
});
