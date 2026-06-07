/**
 * Google Sheets API integration
 * Handles reading and writing to the files registry
 * Updated: Multi-professor support, remarks field
 */

import { google, sheets_v4 } from 'googleapis';
import config from '@/config';

type GoogleSheetsClient = sheets_v4.Sheets;

/**
 * File record structure - matches the Sheets column headers
 */
export interface SheetRow {
  fileId: string;
  semester: string;
  courseCode: string;
  courseName: string;
  professor: string;
  professor2?: string;      // NEW - optional secondary professor
  professor3?: string;      // NEW - optional tertiary professor
  examType: string;
  fileType: string;
  fileName: string;
  uploaderName: string;
  uploadDate: string;
  md5Hash: string;
  webViewLink: string;
  webContentLink: string;
  downloadCount: number;
  remarks?: string;         // NEW - optional remarks/notes
}

/** Column headers in the same order as SheetRow fields */
const SHEET_HEADERS = [
  'fileId',
  'semester',
  'courseCode',
  'courseName',
  'professor',
  'professor2',         // NEW
  'professor3',         // NEW
  'examType',
  'fileType',
  'fileName',
  'uploaderName',
  'uploadDate',
  'md5Hash',
  'webViewLink',
  'webContentLink',
  'downloadCount',
  'remarks',            // NEW
];

/**
 * Initialize Google Sheets client using OAuth2 refresh token.
 */
export function initSheetsClient(): GoogleSheetsClient {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing OAuth credentials. Ensure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ' +
      'and GOOGLE_REFRESH_TOKEN are all set in .env.local'
    );
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Convert array values to SheetRow object
 */
function rowToSheetRow(values: any[]): SheetRow {
  return {
    fileId: values[0] || '',
    semester: values[1] || '',
    courseCode: values[2] || '',
    courseName: values[3] || '',
    professor: values[4] || '',
    professor2: values[5] || '',        // NEW
    professor3: values[6] || '',        // NEW
    examType: values[7] || '',
    fileType: values[8] || '',
    fileName: values[9] || '',
    uploaderName: values[10] || '',
    uploadDate: values[11] || '',
    md5Hash: values[12] || '',
    webViewLink: values[13] || '',
    webContentLink: values[14] || '',
    downloadCount: parseInt(values[15]) || 0,
    remarks: values[16] || '',          // NEW
  };
}

/**
 * Convert SheetRow object to array values
 */
function sheetRowToArray(row: SheetRow): any[] {
  return [
    row.fileId,
    row.semester,
    row.courseCode,
    row.courseName,
    row.professor,
    row.professor2 || '',               // NEW
    row.professor3 || '',               // NEW
    row.examType,
    row.fileType,
    row.fileName,
    row.uploaderName,
    row.uploadDate,
    row.md5Hash,
    row.webViewLink,
    row.webContentLink,
    row.downloadCount,
    row.remarks || '',                  // NEW
  ];
}

/**
 * Check if sheet headers exist and create them if not.
 */
export async function initializeSheetHeaders(): Promise<void> {
  if (!config.SHEET_ID) {
    throw new Error('SHEET_ID is not configured in config/index.ts');
  }

  const sheets = initSheetsClient();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.SHEET_ID,
      range: 'Sheet1!A1:Q1',            // Updated range for new columns
    });

    const headerRow = response.data.values?.[0];

    if (!headerRow || headerRow.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: config.SHEET_ID,
        range: 'Sheet1!A1:Q1',           // Updated range for new columns
        valueInputOption: 'RAW',
        requestBody: {
          values: [SHEET_HEADERS],
        },
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to initialize sheet headers: ${errorMessage}`);
  }
}

/**
 * Read all file records from the registry sheet.
 */
export async function getAllFiles(): Promise<SheetRow[]> {
  if (!config.SHEET_ID) {
    throw new Error('SHEET_ID is not configured in config/index.ts');
  }

  const sheets = initSheetsClient();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.SHEET_ID,
      range: 'Sheet1!A2:Q',             // Updated range for new columns
    });

    const rows = response.data.values || [];
    return rows.map((row) => rowToSheetRow(row));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read files from sheet: ${errorMessage}`);
  }
}

/**
 * Append a new file record to the registry sheet.
 */
export async function appendFileRecord(row: SheetRow): Promise<void> {
  if (!config.SHEET_ID) {
    throw new Error('SHEET_ID is not configured in config/index.ts');
  }

  const sheets = initSheetsClient();

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: config.SHEET_ID,
      range: 'Sheet1!A:Q',              // Updated range for new columns
      valueInputOption: 'RAW',
      requestBody: {
        values: [sheetRowToArray(row)],
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to append file record for "${row.fileName}": ${errorMessage}`
    );
  }
}

/**
 * Increment the download count for a file by 1.
 * downloadCount is column P (index 15, 1-indexed = 16).
 */
export async function incrementDownloadCount(fileId: string): Promise<void> {
  if (!config.SHEET_ID) {
    throw new Error('SHEET_ID is not configured in config/index.ts');
  }

  const sheets = initSheetsClient();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.SHEET_ID,
      range: 'Sheet1!A:A',
    });

    const fileIds = response.data.values || [];
    let targetRowIndex = -1;

    for (let i = 1; i < fileIds.length; i++) {
      if (fileIds[i][0] === fileId) {
        targetRowIndex = i + 1;
        break;
      }
    }

    if (targetRowIndex === -1) {
      throw new Error(`File with ID "${fileId}" not found in registry`);
    }

    // downloadCount is column P
    const downloadCountCell = `P${targetRowIndex}`;
    const currentCell = await sheets.spreadsheets.values.get({
      spreadsheetId: config.SHEET_ID,
      range: downloadCountCell,
    });

    const currentCount = parseInt(currentCell.data.values?.[0]?.[0]) || 0;

    await sheets.spreadsheets.values.update({
      spreadsheetId: config.SHEET_ID,
      range: downloadCountCell,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[currentCount + 1]],
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('not found in registry')) {
      throw new Error(errorMessage);
    }
    throw new Error(`Failed to increment download count for file "${fileId}": ${errorMessage}`);
  }
}

/**
 * Update remarks for a file
 */
export async function updateRemarks(fileId: string, remarks: string): Promise<void> {
  if (!config.SHEET_ID) {
    throw new Error('SHEET_ID is not configured in config/index.ts');
  }

  const sheets = initSheetsClient();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.SHEET_ID,
      range: 'Sheet1!A:A',
    });

    const fileIds = response.data.values || [];
    let targetRowIndex = -1;

    for (let i = 1; i < fileIds.length; i++) {
      if (fileIds[i][0] === fileId) {
        targetRowIndex = i + 1;
        break;
      }
    }

    if (targetRowIndex === -1) {
      throw new Error(`File with ID "${fileId}" not found in registry`);
    }

    // remarks is column Q
    const remarksCell = `Q${targetRowIndex}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId: config.SHEET_ID,
      range: remarksCell,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[remarks]],
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to update remarks for file "${fileId}": ${errorMessage}`);
  }
}