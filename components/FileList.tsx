/**
 * FileList component
 * Displays list of files for a course with download/preview options
 */

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Eye, BookOpen } from 'lucide-react';
import { SheetRow } from '@/lib/sheets';
import { fetchFilesByCourse, incrementFileDownloads } from '@/lib/api-client';
import { getLibgenSearchURL, formatFileSize } from '@/lib/utils';

interface FileListProps {
  courseCode: string;
  semester: string;
}

export default function FileList({ courseCode, semester }: FileListProps) {
  const [files, setFiles] = useState<SheetRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentCourseName, setCurrentCourseName] = useState('');

  // Fetch files on mount
  useEffect(() => {
    const fetchFiles = async () => {
      setIsLoading(true);
      try {
        const result = await fetchFilesByCourse(semester, courseCode);
        setFiles(result);
        if (result.length > 0) {
          setCurrentCourseName(result[0].courseName);
        }
      } catch (error) {
        console.error('Error fetching files:', error);
        setFiles([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, [courseCode, semester]);

  // Handle download - increment counter and open link
  const handleDownload = (file: SheetRow) => {
    // Fire and forget - increment download count
    incrementFileDownloads(file.fileId).catch((error) => {
      console.error('Error incrementing download count:', error);
    });

    // Open download link
    if (file.webContentLink) {
      window.open(file.webContentLink, '_blank');
    }
  };

  // Handle preview - open Drive viewer
  const handlePreview = (file: SheetRow) => {
    setPreviewFileId(file.fileId);
    setIsPreviewOpen(true);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  // Empty state
  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600">
        <BookOpen size={32} className="mx-auto text-gray-400 mb-2" />
        <p className="font-medium text-gray-700">No files yet</p>
        <p className="text-sm mb-3">Be the first to upload!</p>
        <a
          href={getLibgenSearchURL(currentCourseName || courseCode)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#d4a853] hover:text-amber-600 text-sm font-medium flex items-center justify-center gap-2"
        >
          <BookOpen size={16} />
          Search LibGen for textbooks
        </a>
      </div>
    );
  }

  // File type badge color
  const getFileTypeBadgeColor = (fileType: string) => {
    const colors: Record<string, string> = {
      qpaper: 'bg-red-100 text-red-700',
      notes: 'bg-blue-100 text-blue-700',
      slides: 'bg-purple-100 text-purple-700',
      lab: 'bg-green-100 text-green-700',
      assignment: 'bg-orange-100 text-orange-700',
      other: 'bg-gray-100 text-gray-700',
    };
    return colors[fileType] || colors.other;
  };

  // File type label
  const getFileTypeLabel = (fileType: string) => {
    const labels: Record<string, string> = {
      qpaper: 'Q.Paper',
      notes: 'Notes',
      slides: 'Slides',
      lab: 'Lab',
      assignment: 'Assignment',
      other: 'Other',
    };
    return labels[fileType] || fileType;
  };

  return (
    <>
      <div className="space-y-2">
        {files.map((file, index) => (
          <motion.div
            key={file.fileId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-[#d4a853] hover:shadow-sm transition-all group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-medium text-[#1c1c1e] truncate">
                  {file.fileName}
                </h4>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${getFileTypeBadgeColor(file.fileType)}`}>
                  {getFileTypeLabel(file.fileType)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{formatFileSize(100000)}</span>
                <span>•</span>
                <span>{new Date(file.uploadDate).toLocaleDateString()}</span>
                {file.uploaderName && file.uploaderName !== 'Anonymous' && (
                  <>
                    <span>•</span>
                    <span className="text-gray-600">by {file.uploaderName}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-2">
              <button
                onClick={() => handlePreview(file)}
                className="p-1.5 text-gray-600 hover:text-[#1a4a2e] hover:bg-gray-100 rounded-lg transition-colors group-hover:opacity-100"
                title="Preview"
              >
                <Eye size={18} />
              </button>
              <button
                onClick={() => handleDownload(file)}
                className="p-1.5 text-gray-600 hover:text-[#d4a853] hover:bg-amber-50 rounded-lg transition-colors group-hover:opacity-100"
                title="Download"
              >
                <Download size={18} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && previewFileId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsPreviewOpen(false)}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl h-[80vh] bg-white rounded-xl overflow-hidden shadow-xl"
          >
            {/* Close Button */}
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Google Drive Viewer Iframe */}
            <iframe
              src={`https://drive.google.com/file/d/${previewFileId}/preview`}
              width="100%"
              height="100%"
              allowFullScreen
              loading="lazy"
              className="border-none"
              onError={() => (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-600">Unable to preview this file</p>
                </div>
              )}
            />
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
