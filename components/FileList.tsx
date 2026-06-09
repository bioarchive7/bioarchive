'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Eye, BookOpen, X, Calendar } from 'lucide-react';
import { SheetRow } from '@/lib/sheets';
import { fetchFilesByCourse, incrementFileDownloads } from '@/lib/api-client';
import { getLibgenSearchURL, formatFileSize } from '@/lib/utils';

interface FileListProps {
  courseCode: string;
  semester: string;
}

const BADGE: Record<string, { cls: string; label: string }> = {
  qpaper:     { cls: 'badge-qpaper',     label: 'Q.Paper' },
  notes:      { cls: 'badge-notes',      label: 'Notes' },
  slides:     { cls: 'badge-slides',     label: 'Slides' },
  lab:        { cls: 'badge-lab',        label: 'Lab' },
  assignment: { cls: 'badge-assignment', label: 'Assignment' },
  other:      { cls: 'badge-other',      label: 'Other' },
};

export default function FileList({ courseCode, semester }: FileListProps) {
  const [files,             setFiles]            = useState<SheetRow[]>([]);
  const [isLoading,         setIsLoading]        = useState(true);
  const [previewFileId,     setPreviewFileId]    = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!courseCode || !semester) return;
      try {
        setIsLoading(true);
        const data = await fetchFilesByCourse(courseCode, semester);
        if (active) setFiles(data);
      } catch (err) {
        console.error('Error hydrating registry list views:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [courseCode, semester]);

  const handleDownload = async (fileId: string) => {
    try {
      await incrementFileDownloads(fileId);
    } catch (e) {
      console.error('Download counter metrics aggregation fault:', e);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div
        style={{
          padding: '48px 24px',
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px dashed rgba(255, 255, 255, 0.06)',
          borderRadius: '16px',
        }}
      >
        <BookOpen size={36} strokeWidth={1.5} style={{ color: 'var(--text-3)', marginBottom: '12px' }} />
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' }}>
          No resources loaded yet
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', maxWidth: '320px', margin: '0 auto' }}>
          Be the first to upload lecture sheets, custom references, or notes for this class module.
        </p>
      </div>
    );
  }

  return (
    <div className="file-list-grid">
      {files.map((file) => {
        const typeInfo = BADGE[file.fileType] || BADGE.other;
        return (
          <motion.div
            key={file.fileId}
            layoutId={`card-${file.fileId}`}
            className="file-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            <div className="file-card-main">
              <div className="file-title-wrapper">
                <span className={`file-badge ${typeInfo.cls}`}>{typeInfo.label}</span>
                <h4 className="file-title" title={file.fileName}>
                  {file.fileName}
                </h4>
              </div>

              <div className="file-meta-row">
                <span className="meta-author">{file.professor}</span>
                <span className="meta-dot">•</span>
                
                {/* INLINE ACADEMIC CALENDAR YEAR FIELD */}
                {file.year ? (
                  <span className="meta-year-badge flex items-center gap-1 text-[11px] text-amber-400/90 font-medium bg-amber-400/5 border border-amber-400/10 px-1.5 py-0.5 rounded">
                    <Calendar size={11} className="inline shrink-0" />
                    {file.year}
                  </span>
                ) : (
                  <span className="meta-date">{file.uploadDate || 'Recent'}</span>
                )}
              </div>

              {file.remarks && <p className="file-remarks-bubble">&ldquo;{file.remarks}&rdquo;</p>}
            </div>

            <div className="file-card-actions">
              <div className="uploader-signature">
                <span>By {file.uploaderName || 'Contributor'}</span>
              </div>

              <div className="action-button-group">
                <button
                  onClick={() => setPreviewFileId(file.fileId)}
                  className="btn-icon-secondary"
                  title="Preview document modal layout"
                >
                  <Eye size={14} strokeWidth={2.2} />
                </button>
                <a
                  href={file.webContentLink || file.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleDownload(file.fileId)}
                  className="btn-primary-sm"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={13} strokeWidth={2.4} />
                  <span>Get</span>
                </a>
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* PORTAL PREVIEW POPUP */}
      {previewFileId && typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            <motion.div
              className="portal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="portal-window"
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
              >
                <div
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'between',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: 'rgba(0,0,0,0.1)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--text-3)',
                    }}
                  >
                    Document Portal Preview
                  </span>
                  <button
                    onClick={() => setPreviewFileId(null)}
                    style={{
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: 'var(--text-2)',
                    }}
                  >
                    <X size={14} strokeWidth={2.2} />
                  </button>
                </div>
                <iframe
                  src={`https://drive.google.com/file/d/${previewFileId}/preview`}
                  style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
                  allowFullScreen
                  loading="lazy"
                />
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}