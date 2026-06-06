/**
 * BioArchive Configuration
 * Central configuration file for all app constants and environment variables
 */

interface Config {
  /** Google Drive folder ID where all course materials are stored */
  DRIVE_FOLDER_ID: string;
  
  /** Google Drive folder ID for storing duplicate/backup files */
  DUPLICATE_FOLDER_ID: string;
  
  /** Google Sheets ID containing curriculum and course metadata */
  SHEET_ID: string;
  
  /** Application name */
  SITE_NAME: string;
  
  /** Application tagline / description */
  SITE_TAGLINE: string;
  
  /** Array of available semester numbers (1-10 for Integrated MSc) */
  NISER_SEMESTERS: number[];
  
  /** Maximum file upload size in megabytes */
  MAX_UPLOAD_SIZE_MB: number;
  
  /** Allowed file types for upload */
  ALLOWED_FILE_TYPES: string[];
}

const config: Config = {
  DRIVE_FOLDER_ID: process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID || '',
  DUPLICATE_FOLDER_ID: process.env.NEXT_PUBLIC_DUPLICATE_FOLDER_ID || '',
  SHEET_ID: process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID || '',
  SITE_NAME: 'BIO-Archive',
  SITE_TAGLINE: '',
  NISER_SEMESTERS: [1, 2, 3, 4, 5, 6, 7, 8],
  MAX_UPLOAD_SIZE_MB: 100,
  ALLOWED_FILE_TYPES: ['pdf', 'pptx', 'docx', 'xlsx', 'zip', 'jpg', 'jpeg', 'png'],
};

export default config;
