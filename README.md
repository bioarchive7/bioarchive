# BioArchive - NISER Biology Student Resource Portal

A comprehensive study resource portal for Biology students at NISER Bhubaneswar, India.

## Features

- 📚 **Study Materials**: Access question papers, notes, slides, and lab manuals
- 🔍 **Easy Search**: Find resources by semester, course, or file type
- 📤 **Share Resources**: Contribute your own study materials to help peers
- 🎨 **Modern UI**: Built with React, TypeScript, and Tailwind CSS
- ⚡ **Smooth Animations**: Enhanced UX with Framer Motion

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **APIs**: Google Drive & Google Sheets
- **Backend**: Next.js API Routes

## Project Structure

```
bioarchive/
├── app/
│   ├── api/
│   │   ├── upload/route.ts       # File upload endpoint
│   │   └── files/route.ts        # File listing endpoint
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/
│   ├── Navbar.tsx                # Navigation component
│   ├── SemesterBlock.tsx          # Semester display
│   ├── CourseCard.tsx            # Course card component
│   ├── FileList.tsx              # File list display
│   └── UploadModal.tsx           # Upload modal
├── config/
│   └── index.ts                  # Configuration constants
├── data/
│   └── curriculum.ts             # Course curriculum data
├── lib/
│   ├── drive.ts                  # Google Drive API wrapper
│   ├── sheets.ts                 # Google Sheets API wrapper
│   └── utils.ts                  # Utility functions
├── public/
│   └── logo.svg                  # Application logo
├── .env.local.example            # Environment variables template
├── tailwind.config.ts            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies

```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. **Clone the repository** (if applicable)

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   - Copy `.env.local.example` to `.env.local`
   - Fill in your Google Drive and Google Sheets credentials
   - Generate credentials from [Google Cloud Console](https://console.cloud.google.com)

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Configuration

Key configuration values are defined in `config/index.ts`:

- `DRIVE_FOLDER_ID` - Google Drive folder for storing materials
- `DUPLICATE_FOLDER_ID` - Backup folder on Drive
- `SHEET_ID` - Google Sheets containing curriculum
- `MAX_UPLOAD_SIZE_MB` - Maximum file upload size (default: 50 MB)
- `ALLOWED_FILE_TYPES` - Allowed file formats: pdf, pptx, docx, xlsx, zip

## Environment Variables

See `.env.local.example` for required environment variables:

- `NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID`
- `NEXT_PUBLIC_DUPLICATE_FOLDER_ID`
- `NEXT_PUBLIC_GOOGLE_SHEETS_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`

## API Endpoints

### Upload File
- **POST** `/api/upload`
- Upload study materials

### List Files
- **GET** `/api/files?semester=1&courseCode=BIO101`
- Get files for a specific course

## Supported Courses

The curriculum covers 10 semesters of the NISER Integrated MSc Biology program, including:

- General Biology & Cell Biology
- Molecular Biology & Genetics
- Biochemistry & Microbiology
- Physiology & Immunology
- Botany & Zoology
- Developmental Biology
- And more specialized topics in later semesters

## Contributing

This is a student-driven project. To contribute:

1. Create a new branch for your feature
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

This project is part of NISER and follows institutional guidelines.

## Support

For issues or suggestions, please contact the development team or create an issue in the repository.

---

**Status**: 🚧 Under Development - Not all features are currently available.
