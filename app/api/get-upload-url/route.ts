/**
 * API Endpoint: GET UPLOAD URL
 * Location: app/api/get-upload-url/route.ts
 *
 * Creates a resumable upload session with Google Drive and returns the upload URL
 * Browser then uploads directly to Google Drive, bypassing Vercel payload limits
 */

import { NextRequest, NextResponse } from 'next/server';
import { createResumableUploadUrl } from '@/lib/upload-session';
// import { getMimeType } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { fileName, fileSize, mimeType, folderId } = body;

    // Validate inputs
    if (!fileName || !fileSize || !mimeType) {
      return NextResponse.json(
        { status: 'error', message: 'Missing required fields: fileName, fileSize, mimeType' },
        { status: 400 }
      );
    }

    // Limit file size to 500MB (Google Drive limit is higher, but be reasonable)
    const MAX_FILE_SIZE = 500 * 1024 * 1024;
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          status: 'error',
          message: `File size ${(fileSize / (1024 * 1024)).toFixed(1)}MB exceeds maximum of 500MB`,
        },
        { status: 400 }
      );
    }

    // Create resumable upload session with Google Drive
    const session = await createResumableUploadUrl({
      fileName,
      mimeType,
      fileSize,
      folderId,
    });

    return NextResponse.json(
      {
        status: 'success',
        uploadUrl: session.uploadUrl,
        fileName: session.fileName,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Get upload URL error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: `Failed to create upload session: ${errorMsg}`,
      },
      { status: 500 }
    );
  }
}