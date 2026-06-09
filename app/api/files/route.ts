import { NextRequest, NextResponse } from 'next/server';
import { getAllFiles } from '@/lib/sheets';

// A safe, inline string normalization helper instead of mutating the global prototype
const normalize = (val: string | number | undefined | null): string => {
  return String(val || '').trim().toLowerCase();
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Safely pull query parameters
    const paramA = searchParams.get('courseCode') || '';
    const paramB = searchParams.get('semester') || '';

    // Parameter swap fallback logic: if paramB contains alphabetic course characters (e.g., "BIO101"), swap them
    const isSwapped = /[a-zA-Z]/.test(paramB);
    const courseCode = isSwapped ? paramB : paramA;
    const semester   = isSwapped ? paramA : paramB;

    if (!courseCode || !semester) {
      return NextResponse.json({ status: 'success', data: [] });
    }

    const allFiles = await getAllFiles();

    const filtered = allFiles.filter((file) => {
      const matchCourse = normalize(file.courseCode) === normalize(courseCode);
      const matchSem    = normalize(file.semester) === normalize(semester);
      return matchCourse && matchSem;
    });

    // Return wrapped response object layout matching what the frontend client consumes
    return NextResponse.json({
      status: 'success',
      data: filtered
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ status: 'error', data: [] }, { status: 500 });
  }
}