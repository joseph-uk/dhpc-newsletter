const GOOGLE_DOC_BASE = 'https://docs.google.com/document/d/e/';

export type Route =
  | { readonly kind: 'index' }
  | { readonly kind: 'issue'; readonly slug: string }
  | { readonly kind: 'article'; readonly slug: string; readonly articleSlug: string }
  | { readonly kind: 'doc'; readonly url: string }
  | { readonly kind: 'not-found'; readonly path: string };

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stripTrailingSlash(path: string): string {
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1);
  }
  return path;
}

function parseDocRoute(search: string): Route {
  const params = new URLSearchParams(search);

  const url = params.get('url');
  if (url !== null && url.length > 0) {
    return { kind: 'doc', url };
  }

  const id = params.get('id');
  if (id !== null && id.length > 0) {
    return { kind: 'doc', url: `${GOOGLE_DOC_BASE}${id}/pub` };
  }

  return { kind: 'not-found', path: 'doc' };
}

export function parseRoute(pathname: string, basePath: string, search?: string): Route {
  const normalizedBase = stripTrailingSlash(basePath);
  const normalizedPath = stripTrailingSlash(pathname);

  let relative: string;
  if (normalizedPath === normalizedBase) {
    relative = '';
  } else if (normalizedPath.startsWith(basePath)) {
    relative = normalizedPath.slice(basePath.length);
  } else {
    relative = normalizedPath.slice(normalizedBase.length + 1);
  }

  if (relative === '') {
    return { kind: 'index' };
  }

  const segments = relative.split('/');
  const firstSegment = segments[0];

  if (firstSegment === 'issue') {
    const slug = segments[1];
    if (slug === undefined || slug.length === 0) {
      return { kind: 'not-found', path: relative };
    }

    const articleSlug = segments[2];
    if (articleSlug !== undefined && articleSlug.length > 0) {
      return { kind: 'article', slug, articleSlug };
    }

    return { kind: 'issue', slug };
  }

  if (firstSegment === 'doc') {
    return parseDocRoute(search ?? '');
  }

  return { kind: 'not-found', path: relative };
}

export function buildPath(route: Route, basePath: string): string {
  switch (route.kind) {
    case 'index':
      return basePath;
    case 'issue':
      return `${basePath}issue/${route.slug}`;
    case 'article':
      return `${basePath}issue/${route.slug}/${route.articleSlug}`;
    case 'doc':
      return `${basePath}doc?url=${encodeURIComponent(route.url)}`;
    case 'not-found':
      return basePath;
  }
}

export function findArticleIndex(sections: readonly { readonly title: string }[], articleSlug: string): number | undefined {
  const index = sections.findIndex((s) => slugify(s.title) === articleSlug);
  return index >= 0 ? index : undefined;
}

export function navigateTo(route: Route, basePath: string): void {
  const path = buildPath(route, basePath);
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function getBasePath(): string {
  return import.meta.env.BASE_URL;
}

export function getCurrentRoute(): Route {
  return parseRoute(window.location.pathname, getBasePath(), window.location.search.slice(1));
}

export function redirectHashUrls(basePath: string): boolean {
  const hash = window.location.hash;
  if (hash.length === 0) return false;

  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);

  const slug = params.get('issue');
  if (slug !== null && slug.length > 0) {
    const path = buildPath({ kind: 'issue', slug }, basePath);
    window.history.replaceState(null, '', path);
    return true;
  }

  const id = params.get('id');
  if (id !== null && id.length > 0) {
    const url = `${GOOGLE_DOC_BASE}${id}/pub`;
    const path = buildPath({ kind: 'doc', url }, basePath);
    window.history.replaceState(null, '', path);
    return true;
  }

  const url = params.get('url');
  if (url !== null && url.length > 0) {
    const path = buildPath({ kind: 'doc', url }, basePath);
    window.history.replaceState(null, '', path);
    return true;
  }

  return false;
}
