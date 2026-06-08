/**
 * Create resumable upload session with Google Drive
 * STRATEGIC FIX: 
 * - Reads env variables correctly
 * - Uses native Google Drive resumable protocol headers
 * - Better error logging
 */

import config from '@/config';

export interface UploadSessionParams {
  fileName: string;
  mimeType: string;
  folderId: string;
  fileSize: number;
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing OAuth credentials in environment');
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
    throw new Error('No access_token in response');
  }

  return tokenData.access_token;
}

export async function createResumableUploadUrl(
  params: UploadSessionParams
): Promise<{ uploadUrl: string; fileName: string }> {
  try {
    // STRATEGIC FIX: Get folder ID from multiple possible sources
    let targetFolderId = params.folderId;
    
    // If not provided or undefined, try config and env
    if (!targetFolderId || targetFolderId === 'undefined') {
      targetFolderId = 
        config.DRIVE_FOLDER_ID ||
        process.env.DRIVE_FOLDER_ID ||
        process.env.NEXT_PUBLIC_DRIVE_FOLDER_ID ||
        process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID ||
        '';
    }

    console.log('[Upload Session] Starting', {
      fileName: params.fileName,
      fileSize: `${(params.fileSize / 1024 / 1024).toFixed(2)}MB`,
      mimeType: params.mimeType,
      folderId: targetFolderId ? targetFolderId.substring(0, 20) + '...' : 'NOT SET',
    });

    if (!targetFolderId) {
      throw new Error('DRIVE_FOLDER_ID not set in Vercel environment variables or config');
    }

    // Get token
    console.log('[Upload Session] Getting OAuth token...');
    const accessToken = await getAccessToken();

    // Prepare metadata
    const metadata = {
      name: params.fileName,
      mimeType: params.mimeType,
      parents: [targetFolderId],
    };

    console.log('[Upload Session] Creating resumable session with Google Drive...');

    // STRATEGIC FIX: Use correct headers for native Google Drive resumable protocol
    // These headers tell Google we're using the resumable upload protocol
    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          // These headers tell Google the content-type and length of the file we'll upload next
          'X-Upload-Content-Type': params.mimeType,
          'X-Upload-Content-Length': params.fileSize.toString(),
        },
        body: JSON.stringify(metadata),
      }
    );

    console.log('[Upload Session] Google response:', response.status);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[Upload Session] Google error:', errorBody);
      throw new Error(`Google Drive (${response.status}): ${errorBody}`);
    }

    // STRATEGIC FIX: Get upload URL from Location header (standard for resumable uploads)
    const uploadUrl = response.headers.get('location');

    if (!uploadUrl) {
      console.error('[Upload Session] No Location header. Headers:');
      for (const [key, value] of response.headers.entries()) {
        if (key.toLowerCase().includes('upload')) {
          console.error(`  ${key}: ${value}`);
        }
      }
      throw new Error('Google Drive did not return Location header for upload');
    }

    console.log('[Upload Session] Session created successfully');
    return {
      uploadUrl,
      fileName: params.fileName,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Upload Session] Fatal error:', msg);
    throw new Error(`Failed to create upload session: ${msg}`);
  }
}