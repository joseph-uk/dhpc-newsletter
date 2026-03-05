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

interface FormattingRule {
  readonly fontWeight: string | null;
  readonly fontStyle: string | null;
  readonly textDecoration: string | null;
}

function parseFormattingRules(doc: Document): ReadonlyMap<string, FormattingRule> {
  const rules = new Map<string, FormattingRule>();
  const styleElements = doc.querySelectorAll('style');

  for (const styleEl of styleElements) {
    const cssText = styleEl.textContent ?? '';
    const rulePattern = /\.(c\d+)\{([^}]*)\}/g;
    let match = rulePattern.exec(cssText);

    while (match !== null) {
      const className = match[1];
      const declarations = match[2];
      if (className === undefined || declarations === undefined) {
        match = rulePattern.exec(cssText);
        continue;
      }

      const weightMatch = declarations.match(/font-weight:\s*(\d+)/);
      const styleMatch = declarations.match(/font-style:\s*(\w+)/);
      const decoMatch = declarations.match(/text-decoration:\s*(underline)/);

      const weight = weightMatch !== null && weightMatch[1] !== undefined
        ? parseInt(weightMatch[1], 10)
        : null;
      const style = styleMatch !== null ? styleMatch[1] : null;
      const deco = decoMatch !== null ? decoMatch[1] : null;

      const hasBold = weight !== null && weight >= 700;
      const hasItalic = style !== null && style === 'italic';
      const hasUnderline = deco !== null;

      if (hasBold || hasItalic || hasUnderline) {
        rules.set(className, {
          fontWeight: hasBold ? 'bold' : null,
          fontStyle: hasItalic ? 'italic' : null,
          textDecoration: hasUnderline ? 'underline' : null,
        });
      }

      match = rulePattern.exec(cssText);
    }
  }

  return rules;
}

function inlineFormattingStyles(doc: Document): void {
  const rules = parseFormattingRules(doc);
  if (rules.size === 0) return;

  for (const [className, rule] of rules) {
    const elements = doc.querySelectorAll(`.${className}`);
    for (const el of elements) {
      const parts: string[] = [];
      const existing = el.getAttribute('style') ?? '';
      if (existing.length > 0) {
        parts.push(existing.endsWith(';') ? existing : `${existing};`);
      }
      if (rule.fontWeight !== null) parts.push(`font-weight:${rule.fontWeight}`);
      if (rule.fontStyle !== null) parts.push(`font-style:${rule.fontStyle}`);
      if (rule.textDecoration !== null) parts.push(`text-decoration:${rule.textDecoration}`);
      el.setAttribute('style', parts.join(';'));
    }
  }
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

function isH2Element(node: Node): node is Element {
  return node.nodeType === node.ELEMENT_NODE && 'tagName' in node && node.tagName === 'H2';
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
  const h2s = sectionNodes.filter(isH2Element);

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
    const nextH2 = h2s[idx + 1];
    const stop = nextH2 !== undefined ? nextH2 : nextH1;
    return buildSubsection(h2, stop, sanitize);
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
  inlineFormattingStyles(doc);

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
