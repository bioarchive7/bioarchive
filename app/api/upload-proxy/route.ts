/**
 * API Endpoint: UPLOAD PROXY PIPELINE
 * Location: app/api/upload-proxy/route.ts
 *
 * Receives the stream from the frontend and sends it server-to-server to Google Drive.
 * Completely eliminates browser CORS (Status 0) limitations.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    // 1. Extract the destination Google Drive upload URL passed via headers
    const uploadUrl = request.headers.get('x-upload-url');
    const contentType = request.headers.get('content-type') || 'application/octet-stream';

    if (!uploadUrl) {
      return NextResponse.json(
        { status: 'error', message: 'Missing target Google Drive session destination header' },
        { status: 400 }
      );
    }

    console.log('[Upload Proxy] Streaming payload server-to-server to Drive...');

    // 2. Capture the native request body stream safely
    const fileStream = request.body;
    if (!fileStream) {
      return NextResponse.json(
        { status: 'error', message: 'No file stream payload detected' },
        { status: 400 }
      );
    }

    // 3. Pipe the stream cleanly to Google Drive's edge servers
    const googleResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: fileStream,
      // @ts-ignore - Required in Node/Next runtime environments to stream raw requests
      duplex: 'half',
    });

    const responseText = await googleResponse.text();
    console.log('[Upload Proxy] Google Drive response status:', googleResponse.status);

    // 4. Return Google's exact metadata back to the client app
    return new Response(responseText, {
      status: googleResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Upload Proxy] Pipeline runtime failure:', error);
    return NextResponse.json(
      { status: 'error', message: `Internal server proxy error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}