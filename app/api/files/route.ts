import { NextRequest, NextResponse } from 'next/server';
import { getAllFiles } from '@/lib/sheets';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseCode = searchParams.get('courseCode');
    const semester = searchParams.get('semester');

    if (!courseCode) {
      return NextResponse.json(
        { status: 'error', message: 'Missing courseCode parameter' },
        { status: 400 }
      );
    }

    // 1. Fetch raw rows array from Google Sheets
    const allFiles = await getAllFiles();

    // 2. Filter using strict string-normalized checks to avoid numeric-vs-string dropouts
    const filteredFiles = allFiles.filter((file) => {
      const matchesCourse = String(file.courseCode).trim().toLowerCase() === String(courseCode).trim().toLowerCase();
      
      // If a semester filter parameter is provided, validate it loosely
      const matchesSemester = semester 
        ? String(file.semester).trim() === String(semester).trim()
        : true;

      return matchesCourse && matchesSemester;
    });

    // 3. Map values explicitly, capturing the 'year' field securely
    const formattedFiles = filteredFiles.map((file) => ({
      fileId: file.fileId,
      semester: file.semester,
      year: file.year || '', // <── FIXED: Captures the structural Year parameter safely
      courseCode: file.courseCode,
      courseName: file.courseName || '',
      professor: file.professor,
      professor2: file.professor2 || '',
      professor3: file.professor3 || '',
      examType: file.examType || 'na',
      fileType: file.fileType,
      fileName: file.fileName,
      uploaderName: file.uploaderName || 'Anonymous',
      uploadDate: file.uploadDate || '',
      webViewLink: file.webViewLink || '',
      webContentLink: file.webContentLink || '',
      downloadCount: file.downloadCount || 0,
      remarks: file.remarks || '',
    }));

    return NextResponse.json({
      status: 'success',
      data: formattedFiles,
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch files catalog archive' },
      { status: 500 }
    );
  }
}