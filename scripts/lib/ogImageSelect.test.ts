import { describe, it, expect } from 'vitest';
import {
  parseImgTag,
  extractImageCandidates,
  isLandscape,
  selectLandscapeImage,
} from './ogImageSelect';
import type { DocData } from '../../src/types/DocData';

const landscapeTag =
  '<img alt="" src="issues/2025-07/images/photo.jpg" style="width: 766.00px; height: 440.00px; margin-left: 0.00px;" title="">';
const portraitTag =
  '<img alt="" src="issues/2025-07/images/tall.png" style="width: 253.00px; height: 575.00px;" title="">';
const smallLandscapeTag =
  '<img src="issues/2025-07/images/small.jpg" style="width: 400.00px; height: 200.00px;">';

describe('parseImgTag', () => {
  it('extracts src, width and height from an img tag', () => {
    expect(parseImgTag(landscapeTag)).toEqual({
      src: 'issues/2025-07/images/photo.jpg',
      width: 766,
      height: 440,
    });
  });

  it('returns null when src is missing', () => {
    expect(parseImgTag('<img style="width: 766.00px; height: 440.00px;">')).toBeNull();
  });

  it('returns null when src is empty', () => {
    expect(parseImgTag('<img src="" style="width: 766.00px; height: 440.00px;">')).toBeNull();
  });

  it('returns null when width is missing', () => {
    expect(parseImgTag('<img src="a.jpg" style="height: 440.00px;">')).toBeNull();
  });

  it('returns null when height is missing', () => {
    expect(parseImgTag('<img src="a.jpg" style="width: 766.00px;">')).toBeNull();
  });

  it('returns null when a dimension is zero', () => {
    expect(parseImgTag('<img src="a.jpg" style="width: 766.00px; height: 0.00px;">')).toBeNull();
  });
});

describe('extractImageCandidates', () => {
  it('returns all parseable images in document order', () => {
    const content = `<p>Intro</p>${landscapeTag}<p>Mid</p>${portraitTag}`;
    expect(extractImageCandidates(content)).toEqual([
      { src: 'issues/2025-07/images/photo.jpg', width: 766, height: 440 },
      { src: 'issues/2025-07/images/tall.png', width: 253, height: 575 },
    ]);
  });

  it('skips images without usable dimensions', () => {
    const content = `${landscapeTag}<img src="nodims.jpg">`;
    expect(extractImageCandidates(content)).toEqual([
      { src: 'issues/2025-07/images/photo.jpg', width: 766, height: 440 },
    ]);
  });

  it('returns empty array when there are no images', () => {
    expect(extractImageCandidates('<p>no images</p>')).toEqual([]);
  });
});

describe('isLandscape', () => {
  it('accepts a wide, large-enough image', () => {
    expect(isLandscape({ src: 'a.jpg', width: 766, height: 440 })).toBe(true);
  });

  it('rejects a portrait image', () => {
    expect(isLandscape({ src: 'a.jpg', width: 253, height: 575 })).toBe(false);
  });

  it('rejects a wide image that is too small', () => {
    expect(isLandscape({ src: 'a.jpg', width: 400, height: 200 })).toBe(false);
  });

  it('rejects an image whose ratio is below threshold', () => {
    expect(isLandscape({ src: 'a.jpg', width: 700, height: 600 })).toBe(false);
  });
});

describe('selectLandscapeImage', () => {
  it('returns the first landscape image src across sections and subsections', () => {
    const doc: DocData = {
      title: 'Test',
      sections: [
        {
          title: 'Sec 1',
          content: `${portraitTag}${smallLandscapeTag}`,
          subsections: [{ title: 'Sub', content: landscapeTag }],
        },
      ],
    };
    expect(selectLandscapeImage(doc)).toBe('issues/2025-07/images/photo.jpg');
  });

  it('returns null when no landscape image is present', () => {
    const doc: DocData = {
      title: 'Test',
      sections: [{ title: 'Sec', content: `${portraitTag}${smallLandscapeTag}`, subsections: [] }],
    };
    expect(selectLandscapeImage(doc)).toBeNull();
  });

  it('returns null when the document has no images', () => {
    const doc: DocData = {
      title: 'Empty',
      sections: [{ title: 'Sec', content: '<p>text</p>', subsections: [] }],
    };
    expect(selectLandscapeImage(doc)).toBeNull();
  });
});
