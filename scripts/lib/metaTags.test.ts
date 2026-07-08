import { describe, it, expect } from 'vitest';
import { escapeAttribute, renderMetaTags, DEFAULT_OG_IMAGE } from './metaTags';
import type { IssueMeta } from './metaTags';

const origin = 'https://joseph-uk.github.io/dhpc-newsletter/';

const baseMeta: IssueMeta = {
  slug: '2025-07',
  title: 'July 2025',
  description: 'A great month of flying.',
  imagePath: 'issues/2025-07/images/photo.jpg',
};

describe('escapeAttribute', () => {
  it('escapes ampersand, angle brackets and double quotes', () => {
    expect(escapeAttribute('Fish & Chips <b> "wow"')).toBe('Fish &amp; Chips &lt;b&gt; &quot;wow&quot;');
  });

  it('leaves plain text unchanged', () => {
    expect(escapeAttribute('July 2025')).toBe('July 2025');
  });
});

describe('renderMetaTags', () => {
  it('renders an absolute og:image from the image path', () => {
    const html = renderMetaTags(baseMeta, origin);
    expect(html).toContain(
      '<meta property="og:image" content="https://joseph-uk.github.io/dhpc-newsletter/issues/2025-07/images/photo.jpg" />',
    );
  });

  it('renders og:url from the origin and slug', () => {
    const html = renderMetaTags(baseMeta, origin);
    expect(html).toContain(
      '<meta property="og:url" content="https://joseph-uk.github.io/dhpc-newsletter/issue/2025-07" />',
    );
  });

  it('renders og:title and og:description', () => {
    const html = renderMetaTags(baseMeta, origin);
    expect(html).toContain('<meta property="og:title" content="July 2025" />');
    expect(html).toContain('<meta property="og:description" content="A great month of flying." />');
  });

  it('renders the twitter summary_large_image card mirroring og values', () => {
    const html = renderMetaTags(baseMeta, origin);
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(html).toContain('<meta name="twitter:title" content="July 2025" />');
    expect(html).toContain(
      '<meta name="twitter:image" content="https://joseph-uk.github.io/dhpc-newsletter/issues/2025-07/images/photo.jpg" />',
    );
  });

  it('falls back to the site logo when imagePath is null', () => {
    const html = renderMetaTags({ ...baseMeta, imagePath: null }, origin);
    expect(html).toContain(
      `<meta property="og:image" content="https://joseph-uk.github.io/dhpc-newsletter/${DEFAULT_OG_IMAGE}" />`,
    );
  });

  it('escapes special characters in title and description', () => {
    const html = renderMetaTags(
      { ...baseMeta, title: 'Fish & <Chips>', description: 'He said "hi" & left' },
      origin,
    );
    expect(html).toContain('<meta property="og:title" content="Fish &amp; &lt;Chips&gt;" />');
    expect(html).toContain('<meta property="og:description" content="He said &quot;hi&quot; &amp; left" />');
  });

  it('throws when origin does not end with a slash', () => {
    expect(() => renderMetaTags(baseMeta, 'https://joseph-uk.github.io/dhpc-newsletter')).toThrow(
      /must end with a trailing slash/,
    );
  });

  it('throws when origin is empty', () => {
    expect(() => renderMetaTags(baseMeta, '')).toThrow(/origin/);
  });
});
