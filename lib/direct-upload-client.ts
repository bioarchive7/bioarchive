/**
 * Direct Google Drive upload utilities for browser
 * Uses resumable upload protocol to bypass Vercel's payload limits
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
 * Step 2: Upload file directly to Google Drive using resumable upload
 * Returns the file ID from Google Drive's response
 * 
 * BUG FIX: Removed X-Goog-Upload-* headers from final PUT request
 * These headers are only for the initial session creation, not for the final upload
 */
/**
 * Step 2: Upload file directly to Google Drive using chunked resumable upload
 * Returns the file ID from Google Drive's response
 */
export async function uploadFileToGoogleDrive(
  file: File,
  uploadUrl: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  // Must be a multiple of 262144 (256 KB). Let's use 1 MB chunks.
  const CHUNK_SIZE = 1024 * 1024; 
  const totalSize = file.size;
  let startByte = 0;

  while (startByte < totalSize) {
    const endByte = Math.min(startByte + CHUNK_SIZE, totalSize);
    const chunk = file.slice(startByte, endByte);
    const chunkSize = endByte - startByte;

    const responseText = await new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.open('PUT', uploadUrl, true);
      
      // Tell Google the specific byte sequence segment being uploaded
      xhr.setRequestHeader('Content-Length', chunkSize.toString());
      xhr.setRequestHeader('Content-Range', `bytes ${startByte}-${endByte - 1}/${totalSize}`);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            // Track continuous overall file upload percentage
            const uploadedBytesSoFar = startByte + e.loaded;
            const percentComplete = (uploadedBytesSoFar / totalSize) * 100;
            onProgress(Math.min(Math.round(percentComplete), 99)); // Cap at 99% until server returns 200/201
          }
        });
      }

      xhr.addEventListener('load', () => {
        // Google returns 308 Resume Incomplete for intermediate blocks
        // and 200 OK / 201 Created for the final completion block.
        if (xhr.status === 200 || xhr.status === 201 || xhr.status === 308) {
          resolve(xhr.responseText);
        } else {
          reject(new Error(`Chunk upload failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error during chunk upload')));
      xhr.addEventListener('abort', () => reject(new Error('Upload was cancelled')));
      
      xhr.send(chunk);
    });

    startByte = endByte;

    // If we've reached the end, process the final metadata response payload
    if (startByte >= totalSize) {
      try {
        const response = JSON.parse(responseText);
        if (response.id) {
          if (onProgress) onProgress(100);
          return response.id;
        }
        throw new Error('No file ID returned from Drive API');
      } catch (error) {
        throw new Error('Failed to parse final upload response payload');
      }
    }
  }

  throw new Error('Upload processing complete without returning valid file metadata');
}

/**
 * Step 3: Register uploaded file in backend
 * Adds file to Google Sheets and sends notifications
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
    // Step 1: Get upload URL
    const uploadUrl = await getUploadUrl(
      file.name,
      file.size,
      file.type || 'application/octet-stream'
    );

    // Step 2: Upload to Google Drive
    const fileId = await uploadFileToGoogleDrive(file, uploadUrl, onProgress);

    // Step 3: Register in backend
    const registration = await registerUploadedFile(fileId, metadata);

    return registration;
  } catch (error) {
    return {
      status: 'error',
      message: `Upload failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}