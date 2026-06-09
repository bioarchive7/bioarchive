/**
 * File Renaming Utility for BioArchive
 * Renames uploaded files according to consistent naming convention
 * 
 * Pattern:
 * - Question Papers: COURSECODE_COURSENAME_qpaper_YEAR_EXAMTYPE
 * - Other types:    COURSECODE_COURSENAME_FILETYPE_YEAR
 */

/**
 * Sanitize a string for use in filenames
 * - Removes special characters
 * - Converts to uppercase
 * - Replaces spaces with underscores
 */
function sanitizeForFilename(str: string): string {
  return str
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')           // Replace spaces with underscores
    .replace(/[^\w\-]/g, '')        // Remove special characters except hyphens
    .replace(/_+/g, '_')            // Collapse multiple underscores
    .replace(/^_+|_+$/g, '');       // Remove leading/trailing underscores
}

/**
 * Extract file extension from filename
 */
function getFileExtension(fileName: string): string {
  const match = fileName.match(/\.[^/.]+$/);
  return match ? match[0] : '';
}

/**
 * Generate renamed filename based on file type and metadata
 */
export function generateRenamedFilename(
  originalFileName: string,
  metadata: {
    courseCode: string;
    courseName: string;
    fileType: string;
    year: string;
    examType?: string;  // Only for qpaper type
  }
): string {
  const extension = getFileExtension(originalFileName);
  
  const courseCode = sanitizeForFilename(metadata.courseCode);
  const courseName = sanitizeForFilename(metadata.courseName);
  const fileType = sanitizeForFilename(metadata.fileType);
  const year = metadata.year.trim();
  
  let newName = '';

  // Build name based on file type
  if (metadata.fileType.toLowerCase() === 'qpaper' && metadata.examType) {
    const examType = sanitizeForFilename(metadata.examType);
    newName = `${courseCode}_${courseName}_${fileType}_${year}_${examType}`;
  } else {
    newName = `${courseCode}_${courseName}_${fileType}_${year}`;
  }

  return newName + extension;
}

/**
 * Validate filename doesn't exceed limits (max 200 chars for Drive compatibility)
 */
export function isValidFileName(fileName: string, maxLength: number = 200): boolean {
  return fileName.length > 0 && fileName.length <= maxLength;
}

/**
 * Format metadata for renaming - helper for API calls
 */
export function formatMetadataForRenaming(metadata: {
  courseCode: string;
  courseName: string;
  fileType: string;
  year: string;
  examType?: string;
}) {
  return {
    courseCode: metadata.courseCode.trim(),
    courseName: metadata.courseName.trim(),
    fileType: metadata.fileType.trim(),
    year: metadata.year.trim(),
    examType: metadata.examType?.trim(),
  };
}