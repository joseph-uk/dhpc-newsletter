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
