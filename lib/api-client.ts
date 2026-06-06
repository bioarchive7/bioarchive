/**
 * Client-side API wrapper library
 * Provides type-safe fetch wrappers for BioArchive API endpoints
 * Never throws - always returns typed results
 */

import { SheetRow } from '@/lib/sheets';

/**
 * Response from upload endpoint
 */
export interface UploadResponse {
  status: 'success' | 'duplicate' | 'error';
  message: string;
  data?: {
    fileId?: string;
    webViewLink?: string;
    webContentLink?: string;
  };
}

/**
 * Response from files endpoint
 */
export interface FilesResponse {
  files: SheetRow[];
  total: number;
  error?: string;
}

/**
 * Fetch files for a specific course
 * 
 * @param semester - Semester number as string (1-10)
 * @param courseCode - Course code (e.g., "BIO101")
 * @returns Array of SheetRow objects, or empty array on error
 */
export async function fetchFilesByCourse(
  semester: string,
  courseCode: string
): Promise<SheetRow[]> {
  try {
    const params = new URLSearchParams({
      semester,
      courseCode,
    });

    const response = await fetch(`/api/files?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch files: ${response.status} ${response.statusText}`);
      return [];
    }

    const data: FilesResponse = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('Error fetching files by course:', error);
    return [];
  }
}

/**
 * Fetch all files from the registry
 * 
 * @returns Array of all SheetRow objects, or empty array on error
 */
export async function fetchAllFiles(): Promise<SheetRow[]> {
  try {
    const response = await fetch('/api/files', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch all files: ${response.status} ${response.statusText}`);
      return [];
    }

    const data: FilesResponse = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('Error fetching all files:', error);
    return [];
  }
}

/**
 * Upload a file with optional progress tracking
 * Uses XMLHttpRequest for progress monitoring
 * 
 * @param formData - FormData object with file and metadata
 * @param onProgress - Optional callback receiving upload progress (0-100)
 * @returns Upload response object with status and optional fileId
 */
export async function uploadFile(
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<UploadResponse> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress if callback provided
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
      if (xhr.status === 200 || xhr.status === 400) {
        try {
          const response: UploadResponse = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          console.error('Failed to parse upload response:', error);
          resolve({
            status: 'error',
            message: 'Failed to parse server response',
          });
        }
      } else if (xhr.status === 500) {
        try {
          const response: UploadResponse = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          resolve({
            status: 'error',
            message: 'Server error during upload',
          });
        }
      } else {
        resolve({
          status: 'error',
          message: `Upload failed with status ${xhr.status}`,
        });
      }
    });

    // Handle network errors
    xhr.addEventListener('error', () => {
      console.error('Network error during upload');
      resolve({
        status: 'error',
        message: 'Network error: Unable to connect to server',
      });
    });

    // Handle abort
    xhr.addEventListener('abort', () => {
      resolve({
        status: 'error',
        message: 'Upload was cancelled',
      });
    });

    // Handle timeout
    xhr.addEventListener('timeout', () => {
      resolve({
        status: 'error',
        message: 'Upload timed out',
      });
    });

    // Configure and send request
    xhr.open('POST', '/api/upload', true);
    xhr.timeout = 300000; // 5 minutes timeout
    xhr.send(formData);
  });
}

/**
 * Increment download count for a file
 * This would be called when a user downloads a file
 * 
 * @param fileId - ID of the file being downloaded
 * @returns Success status (fire-and-forget, errors are logged but not thrown)
 */
export async function incrementFileDownloads(fileId: string): Promise<boolean> {
  try {
    // This would require a new API endpoint like /api/download/:fileId
    // For now, this is a placeholder for future implementation
    console.log(`Incrementing downloads for file: ${fileId}`);
    return true;
  } catch (error) {
    console.error('Error incrementing download count:', error);
    return false;
  }
}

/**
 * Search files by free text query
 * Would search across fileName, courseName, courseCode
 * 
 * @param query - Search query string
 * @returns Matching SheetRow objects, or empty array on error
 */
export async function searchFiles(query: string): Promise<SheetRow[]> {
  try {
    if (!query.trim()) {
      return [];
    }

    const allFiles = await fetchAllFiles();
    const lowerQuery = query.toLowerCase();

    return allFiles.filter((file) => {
      return (
        file.fileName.toLowerCase().includes(lowerQuery) ||
        file.courseName.toLowerCase().includes(lowerQuery) ||
        file.courseCode.toLowerCase().includes(lowerQuery) ||
        file.fileType.toLowerCase().includes(lowerQuery)
      );
    });
  } catch (error) {
    console.error('Error searching files:', error);
    return [];
  }
}
