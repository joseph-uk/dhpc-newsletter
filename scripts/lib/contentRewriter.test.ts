import { describe, it, expect } from 'vitest';
import { extractImageUrls, rewriteImageUrlsInContent, rewriteDocDataImages, buildDeploymentUrlMap } from './contentRewriter';
import type { DocData } from '../../src/types/DocData';

describe('extractImageUrls', () => {
  it('extracts Google CDN image URLs from HTML content', () => {
    const content = '<p>Text</p><img src="https://lh3.googleusercontent.com/docs-images-rt/ABC123"><p>More</p>';
    const urls = extractImageUrls(content);
    expect(urls).toEqual(['https://lh3.googleusercontent.com/docs-images-rt/ABC123']);
  });

  it('extracts multiple image URLs', () => {
    const content = '<img src="https://lh3.googleusercontent.com/docs-images-rt/AAA"><img src="https://lh3.googleusercontent.com/docs-images-rt/BBB">';
    const urls = extractImageUrls(content);
    expect(urls).toEqual([
      'https://lh3.googleusercontent.com/docs-images-rt/AAA',
      'https://lh3.googleusercontent.com/docs-images-rt/BBB',
    ]);
  });

  it('returns empty array when no images', () => {
    expect(extractImageUrls('<p>No images here</p>')).toEqual([]);
  });

  it('ignores non-Google image URLs', () => {
    const content = '<img src="https://example.com/photo.jpg">';
    expect(extractImageUrls(content)).toEqual([]);
  });

  it('deduplicates URLs', () => {
    const content = '<img src="https://lh3.googleusercontent.com/docs-images-rt/AAA"><img src="https://lh3.googleusercontent.com/docs-images-rt/AAA">';
    const urls = extractImageUrls(content);
    expect(urls).toEqual(['https://lh3.googleusercontent.com/docs-images-rt/AAA']);
  });
});

describe('rewriteImageUrlsInContent', () => {
  it('replaces Google CDN URLs with local paths', () => {
    const content = '<img src="https://lh3.googleusercontent.com/docs-images-rt/ABC123">';
    const urlMap = new Map([['https://lh3.googleusercontent.com/docs-images-rt/ABC123', 'images/ABC123.jpg']]);
    const result = rewriteImageUrlsInContent(content, urlMap);
    expect(result).toBe('<img src="images/ABC123.jpg">');
  });

  it('replaces multiple URLs', () => {
    const content = '<img src="https://lh3.googleusercontent.com/docs-images-rt/A"><img src="https://lh3.googleusercontent.com/docs-images-rt/B">';
    const urlMap = new Map([
      ['https://lh3.googleusercontent.com/docs-images-rt/A', 'images/A.png'],
      ['https://lh3.googleusercontent.com/docs-images-rt/B', 'images/B.jpg'],
    ]);
    const result = rewriteImageUrlsInContent(content, urlMap);
    expect(result).toBe('<img src="images/A.png"><img src="images/B.jpg">');
  });

  it('leaves content unchanged when no matching URLs', () => {
    const content = '<p>No images</p>';
    const result = rewriteImageUrlsInContent(content, new Map());
    expect(result).toBe('<p>No images</p>');
  });
});

describe('rewriteDocDataImages', () => {
  it('rewrites URLs in section content and subsections', () => {
    const doc: DocData = {
      title: 'Test',
      sections: [
        {
          title: 'Section 1',
          content: '<img src="https://lh3.googleusercontent.com/docs-images-rt/IMG1">',
          subsections: [
            {
              title: 'Sub 1',
              content: '<img src="https://lh3.googleusercontent.com/docs-images-rt/IMG2">',
            },
          ],
        },
      ],
    };
    const urlMap = new Map([
      ['https://lh3.googleusercontent.com/docs-images-rt/IMG1', 'images/IMG1.jpg'],
      ['https://lh3.googleusercontent.com/docs-images-rt/IMG2', 'images/IMG2.png'],
    ]);
    const result = rewriteDocDataImages(doc, urlMap);
    expect(result.sections[0]?.content).toBe('<img src="images/IMG1.jpg">');
    expect(result.sections[0]?.subsections[0]?.content).toBe('<img src="images/IMG2.png">');
  });

  it('preserves title and structure', () => {
    const doc: DocData = {
      title: 'My Title',
      sections: [{ title: 'Sec', content: '<p>text</p>', subsections: [] }],
    };
    const result = rewriteDocDataImages(doc, new Map());
    expect(result.title).toBe('My Title');
    expect(result.sections[0]?.title).toBe('Sec');
  });
});

describe('buildDeploymentUrlMap', () => {
  it('maps cache-relative paths to deployment paths', () => {
    const filenames = ['ABC123.jpg', 'DEF456.png'];
    const result = buildDeploymentUrlMap(filenames, '2025-04');
    expect(result.get('images/ABC123.jpg')).toBe('issues/2025-04/images/ABC123.jpg');
    expect(result.get('images/DEF456.png')).toBe('issues/2025-04/images/DEF456.png');
  });

  it('returns empty map for empty filenames', () => {
    const result = buildDeploymentUrlMap([], '2025-04');
    expect(result.size).toBe(0);
  });

  it('handles single image', () => {
    const result = buildDeploymentUrlMap(['photo.webp'], '2026-03');
    expect(result.size).toBe(1);
    expect(result.get('images/photo.webp')).toBe('issues/2026-03/images/photo.webp');
  });
});
