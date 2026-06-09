/**
 * GET /api/files
 * Returns all files, optionally filtered by ?semester=&courseCode=
 *
 * Previously used JWT service-account auth (GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY)
 * which are never set — the project uses OAuth2 refresh-token auth instead.
 * Fixed by delegating to getAllFiles() in lib/sheets.ts, which already handles
 * the correct credentials and sheet structure (single "Sheet1" tab, not per-semester tabs).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllFiles } from '@/lib/sheets';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const semester   = searchParams.get('semester');
    const courseCode = searchParams.get('courseCode');
    const year = searchParams.get('year');

    const allFiles = await getAllFiles();

    // If both filters are supplied, narrow the result set
    if (semester && courseCode) {
      const filtered = allFiles.filter(
        (file) =>
          file.semester === semester &&
          file.courseCode.trim().toLowerCase() === courseCode.trim().toLowerCase() &&
          file.year === year
      );
      return NextResponse.json(filtered);
    }

    // No filters — return everything (used by fetchAllFiles / searchFiles)
    return NextResponse.json(allFiles);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Files API error:', message);
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}