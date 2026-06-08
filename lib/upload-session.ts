/**
 * Create a resumable upload session with Google Drive
 * Returns an upload URL that the browser can use to upload directly to Drive
 * 
 * This bypasses Vercel's payload size limits by using Google Drive's resumable upload protocol
 */

import { google } from 'googleapis';
import config from '@/config';

export interface UploadSessionParams {
  fileName: string;
  mimeType: string;
  folderId: string;
  fileSize: number; // For resumable upload header
}

export interface UploadSession {
  uploadUrl: string;
  sessionId: string;
}

/**
 * Initialize Drive client using OAuth2 refresh token
 */
function initDriveClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing OAuth credentials');
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  return google.drive({ version: 'v3', auth });
}

/**
 * Create a resumable upload session with Google Drive
 * Returns an upload URI that can be used by the browser to upload the file
 */
export async function createUploadSession(
  params: UploadSessionParams
): Promise<UploadSession> {
  try {
    const drive = initDriveClient();
    const targetFolderId = params.folderId || config.DRIVE_FOLDER_ID;

    if (!targetFolderId) {
      throw new Error('No drive folder specified');
    }

    // Create resumable upload session metadata
    const response = await drive.files.create(
      {
        requestBody: {
          name: params.fileName,
          mimeType: params.mimeType,
          parents: [targetFolderId],
        },
        fields: 'id, webViewLink, webContentLink',
        supportsAllDrives: true,
      },
      {
        // Use resumable upload with custom request to get the upload URI
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': params.fileSize.toString(),
          'X-Goog-Upload-Header-Content-Type': params.mimeType,
        },
      }
    );

    // Extract upload URL from response location header
    // In reality, we need to use a different approach since the google client doesn't expose headers
    // Instead, we'll use the Resumable Upload API directly

    throw new Error('Use direct resumable upload API instead');
  } catch (error) {
    throw new Error(
      `Failed to create upload session: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Alternative: Use raw HTTP to create resumable upload session
 * This gives us direct access to the Location header with the upload URL
 */
export async function createResumableUploadUrl(
  params: UploadSessionParams
): Promise<{ uploadUrl: string; fileName: string }> {
  try {
    // Get OAuth token
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Missing OAuth credentials');
    }

    // Get access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get access token');
    }

    const { access_token } = (await tokenResponse.json()) as { access_token: string };

    // Create resumable upload session
    const targetFolderId = params.folderId || config.DRIVE_FOLDER_ID;
    if (!targetFolderId) {
      throw new Error('No drive folder specified');
    }

    const metadata = {
      name: params.fileName,
      mimeType: params.mimeType,
      parents: [targetFolderId],
    };

    const initiateResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Header-Content-Length': params.fileSize.toString(),
          'X-Goog-Upload-Header-Content-Type': params.mimeType,
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initiateResponse.ok) {
      const error = await initiateResponse.text();
      throw new Error(`Failed to initiate upload: ${error}`);
    }

    // The Location header contains the resumable upload URI
    const uploadUrl = initiateResponse.headers.get('location');
    if (!uploadUrl) {
      throw new Error('No upload URL returned from Google Drive');
    }

    return {
      uploadUrl,
      fileName: params.fileName,
    };
  } catch (error) {
    throw new Error(
      `Failed to create resumable upload URL: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}