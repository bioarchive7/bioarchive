/**
 * API Endpoint: REGISTER UPLOAD
 * Location: app/api/register-upload/route.ts
 *
 * Called by the frontend AFTER the file has been uploaded to Google Drive.
 * Registers the file metadata in Google Sheets and sends notifications.
 * The file is already on Google Drive at this point.
 */

import { NextRequest, NextResponse } from 'next/server';
import { appendFileRecord, getAllFiles } from '@/lib/sheets';
import { computeMD5, generateFileName } from '@/lib/utils';
import { notifyModsOfUpload } from '@/lib/notify';
import { google } from 'googleapis';
import config from '@/config';

/**
 * Get file metadata from Google Drive by file ID
 */
async function getFileMetadata(fileId: string) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Missing OAuth credentials');
    }

    const auth = new google.auth.OAuth2(clientId, clientSecret);
    auth.setCredentials({ refresh_token: refreshToken });
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.get({
      fileId,
      fields: 'id, name, webViewLink, webContentLink, size, mimeType',
    });

    return response.data;
  } catch (error) {
    throw new Error(
      `Failed to get file metadata: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract metadata from request
    const {
      fileId,
      fileName,
      semester,
      year,
      courseCode,
      courseName,
      professor,
      professor2,
      professor3,
      examType,
      fileType,
      uploaderName,
      remarks,
    } = body;

    // Validate required fields
    if (!fileId || !semester || !courseCode || !fileType || !professor) {
      return NextResponse.json(
        { status: 'error', message: 'Missing required metadata fields' },
        { status: 400 }
      );
    }

    // Get file metadata from Google Drive
    const driveFile = await getFileMetadata(fileId);
    if (!driveFile) {
      return NextResponse.json(
        { status: 'error', message: 'File not found on Google Drive' },
        { status: 404 }
      );
    }

    // Get all existing files to check for duplicates
    const sheetData = await getAllFiles();

    // For resumable uploads, we can't easily get the MD5 hash before upload
    // Use the file ID + filename as a composite key instead
    const md5Hash = `${fileId}:${driveFile.name}`;

    // Check if file already exists
    const isDuplicate = sheetData.some((row) => row.md5Hash === md5Hash);
    if (isDuplicate) {
      return NextResponse.json(
        {
          status: 'duplicate',
          message: 'This file already exists in our database',
        },
        { status: 400 }
      );
    }

    // Generate standard filename if not provided
    const finalFileName = fileName || generateFileName({
      semester: parseInt(semester),
      courseCode,
      type: fileType as any,
      year: year ? parseInt(year) : undefined,
      originalName: driveFile.name || 'file',
    });

    // Prepare professor list
    const professorList = [
      professor,
      professor2 || null,
      professor3 || null,
    ]
      .filter(Boolean)
      .join('; ');

    // Register in Google Sheets
    const uploadDate = new Date().toISOString().split('T')[0];
    await appendFileRecord({
      fileId,
      semester,
      year,
      courseCode,
      courseName,
      professor: professorList,
      examType,
      fileType,
      fileName: finalFileName,
      uploaderName: uploaderName || 'Anonymous',
      uploadDate,
      md5Hash,
      webViewLink: driveFile.webViewLink || '',
      webContentLink: driveFile.webContentLink || '',
      downloadCount: 0,
      remarks: remarks || '',
    });

    // Send mod notification
    await notifyModsOfUpload({
      fileName: finalFileName,
      courseCode,
      courseName,
      semester,
      professor,
      fileType,
      examType,
      uploaderName: uploaderName || 'Anonymous',
      webViewLink: driveFile.webViewLink || '',
    }).catch((err) => {
      console.error('Notification failed:', err);
      // Don't fail registration if notification fails
    });

    return NextResponse.json(
      {
        status: 'success',
        message: 'File registered successfully',
        data: {
          fileId,
          fileName: finalFileName,
          webViewLink: driveFile.webViewLink,
          webContentLink: driveFile.webContentLink,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Register upload error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: `Failed to register upload: ${errorMsg}`,
      },
      { status: 500 }
    );
  }
}