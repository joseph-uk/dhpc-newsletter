const SHORT_URL_HOSTS: ReadonlySet<string> = new Set([
  'shorturl.at',
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'rb.gy',
  'ow.ly',
  'cutt.ly',
]);

export function isShortUrl(urlString: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }
  const host = parsed.hostname;
  if (SHORT_URL_HOSTS.has(host)) {
    return true;
  }
  for (const shortHost of SHORT_URL_HOSTS) {
    if (host.endsWith(`.${shortHost}`)) {
      return true;
    }
  }
  return false;
}

const HREF_PATTERN = /href="(https?:\/\/[^"]+)"/g;

export function extractShortUrls(html: string): readonly string[] {
  const found = new Set<string>();
  let match = HREF_PATTERN.exec(html);
  while (match !== null) {
    const url = match[1];
    if (url !== undefined && isShortUrl(url)) {
      found.add(url);
    }
    match = HREF_PATTERN.exec(html);
  }
  HREF_PATTERN.lastIndex = 0;
  return [...found];
}

export function replaceUrls(content: string, urlMap: ReadonlyMap<string, string>): string {
  let result = content;
  for (const [shortUrl, resolvedUrl] of urlMap) {
    while (result.includes(shortUrl)) {
      result = result.replace(shortUrl, resolvedUrl);
    }
  }
  return result;
}

export async function resolveUrl(shortUrl: string): Promise<string> {
  const response = await fetch(shortUrl, {
    method: 'HEAD',
    redirect: 'follow',
  });
  return response.url;
}

export async function resolveShortUrls(
  shortUrls: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  const resolved = new Map<string, string>();
  for (const url of shortUrls) {
    try {
      const destination = await resolveUrl(url);
      if (destination !== url) {
        resolved.set(url, destination);
      }
    } catch {
      // Skip URLs that fail to resolve — leave them as-is
    }
  }
  return resolved;
}
