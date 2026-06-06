/**
 * File upload API route
 * No authentication required — open to all users
 */

import { NextRequest, NextResponse } from 'next/server';
import { notifyModsOfUpload } from '@/lib/notify';
import config from '@/config';
import {
  generateFileName,
  computeMD5,
  FileType,
  isFileTypeAllowed,
  isFileSizeAllowed,
} from '@/lib/utils';
import {
  uploadFileToDrive,
  makeFilePublic,
  initDriveClient,
} from '@/lib/drive';
import { getAllFiles, appendFileRecord, SheetRow } from '@/lib/sheets';

export const maxDuration = 60;

interface UploadResponse {
  status: 'success' | 'duplicate' | 'error';
  message: string;
  data?: {
    fileId?: string;
    webViewLink?: string;
    webContentLink?: string;
  };
}

/**
 * Check duplicate by metadata.
 * For question papers: matches courseCode + fileType + professor + examType + year
 * For all other types: matches courseCode + fileType + professor
 */
function checkDuplicateByMetadata(
  existingFiles: SheetRow[],
  courseCode: string,
  fileType: string,
  professor: string,
  examType: string,
  year: string
): boolean {
  return existingFiles.some((row) => {
    const sameCore =
      row.courseCode === courseCode &&
      row.fileType === fileType &&
      row.professor === professor;

    if (fileType === 'qpaper') {
      const rowYear = row.fileName.match(/_(\d{4})_/)?.[1] || '';
      return sameCore && row.examType === examType && rowYear === year;
    }

    return sameCore;
  });
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    const formData = await request.formData();

    const file = formData.get('file') as File | null;
    const semester = formData.get('semester') as string | null;
    const courseCode = formData.get('courseCode') as string | null;
    const courseName = formData.get('courseName') as string | null;
    const fileType = formData.get('fileType') as string | null;
    const year = (formData.get('year') as string | null) || '';
    const uploaderName = (formData.get('uploaderName') as string | null) || 'Anonymous';
    const consent = formData.get('consent') as string | null;
    const professor = (formData.get('professor') as string | null) || '';
    const examType = (formData.get('examType') as string | null) || 'na';

    // ========== VALIDATION ==========

    if (!file) return NextResponse.json({ status: 'error', message: 'No file provided.' }, { status: 400 });
    if (!semester) return NextResponse.json({ status: 'error', message: 'Semester is required.' }, { status: 400 });
    if (!courseCode) return NextResponse.json({ status: 'error', message: 'Course code is required.' }, { status: 400 });
    if (!courseName) return NextResponse.json({ status: 'error', message: 'Course name is required.' }, { status: 400 });
    if (!fileType) return NextResponse.json({ status: 'error', message: 'File type is required.' }, { status: 400 });
    if (!professor) return NextResponse.json({ status: 'error', message: 'Professor name is required.' }, { status: 400 });

    if (fileType === 'qpaper' && !examType) {
      return NextResponse.json({ status: 'error', message: 'Exam type is required for question papers.' }, { status: 400 });
    }

    if (!isFileTypeAllowed(file.name)) {
      return NextResponse.json({
        status: 'error',
        message: `File type not allowed. Allowed: ${config.ALLOWED_FILE_TYPES.join(', ')}`,
      }, { status: 400 });
    }

    if (!isFileSizeAllowed(file.size)) {
      return NextResponse.json({
        status: 'error',
        message: `File exceeds ${config.MAX_UPLOAD_SIZE_MB}MB limit.`,
      }, { status: 400 });
    }

    const semesterNum = parseInt(semester);
    if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 10) {
      return NextResponse.json({ status: 'error', message: 'Semester must be between 1 and 10.' }, { status: 400 });
    }

    // ========== DUPLICATE CHECK ==========

    const existingFiles = await getAllFiles();
    const isDuplicate = checkDuplicateByMetadata(
      existingFiles,
      courseCode,
      fileType,
      professor,
      examType,
      year
    );

    // ========== PROCESS UPLOAD ==========

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const md5Hash = computeMD5(fileBuffer);

    const generatedFileName = generateFileName({
      semester: semesterNum,
      courseCode,
      type: fileType as FileType,
      year: year ? parseInt(year) : undefined,
      uploaderName: consent === 'true' ? uploaderName : undefined,
      originalName: file.name,
    });

    const folderId = isDuplicate ? config.DUPLICATE_FOLDER_ID : config.DRIVE_FOLDER_ID;
    const actualFileName = isDuplicate ? `DUPLICATE_${generatedFileName}` : generatedFileName;

    const uploadResult = await uploadFileToDrive({
      fileBuffer,
      fileName: actualFileName,
      mimeType: file.type || 'application/octet-stream',
      folderId,
    });

    // Duplicate — store in backup, skip sheet + notification
    if (isDuplicate) {
      return NextResponse.json({
        status: 'duplicate',
        message: 'A file with these same details already exists. Stored in backup for manual review.',
        data: { fileId: uploadResult.fileId },
      });
    }

    // Make file publicly viewable
    const driveClient = initDriveClient();
    await makeFilePublic(driveClient, uploadResult.fileId);

    // Record in Google Sheet
    const sheetRecord: SheetRow = {
      fileId: uploadResult.fileId,
      semester,
      courseCode,
      courseName,
      fileType,
      fileName: generatedFileName,
      uploaderName: consent === 'true' ? uploaderName : 'Anonymous',
      uploadDate: new Date().toISOString().split('T')[0],
      md5Hash,
      webViewLink: uploadResult.webViewLink,
      webContentLink: uploadResult.webContentLink,
      downloadCount: 0,
      professor,
      examType: fileType === 'qpaper' ? examType : 'na',
    };

    await appendFileRecord(sheetRecord);

    // Notify mods — fire and forget, never blocks the upload response
    notifyModsOfUpload({
      fileName: generatedFileName,
      courseCode,
      courseName,
      semester,
      professor,
      fileType,
      examType: fileType === 'qpaper' ? examType : 'na',
      uploaderName: consent === 'true' ? uploaderName : 'Anonymous',
      webViewLink: uploadResult.webViewLink,
    }).catch(() => {}); // silently ignore if email fails

    return NextResponse.json({
      status: 'success',
      message: `"${generatedFileName}" uploaded successfully.`,
      data: {
        fileId: uploadResult.fileId,
        webViewLink: uploadResult.webViewLink,
        webContentLink: uploadResult.webContentLink,
      },
    });

  } catch (error) {
    console.error('Upload error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ status: 'error', message: `Upload failed: ${msg}` }, { status: 500 });
  }
}