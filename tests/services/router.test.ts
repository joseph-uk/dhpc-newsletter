import { describe, it, expect } from 'vitest';
import { parseRoute, buildPath, slugify, findArticleIndex } from '../../src/services/router';

const BASE = '/dhpc-newsletter/';

describe('slugify', () => {
  it('lowercases and hyphenates simple titles', () => {
    expect(slugify('Cow Close Fell')).toBe('cow-close-fell');
  });

  it('handles single-word titles', () => {
    expect(slugify('Coaching')).toBe('coaching');
  });

  it('strips non-alphanumeric characters', () => {
    expect(slugify("What's On?")).toBe('whats-on');
  });

  it('collapses multiple hyphens', () => {
    expect(slugify('Hello - World')).toBe('hello-world');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  Hello World  ')).toBe('hello-world');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('handles all-special-character strings', () => {
    expect(slugify('???')).toBe('');
  });

  it('preserves numbers', () => {
    expect(slugify('Issue 42 Report')).toBe('issue-42-report');
  });
});

describe('parseRoute', () => {
  it('parses root as index', () => {
    expect(parseRoute(BASE, BASE)).toEqual({ kind: 'index' });
  });

  it('parses trailing-slash root as index', () => {
    expect(parseRoute('/dhpc-newsletter', BASE)).toEqual({ kind: 'index' });
  });

  it('parses issue slug', () => {
    expect(parseRoute(`${BASE}issue/2025-04`, BASE)).toEqual({ kind: 'issue', slug: '2025-04' });
  });

  it('parses issue slug with trailing slash', () => {
    expect(parseRoute(`${BASE}issue/2025-04/`, BASE)).toEqual({ kind: 'issue', slug: '2025-04' });
  });

  it('parses article within issue', () => {
    expect(parseRoute(`${BASE}issue/2025-04/coaching`, BASE)).toEqual({
      kind: 'article',
      slug: '2025-04',
      articleSlug: 'coaching',
    });
  });

  it('parses article with trailing slash', () => {
    expect(parseRoute(`${BASE}issue/2025-04/cow-close-fell/`, BASE)).toEqual({
      kind: 'article',
      slug: '2025-04',
      articleSlug: 'cow-close-fell',
    });
  });

  it('parses doc route with url query param', () => {
    expect(parseRoute(`${BASE}doc`, BASE, 'url=https://example.com')).toEqual({
      kind: 'doc',
      url: 'https://example.com',
    });
  });

  it('parses doc route with id query param', () => {
    expect(parseRoute(`${BASE}doc`, BASE, 'id=abc123')).toEqual({
      kind: 'doc',
      url: 'https://docs.google.com/document/d/e/abc123/pub',
    });
  });

  it('returns not-found for doc without params', () => {
    expect(parseRoute(`${BASE}doc`, BASE, '')).toEqual({
      kind: 'not-found',
      path: 'doc',
    });
  });

  it('returns not-found for unknown paths', () => {
    expect(parseRoute(`${BASE}unknown/path`, BASE)).toEqual({
      kind: 'not-found',
      path: 'unknown/path',
    });
  });

  it('returns not-found for issue without slug', () => {
    expect(parseRoute(`${BASE}issue`, BASE)).toEqual({
      kind: 'not-found',
      path: 'issue',
    });
  });
});

describe('buildPath', () => {
  it('builds index path', () => {
    expect(buildPath({ kind: 'index' }, BASE)).toBe(BASE);
  });

  it('builds issue path', () => {
    expect(buildPath({ kind: 'issue', slug: '2025-04' }, BASE)).toBe(`${BASE}issue/2025-04`);
  });

  it('builds article path', () => {
    expect(buildPath({ kind: 'article', slug: '2025-04', articleSlug: 'coaching' }, BASE)).toBe(
      `${BASE}issue/2025-04/coaching`,
    );
  });

  it('builds doc path with url', () => {
    expect(buildPath({ kind: 'doc', url: 'https://example.com' }, BASE)).toBe(
      `${BASE}doc?url=https%3A%2F%2Fexample.com`,
    );
  });
});

describe('findArticleIndex', () => {
  const sections = [
    { title: 'Coaching' },
    { title: 'Cow Close Fell' },
    { title: "What's On?" },
  ];

  it('finds section by slugified title', () => {
    expect(findArticleIndex(sections, 'coaching')).toBe(0);
  });

  it('finds section with multi-word slug', () => {
    expect(findArticleIndex(sections, 'cow-close-fell')).toBe(1);
  });

  it('finds section with stripped apostrophe', () => {
    expect(findArticleIndex(sections, 'whats-on')).toBe(2);
  });

  it('returns undefined for non-existent slug', () => {
    expect(findArticleIndex(sections, 'nonexistent')).toBeUndefined();
  });

  it('returns undefined for empty sections', () => {
    expect(findArticleIndex([], 'coaching')).toBeUndefined();
  });
});
