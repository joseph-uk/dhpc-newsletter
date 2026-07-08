import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Registry } from '../src/types/Registry';
import { isRegistry } from '../src/services/registry';
import { isDocData } from '../src/services/frozenDoc';
import { buildIssueMeta, injectIssueMeta } from './lib/prerenderPage';

const DEFAULT_ORIGIN = 'https://joseph-uk.github.io/dhpc-newsletter/';
const SAFE_SLUG = /^[a-z0-9-]+$/;

function assertSafeSlug(slug: string): void {
  if (!SAFE_SLUG.test(slug)) {
    throw new Error(`prerender: refusing unsafe slug "${slug}" — expected characters [a-z0-9-] only`);
  }
}

function resolveOrigin(): string {
  const raw = process.env['VITE_SITE_ORIGIN'];
  const origin = raw !== undefined && raw.length > 0 ? raw : DEFAULT_ORIGIN;
  return origin.endsWith('/') ? origin : `${origin}/`;
}

function parseJsonFile(path: string): unknown {
  let text: string;
  try {
    text = readFileSync(path, 'utf-8');
  } catch (cause) {
    throw new Error(`prerender: cannot read "${path}": ${String(cause)}`);
  }
  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new Error(`prerender: invalid JSON in "${path}": ${String(cause)}`);
  }
}

function loadRegistry(registryPath: string): Registry {
  const parsed = parseJsonFile(registryPath);
  if (!isRegistry(parsed)) {
    throw new Error(`prerender: "${registryPath}" does not match the expected registry shape`);
  }
  return parsed;
}

function prerenderIssue(distDir: string, template: string, slug: string, origin: string): void {
  assertSafeSlug(slug);
  const docPath = join(distDir, 'issues', `${slug}.json`);
  const parsed = parseJsonFile(docPath);
  if (!isDocData(parsed)) {
    throw new Error(`prerender: "${docPath}" does not match the expected DocData shape`);
  }

  const meta = buildIssueMeta(parsed, slug);
  const html = injectIssueMeta(template, meta, origin);
  writeFileSync(join(distDir, 'issue', `${slug}.html`), html, 'utf-8');

  const imageNote = meta.imagePath === null ? 'logo fallback' : meta.imagePath;
  process.stderr.write(`  Prerendered issue/${slug}.html (image: ${imageNote})\n`);
}

function main(): void {
  const projectRoot = join(import.meta.dirname, '..');
  const distDir = join(projectRoot, 'dist');
  const origin = resolveOrigin();

  process.stderr.write(`Prerendering issue pages with origin ${origin}\n`);
  const template = readFileSync(join(distDir, 'index.html'), 'utf-8');
  const registry = loadRegistry(join(distDir, 'registry.json'));

  mkdirSync(join(distDir, 'issue'), { recursive: true });

  for (const issue of registry.issues) {
    prerenderIssue(distDir, template, issue.slug, origin);
  }

  process.stderr.write(`Done. Prerendered ${registry.issues.length} issue pages.\n`);
}

try {
  main();
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`ERROR: ${message}\n`);
  process.exit(1);
}
