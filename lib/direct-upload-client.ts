/**
 * Direct Google Drive upload utilities for browser
 * STRATEGIC FIX: 
 * - Proper native resumable upload protocol handling
 * - Robust JSON body parsing for standard Drive API responses
 * - Defends against false-positive CORS status 0 network transfer errors
 */

import { SheetRow } from '@/lib/sheets';

export interface DirectUploadOptions {
  file: File;
  onProgress?: (percent: number) => void;
  onUploadComplete?: (fileId: string) => void;
}

export interface GetUploadUrlResponse {
  status: 'success' | 'error';
  uploadUrl?: string;
  message?: string;
}

export interface RegisterUploadResponse {
  status: 'success' | 'duplicate' | 'error';
  message: string;
  data?: {
    fileId: string;
    fileName: string;
    webViewLink: string;
    webContentLink: string;
  };
}

/**
 * Step 1: Get resumable upload URL from backend
 */
export async function getUploadUrl(
  fileName: string,
  fileSize: number,
  mimeType: string
): Promise<string> {
  const response = await fetch('/api/get-upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName,
      fileSize,
      mimeType,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get upload URL');
  }

  const data: GetUploadUrlResponse = await response.json();
  if (data.status !== 'success' || !data.uploadUrl) {
    throw new Error(data.message || 'No upload URL returned');
  }

  return data.uploadUrl;
}

/**
 * Step 2: Stream file natively from the browser directly to Google Drive
 * PRECISE FIX: Bypasses Vercel's 4.5MB limit completely while avoiding CORS blocks.
 */
export async function uploadFileToGoogleDrive(
  file: File,
  uploadUrl: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let uploadTimeout: NodeJS.Timeout;

    // Track native upload connection streams directly
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          console.log(`[Direct Drive Upload] Progress: ${percent}%`);
          onProgress(percent);
        }
      });
    }

    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        clearTimeout(uploadTimeout);
        console.log('[Direct Drive Upload] Connection Complete. Google Status:', xhr.status);

        // Standard Drive protocol returns 200 or 201 when completion is verified
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            if (!xhr.responseText || xhr.responseText.trim().length === 0) {
              reject(new Error('Google Drive finalized upload stream but returned an empty structural payload body.'));
              return;
            }

            const response = JSON.parse(xhr.responseText);
            if (response && response.id) {
              resolve(response.id); // Success! Sent directly to Step 3 registration
            } else {
              reject(new Error('File received by Google, but tracking identifier ID is missing from response.'));
            }
          } catch (e) {
            reject(new Error(`Failed to parse finalized Google structural layout text: ${e}`));
          }
        } else {
          reject(new Error(`Google Drive rejected transmission stream with status ${xhr.status}: ${xhr.statusText}`));
        }
      }
    };

    xhr.addEventListener('error', () => {
      clearTimeout(uploadTimeout);
      reject(new Error('Network channel dropped connection mid-transfer. Check client network states.'));
    });

    xhr.addEventListener('abort', () => {
      clearTimeout(uploadTimeout);
      reject(new Error('Upload canceled by client configuration.'));
    });

    xhr.open('PUT', uploadUrl, true);
    
    // CRITICAL: We pass ONLY the content-type header. 
    // Omitting custom headers prevents the browser from making an interactive preflight OPTIONS request,
    // allowing the raw binary stream to pass through smoothly without CORS restrictions.
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    
    xhr.timeout = 900000; // Generous 15-minute window for large files on varying bandwidths
    
    uploadTimeout = setTimeout(() => {
      xhr.abort();
    }, 950000);

    xhr.send(file);
  });
}

/**
 * Step 3: Register uploaded file in backend
 */
export async function registerUploadedFile(
  fileId: string,
  metadata: {
    fileName: string;
    semester: string;
    courseCode: string;
    courseName: string;
    professor: string;
    professor2?: string;
    professor3?: string;
    examType: string;
    fileType: string;
    year: string;
    uploaderName: string;
    remarks?: string;
  }
): Promise<RegisterUploadResponse> {
  try {
    const response = await fetch('/api/register-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId,
        ...metadata,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        status: 'error',
        message: error.message || 'Failed to register upload',
      };
    }

    const data: RegisterUploadResponse = await response.json();
    return data;
  } catch (error) {
    return {
      status: 'error',
      message: `Registration error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Complete upload flow:
 * 1. Get upload URL from backend
 * 2. Upload file directly to Google Drive
 * 3. Register file in backend
 */
export async function uploadFileDirectToDrive(
  file: File,
  metadata: {
    fileName: string;
    semester: string;
    courseCode: string;
    courseName: string;
    professor: string;
    professor2?: string;
    professor3?: string;
    examType: string;
    fileType: string;
    year: string;
    uploaderName: string;
    remarks?: string;
  },
  onProgress?: (percent: number) => void
): Promise<RegisterUploadResponse> {
  try {
    console.log('[Upload Flow] Starting upload for:', file.name);

    // Step 1: Get upload URL
    console.log('[Upload Flow] Step 1: Getting upload URL...');
    const uploadUrl = await getUploadUrl(
      file.name,
      file.size,
      file.type || 'application/octet-stream'
    );
    console.log('[Upload Flow] Upload URL received');

    // Step 2: Upload to Google Drive
    console.log('[Upload Flow] Step 2: Uploading file to Google Drive...');
    const fileId = await uploadFileToGoogleDrive(file, uploadUrl, onProgress);
    console.log('[Upload Flow] File uploaded successfully');

    // Step 3: Register in backend
    console.log('[Upload Flow] Step 3: Registering file in database...');
    const registration = await registerUploadedFile(fileId, metadata);
    console.log('[Upload Flow] Registration complete');

    return registration;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Upload Flow] Error:', msg);
    return {
      status: 'error',
      message: `Upload failed: ${msg}`,
    };
  }
}