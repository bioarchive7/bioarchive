#!/usr/bin/env node

/**
 * Test Google Drive Resumable Upload API
 * Shows the exact error message from Google
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[37m',
};

function log(color, ...args) {
  console.log(colors[color], ...args, colors.reset);
}

async function main() {
  log('cyan', '\n🔍 Google Drive Resumable Upload Diagnostics\n');

  // Read .env.local
  log('blue', 'Reading .env.local...');
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    log('red', '❌ .env.local not found');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#')) {
      env[key.trim()] = valueParts.join('=').trim().replace(/^"(.*)"$/, '$1');
    }
  });

  // Validate required fields
  const required = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'NEXT_PUBLIC_DRIVE_FOLDER_ID'];
  for (const field of required) {
    if (!env[field]) {
      log('red', `❌ ${field} is missing from .env.local`);
      process.exit(1);
    }
  }

  log('green', '✅ All credentials loaded\n');

  const FOLDER_ID = env.NEXT_PUBLIC_DRIVE_FOLDER_ID || env.DRIVE_FOLDER_ID;
  log('gray', `Folder ID: ${FOLDER_ID}`);
  log('gray', `Client ID: ${env.GOOGLE_CLIENT_ID.substring(0, 30)}...`);

  // Step 1: Get access token
  log('blue', '\n[1/3] Getting Google access token...');
  
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        refresh_token: env.GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      log('red', `❌ Token refresh failed: ${error}`);
      process.exit(1);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    log('green', '✅ Access token obtained');

    // Step 2: Try to create resumable upload session
    log('blue', '\n[2/3] Creating resumable upload session with Google Drive...');
    
    const metadata = {
      name: 'test-upload.txt',
      mimeType: 'text/plain',
      parents: [FOLDER_ID],
    };

    log('gray', `Sending metadata:`);
    log('gray', JSON.stringify(metadata, null, 2));
    log('gray', `Headers:`);
    log('gray', `  X-Goog-Upload-Protocol: resumable`);
    log('gray', `  X-Goog-Upload-Header-Content-Length: 1024`);
    log('gray', `  X-Goog-Upload-Header-Content-Type: text/plain`);

    const initiateResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Header-Content-Length': '1024',
          'X-Goog-Upload-Header-Content-Type': 'text/plain',
        },
        body: JSON.stringify(metadata),
      }
    );

    log('gray', `\nGoogle Drive API Response:`);
    log('gray', `Status: ${initiateResponse.status} ${initiateResponse.statusText}`);
    
    // Show all response headers
    log('gray', `Response Headers:`);
    for (const [key, value] of initiateResponse.headers) {
      log('gray', `  ${key}: ${value}`);
    }

    if (!initiateResponse.ok) {
      const errorBody = await initiateResponse.text();
      log('red', `\n❌ Google Drive API returned ${initiateResponse.status}`);
      log('red', `Error body:`);
      log('red', errorBody);
      
      // Try to parse as JSON for better formatting
      try {
        const jsonError = JSON.parse(errorBody);
        log('red', `\nParsed error:`);
        log('red', JSON.stringify(jsonError, null, 2));
      } catch (e) {
        // Already logged as plain text
      }

      log('yellow', '\n💡 TROUBLESHOOTING:');
      log('yellow', '1. Verify NEXT_PUBLIC_DRIVE_FOLDER_ID is correct');
      log('yellow', '2. Open the folder in Google Drive and check URL');
      log('yellow', '3. Make sure you have write permissions to the folder');
      log('yellow', '4. Verify Google Drive API is enabled in Google Cloud Console');
      log('yellow', '5. Check if folder ID has special characters or spaces');

      process.exit(1);
    }

    const uploadUrl = initiateResponse.headers.get('location');
    if (!uploadUrl) {
      log('red', '❌ No Location header in response');
      process.exit(1);
    }

    log('green', '✅ Resumable upload session created!');
    log('gray', `Upload URL (first 60 chars): ${uploadUrl.substring(0, 60)}...`);

    log('cyan', '\n' + '='.repeat(50));
    log('green', '\n✅ Google Drive API is working correctly!\n');
    log('yellow', 'Your credentials and folder ID are valid.');
    log('yellow', 'The issue is somewhere else in the upload flow.\n');

  } catch (error) {
    log('red', `❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();