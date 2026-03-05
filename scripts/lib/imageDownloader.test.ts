import { describe, it, expect } from 'vitest';
import { extractImageId, contentTypeToExtension } from './imageDownloader';

describe('extractImageId', () => {
  it('extracts ID from Google CDN URL', () => {
    const url = 'https://lh3.googleusercontent.com/docs-images-rt/AHDoZz5abc123';
    expect(extractImageId(url)).toBe('AHDoZz5abc123');
  });

  it('throws on non-Google URL', () => {
    expect(() => extractImageId('https://example.com/photo.jpg')).toThrow('not a Google Docs image URL');
  });

  it('throws on empty ID', () => {
    expect(() => extractImageId('https://lh3.googleusercontent.com/docs-images-rt/')).toThrow('empty image ID');
  });
});

describe('contentTypeToExtension', () => {
  it('maps image/jpeg to .jpg', () => {
    expect(contentTypeToExtension('image/jpeg')).toBe('.jpg');
  });

  it('maps image/png to .png', () => {
    expect(contentTypeToExtension('image/png')).toBe('.png');
  });

  it('maps image/gif to .gif', () => {
    expect(contentTypeToExtension('image/gif')).toBe('.gif');
  });

  it('maps image/webp to .webp', () => {
    expect(contentTypeToExtension('image/webp')).toBe('.webp');
  });

  it('defaults to .jpg for unknown types', () => {
    expect(contentTypeToExtension('application/octet-stream')).toBe('.jpg');
  });

  it('defaults to .jpg for empty string', () => {
    expect(contentTypeToExtension('')).toBe('.jpg');
  });

  it('handles content-type with parameters', () => {
    expect(contentTypeToExtension('image/png; charset=utf-8')).toBe('.png');
  });
});
