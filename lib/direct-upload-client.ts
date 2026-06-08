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
/**
 * Step 2: Upload file directly to Google Drive using standard native resumable upload
 * CORRECTED: Reliably extracts the final file ID metadata returned by the completed API stream.
 */
/**
 * Step 2: Upload file directly to Google Drive using standard native resumable upload
 * FIXES BOTH: Prevents network timeout drops AND properly parses final metadata JSON body.
 */
export async function uploadFileToGoogleDrive(
  file: File,
  uploadUrl: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track network upload progress natively
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(Math.round(percentComplete));
        }
      });
    }

    // Handle stream completion
    xhr.addEventListener('load', () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          if (!xhr.responseText || xhr.responseText.trim().length === 0) {
            reject(new Error('Google Drive finalized the upload but returned an empty response body.'));
            return;
          }

          // Parse the valid metadata payload returned by standard Drive API protocol
          const response = JSON.parse(xhr.responseText);
          
          if (response && response.id) {
            resolve(response.id); // Success! Passed to Step 3 registration
          } else {
            reject(new Error('Upload succeeded, but file metadata ID missing from Google Drive response.'));
          }
        } catch (error) {
          console.error('Raw unparsable response content was:', xhr.responseText);
          reject(new Error(`Failed to parse Google Drive metadata structure: ${error instanceof Error ? error.message : String(error)}`));
        }
      } else {
        console.error('Upload transaction rejected:', {
          status: xhr.status,
          statusText: xhr.statusText,
          response: xhr.responseText,
        });
        reject(new Error(`Upload rejected with status ${xhr.status}: ${xhr.statusText}`));
      }
    });

    // Handle structural pipeline connection errors
    xhr.addEventListener('error', () => reject(new Error('Network connection error during stream transfer')));
    xhr.addEventListener('abort', () => reject(new Error('Upload stream aborted')));
    xhr.addEventListener('timeout', () => reject(new Error('Upload session timed out')));

    // Dispatch the payload over an unbroken native PUT request stream
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    
    // 10-minute timeout window
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