/**
 * API Upload Endpoint Handler
 * Location: app/api/upload/route.ts
 * 
 * Handles multi-file uploads with automatic merging for compatible file types
 * Uploads merged file to Google Drive and registers in Google Sheets
 */

import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToDrive, checkDuplicateByHash } from '@/lib/drive';
import { appendFileRecord, getAllFiles } from '@/lib/sheets';
import { computeMD5, generateFileName } from '@/lib/utils';
import { smartMergeFiles, shouldMergeFiles } from '@/lib/file-merger';
import { notifyModsOfUpload } from '@/lib/notify';
import config from '@/config';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract fields
    const semester = formData.get('semester') as string;
    const courseCode = formData.get('courseCode') as string;
    const courseName = formData.get('courseName') as string;
    const professor = formData.get('professor') as string;
    const professor2 = formData.get('professor2') as string | null;
    const professor3 = formData.get('professor3') as string | null;
    const examType = formData.get('examType') as string;
    const fileType = formData.get('fileType') as string;
    const year = formData.get('year') as string;
    const uploaderName = formData.get('uploaderName') as string;
    const remarks = formData.get('remarks') as string | null;
    const isMultiFile = (formData.get('isMultiFile') as string) === 'true';

    // Get all files from FormData
    const fileEntries = formData.getAll('files');
    if (fileEntries.length === 0) {
      return NextResponse.json(
        { status: 'error', message: 'No files provided' },
        { status: 400 }
      );
    }

    // Validate inputs
    if (!semester || !courseCode || !fileType || !professor) {
      return NextResponse.json(
        { status: 'error', message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Convert files to buffers
    const files: { name: string; buffer: Buffer; ext: string }[] = [];
    for (const entry of fileEntries) {
      if (!(entry instanceof File)) continue;

      const buffer = Buffer.from(await entry.arrayBuffer());
      const ext = entry.name.split('.').pop()?.toLowerCase() || '';

      files.push({
        name: entry.name,
        buffer,
        ext,
      });
    }

    if (files.length === 0) {
      return NextResponse.json(
        { status: 'error', message: 'No valid files provided' },
        { status: 400 }
      );
    }

    // Check for duplicates before merging
    const sheetData = await getAllFiles();
    
    // Compute hash of the first file (or merged file)
    let fileToUpload: { name: string; buffer: Buffer };

    // Decide whether to merge files
    if (shouldMergeFiles(fileType, files.length)) {
      const merged = await smartMergeFiles(files);
      fileToUpload = {
        name: merged.filename,
        buffer: merged.buffer,
      };
    } else {
      // Use only the first file
      fileToUpload = {
        name: files[0].name,
        buffer: files[0].buffer,
      };
    }

    const md5Hash = computeMD5(fileToUpload.buffer);

    // Check if file already exists
    if (checkDuplicateByHash(md5Hash, sheetData)) {
      return NextResponse.json(
        {
          status: 'duplicate',
          message: 'This file already exists in our database',
        },
        { status: 400 }
      );
    }

    // Generate standard filename
    const finalFileName = generateFileName({
      semester: parseInt(semester),
      courseCode,
      type: fileType as any,
      year: year ? parseInt(year) : undefined,
      originalName: fileToUpload.name,
    });

    // Upload to Google Drive
    const uploadResult = await uploadFileToDrive({
      fileBuffer: fileToUpload.buffer,
      fileName: finalFileName,
      mimeType: getMimeType(finalFileName),
      folderId: config.DRIVE_FOLDER_ID,
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
      fileId: uploadResult.fileId,
      semester,
      courseCode,
      courseName,
      professor: professorList,
      examType,
      fileType,
      fileName: finalFileName,
      uploaderName: uploaderName || 'Anonymous',
      uploadDate,
      md5Hash,
      webViewLink: uploadResult.webViewLink,
      webContentLink: uploadResult.webContentLink,
      downloadCount: 0,
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
      webViewLink: uploadResult.webViewLink,
    }).catch((err) => {
      console.error('Notification failed:', err);
      // Don't fail the upload if notification fails
    });

    return NextResponse.json(
      {
        status: 'success',
        message: `File${files.length > 1 ? 's' : ''} uploaded successfully${isMultiFile ? ' and merged' : ''}`,
        data: {
          fileId: uploadResult.fileId,
          webViewLink: uploadResult.webViewLink,
          webContentLink: uploadResult.webContentLink,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Upload error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: `Upload failed: ${errorMsg}`,
      },
      { status: 500 }
    );
  }
}

/**
 * Get MIME type based on file extension
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    zip: 'application/zip',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}