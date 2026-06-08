import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const uploadUrl = request.headers.get('x-upload-url');
    const contentRange = request.headers.get('content-range');
    const contentType = request.headers.get('content-type') || 'application/octet-stream';

    if (!uploadUrl || !contentRange) {
      return NextResponse.json(
        { status: 'error', message: 'Missing routing headers x-upload-url or content-range' },
        { status: 400 }
      );
    }

    const chunkStream = request.body;
    if (!chunkStream) {
      return NextResponse.json({ status: 'error', message: 'No chunk data found' }, { status: 400 });
    }

    // Pass the chunk directly to Google Drive
    const googleResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Range': contentRange,
      },
      body: chunkStream,
      // @ts-ignore
      duplex: 'half',
    });

    const responseText = await googleResponse.text();

    // Google returns 308 Resume Incomplete for intermediate chunks, or 200/201 for the final chunk
    return new Response(responseText, {
      status: googleResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Chunk Proxy] Failed to pipe chunk:', error);
    return NextResponse.json({ status: 'error', message: 'Chunk transfer failed' }, { status: 500 });
  }
}