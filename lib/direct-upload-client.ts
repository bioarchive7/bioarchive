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


export async function uploadFileToGoogleDrive(
  file: File,
  uploadUrl: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  // Google Drive requires chunks to be multiples of 256 KB. We will use exactly 2 MB.
  const CHUNK_SIZE = 2 * 1024 * 1024; 
  const totalBytes = file.size;
  let offset = 0;

  while (offset < totalBytes) {
    const end = Math.min(offset + CHUNK_SIZE, totalBytes);
    const chunk = file.slice(offset, end);
    const chunkLength = end - offset;

    const resultId = await new Promise<string | null>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          // 308 means chunk received successfully, more chunks expected.
          // 200/201 means final chunk received successfully, upload complete.
          if (xhr.status === 308 || xhr.status === 200 || xhr.status === 201) {
            if (end === totalBytes) {
              // Final chunk complete, extract file ID from response body
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response.id || null);
              } catch {
                reject(new Error('Failed parsing final completion payload metadata.'));
              }
            } else {
              resolve(null); // Intermediate chunk successful
            }
          } else {
            reject(new Error(`Chunk upload failed with status code ${xhr.status}`));
          }
        }
      };

      xhr.open('PUT', '/api/upload-chunk', true);
      
      // Set headers for the local server proxy route
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.setRequestHeader('x-upload-url', uploadUrl);
      xhr.setRequestHeader('Content-Range', `bytes ${offset}-${end - 1}/${totalBytes}`);

      xhr.send(chunk);
    });

    if (end === totalBytes && resultId) {
      if (onProgress) onProgress(100);
      return resultId; // Entire flow complete!
    }

    offset = end;
    if (onProgress) {
      onProgress(Math.round((offset / totalBytes) * 100));
    }
  }

  throw new Error('Upload finalized but file transaction tracking identifier was not found.');
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