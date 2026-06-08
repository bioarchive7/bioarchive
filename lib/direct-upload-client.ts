/**
 * Direct Google Drive upload utilities for browser
 * Uses standard resumable upload protocol to bypass Vercel's payload limits
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
 * Step 2: Upload file directly to Google Drive using standard native resumable upload
 * CORRECTED: Streams the entire file natively via single PUT stream, matching the corrected backend.
 */
/**
 * Step 2: Upload file directly to Google Drive using standard native resumable upload
 * CORRECTED: Safely handles the empty response body returned by the native completion stream.
 */
export async function uploadFileToGoogleDrive(
  file: File,
  uploadUrl: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track standard upload stream progress natively
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(Math.round(percentComplete));
        }
      });
    }

    // Handle session completion
    xhr.addEventListener('load', () => {
      if (xhr.status === 200 || xhr.status === 201) {
        // When using the native protocol, Google completes with a 200/201.
        // If the body contains file metadata, we parse it. 
        // If it's empty, we extract the structural tracking ID directly out of the URL parameter.
        try {
          if (xhr.responseText && xhr.responseText.trim().length > 0) {
            const response = JSON.parse(xhr.responseText);
            if (response.id) {
              resolve(response.id);
              return;
            }
          }

          // Fallback parsing logic: Extract the validation upload_id parameter out of the active URL string
          const urlObj = new URL(uploadUrl);
          const uploadId = urlObj.searchParams.get('upload_id');
          
          if (uploadId) {
            resolve(uploadId);
          } else {
            reject(new Error('Could not resolve file transaction identifier from session parameters.'));
          }
        } catch (error) {
          reject(new Error('Failed to handle final upload tracking payload validation.'));
        }
      } else {
        console.error('Upload failed:', {
          status: xhr.status,
          statusText: xhr.statusText,
          response: xhr.responseText,
        });
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      console.error('Network connection error during transfer');
      reject(new Error('Network connection error during transfer'));
    });

    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));
    xhr.addEventListener('timeout', () => reject(new Error('Upload timed out')));

    // Execute standard native uploader PUT request
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    
    // 10 minutes timeout window to avoid drops
    xhr.timeout = 600000; 

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