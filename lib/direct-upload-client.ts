/**
 * Direct Google Drive upload utilities for browser
 * STRATEGIC FIX: 
 * - Proper native resumable upload protocol handling
 * - Robust JSON body parsing for standard Drive API responses
 * - Network timeout protection
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
 * Step 2: Upload file directly to Google Drive
 * STRATEGIC FIX: Standard native resumable upload execution. Handles both 200/201 and cleanly parses the response JSON block.
 */
export async function uploadFileToGoogleDrive(
  file: File,
  uploadUrl: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let uploadTimeout: NodeJS.Timeout;

    // Track progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          console.log(`[Upload] Progress: ${percent}%`);
          onProgress(percent);
        }
      });
    }

    // Handle completion
    xhr.addEventListener('load', () => {
      clearTimeout(uploadTimeout);
      
      console.log('[Upload] Complete. Status:', xhr.status);

      // Both 200 OK and 201 Created indicate full completion inside standard protocol
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          if (!xhr.responseText || xhr.responseText.trim().length === 0) {
            reject(new Error('Google Drive finalized the upload but returned an empty response body.'));
            return;
          }

          const response = JSON.parse(xhr.responseText);
          if (response && response.id) {
            console.log('[Upload] File ID received:', response.id);
            resolve(response.id);
          } else {
            reject(new Error('Upload succeeded, but file metadata ID missing from Google Drive response.'));
          }
        } catch (e) {
          console.error('Raw unparsable response content was:', xhr.responseText);
          reject(new Error(`Failed to parse Google Drive metadata structure: ${e}`));
        }
      } else {
        reject(new Error(`Upload returned status ${xhr.status}: ${xhr.statusText}`));
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      clearTimeout(uploadTimeout);
      console.error('[Upload] Network error during stream transfer');
      reject(new Error('Network connection error during transfer'));
    });

    xhr.addEventListener('abort', () => {
      clearTimeout(uploadTimeout);
      console.error('[Upload] Aborted');
      reject(new Error('Upload stream aborted'));
    });

    xhr.addEventListener('timeout', () => {
      clearTimeout(uploadTimeout);
      console.error('[Upload] XHR timeout');
      reject(new Error('Upload session timed out'));
    });

    // Configure request
    console.log('[Upload] Starting file upload...');
    console.log('[Upload] File size:', `${(file.size / 1024 / 1024).toFixed(2)}MB`);
    
    xhr.open('PUT', uploadUrl, true);
    
    // Set proper headers for standard native PUT request uploader mechanics
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    
    // Set timeouts
    xhr.timeout = 600000; // 10 minutes XHR timeout
    
    // Additional safety manual drop protection
    uploadTimeout = setTimeout(() => {
      console.error('[Upload] Manual timeout triggered after 15 minutes');
      xhr.abort();
    }, 900000); 

    // Send file payload over the unbroken native pipeline
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