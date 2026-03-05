import { google } from 'googleapis';

export interface DriveDoc {
  readonly id: string;
  readonly name: string;
  readonly createdTime: string | undefined;
}

const MONTH_MAP: ReadonlyMap<string, string> = new Map([
  ['january', '01'], ['february', '02'], ['march', '03'], ['april', '04'],
  ['may', '05'], ['june', '06'], ['july', '07'], ['august', '08'],
  ['september', '09'], ['october', '10'], ['november', '11'], ['december', '12'],
]);

export function buildDocUrl(docId: string): string {
  if (docId.length === 0) {
    throw new Error('buildDocUrl: docId must not be empty');
  }
  return `https://docs.google.com/document/d/${docId}/pub`;
}

export function extractSlugFromTitle(title: string): string | null {
  if (title.length === 0) return null;

  const match = title.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b/i);
  if (match === null) return null;

  const monthName = match[1];
  const year = match[2];
  if (monthName === undefined || year === undefined) return null;

  const monthNum = MONTH_MAP.get(monthName.toLowerCase());
  if (monthNum === undefined) return null;

  return `${year}-${monthNum}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseDriveFileList(value: unknown): readonly DriveDoc[] {
  if (!isRecord(value)) {
    throw new Error('parseDriveFileList: expected object');
  }

  const files = value['files'];
  if (!Array.isArray(files)) return [];

  const docs: DriveDoc[] = [];
  for (const file of files) {
    if (!isRecord(file)) continue;
    if (typeof file['id'] !== 'string' || file['id'].length === 0) continue;

    const name = typeof file['name'] === 'string' ? file['name'] : '';
    const createdTime = typeof file['createdTime'] === 'string' ? file['createdTime'] : undefined;

    docs.push({ id: file['id'], name, createdTime });
  }

  return docs;
}

export async function listDocsInFolder(
  auth: InstanceType<typeof google.auth.OAuth2>,
  folderId: string,
): Promise<readonly DriveDoc[]> {
  if (folderId.length === 0) {
    throw new Error('listDocsInFolder: folderId must not be empty');
  }

  const drive = google.drive({ version: 'v3', auth });

  const allDocs: DriveDoc[] = [];
  let pageToken: string | undefined;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false`,
      fields: 'nextPageToken, files(id, name, createdTime)',
      pageSize: 100,
      pageToken,
    });

    const data: unknown = response.data;
    const docs = parseDriveFileList(data);
    allDocs.push(...docs);

    const nextToken = isRecord(data) ? data['nextPageToken'] : undefined;
    pageToken = typeof nextToken === 'string' ? nextToken : undefined;
  } while (pageToken !== undefined);

  return allDocs;
}
