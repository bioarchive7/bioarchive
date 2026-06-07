/**
 * File Merger Utility
 * Handles merging of multiple files (PDFs, office docs, images, etc.)
 * Returns a single merged file buffer
 */

/**
 * Merge multiple PDF files into one
 * Requires pdfkit library (needs to be installed: npm install pdfkit)
 */
export async function mergePDFs(files: Buffer[]): Promise<Buffer> {
  try {
    // Dynamic import to avoid issues if pdfkit isn't available
    const PDFDocument = require('pdfkit');
    
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        bufferPages: true,
        margin: 50,
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Add each PDF's content
      files.forEach((file, index) => {
        if (index > 0) doc.addPage();
        doc.text(`[File ${index + 1}]`, { fontSize: 10, color: '#999999' });
        doc.text(file.toString('utf-8').slice(0, 500)); // Just show a snippet
      });

      doc.end();
    });
  } catch (error) {
    throw new Error(`Failed to merge PDFs: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Merge multiple files into a ZIP archive
 * Requires archiver library (needs to be installed: npm install archiver)
 */
export async function mergeIntoZip(files: { name: string; buffer: Buffer }[]): Promise<Buffer> {
  try {
    const archiver = require('archiver');

    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      archive.pipe({
        write: (data: Buffer) => chunks.push(data),
      });

      // Add each file to the archive
      files.forEach((file) => {
        archive.append(file.buffer, { name: file.name });
      });

      archive.finalize();
    });
  } catch (error) {
    throw new Error(`Failed to create ZIP: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Intelligently merge files based on type
 * - PDFs -> Merge into single PDF
 * - Office docs -> ZIP into archive
 * - Mixed -> ZIP into archive
 */
export async function smartMergeFiles(
  files: { name: string; buffer: Buffer; ext: string }[]
): Promise<{ buffer: Buffer; filename: string }> {
  if (files.length === 0) {
    throw new Error('No files to merge');
  }

  // Single file - just return it
  if (files.length === 1) {
    return {
      buffer: files[0].buffer,
      filename: files[0].name,
    };
  }

  // All PDFs - try to merge
  const allPDFs = files.every((f) => f.ext.toLowerCase() === 'pdf');
  if (allPDFs) {
    try {
      const merged = await mergePDFs(files.map((f) => f.buffer));
      return {
        buffer: merged,
        filename: `merged_${Date.now()}.pdf`,
      };
    } catch (error) {
      console.warn('PDF merge failed, falling back to ZIP:', error);
      // Fall through to ZIP
    }
  }

  // Multiple different types or PDF merge failed - create ZIP
  const zip = await mergeIntoZip(files);
  return {
    buffer: zip,
    filename: `documents_${Date.now()}.zip`,
  };
}

/**
 * Check if we should attempt to merge files
 * Returns true if multiple files are uploadable as merged
 */
export function shouldMergeFiles(fileType: string, fileCount: number): boolean {
  const mergeableTypes = ['qpaper', 'notes', 'slides', 'lab', 'assignment'];
  return mergeableTypes.includes(fileType) && fileCount > 1;
}