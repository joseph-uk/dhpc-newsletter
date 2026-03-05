import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const GOOGLE_CDN_PREFIX = 'https://lh3.googleusercontent.com/docs-images-rt/';

export function extractImageId(url: string): string {
  if (!url.startsWith(GOOGLE_CDN_PREFIX)) {
    throw new Error(`extractImageId: not a Google Docs image URL: "${url}"`);
  }
  const id = url.slice(GOOGLE_CDN_PREFIX.length);
  if (id.length === 0) {
    throw new Error(`extractImageId: empty image ID in URL: "${url}"`);
  }
  return id;
}

export function contentTypeToExtension(contentType: string): string {
  const base = contentType.split(';')[0]?.trim() ?? '';
  switch (base) {
    case 'image/jpeg': return '.jpg';
    case 'image/png': return '.png';
    case 'image/gif': return '.gif';
    case 'image/webp': return '.webp';
    case 'image/svg+xml': return '.svg';
    default: return '.jpg';
  }
}

export async function downloadImage(url: string, outputDir: string): Promise<string> {
  const id = extractImageId(url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`downloadImage: failed to fetch "${url}": HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const ext = contentTypeToExtension(contentType);
  const filename = `${id}${ext}`;

  mkdirSync(outputDir, { recursive: true });
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(join(outputDir, filename), buffer);

  return filename;
}

export async function downloadAllImages(
  urls: readonly string[],
  outputDir: string,
): Promise<ReadonlyMap<string, string>> {
  const urlMap = new Map<string, string>();

  for (const url of urls) {
    const filename = await downloadImage(url, outputDir);
    urlMap.set(url, `images/${filename}`);
  }

  return urlMap;
}
