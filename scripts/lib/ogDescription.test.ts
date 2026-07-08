import { describe, it, expect } from 'vitest';
import { stripHtml, extractDescription } from './ogDescription';
import type { DocData } from '../../src/types/DocData';

describe('stripHtml', () => {
  it('removes tags and collapses whitespace', () => {
    expect(stripHtml('<p>Hello   <strong>world</strong></p>\n<p>again</p>')).toBe('Hello world again');
  });

  it('decodes common HTML entities', () => {
    expect(stripHtml('<p>Fish &amp; chips &lt;here&gt; &quot;now&quot;&nbsp;then</p>')).toBe(
      'Fish & chips <here> "now" then',
    );
  });

  it('returns empty string for tag-only content', () => {
    expect(stripHtml('<img src="a.jpg"><br>')).toBe('');
  });
});

describe('extractDescription', () => {
  it('uses the first meaningful text block, stripped of markup', () => {
    const doc: DocData = {
      title: 'July 2025',
      sections: [
        {
          title: 'Welcome',
          content: '<img src="a.jpg"><p>A great month of flying at the Dales club.</p>',
          subsections: [],
        },
      ],
    };
    expect(extractDescription(doc)).toBe('A great month of flying at the Dales club.');
  });

  it('falls through to subsection content when section content has no text', () => {
    const doc: DocData = {
      title: 'July 2025',
      sections: [
        {
          title: 'Reports',
          content: '<img src="a.jpg">',
          subsections: [{ title: 'XC', content: '<p>Long flights over the moor.</p>' }],
        },
      ],
    };
    expect(extractDescription(doc)).toBe('Long flights over the moor.');
  });

  it('truncates long text on a word boundary with an ellipsis', () => {
    const words = Array.from({ length: 60 }, (_, index) => `flying${index}`);
    const longText = words.join(' ');
    const doc: DocData = {
      title: 'Big',
      sections: [{ title: 'S', content: `<p>${longText}</p>`, subsections: [] }],
    };
    const result = extractDescription(doc);
    expect(result.length).toBeLessThanOrEqual(200);
    expect(result.endsWith('…')).toBe(true);

    const lastWord = result.slice(0, -1).trimEnd().split(' ').at(-1);
    expect(words).toContain(lastWord);
  });

  it('hard-truncates a single very long word with no spaces', () => {
    const longWord = 'x'.repeat(250);
    const doc: DocData = {
      title: 'Big',
      sections: [{ title: 'S', content: `<p>${longWord}</p>`, subsections: [] }],
    };
    const result = extractDescription(doc);
    expect(result.length).toBe(200);
    expect(result.endsWith('…')).toBe(true);
  });

  it('skips empty sections and subsections until text is found', () => {
    const doc: DocData = {
      title: 'T',
      sections: [
        { title: 'Empty', content: '<img src="a.jpg">', subsections: [{ title: 'Sub', content: '<br>' }] },
        { title: 'Real', content: '<p>Found it here.</p>', subsections: [] },
      ],
    };
    expect(extractDescription(doc)).toBe('Found it here.');
  });

  it('returns the title when no body text exists', () => {
    const doc: DocData = {
      title: 'Silent Issue',
      sections: [{ title: 'S', content: '<img src="a.jpg">', subsections: [] }],
    };
    expect(extractDescription(doc)).toBe('Silent Issue');
  });
});
