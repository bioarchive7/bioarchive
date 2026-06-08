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
    throw new Error('Missing OAuth credentials in environment.');
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
  return tokenData.access_token;
}

export async function createResumableUploadUrl(
  params: UploadSessionParams
): Promise<{ uploadUrl: string; fileName: string }> {
  try {
    const targetFolderId = params.folderId || config.DRIVE_FOLDER_ID;
    const accessToken = await getAccessToken();

    const metadata = {
      name: params.fileName,
      mimeType: params.mimeType,
      parents: [targetFolderId],
    };

    console.log('[Upload Session] Requesting standard native resumable session...');

    // Native Google Drive API Resumable upload initiation endpoint
    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': params.mimeType,
          'X-Upload-Content-Length': params.fileSize.toString(),
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Google Drive API session generation failed: ${errorBody}`);
    }

    // Standard native responses reliably use the 'location' header
    const uploadUrl = response.headers.get('location');
    if (!uploadUrl) {
      throw new Error('Google Drive did not return native Location tracking path header');
    }

    return { uploadUrl, fileName: params.fileName };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create upload session: ${msg}`);
  }
}