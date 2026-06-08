/**
 * Create a resumable upload session with Google Drive
 * Returns an upload URL that the browser can use to upload directly to Drive
 * 
 * CORRECT IMPLEMENTATION - follows Google Drive API documentation exactly
 */

import config from '@/config';

export interface UploadSessionParams {
  fileName: string;
  mimeType: string;
  folderId: string;
  fileSize: number;
}

/**
 * Get fresh OAuth access token using refresh token
 */
async function getAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing OAuth: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN'
    );
  }

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
    const errorText = await tokenResponse.text();
    throw new Error(`Token refresh failed: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error('No access_token in token response');
  }

  return tokenData.access_token;
}

/**
 * Create resumable upload session with Google Drive
 * CORRECT: Follows Google Drive Resumable Upload Protocol exactly
 * 
 * Request headers needed:
 * - X-Goog-Upload-Protocol: resumable (enables resumable protocol)
 * - X-Goog-Upload-Command: start (initiates session, returns Location header)
 * - X-Goog-Upload-Header-Content-Length: [file size]
 * - X-Goog-Upload-Header-Content-Type: [mime type]
 * 
 * Response: 200 OK with Location header containing upload session URI
 */
export async function createResumableUploadUrl(
  params: UploadSessionParams
): Promise<{ uploadUrl: string; fileName: string }> {
  try {
    console.log('[Upload Session] Starting resumable upload initiation', {
      fileName: params.fileName,
      fileSize: params.fileSize,
      mimeType: params.mimeType,
      folderId: params.folderId?.substring(0, 15) + '...',
    });

    // Validate
    if (!params.fileName || !params.mimeType || !params.fileSize) {
      throw new Error('Missing: fileName, mimeType, or fileSize');
    }

    const targetFolderId = params.folderId || config.DRIVE_FOLDER_ID;
    if (!targetFolderId) {
      throw new Error('No DRIVE_FOLDER_ID configured');
    }

    // Get token
    console.log('[Upload Session] Getting access token...');
    const accessToken = await getAccessToken();
    console.log('[Upload Session] Token obtained');

    // Prepare metadata
    const metadata = {
      name: params.fileName,
      mimeType: params.mimeType,
      parents: [targetFolderId],
    };

    console.log('[Upload Session] Initiating resumable session...');

    // Make request to Google Drive API
    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': params.fileSize.toString(),
          'X-Goog-Upload-Header-Content-Type': params.mimeType,
        },
        body: JSON.stringify(metadata),
      }
    );

    console.log('[Upload Session] Response status:', response.status);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[Upload Session] API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
      });
      throw new Error(`Google Drive API (${response.status}): ${errorBody}`);
    }

    // Extract Location header (case-insensitive)
    // Try multiple variations to handle any case sensitivity issues
    let uploadUrl = 
      response.headers.get('location') ||
      response.headers.get('Location') ||
      response.headers.get('LOCATION');

    // If still not found, log all headers for debugging
    if (!uploadUrl) {
      console.error('[Upload Session] Location header not found. All headers:');
      for (const [key, value] of response.headers.entries()) {
        console.error(`  ${key}: ${value}`);
      }
      throw new Error('Google Drive did not return Location header');
    }

    console.log('[Upload Session] Resumable session created');
    console.log('[Upload Session] Upload URL (first 80 chars):', uploadUrl.substring(0, 80) + '...');

    return {
      uploadUrl,
      fileName: params.fileName,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Upload Session] Fatal error:', msg);
    throw new Error(`Failed to create resumable upload URL: ${msg}`);
  }
}