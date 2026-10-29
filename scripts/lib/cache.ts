import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { DocData } from '../../src/types/DocData';
import type { IssueStatus } from '../../src/types/Registry';

export interface CacheMeta {
  readonly slug: string;
  readonly docUrl: string;
  readonly fetchedAt: string;
  readonly issueStatus: IssueStatus;
  readonly imageCount: number;
  readonly contentHash: string;
}

const VALID_STATUSES: readonly IssueStatus[] = ['pre-release', 'published', 'frozen'];

function assertIsRecord(value: unknown): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    throw new Error('validateCacheMeta: expected object, got ' + typeof value);
  }
}

function isIssueStatus(value: string): value is IssueStatus {
  return VALID_STATUSES.some((s) => s === value);
}

export function validateCacheMeta(value: unknown): CacheMeta {
  assertIsRecord(value);

  if (typeof value['slug'] !== 'string' || value['slug'].length === 0) {
    throw new Error('validateCacheMeta: missing or invalid slug');
  }
  if (typeof value['docUrl'] !== 'string') {
    throw new Error('validateCacheMeta: missing or invalid docUrl');
  }
  if (typeof value['fetchedAt'] !== 'string') {
    throw new Error('validateCacheMeta: missing or invalid fetchedAt');
  }
  if (typeof value['issueStatus'] !== 'string' || !isIssueStatus(value['issueStatus'])) {
    throw new Error('validateCacheMeta: missing or invalid issueStatus');
  }
  if (typeof value['imageCount'] !== 'number') {
    throw new Error('validateCacheMeta: missing or invalid imageCount');
  }
  if (typeof value['contentHash'] !== 'string') {
    throw new Error('validateCacheMeta: missing or invalid contentHash');
  }

  return {
    slug: value['slug'],
    docUrl: value['docUrl'],
    fetchedAt: value['fetchedAt'],
    issueStatus: value['issueStatus'],
    imageCount: value['imageCount'],
    contentHash: value['contentHash'],
  };
}

export function isCacheStale(meta: CacheMeta, ttlMs: number): boolean {
  const fetchedAt = new Date(meta.fetchedAt).getTime();
  return (Date.now() - fetchedAt) > ttlMs;
}

export function ensureCacheDir(docsRoot: string, slug: string): string {
  const dir = join(docsRoot, slug);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function readCacheMeta(docsRoot: string, slug: string): CacheMeta | null {
  const metaPath = join(docsRoot, slug, 'meta.json');
  if (!existsSync(metaPath)) return null;
  try {
    const raw: unknown = JSON.parse(readFileSync(metaPath, 'utf-8'));
    return validateCacheMeta(raw);
  } catch {
    return null;
  }
}

export function writeCacheMeta(docsRoot: string, slug: string, meta: CacheMeta): void {
  const dir = ensureCacheDir(docsRoot, slug);
  writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8');
}

function assertIsDocData(value: unknown, slug: string): asserts value is DocData {
  assertIsRecord(value);
  if (typeof value['title'] !== 'string') {
    throw new Error(`Invalid cached doc for "${slug}": missing title`);
  }
  if (!Array.isArray(value['sections'])) {
    throw new Error(`Invalid cached doc for "${slug}": missing sections array`);
  }
}

export function hasCachedDoc(docsRoot: string, slug: string): boolean {
  const docPath = join(docsRoot, slug, 'doc.json');
  return existsSync(docPath);
}

export function readCachedDoc(docsRoot: string, slug: string): DocData {
  const docPath = join(docsRoot, slug, 'doc.json');
  if (!existsSync(docPath)) {
    throw new Error(`No cache found for issue "${slug}". Run 'npm run cache' first.`);
  }
  const raw: unknown = JSON.parse(readFileSync(docPath, 'utf-8'));
  assertIsDocData(raw, slug);
  return raw;
}

export function writeCachedDoc(docsRoot: string, slug: string, doc: DocData): void {
  const dir = ensureCacheDir(docsRoot, slug);
  writeFileSync(join(dir, 'doc.json'), JSON.stringify(doc, null, 2), 'utf-8');
}

export function writeRawHtml(docsRoot: string, slug: string, html: string): void {
  const dir = ensureCacheDir(docsRoot, slug);
  writeFileSync(join(dir, 'raw.html'), html, 'utf-8');
}
