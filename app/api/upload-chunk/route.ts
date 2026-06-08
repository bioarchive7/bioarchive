import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const uploadUrl = request.headers.get('x-upload-url');
    const contentRange = request.headers.get('content-range');
    const contentType = request.headers.get('x-file-mime') || 'application/octet-stream';

    if (!uploadUrl || !contentRange) {
      return NextResponse.json(
        { status: 'error', message: 'Missing structural routing headers' },
        { status: 400 }
      );
    }

    // Parse the safe JSON text payload
    const body = await request.json();
    if (!body || !body.chunk) {
      return NextResponse.json({ status: 'error', message: 'Chunk data text string missing' }, { status: 400 });
    }

    // Decode the base64 string directly back into a clean node binary buffer
    const binaryBuffer = Buffer.from(body.chunk, 'base64');

    console.log(`[Chunk Proxy] Routing bytes block: ${contentRange}`);

    // Dispatch the clean buffer data server-to-server directly to Google Drive
    const googleResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Range': contentRange,
      },
      body: binaryBuffer,
    });

    const responseText = await googleResponse.text();
    console.log('[Chunk Proxy] Google Response status code:', googleResponse.status);

    // Bubble Google's exact tracking status (308, 200, or 201) back to the client app
    return new Response(responseText, {
      status: googleResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Chunk Proxy] Failed to route chunk safely:', error);
    return NextResponse.json(
      { status: 'error', message: `Chunk transfer crash logic error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}