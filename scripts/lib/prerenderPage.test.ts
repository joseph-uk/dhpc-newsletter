import { describe, it, expect } from 'vitest';
import { buildIssueMeta, injectIssueMeta } from './prerenderPage';
import type { DocData } from '../../src/types/DocData';

const origin = 'https://joseph-uk.github.io/dhpc-newsletter/';

const doc: DocData = {
  title: 'July 2025',
  sections: [
    {
      title: 'Welcome',
      content:
        '<p>A cracking month at the Dales club.</p>' +
        '<img src="issues/2025-07/images/photo.jpg" style="width: 766.00px; height: 440.00px;">',
      subsections: [],
    },
  ],
};

const template = `<!doctype html>
<html>
  <head>
    <title>Skywords — DHPC Newsletter</title>
    <!-- og:start -->
    <meta property="og:title" content="Skywords" />
    <!-- og:end -->
  </head>
  <body><div id="root"></div></body>
</html>`;

describe('buildIssueMeta', () => {
  it('assembles slug, title, description and landscape image path', () => {
    expect(buildIssueMeta(doc, '2025-07')).toEqual({
      slug: '2025-07',
      title: 'July 2025',
      description: 'A cracking month at the Dales club.',
      imagePath: 'issues/2025-07/images/photo.jpg',
    });
  });

  it('sets imagePath to null when no landscape image exists', () => {
    const textOnly: DocData = {
      title: 'Quiet',
      sections: [{ title: 'S', content: '<p>Nothing but words here.</p>', subsections: [] }],
    };
    expect(buildIssueMeta(textOnly, 'quiet').imagePath).toBeNull();
  });
});

describe('injectIssueMeta', () => {
  it('replaces the og marker region with issue-specific tags', () => {
    const result = injectIssueMeta(template, buildIssueMeta(doc, '2025-07'), origin);
    expect(result).toContain('<meta property="og:title" content="July 2025" />');
    expect(result).toContain(
      '<meta property="og:image" content="https://joseph-uk.github.io/dhpc-newsletter/issues/2025-07/images/photo.jpg" />',
    );
    expect(result).not.toContain('content="Skywords" />');
    expect(result).toContain('<!-- og:start -->');
    expect(result).toContain('<!-- og:end -->');
  });

  it('updates the document title to the issue title', () => {
    const result = injectIssueMeta(template, buildIssueMeta(doc, '2025-07'), origin);
    expect(result).toContain('<title>July 2025</title>');
    expect(result).not.toContain('<title>Skywords — DHPC Newsletter</title>');
  });

  it('preserves a title containing a dollar sign without regex substitution', () => {
    const dollarDoc: DocData = { ...doc, title: 'Win $100' };
    const result = injectIssueMeta(template, buildIssueMeta(dollarDoc, '2025-07'), origin);
    expect(result).toContain('<title>Win $100</title>');
  });

  it('throws when the og markers are missing', () => {
    expect(() => injectIssueMeta('<head><title>x</title></head>', buildIssueMeta(doc, '2025-07'), origin)).toThrow(
      /og:start/,
    );
  });

  it('throws when the title element is missing', () => {
    const noTitle = '<head><!-- og:start --><!-- og:end --></head>';
    expect(() => injectIssueMeta(noTitle, buildIssueMeta(doc, '2025-07'), origin)).toThrow(/title/);
  });
});
