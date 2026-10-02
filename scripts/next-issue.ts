import { readFileSync } from 'node:fs';
import { parseCsvContent } from './lib/csv';
import { nextIssue } from './lib/nextIssue';

function main(): void {
  const csvPath = process.argv[2];
  if (csvPath === undefined) {
    throw new Error('Usage: next-issue <issues.csv>');
  }

  const next = nextIssue(parseCsvContent(readFileSync(csvPath, 'utf-8')));
  process.stdout.write(`slug=${next.slug}\ntitle=${next.title}\n`);
}

try {
  main();
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`ERROR: ${message}\n`);
  process.exit(1);
}
