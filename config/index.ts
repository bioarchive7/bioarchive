/**
 * BioArchive Configuration
 * Central configuration file for all app constants and environment variables
 * 
 * FIX: Reads correct env variable names that match .env.local
 */

interface Config {
  DRIVE_FOLDER_ID: string;
  DUPLICATE_FOLDER_ID: string;
  SHEET_ID: string;
  SITE_NAME: string;
  SITE_TAGLINE: string;
  NISER_SEMESTERS: number[];
  MAX_UPLOAD_SIZE_MB: number;
  ALLOWED_FILE_TYPES: string[];
}

const config: Config = {
  // FIX: Try both names - first the non-public one (Vercel env), then the public one (.env.local)
  DRIVE_FOLDER_ID: 
    process.env.DRIVE_FOLDER_ID || 
    process.env.NEXT_PUBLIC_DRIVE_FOLDER_ID || 
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID || 
    '',
    
  DUPLICATE_FOLDER_ID: 
    process.env.DUPLICATE_FOLDER_ID ||
    process.env.NEXT_PUBLIC_DUPLICATE_FOLDER_ID || 
    '',
    
  SHEET_ID: 
    process.env.SHEET_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID || 
    '',
    
  SITE_NAME: 'BIO-Archive',
  SITE_TAGLINE: '',
  NISER_SEMESTERS: [1, 2, 3, 4, 5, 6, 7, 8],
  MAX_UPLOAD_SIZE_MB: 100,
  ALLOWED_FILE_TYPES: ['pdf', 'pptx', 'ppt', 'docx', 'xlsx', 'zip', 'jpg', 'jpeg', 'png'],
};

export default config;