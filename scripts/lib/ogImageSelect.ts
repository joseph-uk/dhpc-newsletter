import type { DocData } from '../../src/types/DocData';

export interface ImageCandidate {
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

const MIN_ASPECT_RATIO = 1.3;
const MIN_DISPLAY_WIDTH = 600;
const IMG_TAG_PATTERN = /<img[^>]*>/g;

function firstCapture(pattern: RegExp, input: string): string | null {
  const match = pattern.exec(input);
  if (match === null) return null;
  const captured = match[1];
  return captured === undefined ? null : captured;
}

export function parseImgTag(tag: string): ImageCandidate | null {
  const src = firstCapture(/src="([^"]*)"/, tag);
  if (src === null || src.length === 0) return null;

  const widthStr = firstCapture(/width:\s*([\d.]+)px/, tag);
  const heightStr = firstCapture(/height:\s*([\d.]+)px/, tag);
  if (widthStr === null || heightStr === null) return null;

  const width = Number.parseFloat(widthStr);
  const height = Number.parseFloat(heightStr);
  if (width <= 0 || height <= 0) return null;

  return { src, width, height };
}

export function extractImageCandidates(content: string): readonly ImageCandidate[] {
  const tags = content.match(IMG_TAG_PATTERN);
  if (tags === null) return [];

  const candidates: ImageCandidate[] = [];
  for (const tag of tags) {
    const candidate = parseImgTag(tag);
    if (candidate !== null) candidates.push(candidate);
  }
  return candidates;
}

export function isLandscape(candidate: ImageCandidate): boolean {
  if (candidate.width < MIN_DISPLAY_WIDTH) return false;
  return candidate.width / candidate.height >= MIN_ASPECT_RATIO;
}

function collectCandidates(doc: DocData): readonly ImageCandidate[] {
  const candidates: ImageCandidate[] = [];
  for (const section of doc.sections) {
    candidates.push(...extractImageCandidates(section.content));
    for (const subsection of section.subsections) {
      candidates.push(...extractImageCandidates(subsection.content));
    }
  }
  return candidates;
}

export function selectLandscapeImage(doc: DocData): string | null {
  const landscape = collectCandidates(doc).find(isLandscape);
  return landscape === undefined ? null : landscape.src;
}
