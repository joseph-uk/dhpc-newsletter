import type { DocData } from '../../src/types/DocData';

const GOOGLE_IMAGE_PATTERN = /https:\/\/lh3\.googleusercontent\.com\/docs-images-rt\/[^\s"'<>]+/g;

export function extractImageUrls(content: string): readonly string[] {
  const matches = content.match(GOOGLE_IMAGE_PATTERN);
  if (matches === null) return [];
  return [...new Set(matches)];
}

export function rewriteImageUrlsInContent(content: string, urlMap: ReadonlyMap<string, string>): string {
  let result = content;
  for (const [originalUrl, localPath] of urlMap) {
    result = result.replaceAll(originalUrl, localPath);
  }
  return result;
}

export function buildDeploymentUrlMap(imageFilenames: readonly string[], slug: string): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const filename of imageFilenames) {
    map.set(`images/${filename}`, `issues/${slug}/images/${filename}`);
  }
  return map;
}

export function rewriteDocDataImages(doc: DocData, urlMap: ReadonlyMap<string, string>): DocData {
  return {
    title: doc.title,
    sections: doc.sections.map((section) => ({
      title: section.title,
      content: rewriteImageUrlsInContent(section.content, urlMap),
      subsections: section.subsections.map((sub) => ({
        title: sub.title,
        content: rewriteImageUrlsInContent(sub.content, urlMap),
      })),
    })),
  };
}
