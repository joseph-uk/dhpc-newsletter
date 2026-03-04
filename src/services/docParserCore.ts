import type { DocData, Section, Subsection } from '../types/DocData';

export type Sanitize = (html: string) => string;

function rewriteLinks(doc: Document): void {
  doc.querySelectorAll('a[href]').forEach((anchor) => {
    const href = anchor.getAttribute('href') ?? '';
    const match = href.match(/google\.com\/url\?q=([^&]+)/);
    if (match !== null && match[1] !== undefined) {
      anchor.setAttribute('href', decodeURIComponent(match[1]));
    }
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noopener noreferrer');
  });
}

function rewriteImageUrls(doc: Document): void {
  doc.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src') ?? '';
    if (src.includes('docs.google.com/docs-images-rt/')) {
      img.setAttribute(
        'src',
        src.replace('docs.google.com/docs-images-rt/', 'lh3.googleusercontent.com/docs-images-rt/'),
      );
    }
  });
}

function fixListIndent(doc: Document): void {
  doc.querySelectorAll('ul').forEach((ul) => {
    const classes = ul.getAttribute('class') ?? '';
    const match = classes.match(/-(\d)(?:\s|$)/);
    if (match !== null && match[1] !== undefined) {
      ul.setAttribute('data-indent', match[1]);
    }
  });
}

function serialise(nodes: readonly Node[]): string {
  const first = nodes[0];
  if (first === undefined) return '';
  const ownerDoc = first.ownerDocument;
  if (ownerDoc === null) return '';
  const div = ownerDoc.createElement('div');
  nodes.forEach((node) => div.appendChild(node.cloneNode(true)));
  return div.innerHTML;
}

function collectUntil(start: Element, stop: Element | null): Node[] {
  const nodes: Node[] = [];
  let current: Element | null = start.nextElementSibling;
  while (current !== null && current !== stop) {
    nodes.push(current);
    current = current.nextElementSibling;
  }
  return nodes;
}

function buildSubsection(h2: Element, nextStop: Element | null, sanitize: Sanitize): Subsection {
  const nodes = collectUntil(h2, nextStop);
  const rawHtml = serialise(nodes);
  return {
    title: h2.textContent ?? '',
    content: sanitize(rawHtml),
  };
}

function buildSection(h1: Element, nextH1: Element | null, sanitize: Sanitize): Section {
  const sectionNodes = collectUntil(h1, nextH1);
  const h2s = sectionNodes.filter(
    (n): n is Element => n instanceof Element && n.tagName === 'H2',
  );

  if (h2s.length === 0) {
    const rawHtml = serialise(sectionNodes);
    return {
      title: h1.textContent ?? '',
      content: sanitize(rawHtml),
      subsections: [],
    };
  }

  const firstH2 = h2s[0];
  const introNodes = firstH2 !== undefined ? collectUntil(h1, firstH2) : [];
  const introHtml = sanitize(serialise(introNodes));

  const subsections = h2s.map((h2, idx) => {
    const nextH2 = idx < h2s.length - 1 ? h2s[idx + 1] : null;
    const stop = nextH2 !== undefined ? nextH2 : nextH1;
    return buildSubsection(h2, stop ?? null, sanitize);
  });

  return {
    title: h1.textContent ?? '',
    content: introHtml,
    subsections,
  };
}

function extractTitle(doc: Document): string {
  const titleEl = doc.querySelector('.title');
  if (titleEl !== null) {
    return titleEl.textContent ?? '';
  }
  return doc.querySelector('title')?.textContent ?? '';
}

export function parseDocument(doc: Document, sanitize: Sanitize): DocData {
  rewriteLinks(doc);
  rewriteImageUrls(doc);
  fixListIndent(doc);

  const title = extractTitle(doc);
  const h1s = Array.from(doc.querySelectorAll('h1'));

  const sections = h1s
    .map((h1, idx) => {
      const nextH1 = idx < h1s.length - 1 ? h1s[idx + 1] : null;
      return buildSection(h1, nextH1 ?? null, sanitize);
    })
    .filter((section) => section.title.trim().length > 0);

  return { title, sections };
}
