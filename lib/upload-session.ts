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
 * Use raw HTTP to create resumable upload session
 * This gives us direct access to the Location header with the upload URL
 * 
 * Google Drive Resumable Upload Flow:
 * 1. POST to /upload/drive/v3/files?uploadType=resumable with metadata
 * 2. Google returns Location header with session URI
 * 3. Browser uses that URI to upload the file
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

    // Step 1: Get fresh access token
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
      const error = await tokenResponse.text();
      throw new Error(`Failed to get access token: ${error}`);
    }

    const { access_token } = (await tokenResponse.json()) as { access_token: string };

    // Step 2: Initiate resumable upload session
    const targetFolderId = params.folderId || config.DRIVE_FOLDER_ID;
    if (!targetFolderId) {
      throw new Error('No drive folder specified');
    }

    const metadata = {
      name: params.fileName,
      mimeType: params.mimeType,
      parents: [targetFolderId],
    };

    // Important: Use correct headers for resumable upload initiation
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
      console.error('Google Drive API Error:', {
        status: initiateResponse.status,
        statusText: initiateResponse.statusText,
        error,
      });
      throw new Error(`Failed to initiate upload: ${error}`);
    }

    // Step 3: Extract upload URL from Location header
    const uploadUrl = initiateResponse.headers.get('location');
    if (!uploadUrl) {
      throw new Error('No upload URL returned from Google Drive (missing Location header)');
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