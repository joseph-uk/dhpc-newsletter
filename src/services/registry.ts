import type { Issue, IssueStatus, Registry } from '../types/Registry';

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIssueStatus(value: unknown): value is IssueStatus {
  return value === 'pre-release' || value === 'published' || value === 'frozen';
}

function isIssue(value: unknown): value is Issue {
  if (!isStringRecord(value)) return false;
  return (
    typeof value['slug'] === 'string' && value['slug'].length > 0 &&
    typeof value['title'] === 'string' && value['title'].length > 0 &&
    typeof value['docUrl'] === 'string' &&
    isIssueStatus(value['status']) &&
    typeof value['contentHash'] === 'string'
  );
}

function isRegistry(value: unknown): value is Registry {
  if (!isStringRecord(value)) return false;
  const issues = value['issues'];
  return Array.isArray(issues) && issues.every(isIssue);
}

export async function loadRegistry(): Promise<Registry> {
  const registryUrl = `${import.meta.env.BASE_URL}registry.json`;

  let response: Response;
  try {
    response = await fetch(registryUrl, { cache: 'no-store' });
  } catch (cause) {
    throw new Error(
      `loadRegistry: network failure fetching "${registryUrl}": ${String(cause)}`,
    );
  }

  if (response.status === 404) {
    return { issues: [] };
  }

  if (!response.ok) {
    throw new Error(
      `loadRegistry: server returned ${response.status} for "${registryUrl}"`,
    );
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch (cause) {
    throw new Error(
      `loadRegistry: failed to parse JSON from "${registryUrl}": ${String(cause)}`,
    );
  }

  if (!isRegistry(parsed)) {
    throw new Error(
      `loadRegistry: registry.json does not match expected shape`,
    );
  }

  return parsed;
}
