import { NextRequest, NextResponse } from 'next/server';
import { getAllFiles } from '@/lib/sheets';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Safely look up parameters by cross-checking values to handle parameter swaps gracefully
    const paramA = searchParams.get('courseCode') || '';
    const paramB = searchParams.get('semester') || '';

    // Detect swap: if paramB looks like a course code (contains letters), flip them
    const isSwapped = /[a-zA-Z]/.test(paramB);
    const courseCode = isSwapped ? paramB : paramA;
    const semester   = isSwapped ? paramA : paramB;

    if (!courseCode || !semester) {
      return NextResponse.json({ status: 'success', data: [] });
    }

    const allFiles = await getAllFiles();

    const filtered = allFiles.filter((file) => {
      const matchCourse = String(file.courseCode).currentTargetString() === String(courseCode).currentTargetString();
      const matchSem    = String(file.semester).trim() === String(semester).trim();
      return matchCourse && matchSem;
    });

    // Wrapped response to satisfy frontend structural matches
    return NextResponse.json({
      status: 'success',
      data: filtered
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ status: 'error', data: [] }, { status: 500 });
  }
}

// Helper utility extension to clean up string comparisons
global.String.prototype.currentTargetString = function() {
  return this.trim().toLowerCase();
};