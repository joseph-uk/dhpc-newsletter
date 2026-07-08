export interface IssueMeta {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly imagePath: string | null;
}

export const DEFAULT_OG_IMAGE = 'dhcp_logo.jpeg';
const SITE_NAME = 'Skywords — DHPC Newsletter';

export function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderMetaTags(meta: IssueMeta, origin: string): string {
  if (origin.length === 0) {
    throw new Error('renderMetaTags: origin must not be empty');
  }
  if (!origin.endsWith('/')) {
    throw new Error(`renderMetaTags: origin must end with a trailing slash, received "${origin}"`);
  }

  const imagePath = meta.imagePath === null ? DEFAULT_OG_IMAGE : meta.imagePath;
  const image = escapeAttribute(`${origin}${imagePath}`);
  const url = escapeAttribute(`${origin}issue/${meta.slug}`);
  const title = escapeAttribute(meta.title);
  const description = escapeAttribute(meta.description);
  const siteName = escapeAttribute(SITE_NAME);

  return [
    '<meta property="og:type" content="article" />',
    `<meta property="og:site_name" content="${siteName}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ].join('\n');
}
