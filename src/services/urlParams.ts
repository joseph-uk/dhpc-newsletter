const GOOGLE_DOC_BASE = 'https://docs.google.com/document/d/e/';

export type HashMode =
  | { readonly kind: 'issue'; readonly slug: string }
  | { readonly kind: 'url'; readonly url: string }
  | { readonly kind: 'none' };

function parseHash(hash: string): URLSearchParams {
  const withoutHash = hash.startsWith('#') ? hash.slice(1) : hash;
  return new URLSearchParams(withoutHash);
}

export function getHashMode(): HashMode {
  const params = parseHash(window.location.hash);

  const slug = params.get('issue');
  if (slug !== null && slug.length > 0) {
    return { kind: 'issue', slug };
  }

  const id = params.get('id');
  if (id !== null && id.length > 0) {
    return { kind: 'url', url: `${GOOGLE_DOC_BASE}${id}/pub` };
  }

  const url = params.get('url');
  if (url !== null && url.length > 0) {
    return { kind: 'url', url };
  }

  return { kind: 'none' };
}

export function getDocUrl(): string | null {
  const mode = getHashMode();
  if (mode.kind === 'url') {
    return mode.url;
  }
  return null;
}

export function setDocUrl(url: string): void {
  if (url.length === 0) {
    throw new Error('setDocUrl: url must not be empty');
  }

  window.location.hash = '#url=' + encodeURIComponent(url);
  location.reload();
}

export function setIssueSlug(slug: string): void {
  if (slug.length === 0) {
    throw new Error('setIssueSlug: slug must not be empty');
  }

  window.location.hash = '#issue=' + encodeURIComponent(slug);
  location.reload();
}
