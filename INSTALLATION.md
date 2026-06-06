# BioArchive Installation Guide

This guide will help you set up the BioArchive project on your local machine.

## Step 1: Prerequisites

Make sure you have installed:

- **Node.js** (version 18 or higher) from https://nodejs.org/
- **npm** (comes with Node.js)

To verify installation:
```bash
node --version
npm --version
```

## Step 2: Navigate to Project Directory

```bash
cd e:\bioarchive
```

## Step 3: Install Dependencies

```bash
npm install
```

This will install all required packages:
- next (React framework)
- react & react-dom
- tailwindcss (CSS framework)
- framer-motion (animations)
- lucide-react (icons)
- googleapis (Google APIs)
- And all dev dependencies

## Step 4: Set Up Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   copy .env.local.example .env.local
   ```

2. Edit `.env.local` and add your Google Cloud credentials:
   - Get credentials from https://console.cloud.google.com/
   - Create a service account for Drive & Sheets API
   - Add the credentials to `.env.local`

## Step 5: Run Development Server

```bash
npm run dev
```

The application will be available at: http://localhost:3000

## Step 6: Build for Production

```bash
npm run build
```

Then start production server:
```bash
npm start
```

## Troubleshooting

### Node.js not found
If you get "node is not recognized", you need to:
1. Install Node.js from https://nodejs.org/
2. Restart your terminal/PowerShell
3. Verify with `node --version`

### Dependencies installation fails
Try clearing npm cache:
```bash
npm cache clean --force
npm install
```

### Port 3000 already in use
Run on a different port:
```bash
npm run dev -- -p 3001
```

## Next Steps

Once the development server is running:

1. Implement Google Drive API integration in `lib/drive.ts`
2. Implement Google Sheets integration in `lib/sheets.ts`
3. Connect the upload and files API endpoints
4. Add authentication
5. Deploy to production

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Google APIs Documentation](https://developers.google.com/apis-explorer)
