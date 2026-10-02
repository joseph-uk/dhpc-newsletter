import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPT = join(__dirname, 'next-issue.ts');
const TSX = join(__dirname, '..', 'node_modules', '.bin', 'tsx');

function runCli(csvPath: string): string {
  return execFileSync(TSX, [SCRIPT, csvPath], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
}

describe('next-issue CLI', () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'next-issue-'));
  });

  afterAll(() => {
    rmSync(dir, { recursive: true });
  });

  it('prints the next slug and title as GITHUB_OUTPUT lines', () => {
    const csvPath = join(dir, 'issues.csv');
    writeFileSync(
      csvPath,
      [
        'slug,title,doc_url,status',
        '2026-08,August 2026,https://docs.google.com/document/d/a/pub,published',
        '2026-09,September 2026,https://docs.google.com/document/d/b/pub,published',
        '',
      ].join('\n'),
    );

    expect(runCli(csvPath)).toBe('slug=2026-10\ntitle=October 2026\n');
  });

  it('fails with a non-zero exit when no CSV path is given', () => {
    expect(() => execFileSync(TSX, [SCRIPT], { stdio: 'pipe' })).toThrow(/Usage: next-issue <issues.csv>/);
  });
});
