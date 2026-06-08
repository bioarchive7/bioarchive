#!/usr/bin/env node

/**
 * Test Script: Verify Google OAuth Credentials
 * 
 * Run this to check if your credentials are valid before deploying
 * Usage: node test-credentials.js
 */

const fs = require('fs');
const path = require('path');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(colors[color], ...args, colors.reset);
}

async function main() {
  log('cyan', '\n🧪 BioArchive Credentials Test\n');
  log('cyan', '='.repeat(50));

  // Step 1: Check .env.local exists
  log('blue', '\n[1/4] Checking .env.local file...');
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    log('red', '❌ .env.local not found');
    log('yellow', '   Create it using: cp .env.local.example .env.local');
    process.exit(1);
  }
  log('green', '✅ .env.local found');

  // Step 2: Load environment variables
  log('blue', '\n[2/4] Loading environment variables...');
  require('dotenv').config({ path: envPath });

  const requiredVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN',
  ];

  let allPresent = true;
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      log('red', `❌ ${varName} is missing`);
      allPresent = false;
    } else {
      log('green', `✅ ${varName} is set`);
    }
  }

  if (!allPresent) {
    log('red', '\n❌ Some required variables are missing');
    process.exit(1);
  }

  // Step 3: Test Google OAuth token refresh
  log('blue', '\n[3/4] Testing Google OAuth token refresh...');
  log('yellow', '   (This verifies your credentials are valid)');

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      log('red', `❌ Google OAuth failed (${response.status})`);
      log('red', `   ${error}`);
      process.exit(1);
    }

    const data = await response.json();
    if (!data.access_token) {
      log('red', '❌ No access token in response');
      log('red', `   Response: ${JSON.stringify(data)}`);
      process.exit(1);
    }

    log('green', '✅ Google OAuth token refresh successful');
    log('yellow', `   Token (first 20 chars): ${data.access_token.substring(0, 20)}...`);
    log('yellow', `   Expires in: ${data.expires_in} seconds`);
  } catch (error) {
    log('red', '❌ Failed to refresh Google OAuth token');
    log('red', `   Error: ${error.message}`);
    process.exit(1);
  }

  // Step 4: Check Google Drive folder
  log('blue', '\n[4/4] Checking Google Drive folder access...');
  
  const folderId = process.env.NEXT_PUBLIC_DRIVE_FOLDER_ID || 
                   process.env.DRIVE_FOLDER_ID;
  
  if (!folderId) {
    log('yellow', '⚠️  DRIVE_FOLDER_ID not set (this is optional)');
    log('yellow', '   You can set it later in Vercel');
  } else {
    try {
      // Get new token for this test
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
          grant_type: 'refresh_token',
        }).toString(),
      });

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      const driveResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${folderId}?fields=name,mimeType`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!driveResponse.ok) {
        log('red', `❌ Cannot access Drive folder (${driveResponse.status})`);
        log('yellow', '   Verify:');
        log('yellow', '   1. DRIVE_FOLDER_ID is correct');
        log('yellow', '   2. Google account has access to folder');
        log('yellow', '   3. Drive API is enabled in Google Cloud Console');
      } else {
        const folderData = await driveResponse.json();
        log('green', '✅ Google Drive folder is accessible');
        log('yellow', `   Folder: ${folderData.name}`);
      }
    } catch (error) {
      log('yellow', `⚠️  Could not verify folder: ${error.message}`);
    }
  }

  // Summary
  log('cyan', '\n' + '='.repeat(50));
  log('green', '\n✅ All credentials are valid!\n');
  log('yellow', 'Next steps:');
  log('yellow', '1. Add these variables to Vercel Environment Variables');
  log('yellow', '2. Redeploy: git push');
  log('yellow', '3. Test upload: https://bioarchive.vercel.app\n');
}

main().catch((error) => {
  log('red', `\n❌ Unexpected error: ${error.message}\n`);
  process.exit(1);
});