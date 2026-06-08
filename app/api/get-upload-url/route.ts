/**
 * API Endpoint: GET UPLOAD URL
 * Location: app/api/get-upload-url/route.ts
 *
 * Creates a resumable upload session with Google Drive and returns the upload URL
 * Browser then uploads directly to Google Drive, bypassing Vercel payload limits
 */

import { NextRequest, NextResponse } from 'next/server';
import { createResumableUploadUrl } from '@/lib/upload-session';

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

    // Limit file size to 500MB
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

    // CRITICAL CORS FIX: Dynamically detect the current request origin host (e.g., http://localhost:3000)
    // and pass it down into the session builder so Google permits direct cross-origin browser PUT requests.
    const originHeader = request.headers.get('origin') || new URL(request.url).origin;

    // Create resumable upload session with Google Drive
    const session = await createResumableUploadUrl({
      fileName,
      mimeType,
      fileSize,
      folderId,
    //   origin: originHeader, // <-- Strategic parameter pass-through
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