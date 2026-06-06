/**
 * Google Drive API integration
 * Uses OAuth2 refresh token — works with personal Google accounts.
 * To change credentials, update .env.local only. No other file needs touching.
 */

import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import config from '@/config';

type GoogleDriveClient = drive_v3.Drive;

/**
 * Initialize Drive client using OAuth2 refresh token.
 * Reads GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN from env.
 */
export function initDriveClient(): GoogleDriveClient {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing OAuth credentials. Ensure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ' +
      'and GOOGLE_REFRESH_TOKEN are all set in .env.local'
    );
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  return google.drive({ version: 'v3', auth });
}

export interface UploadFileToDriveParams {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  folderId: string;
}

export interface UploadResult {
  fileId: string;
  webViewLink: string;
  webContentLink: string;
}

/**
 * Upload a file to Google Drive.
 */
export async function uploadFileToDrive(
  params: UploadFileToDriveParams
): Promise<UploadResult> {
  const { fileBuffer, fileName, mimeType, folderId } = params;

  const targetFolderId = folderId || config.DRIVE_FOLDER_ID;
  if (!targetFolderId) {
    throw new Error(
      'No drive folder specified. Pass folderId or set DRIVE_FOLDER_ID in config.'
    );
  }

  const drive = initDriveClient();

  try {
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType,
        parents: [targetFolderId],
      },
      media: {
        mimeType,
        body: Readable.from(fileBuffer),
      },
      fields: 'id, webViewLink, webContentLink',
    });

    const fileId = response.data.id;
    if (!fileId) {
      throw new Error('File created but no ID returned from Drive API');
    }

    return {
      fileId,
      webViewLink: response.data.webViewLink || '',
      webContentLink: response.data.webContentLink || '',
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to upload "${fileName}" to Google Drive: ${msg}`);
  }
}

/**
 * Check if a file with the given MD5 hash already exists.
 * Pure function — no API calls.
 */
export function checkDuplicateByHash(
  hash: string,
  sheetData: any[]
): boolean {
  return sheetData.some((row) => row.md5Hash === hash);
}

/**
 * Make a file publicly accessible ("anyone with the link can view").
 */
export async function makeFilePublic(
  driveClient: GoogleDriveClient,
  fileId: string
): Promise<void> {
  try {
    await driveClient.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to make file ${fileId} public: ${msg}`);
  }
}

/**
 * Create a folder in Google Drive.
 */
export async function createDriveFolder(
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  const drive = initDriveClient();
  const parents = [parentFolderId || config.DRIVE_FOLDER_ID];

  try {
    const response = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents,
      },
      fields: 'id',
    });

    const folderId = response.data.id;
    if (!folderId) throw new Error('Folder created but no ID returned');
    return folderId;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create folder "${folderName}": ${msg}`);
  }
}

/**
 * List files in a Drive folder.
 */
export async function listDriveFiles(folderId: string): Promise<any[]> {
  const drive = initDriveClient();

  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      spaces: 'drive',
      fields: 'files(id, name, mimeType, createdTime, size)',
    });

    return response.data.files || [];
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list files in folder ${folderId}: ${msg}`);
  }
}

/**
 * Delete a file from Google Drive.
 */
export async function deleteFileFromDrive(fileId: string): Promise<void> {
  const drive = initDriveClient();

  try {
    await drive.files.delete({ fileId });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to delete file ${fileId}: ${msg}`);
  }
}