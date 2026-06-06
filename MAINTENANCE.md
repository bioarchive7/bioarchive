# BioArchive Maintenance Guide

Operational guide for managing BioArchive after deployment.

---

## Adding a New Course

### Step 1: Edit curriculum.ts

Open [data/curriculum.ts](data/curriculum.ts) and add the course to the correct semester:

```typescript
export const CURRICULUM: Record<string, Course[]> = {
  '1': [
    // ... existing courses
    {
      code: 'BIO999',           // Unique course code
      name: 'New Course Name',  // Full course name
      image: '/images/courses/new-course.svg', // Optional icon path
      description: 'Brief description of what students will learn',
    },
  ],
  // ... other semesters
};
```

### Step 2: Deploy

```bash
git add data/curriculum.ts
git commit -m "Add BIO999: New Course Name to Semester 1"
git push
```

Vercel will automatically rebuild and deploy within 2-3 minutes.

**That's it!** The new course appears in the app immediately.

---

## Adding a New Semester

BioArchive currently supports semesters 1-10 (Integrated MSc Biology). To add more:

### Step 1: Update config.ts (if adding semester 11+)

Open [config/index.ts](config/index.ts):

```typescript
NISER_SEMESTERS: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // Add new semester number
```

### Step 2: Add courses to curriculum.ts

```typescript
export const CURRICULUM: Record<string, Course[]> = {
  // ... semesters 1-10
  '11': [
    {
      code: 'BIO601',
      name: 'Advanced Research Methods',
      image: '/images/courses/research-methods.svg',
      description: 'In-depth research design and scientific methodology',
    },
    // ... more courses for semester 11
  ],
};
```

### Step 3: Deploy

```bash
git add config/index.ts data/curriculum.ts
git commit -m "Add Semester 11 with courses"
git push
```

---

## Changing the Google Drive Folder

All files are stored in a Google Drive folder configured in one place.

### Why would you change it?

- Migrate to a new shared Drive
- Segregate test vs production files
- Clean up and archive old folders

### How to change it:

1. In Google Drive, create the new folder (or note the existing one)
2. Right-click the folder and select **"Share"** or open it
3. Copy the folder ID from the URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
4. Go to Vercel dashboard → **Settings** → **Environment Variables**
5. Edit `NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID` with the new folder ID
6. Redeploy:

   ```bash
   # Option 1: Use Vercel CLI (immediate)
   npm i -g vercel
   vercel --prod
   
   # Option 2: Trigger redeployment via dashboard
   # Go to Deployments → Click "..." on latest → Redeploy
   ```

**Warning**: This change affects ALL FUTURE uploads. Existing files stay in the old folder.

---

## Changing the Google Sheet

All file metadata (name, semester, uploader) is stored in a Google Sheet.

### Why would you change it?

- Move to a organization-owned Sheet
- Start a fresh semester with a new Sheet
- Archive old data

### How to change it:

1. Create a new Google Sheet (or open existing one)
2. The sheet must have your service account as an editor
3. Get the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`
4. Go to Vercel dashboard → **Settings** → **Environment Variables**
5. Edit `NEXT_PUBLIC_GOOGLE_SHEETS_ID` with the new Sheet ID
6. Redeploy:

   ```bash
   npm i -g vercel
   vercel --prod
   ```

**Note**: Your service account will automatically create column headers when the new Sheet is first accessed.

---

## Duplicate Files Location

When a user uploads a file that already exists (same MD5 hash), it's stored in a separate folder:

**Type**: Google Drive folder
**Config key**: `NEXT_PUBLIC_DUPLICATE_FOLDER_ID` in Vercel Environment Variables
**Purpose**: Backup/archive of files marked as duplicates

### Why they're separate:

- Prevents version confusion (which file is current?)
- Backups in case original gets corrupted
- Easy to audit upload history

### How to view duplicates:

1. Open Google Drive
2. Navigate to the folder ID stored in `NEXT_PUBLIC_DUPLICATE_FOLDER_ID`
3. Files named with `DUPLICATE_` prefix are backups

### To change the duplicates folder:

Same process as changing the main Drive folder:

1. Create/note the new folder ID
2. Update `NEXT_PUBLIC_DUPLICATE_FOLDER_ID` in Vercel Environment Variables
3. Redeploy

---

## Removing a File

If a file needs to be removed (copyright issue, wrong upload, etc.):

### Step 1: Remove from Google Drive

1. Get the file ID from your users (they can share the Drive link)
2. Open Google Drive
3. Find and delete the file
4. The file becomes inaccessible but History retains the record

### Step 2: Remove from Google Sheet (Registry)

1. Open your Google Sheet (ID from `NEXT_PUBLIC_GOOGLE_SHEETS_ID`)
2. Find the row with the deleted file
3. Delete the entire row
4. The file no longer appears in BioArchive

### Automation (manual SQL-like command):

Currently, there's no built-in delete API. To automate, you could:

1. Create a Google Apps Script in the Sheet
2. Bind it to a delete function
3. Or manually delete as described above

**Alternative**: Create a file moderation UI (future enhancement).

---

## Checking for Duplicates Manually

Duplicate detection uses MD5 hashing (file content fingerprint).

### To manually check if a file is a duplicate:

1. Compute the file's MD5 hash:
   ```bash
   # On Windows PowerShell:
   (Get-FileHash "path\to\file.pdf" -Algorithm MD5).Hash.ToLower()
   
   # On Mac/Linux:
   md5sum /path/to/file.pdf
   ```

2. Open your Google Sheet
3. Find the `md5Hash` column (column I)
4. Search (Ctrl+F) for the hash
5. If found, the file is a duplicate

### Duplicates folder location:

Files detected as duplicates go here:
- **Folder ID**: `NEXT_PUBLIC_DUPLICATE_FOLDER_ID`
- **File naming**: `DUPLICATE_SEM1_BIO101_NOTES_CURRENT_1717584000000.pdf`
- **Why there**: Preserve backup but don't confuse users

---

## Checking Upload Errors

If users report upload failures:

### 1. Check Vercel Logs

```bash
npm i -g vercel
vercel logs

# Or in Vercel dashboard:
# Deployments → [Latest] → Logs → Filter by "upload"
```

### 2. Common errors:

| Error | Cause | Solution |
|-------|-------|----------|
| "File exceeds 50MB limit" | File too large | User must compress or split |
| "File type not allowed" | Wrong extension | User uploads `pdf`, not `txt` |
| "Google Drive API error" | Service account issue | Check Drive folder exists and service account has access |
| "Sheet ID not configured" | Environment variable missing | Verify `NEXT_PUBLIC_GOOGLE_SHEETS_ID` in Vercel |

### 3. Check Google Drive permissions

```bash
# Verify service account has access to folder:
# 1. Go to Google Drive folder
# 2. Share → Add service account email (from .env.local)
# 3. Give Editor role
```

---

## Performance Monitoring

### Check file upload speed:

1. In Vercel dashboard → **Analytics**
2. Look for `/api/upload` response times
3. Should be < 5 seconds for typical files

### If uploads are slow:

- Check file size (>50MB not allowed)
- Check internet connection
- Check Google Drive quota (free account limited)
- Consider upgrading Google Workspace for enterprise

---

## Analytics & Insights

### View traffic:

Vercel dashboard → **Analytics** shows:
- Page views
- API requests
- Response times
- Geographic distribution

### Search visibility:

Google Search Console → **Performance** shows:
- How many times BioArchive appears in Google search
- Click-through rate
- Average position
- Most popular pages

---

## Backups

### Automatic backups:

- **Git history**: Every push backs up your code on GitHub
- **Google Drive**: Files uploaded persist in Drive
- **Google Sheet**: File metadata backed up in Sheet

### Manual backup:

1. Download curriculu.ts and config.ts regularly:
   ```bash
   git clone https://github.com/YOUR_USERNAME/bioarchive.git bioarchive-backup
   ```

2. Download Google Sheet as CSV:
   - Open Sheet → **File** → **Download** → **CSV**
   - Save locally for records

3. Export Google Drive folder:
   - Right-click folder → **Download** (downloads as .zip)
   - Store in backup location

---

## Updating BioArchive Code

To update components, fix bugs, or add features:

### Local development:

```bash
cd e:\bioarchive

# Pull latest changes (if team development)
git pull

# Install any new dependencies
npm install

# Run locally
npm run dev

# Visit http://localhost:3000
```

### Deploy changes:

```bash
# Make code changes
# ...

# Test locally to verify
npm run build

# Commit and push
git add .
git commit -m "Your change description"
git push

# Vercel auto-deploys within 2-3 minutes
```

---

## Support & Troubleshooting

### Common questions:

**Q: How do I add authentication so only specific users can upload?**
A: Currently, anyone can upload. Future enhancement would use Google OAuth or similar. See `api-client.ts` for TODO comment.

**Q: How do I limit file uploads by course?**
A: The UI validates semester/course exists. API could add further restrictions in `app/api/upload/route.ts`.

**Q: Can I preview other file types (not just PDFs)?**
A: Google Drive viewer supports PDF, PPTX, DOCX, XLSX. Preview code is in `FileList.tsx`.

**Q: How do I track who's downloading files?**
A: Download tracking is a TODO in `api-client.ts`. Currently downloads increment automatically in the Sheet, but user identity isn't captured.

---

## Next Steps

- Share BioArchive URL with NISER students
- Monitor uploads and user feedback
- Update curriculum as courses progress through semesters
- Plan future enhancements (authentication, advanced search, etc.)

For questions, refer to [README.md](README.md) and [DEPLOYMENT.md](DEPLOYMENT.md).

Good luck! 📚
