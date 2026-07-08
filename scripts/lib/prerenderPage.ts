import type { DocData } from '../../src/types/DocData';
import { selectLandscapeImage } from './ogImageSelect';
import { extractDescription } from './ogDescription';
import { escapeAttribute, renderMetaTags } from './metaTags';
import type { IssueMeta } from './metaTags';

const OG_START = '<!-- og:start -->';
const OG_END = '<!-- og:end -->';
const OG_REGION = /<!-- og:start -->[\s\S]*?<!-- og:end -->/;
const TITLE_REGION = /<title>[\s\S]*?<\/title>/;

export function buildIssueMeta(doc: DocData, slug: string): IssueMeta {
  return {
    slug,
    title: doc.title,
    description: extractDescription(doc),
    imagePath: selectLandscapeImage(doc),
  };
}

export function injectIssueMeta(template: string, meta: IssueMeta, origin: string): string {
  if (!OG_REGION.test(template)) {
    throw new Error(`injectIssueMeta: template missing ${OG_START} / ${OG_END} markers`);
  }
  if (!TITLE_REGION.test(template)) {
    throw new Error('injectIssueMeta: template missing <title> element');
  }

  const tags = renderMetaTags(meta, origin);
  const withTags = template.replace(OG_REGION, () => `${OG_START}\n${tags}\n    ${OG_END}`);
  return withTags.replace(TITLE_REGION, () => `<title>${escapeAttribute(meta.title)}</title>`);
}
