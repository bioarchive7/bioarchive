/**
 * Utility functions for BioArchive
 */

import crypto from 'crypto';
import config from '@/config';
import { LIBGEN_BASE_URL } from '@/data/curriculum';

/** Types of files that can be uploaded */
export type FileType = 'qpaper' | 'notes' | 'slides' | 'lab' | 'assignment' | 'other';

/** Details about a file to be uploaded */
export interface FileDetails {
  semester: number;
  courseCode: string;
  type: FileType;
  year?: number;
  uploaderName?: string;
  originalName: string;
}

/**
 * Generate a standardized filename for uploaded files
 * Format: SEM{n}_{COURSECODE}_{TYPE}_{YEAR}_{timestamp}.{ext}
 * 
 * @param details - File upload details
 * @returns Formatted filename string
 */
export function generateFileName(details: FileDetails): string {
  const { semester, courseCode, type, year, originalName } = details;
  
  // Extract file extension from original name
  const ext = originalName.split('.').pop() || 'bin';
  
  // Generate timestamp for uniqueness
  const timestamp = Date.now();
  
  // Build filename components
  const semesterPart = `SEM${semester}`;
  const coursePart = courseCode.toUpperCase();
  const typePart = type.toUpperCase();
  const yearPart = year ? `${year}` : 'CURRENT';
  
  // Combine all parts
  const filename = `${semesterPart}_${coursePart}_${typePart}_${yearPart}_${timestamp}.${ext}`;
  
  return filename;
}

/**
 * Compute MD5 hash of a buffer using Node's crypto module
 * Used for file integrity verification
 * 
 * @param buffer - Buffer containing the file data
 * @returns Hex-encoded MD5 hash string
 */
export function computeMD5(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Format bytes into human-readable file size
 * 
 * @param bytes - Number of bytes
 * @returns Formatted file size string (e.g. "2.4 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  const size = bytes / Math.pow(k, i);
  const rounded = Math.round(size * 10) / 10; // Round to 1 decimal place
  
  return `${rounded} ${sizes[i]}`;
}

/**
 * Generate a search URL for LibGen (Library Genesis)
 * Used to help students find textbooks and reference materials
 * 
 * @param bookTitle - Title of the book to search for
 * @returns Complete URL string for LibGen search
 */
export function getLibgenSearchURL(bookTitle: string): string {
  const encodedTitle = encodeURIComponent(bookTitle);
  return `${LIBGEN_BASE_URL}${encodedTitle}`;
}

/**
 * Validate if a file type is allowed for upload
 * 
 * @param filename - Name of the file
 * @returns True if file type is in ALLOWED_FILE_TYPES config
 */
export function isFileTypeAllowed(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return config.ALLOWED_FILE_TYPES.includes(ext);
}

/**
 * Validate if file size is within limits
 * 
 * @param sizeInBytes - Size of file in bytes
 * @returns True if file size is within MAX_UPLOAD_SIZE_MB limit
 */
export function isFileSizeAllowed(sizeInBytes: number): boolean {
  const maxBytes = config.MAX_UPLOAD_SIZE_MB * 1024 * 1024;
  return sizeInBytes <= maxBytes;
}
