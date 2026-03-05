import { describe, it, expect } from 'vitest';
import { isShortUrl, extractShortUrls, replaceUrls } from '../../../scripts/lib/shortUrlResolver';

describe('isShortUrl', () => {
  it('detects shorturl.at', () => {
    expect(isShortUrl('https://shorturl.at/3CcK0')).toBe(true);
  });

  it('detects bit.ly', () => {
    expect(isShortUrl('https://bit.ly/abc123')).toBe(true);
  });

  it('detects tinyurl.com', () => {
    expect(isShortUrl('https://tinyurl.com/y6abc')).toBe(true);
  });

  it('detects t.co', () => {
    expect(isShortUrl('https://t.co/xyz789')).toBe(true);
  });

  it('detects goo.gl', () => {
    expect(isShortUrl('https://goo.gl/maps/abc')).toBe(true);
  });

  it('detects rb.gy', () => {
    expect(isShortUrl('https://rb.gy/abc')).toBe(true);
  });

  it('detects ow.ly', () => {
    expect(isShortUrl('https://ow.ly/abc')).toBe(true);
  });

  it('detects cutt.ly', () => {
    expect(isShortUrl('https://cutt.ly/abc')).toBe(true);
  });

  it('does not match regular URLs', () => {
    expect(isShortUrl('https://www.example.com/page')).toBe(false);
    expect(isShortUrl('https://docs.google.com/document/123')).toBe(false);
    expect(isShortUrl('https://www.dhpc.org.uk/skywords')).toBe(false);
  });

  it('detects maps.app.goo.gl', () => {
    expect(isShortUrl('https://maps.app.goo.gl/ktzmt1m6kY8vqEiUA')).toBe(true);
  });
});

describe('extractShortUrls', () => {
  it('finds short URLs in href attributes', () => {
    const html = '<a href="https://shorturl.at/3CcK0">link</a>';
    expect(extractShortUrls(html)).toEqual(['https://shorturl.at/3CcK0']);
  });

  it('finds multiple different short URLs', () => {
    const html = '<a href="https://bit.ly/abc">a</a><a href="https://t.co/xyz">b</a>';
    const result = extractShortUrls(html);
    expect(result).toContain('https://bit.ly/abc');
    expect(result).toContain('https://t.co/xyz');
    expect(result).toHaveLength(2);
  });

  it('deduplicates repeated URLs', () => {
    const html = '<a href="https://bit.ly/abc">a</a><a href="https://bit.ly/abc">b</a>';
    expect(extractShortUrls(html)).toEqual(['https://bit.ly/abc']);
  });

  it('returns empty array when no short URLs present', () => {
    const html = '<a href="https://www.example.com">link</a>';
    expect(extractShortUrls(html)).toEqual([]);
  });

  it('ignores non-href occurrences', () => {
    const html = '<p>Visit https://bit.ly/abc for details</p>';
    expect(extractShortUrls(html)).toEqual([]);
  });
});

describe('replaceUrls', () => {
  it('replaces short URLs with resolved URLs in content', () => {
    const content = '<a href="https://shorturl.at/abc">link</a>';
    const urlMap = new Map([['https://shorturl.at/abc', 'https://www.example.com/full-page']]);
    expect(replaceUrls(content, urlMap)).toBe('<a href="https://www.example.com/full-page">link</a>');
  });

  it('replaces multiple occurrences of the same URL', () => {
    const content = '<a href="https://bit.ly/x">a</a> <a href="https://bit.ly/x">b</a>';
    const urlMap = new Map([['https://bit.ly/x', 'https://resolved.com']]);
    expect(replaceUrls(content, urlMap)).toBe('<a href="https://resolved.com">a</a> <a href="https://resolved.com">b</a>');
  });

  it('leaves content unchanged when urlMap is empty', () => {
    const content = '<a href="https://shorturl.at/abc">link</a>';
    expect(replaceUrls(content, new Map())).toBe(content);
  });
});
