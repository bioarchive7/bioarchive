/**
 * Google Sheets API integration
 * Handles reading and writing to the files registry
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
  examType: string;
  fileType: string;
  fileName: string;
  uploaderName: string;
  uploadDate: string;
  md5Hash: string;
  webViewLink: string;
  webContentLink: string;
  downloadCount: number;
}

/** Column headers in the same order as SheetRow fields */
const SHEET_HEADERS = [
  'fileId',
  'semester',
  'courseCode',
  'courseName',
  'professor',
  'examType',
  'fileType',
  'fileName',
  'uploaderName',
  'uploadDate',
  'md5Hash',
  'webViewLink',
  'webContentLink',
  'downloadCount',
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
    examType: values[5] || '',
    fileType: values[6] || '',
    fileName: values[7] || '',
    uploaderName: values[8] || '',
    uploadDate: values[9] || '',
    md5Hash: values[10] || '',
    webViewLink: values[11] || '',
    webContentLink: values[12] || '',
    downloadCount: parseInt(values[13]) || 0,
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
    row.examType,
    row.fileType,
    row.fileName,
    row.uploaderName,
    row.uploadDate,
    row.md5Hash,
    row.webViewLink,
    row.webContentLink,
    row.downloadCount,
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
      range: 'Sheet1!A1:N1',
    });

    const headerRow = response.data.values?.[0];

    if (!headerRow || headerRow.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: config.SHEET_ID,
        range: 'Sheet1!A1:N1',
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
      range: 'Sheet1!A2:N',
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
      range: 'Sheet1!A:N',       // fixed — was A:L
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
 * downloadCount is column N (index 13, 1-indexed = 14).
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

    // downloadCount is column N
    const downloadCountCell = `N${targetRowIndex}`;
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