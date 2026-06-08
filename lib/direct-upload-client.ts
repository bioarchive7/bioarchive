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
 */
export async function uploadFileToGoogleDrive(
  file: File,
  uploadUrl: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(Math.round(percentComplete));
        }
      });
    }

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          // Google Drive returns JSON with file metadata
          const response = JSON.parse(xhr.responseText);
          const fileId = response.id;
          if (fileId) {
            resolve(fileId);
          } else {
            reject(new Error('No file ID in response'));
          }
        } catch (error) {
          reject(new Error('Failed to parse upload response'));
        }
      } else {
        // Log response for debugging
        console.error('Upload failed:', {
          status: xhr.status,
          statusText: xhr.statusText,
          response: xhr.responseText,
        });
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      console.error('Network error during upload');
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was cancelled'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new Error('Upload timed out'));
    });

    // Configure request - use PUT for resumable upload finalization
    xhr.open('PUT', uploadUrl, true);
    
    // Set required headers for resumable upload
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('X-Goog-Upload-Protocol', 'resumable');
    xhr.setRequestHeader('X-Goog-Upload-Command', 'upload, finalize');
    xhr.setRequestHeader('X-Goog-Upload-Content-Length', file.size.toString());
    
    xhr.timeout = 300000; // 5 minutes

    // Send file
    xhr.send(file);
  });
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