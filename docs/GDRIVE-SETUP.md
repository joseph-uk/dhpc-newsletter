# Google Drive Newsletter Discovery — Setup Guide

This CLI tool discovers newsletter Google Docs in a Drive folder and adds them to `issues.csv` automatically.

## Prerequisites

- A Google account with access to the newsletter Drive folder
- Node.js 20+ (already installed if you can run `npm run dev`)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top left, then **New Project**
3. Name it something like `dhpc-skywords` and click **Create**
4. Wait for creation to complete, then select the new project

## Step 2: Enable the Google Drive API

1. In the Cloud Console, go to **APIs & Services** > **Library**
   - Or visit: https://console.cloud.google.com/apis/library
2. Search for **Google Drive API**
3. Click on it, then click **Enable**

## Step 3: Configure the OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
   - Or visit: https://console.cloud.google.com/apis/credentials/consent
2. Select **External** user type, click **Create**
3. Fill in:
   - **App name**: `Skywords CLI`
   - **User support email**: your email
   - **Developer contact**: your email
4. Click **Save and Continue** through the remaining steps (Scopes, Test users, Summary)
5. On the **Test users** step, click **Add Users** and add your Google email address
   - While the app is in "Testing" status, only test users can authenticate

## Step 4: Create OAuth2 Credentials

1. Go to **APIs & Services** > **Credentials**
   - Or visit: https://console.cloud.google.com/apis/credentials
2. Click **+ Create Credentials** > **OAuth client ID**
3. Select **Desktop app** as the application type
4. Name it `Skywords CLI`
5. Click **Create**
6. Click **Download JSON** on the confirmation dialog
7. Save the downloaded file as:
   ```
   scripts/.credentials/client_secret.json
   ```
   This directory is gitignored — the file will never be committed.

## Step 5: Find Your Drive Folder ID

1. Open Google Drive in your browser
2. Navigate to the folder containing the newsletter Google Docs
3. Look at the URL — it will be something like:
   ```
   https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ
   ```
4. The folder ID is the long string after `/folders/`:
   ```
   1aBcDeFgHiJkLmNoPqRsTuVwXyZ
   ```
5. Copy this — you'll need it for the CLI command

## Usage

### First Run (Authentication)

The first time you run the tool, it will print a URL. Open it in your browser, log in with your Google account, and paste the authorisation code back into the terminal.

```bash
npm run gdrive:discover -- --folder-id=YOUR_FOLDER_ID --dry-run
```

The `--dry-run` flag shows what would be added without making changes. The authorisation token is saved to `scripts/.credentials/token.json` (gitignored) so you won't need to authenticate again.

### Discover and Add New Issues

```bash
# Preview what will be added (recommended first)
npm run gdrive:discover -- --folder-id=YOUR_FOLDER_ID --dry-run

# Add new issues to CSV
npm run gdrive:discover -- --folder-id=YOUR_FOLDER_ID

# Set status for new entries (default: published)
npm run gdrive:discover -- --folder-id=YOUR_FOLDER_ID --status=frozen
npm run gdrive:discover -- --folder-id=YOUR_FOLDER_ID --status=pre-release
```

### After Adding Issues

```bash
# 1. Review the CSV
cat issues.csv

# 2. Cache the new issues (fetches HTML and images)
npm run cache

# 3. Freeze for deployment
npm run freeze

# 4. Verify locally
npm run dev
```

## How It Works

1. Authenticates with Google Drive API (read-only access)
2. Lists all Google Docs in the specified folder
3. Extracts month/year from document titles (e.g. "Skywords January 2025" -> `2025-01`)
4. Compares against existing `issues.csv` entries
5. Appends new entries with the document's published URL

### Title Parsing

The tool extracts slugs from document titles containing a month name and year:
- `Skywords December 2024` -> `2024-12`
- `DHPC Newsletter March 2026` -> `2026-03`
- `February 2025` -> `2025-02`

Documents with titles that don't contain a recognisable month/year pattern are skipped with a warning.

### URL Format

The tool constructs URLs in the format `https://docs.google.com/document/d/{docId}/pub`. This works for any document with public link sharing enabled. The existing cache pipeline handles fetching and parsing these URLs.

## Security

- **All credentials are local only** — `scripts/.credentials/` is in `.gitignore`
- **Read-only access** — the tool only requests `drive.readonly` scope
- **Token verification** — the code checks `.gitignore` coverage before saving any tokens
- **Never commit** `client_secret.json` or `token.json`

## Troubleshooting

### "client_secret.json not found"
Download OAuth2 credentials from Google Cloud Console (Step 4) and save to `scripts/.credentials/client_secret.json`.

### "Access denied" or 403 error
- Ensure you added your email as a test user (Step 3, point 5)
- Ensure the Drive API is enabled (Step 2)
- Ensure the documents are in a folder your account can access

### Documents skipped with "cannot extract month/year"
The document title doesn't match the expected pattern. Rename the document in Google Drive to include the month name and four-digit year, e.g. "Skywords January 2025".

### Token expired
Delete `scripts/.credentials/token.json` and run the command again to re-authenticate.
