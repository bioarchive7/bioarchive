# BioArchive Deployment Guide

Complete step-by-step guide to deploy BioArchive to Vercel.

## Prerequisites

- GitHub account
- Vercel account (free tier works)
- Google Cloud project with Drive & Sheets APIs enabled
- Service account credentials from Google Cloud Console

---

## Step 1: Push Code to GitHub

### Create a new GitHub repository

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `bioarchive` (or preferred name)
3. Description: `NISER Biology Student Resource Portal`
4. Choose: **Public** (so it can be deployed to Vercel)
5. DO NOT initialize with README, .gitignore, or license (we already have them)
6. Click "Create repository"

### Push your local code to GitHub

```bash
cd e:\bioarchive

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial BioArchive deployment"

# Add remote (replace YOUR_USERNAME and YOUR_REPO with your values)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to main branch
git branch -M main
git push -u origin main
```

---

## Step 2: Import Repository to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository**
3. Paste your GitHub repo URL: `https://github.com/YOUR_USERNAME/YOUR_REPO`
4. Click **Import**
5. Leave default project settings as-is
6. DO NOT deploy yet — proceed to next step to add environment variables

---

## Step 3: Add Environment Variables to Vercel

After importing your GitHub repo to Vercel (before deploying):

1. In Vercel dashboard, click on your project
2. Go to **Settings** → **Environment Variables**
3. Add each variable from `.env.local.example`:

   ```
   NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID=<your_folder_id>
   NEXT_PUBLIC_DUPLICATE_FOLDER_ID=<your_duplicate_folder_id>
   NEXT_PUBLIC_GOOGLE_SHEETS_ID=<your_sheets_id>
   GOOGLE_SERVICE_ACCOUNT_EMAIL=<your_service_account_email>
   GOOGLE_PRIVATE_KEY=<your_private_key>
   GOOGLE_SERVICE_ACCOUNT_JSON=<your_service_account_json_string>
   ```

4. **Important**: The values with `NEXT_PUBLIC_` prefix are safe to commit but should match your production IDs.

---

## Step 4: Get Google Service Account Credentials

### Where to generate credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your BioArchive project
3. Go to **APIs & Services** → **Service Accounts**
4. Click on your service account email
5. Go to **Keys** tab
6. If no key exists, click **Add Key** → **Create new key** → **JSON**
7. A JSON file will download

### Extract credentials for .env.local:

From the downloaded JSON file, you need:

**For individual variables:**
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=<client_email from JSON>
GOOGLE_PRIVATE_KEY=<private_key from JSON (first 64 chars for display)>
```

**For GOOGLE_SERVICE_ACCOUNT_JSON** (most important):
```
# Convert the entire JSON to a single-line string:
# Copy the entire JSON, remove all newlines, and set as:
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"bioarchive",...}
```

#### Quick conversion method:

1. Open the downloaded JSON file in a text editor
2. Copy all contents
3. Use an online JSON minifier (or Node.js):
   ```bash
   node -e "console.log(JSON.stringify(require('./path/to/downloaded.json')))"
   ```
4. Copy the output and paste as `GOOGLE_SERVICE_ACCOUNT_JSON` value

---

## Step 5: Deploy

1. In Vercel dashboard, click **Deploy**
2. Wait for build to complete (usually 2-3 minutes)
3. When successful, you'll see a "Production" URL like: `https://bioarchive-xxx.vercel.app`

---

## Step 6: Set Up Google Search Console

Google Search Console helps your site appear in Google search results.

### Add verification meta tag:

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Click **Add property**
3. Enter your Vercel URL: `https://bioarchive-xxx.vercel.app`
4. Choose **HTML tag verification**
5. Copy the meta tag (example):
   ```html
   <meta name="google-site-verification" content="abc123xyz..." />
   ```

### Add to layout.tsx:

In [app/layout.tsx](app/layout.tsx), add the verification tag inside the `<head>`:

```tsx
export const metadata: Metadata = {
  title: `${config.SITE_NAME} | NISER Biology Resources`,
  description: config.SITE_TAGLINE,
  verification: {
    google: 'abc123xyz...' // Your verification code only
  },
  // ... rest of metadata
};
```

Then redeploy:
```bash
git add app/layout.tsx
git commit -m "Add Google Search Console verification"
git push
# Vercel will auto-deploy when it sees the push
```

---

## Step 7: Submit Sitemap to Google Search Console

### Update sitemap.xml with production URL:

1. Open [public/sitemap.xml](public/sitemap.xml)
2. Replace `https://bioarchive.vercel.app` with your actual Vercel URL
3. Commit and push:
   ```bash
   git add public/sitemap.xml
   git commit -m "Update sitemap with production URL"
   git push
   ```

### Submit to Google Search Console:

1. In Google Search Console, go to **Sitemaps**
2. Click **Add/Test Sitemap**
3. Enter: `https://your-bioarchive-url.vercel.app/sitemap.xml`
4. Click **Submit**

Google will start crawling your site within 24 hours.

---

## Step 8: Update Curriculum & Redeploy

To add new courses, semesters, or update the curriculum:

### Edit curriculum locally:

1. Update [data/curriculum.ts](data/curriculum.ts) with new courses
2. Test locally: `npm run dev`
3. Commit and push:
   ```bash
   git add data/curriculum.ts
   git commit -m "Add new courses to semester X"
   git push
   ```

### Automatic deployment:

Vercel will automatically detect the push and redeploy your site with the new curriculum. No additional steps needed.

### Using Vercel CLI (optional faster method):

If you want to deploy without pushing to GitHub:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy current directory
vercel --prod

# It will ask you to link to your project and deploy immediately
```

---

## Common Issues & Solutions

### Issue: "Build failed"

**Solution**: Run `npm run build` locally to see the error:
```bash
npm run build
```

Fix the error and push again.

### Issue: "GOOGLE_SERVICE_ACCOUNT_JSON is invalid"

**Solution**: 
- Ensure the value is a **single-line JSON string** with no newlines
- Double-check it's valid JSON with an online JSON validator
- Re-add the variable in Vercel dashboard

### Issue: "Files are not uploading to Google Drive"

**Solution**:
- Verify service account has Drive API permissions in Google Cloud Console
- Verify `DRIVE_FOLDER_ID` is correct and exists in your Google Drive
- Check Vercel logs: **Deployments** → **Build Logs** → scroll for errors

### Issue: "Sitemap returns 404"

**Solution**: 
- Verify `public/sitemap.xml` exists
- Check that you updated the URL in sitemap.xml
- Re-deploy: `git push`

---

## DNS Setup (Optional: Custom Domain)

To use a custom domain like `bioarchive.niser.ac.in`:

1. In Vercel dashboard → **Settings** → **Domains**
2. Click **Add Domain**
3. Enter your domain
4. Vercel will show DNS records to add
5. Update your domain registrar's DNS settings
6. Wait 24-48 hours for DNS to propagate

---

## Next Steps

Once deployed:

✅ Share the URL with NISER Biology students
✅ Monitor Vercel analytics
✅ Check Google Search Console for search insights
✅ Read [MAINTENANCE.md](MAINTENANCE.md) for ongoing operations

Good luck! 🚀
