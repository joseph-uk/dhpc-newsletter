import type { DocData, Section, Subsection } from '../types/DocData';

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSubsection(value: unknown): value is Subsection {
  if (!isStringRecord(value)) return false;
  return typeof value['title'] === 'string' && typeof value['content'] === 'string';
}

function isSection(value: unknown): value is Section {
  if (!isStringRecord(value)) return false;
  const subs = value['subsections'];
  return (
    typeof value['title'] === 'string' &&
    typeof value['content'] === 'string' &&
    Array.isArray(subs) && subs.every(isSubsection)
  );
}

function isDocData(value: unknown): value is DocData {
  if (!isStringRecord(value)) return false;
  const sections = value['sections'];
  return (
    typeof value['title'] === 'string' &&
    Array.isArray(sections) && sections.every(isSection)
  );
}

export async function loadFrozenDoc(slug: string): Promise<DocData> {
  if (slug.length === 0) {
    throw new Error('loadFrozenDoc: slug must not be empty');
  }

  const docUrl = `${import.meta.env.BASE_URL}issues/${slug}.json`;

  let response: Response;
  try {
    response = await fetch(docUrl, { cache: 'no-store' });
  } catch (cause) {
    throw new Error(
      `loadFrozenDoc: network failure fetching "${docUrl}": ${String(cause)}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `loadFrozenDoc: server returned ${response.status} for "${docUrl}"`,
    );
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch (cause) {
    throw new Error(
      `loadFrozenDoc: failed to parse JSON from "${docUrl}": ${String(cause)}`,
    );
  }

  if (!isDocData(parsed)) {
    throw new Error(
      `loadFrozenDoc: "${docUrl}" does not match expected DocData shape`,
    );
  }

  return parsed;
}
