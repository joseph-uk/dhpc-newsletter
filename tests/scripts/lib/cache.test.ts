import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { isCacheStale, validateCacheMeta, pruneImages } from '../../../scripts/lib/cache';
import type { CacheMeta } from '../../../scripts/lib/cache';

describe('isCacheStale', () => {
  it('returns false when cache is fresh', () => {
    const meta: CacheMeta = {
      slug: '2025-01',
      docUrl: 'https://example.com',
      fetchedAt: new Date().toISOString(),
      issueStatus: 'frozen',
      imageCount: 5,
      contentHash: 'abc123def456abc123def456abc123de',
    };
    expect(isCacheStale(meta, 86400000)).toBe(false);
  });

  it('returns true when cache is older than TTL', () => {
    const oldDate = new Date(Date.now() - 100000).toISOString();
    const meta: CacheMeta = {
      slug: '2025-01',
      docUrl: 'https://example.com',
      fetchedAt: oldDate,
      issueStatus: 'published',
      imageCount: 3,
      contentHash: 'abc123def456abc123def456abc123de',
    };
    expect(isCacheStale(meta, 1000)).toBe(true);
  });

  it('returns false when cache is within TTL', () => {
    const recentDate = new Date(Date.now() - 1000).toISOString();
    const meta: CacheMeta = {
      slug: '2025-01',
      docUrl: 'https://example.com',
      fetchedAt: recentDate,
      issueStatus: 'published',
      imageCount: 0,
      contentHash: 'abc123def456abc123def456abc123de',
    };
    expect(isCacheStale(meta, 86400000)).toBe(false);
  });
});

describe('validateCacheMeta', () => {
  const validInput = {
    slug: '2025-01',
    docUrl: 'https://example.com',
    fetchedAt: '2025-01-01T00:00:00.000Z',
    issueStatus: 'frozen',
    imageCount: 5,
    contentHash: '5d41402abc4b2a76b9719d911017c592',
  };

  it('returns valid CacheMeta for correct input', () => {
    const result = validateCacheMeta(validInput);
    expect(result.slug).toBe('2025-01');
    expect(result.imageCount).toBe(5);
    expect(result.contentHash).toBe('5d41402abc4b2a76b9719d911017c592');
  });

  it('throws on missing slug', () => {
    expect(() => validateCacheMeta({ ...validInput, slug: undefined })).toThrow('slug');
  });

  it('throws on invalid issueStatus', () => {
    expect(() => validateCacheMeta({ ...validInput, issueStatus: 'bad' })).toThrow('issueStatus');
  });

  it('throws on non-object input', () => {
    expect(() => validateCacheMeta(null)).toThrow('expected object');
  });

  it('throws on missing contentHash', () => {
    expect(() => validateCacheMeta({ ...validInput, contentHash: undefined })).toThrow('contentHash');
  });

  it('throws on non-string contentHash', () => {
    expect(() => validateCacheMeta({ ...validInput, contentHash: 123 })).toThrow('contentHash');
  });

  it('throws on missing contentHash', () => {
    const { contentHash: _, ...withoutHash } = validInput;
    void _;
    expect(() => validateCacheMeta(withoutHash)).toThrow('contentHash');
  });
});

describe('pruneImages', () => {
  function createImagesDir(filenames: readonly string[]): string {
    const dir = mkdtempSync(join(tmpdir(), 'prune-images-'));
    const imagesDir = join(dir, 'images');
    mkdirSync(imagesDir);
    for (const name of filenames) {
      writeFileSync(join(imagesDir, name), 'x');
    }
    return imagesDir;
  }

  it('removes files not in the keep set and reports them', () => {
    const imagesDir = createImagesDir(['keep1.png', 'keep2.jpg', 'orphan.png']);
    const removed = pruneImages(imagesDir, ['keep1.png', 'keep2.jpg']);
    expect(removed).toEqual(['orphan.png']);
    expect(readdirSync(imagesDir).sort()).toEqual(['keep1.png', 'keep2.jpg']);
    rmSync(imagesDir, { recursive: true });
  });

  it('keeps every file and reports none removed when all are in the keep set', () => {
    const imagesDir = createImagesDir(['a.png', 'b.png']);
    const removed = pruneImages(imagesDir, ['a.png', 'b.png']);
    expect(removed).toEqual([]);
    expect(readdirSync(imagesDir).sort()).toEqual(['a.png', 'b.png']);
    rmSync(imagesDir, { recursive: true });
  });

  it('removes all files when the keep set is empty', () => {
    const imagesDir = createImagesDir(['a.png', 'b.png']);
    const removed = pruneImages(imagesDir, []);
    expect([...removed].sort()).toEqual(['a.png', 'b.png']);
    expect(readdirSync(imagesDir)).toEqual([]);
    rmSync(imagesDir, { recursive: true });
  });

  it('returns an empty list when the images directory does not exist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'prune-images-'));
    const missing = join(dir, 'images');
    expect(pruneImages(missing, ['a.png'])).toEqual([]);
    rmSync(dir, { recursive: true });
  });
});
