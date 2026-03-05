import type { DocData } from '../types/DocData';
import { sha256Browser } from './contentHash';
import { parseGoogleDoc } from './docParser';

export async function checkContentFreshness(
  liveHtml: string,
  cachedHash: string,
): Promise<DocData | null> {
  const liveHash = await sha256Browser(liveHtml);
  if (liveHash === cachedHash) return null;
  return parseGoogleDoc(liveHtml);
}
