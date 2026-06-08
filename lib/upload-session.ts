/**
 * Create a resumable upload session with Google Drive
 * Returns an upload URL that the browser can use to upload directly to Drive
 * 
 * FIXED: Added X-Goog-Upload-Command: start header (required by Google Drive API)
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

  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is missing in Vercel environment variables');
  }
  if (!clientSecret) {
    throw new Error('GOOGLE_CLIENT_SECRET is missing in Vercel environment variables');
  }
  if (!refreshToken) {
    throw new Error('GOOGLE_REFRESH_TOKEN is missing in Vercel environment variables');
  }

  try {
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
      throw new Error(
        `Google OAuth token refresh failed (${tokenResponse.status}): ${errorText}`
      );
    }

    const tokenData = await tokenResponse.json();
    
    if (!tokenData || typeof tokenData !== 'object') {
      throw new Error('Google OAuth response is not valid JSON');
    }

    const access_token = tokenData.access_token;
    if (!access_token || typeof access_token !== 'string') {
      throw new Error(
        `No access token in Google response. Keys: ${Object.keys(tokenData).join(', ')}`
      );
    }

    return access_token;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get Google access token: ${msg}`);
  }
}

/**
 * Create resumable upload session with Google Drive
 * FIXED: Added X-Goog-Upload-Command: start header
 */
export async function createResumableUploadUrl(
  params: UploadSessionParams
): Promise<{ uploadUrl: string; fileName: string }> {
  try {
    // Validate input parameters
    if (!params.fileName || !params.mimeType || !params.fileSize) {
      throw new Error(
        `Missing upload parameters: fileName=${params.fileName}, mimeType=${params.mimeType}, fileSize=${params.fileSize}`
      );
    }

    if (params.fileSize <= 0) {
      throw new Error(`Invalid file size: ${params.fileSize}`);
    }

    // Get target folder
    const targetFolderId = params.folderId || config.DRIVE_FOLDER_ID;
    if (!targetFolderId) {
      throw new Error(
        'No Google Drive folder specified. Set folderId in params or DRIVE_FOLDER_ID in config'
      );
    }

    console.log('[Upload Session] Starting resumable upload initiation', {
      fileName: params.fileName,
      fileSize: params.fileSize,
      mimeType: params.mimeType,
      folderId: targetFolderId.substring(0, 10) + '...',
    });

    // Step 1: Get access token
    console.log('[Upload Session] Fetching Google access token...');
    const access_token = await getAccessToken();
    console.log('[Upload Session] Access token obtained successfully');

    // Step 2: Prepare metadata for Google Drive
    const metadata = {
      name: params.fileName,
      mimeType: params.mimeType,
      parents: [targetFolderId],
    };

    console.log('[Upload Session] Initiating resumable upload with Google Drive API...');

    // Step 3: Initiate resumable upload session
    // FIX: Added X-Goog-Upload-Command: start header (REQUIRED by Google Drive API)
    const initiateResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',                    // ← ADDED THIS LINE
          'X-Goog-Upload-Header-Content-Length': params.fileSize.toString(),
          'X-Goog-Upload-Header-Content-Type': params.mimeType,
        },
        body: JSON.stringify(metadata),
      }
    );

    console.log('[Upload Session] Google Drive response status:', initiateResponse.status);

    if (!initiateResponse.ok) {
      const errorText = await initiateResponse.text();
      console.error('[Upload Session] Google Drive API error:', {
        status: initiateResponse.status,
        statusText: initiateResponse.statusText,
        body: errorText,
      });

      throw new Error(
        `Google Drive API error (${initiateResponse.status}): ${errorText}`
      );
    }

    // Step 4: Extract upload URL from Location header
    const uploadUrl = initiateResponse.headers.get('location');
    
    if (!uploadUrl) {
      console.error('[Upload Session] Missing Location header in response');
      console.error('[Upload Session] Response headers:', {
        contentType: initiateResponse.headers.get('content-type'),
        contentLength: initiateResponse.headers.get('content-length'),
      });
      throw new Error('Google Drive did not return upload URL (missing Location header)');
    }

    console.log('[Upload Session] Upload session created successfully');
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