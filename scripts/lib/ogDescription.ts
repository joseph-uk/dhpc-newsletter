import type { DocData } from '../../src/types/DocData';

const MAX_DESCRIPTION_LENGTH = 200;
const ELLIPSIS = '…';
const NON_BREAKING_SPACE = ' ';

// Ordered so that "&amp;" is decoded LAST — decoding it earlier would let a
// literal "&amp;lt;" collapse to "<" instead of staying "&lt;".
const HTML_ENTITIES: ReadonlyArray<readonly [string, string]> = [
  ['&lt;', '<'],
  ['&gt;', '>'],
  ['&quot;', '"'],
  ['&#39;', "'"],
  ['&apos;', "'"],
  ['&nbsp;', NON_BREAKING_SPACE],
  ['&amp;', '&'],
];

function decodeEntities(text: string): string {
  let result = text;
  for (const [entity, char] of HTML_ENTITIES) {
    result = result.replaceAll(entity, char);
  }
  return result;
}

export function stripHtml(html: string): string {
  const withoutTags = html.replace(/<[^>]*>/g, ' ');
  return decodeEntities(withoutTags).replace(/\s+/g, ' ').trim();
}

function firstMeaningfulText(doc: DocData): string {
  for (const section of doc.sections) {
    const sectionText = stripHtml(section.content);
    if (sectionText.length > 0) return sectionText;

    for (const subsection of section.subsections) {
      const subText = stripHtml(subsection.content);
      if (subText.length > 0) return subText;
    }
  }
  return '';
}

function truncate(text: string): string {
  if (text.length <= MAX_DESCRIPTION_LENGTH) return text;

  const slice = text.slice(0, MAX_DESCRIPTION_LENGTH - ELLIPSIS.length);
  const lastSpace = slice.lastIndexOf(' ');
  const trimmed = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${trimmed}${ELLIPSIS}`;
}

export function extractDescription(doc: DocData): string {
  const text = firstMeaningfulText(doc);
  if (text.length === 0) return doc.title;
  return truncate(text);
}
