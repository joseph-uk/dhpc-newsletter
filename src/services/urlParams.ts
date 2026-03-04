const GOOGLE_DOC_BASE = 'https://docs.google.com/document/d/e/';

function parseHash(hash: string): URLSearchParams {
  const withoutHash = hash.startsWith('#') ? hash.slice(1) : hash;
  return new URLSearchParams(withoutHash);
}

export function getDocUrl(): string | null {
  const params = parseHash(window.location.hash);

  const id = params.get('id');
  if (id !== null) {
    return `${GOOGLE_DOC_BASE}${id}/pub`;
  }

  const url = params.get('url');
  if (url !== null) {
    return url;
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
