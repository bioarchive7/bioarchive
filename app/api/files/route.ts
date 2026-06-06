import { NextRequest, NextResponse } from 'next/server';
import { getAllFiles } from '@/lib/sheets';

// In-memory cache — persists across requests in the same server instance
let cache: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const semester = searchParams.get('semester');
  const courseCode = searchParams.get('courseCode');

  try {
    // Serve from cache if fresh
    const now = Date.now();
    if (!cache || now - cache.timestamp > CACHE_TTL_MS) {
      const allFiles = await getAllFiles();
      cache = { data: allFiles, timestamp: now };
    }

    let files = cache.data;

    // Filter in-memory — no extra API calls
    if (semester) files = files.filter(f => f.semester === semester);
    if (courseCode) files = files.filter(f => f.courseCode === courseCode);

    return NextResponse.json(
      { files, total: files.length },
      {
        headers: {
          'Cache-Control': 's-maxage=60, stale-while-revalidate',
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}