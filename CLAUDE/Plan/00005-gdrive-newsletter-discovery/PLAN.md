# Plan: Google Drive Newsletter Discovery CLI

## Context

Adding new newsletter issues to the site currently requires manually finding each Google Doc's published URL and adding a row to `issues.csv`. The user has a backlog of editions in a single Google Drive folder and wants to automate discovery. This plan adds a CLI tool that authenticates via OAuth2 (browser-based), lists all Google Docs in the folder, and appends new entries to the CSV.

**Security is paramount** — this is a public repository. No credentials, tokens, or secrets must ever be committed.

## One-Time User Setup (documented, not coded)

1. Go to Google Cloud Console
2. Create a project (or use existing)
3. Enable the **Google Drive API**
4. Create OAuth2 credentials -> Application type: **Desktop app**
5. Download the JSON -> save as `scripts/.credentials/client_secret.json`
6. The first run of the CLI opens a browser for Google login

## Security Hardening

### Step 1: Gitignore patterns
Add to `.gitignore`:
```
scripts/.credentials/
```

### Step 2: Credential file validation
Before writing any token file, the script must verify:
- `scripts/.credentials/` is listed in `.gitignore`
- The directory has restrictive permissions (700)

## Implementation

### Files to create (TDD - tests first):

| File | Purpose |
|------|---------|
| `scripts/lib/googleAuth.ts` | OAuth2 browser flow: load client secret, open browser, exchange code, store/refresh tokens |
| `scripts/lib/googleAuth.test.ts` | Tests for token validation, credential loading |
| `scripts/lib/driveClient.ts` | Drive API wrapper: list Google Docs in a folder |
| `scripts/lib/driveClient.test.ts` | Tests for response parsing, slug extraction |
| `scripts/gdrive-discover.ts` | CLI entry point |

### Files to modify:

| File | Change |
|------|--------|
| `.gitignore` | Add `scripts/.credentials/` |
| `package.json` | Add `"gdrive:discover"` script |
| `scripts/lib/csv.ts` | Add `formatCsvRow()` and `appendCsvRow()` for writing |
| `scripts/lib/csv.test.ts` | Tests for new CSV write functions |

### Dependency:

```
npm install --save-dev googleapis
```

(`googleapis` includes `google-auth-library` and typed Drive API client. Handles OAuth2 browser flow, token refresh, etc.)

### Architecture

#### 1. `scripts/lib/googleAuth.ts`

```
loadClientSecret(credentialsDir) -> OAuth2ClientConfig
authenticate(config, credentialsDir) -> OAuth2Client
  - Check for saved token at scripts/.credentials/token.json
  - If valid: use refresh token
  - If not: open browser -> OAuth2 consent -> save token
saveToken(credentialsDir, token) -> void
  - Verify .gitignore coverage before writing
```

Scopes needed: `https://www.googleapis.com/auth/drive.readonly`

#### 2. `scripts/lib/driveClient.ts`

```
listDocsInFolder(auth, folderId) -> DriveDoc[]
  - Drive API files.list with query:
    '{folderId}' in parents AND mimeType='application/vnd.google-apps.document'
  - Returns: { id, title, createdTime, modifiedTime }

buildDocUrl(docId) -> string
  - Returns: https://docs.google.com/document/d/{docId}/pub

extractSlugFromTitle(title) -> string | null
  - Parse month/year from titles like "Skywords December 2024"
  - Returns slug like "2024-12" or null if unparseable
```

**URL format**: `https://docs.google.com/document/d/{docId}/pub` works for any document with public link sharing. Different from the existing `/d/e/2PACX-...` format in the CSV, but functionally equivalent. The cache pipeline works with both.

#### 3. `scripts/gdrive-discover.ts`

CLI interface:
```
npm run gdrive:discover -- --folder-id=<FOLDER_ID>
npm run gdrive:discover -- --folder-id=<FOLDER_ID> --status=published
npm run gdrive:discover -- --folder-id=<FOLDER_ID> --dry-run
```

Flow:
1. Parse args (folder-id required, status defaults to "published", dry-run flag)
2. Authenticate via OAuth2
3. List all Google Docs in the folder
4. Read existing `issues.csv`
5. Compare: find docs not yet in CSV (match by doc ID in URL)
6. Display findings:
   ```
   Found 15 documents in folder
   Already in CSV: 13
   New documents: 2
     - "Skywords January 2026" -> slug: 2026-01
     - "Skywords February 2026" -> slug: 2026-02
   ```
7. If not `--dry-run`: append new rows to `issues.csv`
8. Print instructions: `Run 'npm run cache' to fetch and cache new issues`

#### 4. CSV write extension (`scripts/lib/csv.ts`)

Add:
- `formatCsvRow(row: CsvRow): string` — formats a row as CSV
- `appendCsvRow(csvPath: string, row: CsvRow): void` — appends to file with trailing newline

## Verification

1. **Unit tests**: `npx vitest run` — all new tests pass
2. **Lint**: `npx eslint scripts/`
3. **Build**: `npm run build`
4. **Manual test**:
   - `npm run gdrive:discover -- --folder-id=<ID> --dry-run` — lists docs
   - Without `--dry-run` — appends new rows to CSV
   - `npm run cache --slug <new-slug>` — caches with new URL format
   - `npm run freeze` — includes new issue in registry
5. **Security**:
   - `scripts/.credentials/` is in `.gitignore`
   - No credential patterns in staged files
   - Token file has restrictive permissions
