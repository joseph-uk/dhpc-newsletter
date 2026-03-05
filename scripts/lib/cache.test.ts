import { describe, it, expect } from 'vitest';
import { isCacheStale, validateCacheMeta } from './cache';
import type { CacheMeta } from './cache';

describe('isCacheStale', () => {
  it('returns false when cache is fresh', () => {
    const meta: CacheMeta = {
      slug: '2025-01',
      docUrl: 'https://example.com',
      fetchedAt: new Date().toISOString(),
      issueStatus: 'frozen',
      imageCount: 5,
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
    };
    expect(isCacheStale(meta, 86400000)).toBe(false);
  });
});

describe('validateCacheMeta', () => {
  it('returns valid CacheMeta for correct input', () => {
    const input = {
      slug: '2025-01',
      docUrl: 'https://example.com',
      fetchedAt: '2025-01-01T00:00:00.000Z',
      issueStatus: 'frozen',
      imageCount: 5,
    };
    const result = validateCacheMeta(input);
    expect(result.slug).toBe('2025-01');
    expect(result.imageCount).toBe(5);
  });

  it('throws on missing slug', () => {
    expect(() => validateCacheMeta({ docUrl: 'x', fetchedAt: 'x', issueStatus: 'frozen', imageCount: 0 })).toThrow('slug');
  });

  it('throws on invalid issueStatus', () => {
    expect(() => validateCacheMeta({ slug: 'x', docUrl: 'x', fetchedAt: 'x', issueStatus: 'bad', imageCount: 0 })).toThrow('issueStatus');
  });

  it('throws on non-object input', () => {
    expect(() => validateCacheMeta(null)).toThrow('expected object');
  });
});
