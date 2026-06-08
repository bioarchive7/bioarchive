/**
 * API Endpoint: REGISTER UPLOAD
 * Location: app/api/register-upload/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { appendFileRecord, getAllFiles } from '@/lib/sheets';
import { generateFileName } from '@/lib/utils';
import { notifyModsOfUpload } from '@/lib/notify';
import { google } from 'googleapis';

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

async function moveFileToDuplicateFolder(fileId: string, currentParentId: string) {
  try {
    const duplicateFolderId = process.env.NEXT_PUBLIC_DUPLICATE_FOLDER_ID;
    if (!duplicateFolderId) return;

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
  } catch (error) {
    console.error('[Duplicate Relocation Error]:', error);
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

    if (!fileId || !semester || !courseCode || !fileType || !professor) {
      return NextResponse.json({ status: 'error', message: 'Missing required fields' }, { status: 400 });
    }

    const driveFile = await getFileMetadata(fileId);
    if (!driveFile) {
      return NextResponse.json({ status: 'error', message: 'File not found on Drive' }, { status: 404 });
    }

    // Duplicate logic: Strict parameter tracking exclusively on qpaper and slides
    const shouldCheckDuplicates = fileType === 'qpaper' || fileType === 'slides';
    let isDuplicate = false;

    if (shouldCheckDuplicates) {
      const sheetData = await getAllFiles();
      isDuplicate = sheetData.some((row) => {
        const matchSemester = String(row.semester) === String(semester);
        const matchYear     = String(row.year).toLowerCase() === String(year).toLowerCase();
        const matchCourse   = String(row.courseCode).toLowerCase() === String(courseCode).toLowerCase();
        const matchProf     = String(row.professor).toLowerCase() === String(professor).toLowerCase();
        const matchExam     = fileType === 'qpaper' 
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

      return NextResponse.json({
        status: 'duplicate',
        message: 'This academic material is already registered. Sent copy to backups!',
        data: { fileId, fileName: driveFile.name }
      }, { status: 200 });
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

    // Append beautifully structured inputs directly matching columns A-R
    await appendFileRecord({
      fileId,
      semester: String(semester),
      year: String(year),
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
      semester: String(semester),
      professor,
      fileType,
      examType,
      uploaderName: uploaderName || 'Anonymous',
      webViewLink: driveFile.webViewLink || '',
    }).catch((err) => console.error('Notification bypassed:', err));

    return NextResponse.json({
      status: 'success',
      message: 'File cataloged successfully',
      data: { fileId, fileName: finalFileName }
    }, { status: 200 });

  } catch (error) {
    console.error('Registration runtime error:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: `Failed to register entry: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
}