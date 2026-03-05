import { google } from 'googleapis';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';

export interface ClientSecret {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
}

export interface SavedToken {
  readonly access_token: string;
  readonly refresh_token: string;
  readonly token_type: string;
  readonly expiry_date: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateClientSecret(value: unknown): ClientSecret {
  if (!isRecord(value)) {
    throw new Error('validateClientSecret: expected object');
  }

  const installed = value['installed'];
  if (!isRecord(installed)) {
    throw new Error('validateClientSecret: missing "installed" key');
  }

  if (typeof installed['client_id'] !== 'string' || installed['client_id'].length === 0) {
    throw new Error('validateClientSecret: missing client_id');
  }
  if (typeof installed['client_secret'] !== 'string' || installed['client_secret'].length === 0) {
    throw new Error('validateClientSecret: missing client_secret');
  }

  const redirectUris = installed['redirect_uris'];
  if (!Array.isArray(redirectUris)) {
    throw new Error('validateClientSecret: missing redirect_uris');
  }
  if (redirectUris.length === 0) {
    throw new Error('validateClientSecret: redirect_uris is empty');
  }

  const firstUri: unknown = redirectUris[0];
  if (typeof firstUri !== 'string') {
    throw new Error('validateClientSecret: redirect_uris[0] is not a string');
  }

  return {
    clientId: installed['client_id'],
    clientSecret: installed['client_secret'],
    redirectUri: firstUri,
  };
}

export function validateSavedToken(value: unknown): SavedToken {
  if (!isRecord(value)) {
    throw new Error('validateSavedToken: expected object');
  }

  if (typeof value['access_token'] !== 'string' || value['access_token'].length === 0) {
    throw new Error('validateSavedToken: missing access_token');
  }
  if (typeof value['refresh_token'] !== 'string' || value['refresh_token'].length === 0) {
    throw new Error('validateSavedToken: missing refresh_token');
  }
  if (typeof value['token_type'] !== 'string' || value['token_type'].length === 0) {
    throw new Error('validateSavedToken: missing token_type');
  }
  if (typeof value['expiry_date'] !== 'number') {
    throw new Error('validateSavedToken: missing expiry_date');
  }

  return {
    access_token: value['access_token'],
    refresh_token: value['refresh_token'],
    token_type: value['token_type'],
    expiry_date: value['expiry_date'],
  };
}

export function verifyGitignoreCoverage(gitignoreContent: string, credentialsPath: string): void {
  const lines = gitignoreContent.split('\n');
  const found = lines.some((line) => line.trim() === credentialsPath);
  if (!found) {
    throw new Error(
      `verifyGitignoreCoverage: "${credentialsPath}" not found in .gitignore. ` +
      'Refusing to save credentials without gitignore protection.',
    );
  }
}

export function loadClientSecret(credentialsDir: string): ClientSecret {
  const filePath = join(credentialsDir, 'client_secret.json');
  if (!existsSync(filePath)) {
    throw new Error(
      `loadClientSecret: "${filePath}" not found. ` +
      'Download OAuth2 credentials from Google Cloud Console and save them there.',
    );
  }

  const content = readFileSync(filePath, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`loadClientSecret: "${filePath}" is not valid JSON`);
  }

  return validateClientSecret(parsed);
}

export function loadSavedToken(credentialsDir: string): SavedToken | null {
  const filePath = join(credentialsDir, 'token.json');
  if (!existsSync(filePath)) return null;

  const content = readFileSync(filePath, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }

  try {
    return validateSavedToken(parsed);
  } catch {
    return null;
  }
}

export function saveToken(
  credentialsDir: string,
  token: SavedToken,
  projectRoot: string,
): void {
  const gitignorePath = join(projectRoot, '.gitignore');
  if (!existsSync(gitignorePath)) {
    throw new Error('saveToken: .gitignore not found at project root');
  }

  const gitignoreContent = readFileSync(gitignorePath, 'utf-8');
  verifyGitignoreCoverage(gitignoreContent, 'scripts/.credentials/');

  const filePath = join(credentialsDir, 'token.json');
  writeFileSync(filePath, JSON.stringify(token, null, 2), 'utf-8');
}

export async function authenticate(
  credentialsDir: string,
  projectRoot: string,
): Promise<InstanceType<typeof google.auth.OAuth2>> {
  const secret = loadClientSecret(credentialsDir);

  const oauth2Client = new google.auth.OAuth2(
    secret.clientId,
    secret.clientSecret,
    secret.redirectUri,
  );

  const savedToken = loadSavedToken(credentialsDir);
  if (savedToken !== null) {
    oauth2Client.setCredentials(savedToken);
    return oauth2Client;
  }

  const authResult = await getAuthCodeViaLocalServer(oauth2Client);

  const { tokens } = await oauth2Client.getToken({
    code: authResult.code,
    redirect_uri: authResult.redirectUri,
  });

  if (
    typeof tokens['access_token'] !== 'string' ||
    typeof tokens['refresh_token'] !== 'string' ||
    typeof tokens['token_type'] !== 'string' ||
    typeof tokens['expiry_date'] !== 'number'
  ) {
    throw new Error('authenticate: received incomplete token from Google');
  }

  const token: SavedToken = {
    access_token: tokens['access_token'],
    refresh_token: tokens['refresh_token'],
    token_type: tokens['token_type'],
    expiry_date: tokens['expiry_date'],
  };

  saveToken(credentialsDir, token, projectRoot);
  oauth2Client.setCredentials(token);
  process.stderr.write('Token saved. You will not need to authenticate again.\n');

  return oauth2Client;
}

interface AuthCodeResult {
  readonly code: string;
  readonly redirectUri: string;
}

function getAuthCodeViaLocalServer(
  oauth2Client: InstanceType<typeof google.auth.OAuth2>,
): Promise<AuthCodeResult> {
  return new Promise((resolve, reject) => {
    let serverRedirectUri = '';

    const server = createServer((req, res) => {
      if (req.url === undefined) {
        res.writeHead(400);
        res.end('Bad request');
        return;
      }

      const url = new URL(req.url, 'http://localhost');
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error !== null) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authorisation denied</h1><p>You can close this tab.</p>');
        server.close();
        reject(new Error(`Google authorisation denied: ${error}`));
        return;
      }

      if (code === null || code.length === 0) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Missing code</h1><p>No authorisation code received.</p>');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Authorised</h1><p>You can close this tab and return to your terminal.</p>');
      server.close();
      resolve({ code, redirectUri: serverRedirectUri });
    });

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        reject(new Error('Failed to start local auth server'));
        return;
      }

      serverRedirectUri = `http://127.0.0.1:${String(address.port)}`;

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive.readonly'],
        redirect_uri: serverRedirectUri,
      });

      process.stderr.write('\nOpen this URL in your browser to authorise:\n');
      process.stderr.write(`${authUrl}\n\n`);
      process.stderr.write('Waiting for authorisation...\n');
    });

    server.on('error', reject);
  });
}
