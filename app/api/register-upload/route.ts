/**
 * API Endpoint: REGISTER UPLOAD
 * Location: app/api/register-upload/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { appendFileRecord, getAllFiles } from '@/lib/sheets';
import { generateFileName } from '@/lib/utils';
import { notifyModsOfUpload } from '@/lib/notify';
import { google } from 'googleapis';
import config from '@/config';

/**
 * Get file parent information from Google Drive to enable backup migration routing
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
      fields: 'id, name, webViewLink, webContentLink, size, mimeType, parents, md5Checksum',
    });

    return response.data;
  } catch (error) {
    throw new Error(
      `Failed to get file metadata: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Migrate target duplicate assets into the designated duplicate/backup folder dynamically
 */
async function moveFileToDuplicateFolder(fileId: string, currentParentId: string) {
  try {
    const duplicateFolderId = process.env.NEXT_PUBLIC_DUPLICATE_FOLDER_ID;
    if (!duplicateFolderId) {
      console.warn('NEXT_PUBLIC_DUPLICATE_FOLDER_ID not configured, bypassing asset migration');
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    const auth = new google.auth.OAuth2(clientId, clientSecret);
    auth.setCredentials({ refresh_token: refreshToken });
    const drive = google.drive({ version: 'v3', auth });

    await drive.files.update({
      fileId,
      addParents: duplicateFolderId,
      removeParents: currentParentId,
      fields: 'id, parents',
    });
    console.log(`[Duplicate Relocation] Moved conflicting file ${fileId} to backup directory.`);
  } catch (error) {
    console.error('[Duplicate Relocation] Failed moving target file asset:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

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

    const driveFile = await getFileMetadata(fileId);
    if (!driveFile) {
      return NextResponse.json(
        { status: 'error', message: 'File not found on Google Drive' },
        { status: 404 }
      );
    }

    // Only look up duplicates for specific academic material categories
    const checkDuplicates = fileType === 'qpaper' || fileType === 'slides';
    let isDuplicate = false;

    if (checkDuplicates) {
      const sheetData = await getAllFiles();
      isDuplicate = sheetData.some((row) => {
        const matchSemester = String(row.semester) === String(semester);
        const matchYear     = String(row.year).toLowerCase() === String(year).toLowerCase();
        const matchCourse   = String(row.courseCode).toLowerCase() === String(courseCode).toLowerCase();
        const matchProf     = String(row.professor).toLowerCase() === String(professor).toLowerCase();
        
        // Match exam type specifically for question papers
        const matchExam = fileType === 'qpaper' 
          ? String(row.examType).toLowerCase() === String(examType).toLowerCase()
          : true;

        return matchSemester && matchYear && matchCourse && matchProf && matchExam;
      });
    }

    if (isDuplicate) {
      const originalParent = (driveFile.parents && driveFile.parents[0]) || '';
      if (originalParent) {
        await moveFileToDuplicateFolder(fileId, originalParent);
      }

      return NextResponse.json(
        {
          status: 'duplicate',
          message: 'This syllabus item has already been submitted. Sent copy to backups!',
          data: {
            fileId,
            fileName: driveFile.name,
            webViewLink: driveFile.webViewLink,
            webContentLink: driveFile.webContentLink,
          }
        },
        { status: 200 }
      );
    }

    const finalFileName = fileName || generateFileName({
      semester: parseInt(semester),
      courseCode,
      type: fileType as any,
      year: year ? parseInt(year) : undefined,
      originalName: driveFile.name || 'file',
    });

    const uploadDate = new Date().toISOString().split('T')[0];
    const md5Hash = driveFile.md5Checksum || `${fileId}:${driveFile.name}`;

    // Appends cleanly to match all columns A-R in your database schema index sequentially
    await appendFileRecord({
      fileId,
      semester,
      year: year || '',
      courseCode,
      courseName: courseName || '',
      professor: professor || '',
      professor2: professor2 || '',
      professor3: professor3 || '',
      examType: examType || 'na',
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
    }).catch((err) => console.error('Notification failed:', err));

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
      { status: 'error', message: `Failed to register upload: ${errorMsg}` },
      { status: 500 }
    );
  }
}