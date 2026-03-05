import { describe, it, expect } from 'vitest';
import { checkContentFreshness } from '../../src/services/freshnessCheck';
import { sha256Browser } from '../../src/services/contentHash';

describe('checkContentFreshness', () => {
  const sampleHtml = `<html><head><style>.title{}</style></head><body>
    <div id="header"><p class="title"><span>Test Doc</span></p></div>
    <div id="contents"><h2><span>Section One</span></h2><p><span>Content here</span></p></div>
  </body></html>`;

  it('returns null when live HTML matches cached hash', async () => {
    const cachedHash = await sha256Browser(sampleHtml);
    const result = await checkContentFreshness(sampleHtml, cachedHash);
    expect(result).toBeNull();
  });

  it('returns parsed DocData when live HTML differs from cached hash', async () => {
    const staleHash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const result = await checkContentFreshness(sampleHtml, staleHash);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('sections');
  });

  it('returns DocData with correct title from changed content', async () => {
    const staleHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const result = await checkContentFreshness(sampleHtml, staleHash);
    expect(result).not.toBeNull();
    if (result !== null) {
      expect(result.title).toBe('Test Doc');
    }
  });
});
