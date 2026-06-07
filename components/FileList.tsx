'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Eye, BookOpen, X } from 'lucide-react';
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
  const [currentCourseName, setCurrentCourseName]= useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchFilesByCourse(semester, courseCode)
      .then((result) => {
        if (cancelled) return;
        setFiles(result);
        if (result.length > 0) setCurrentCourseName(result[0].courseName);
      })
      .catch(() => { if (!cancelled) setFiles([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [courseCode, semester]);

  const handleDownload = (file: SheetRow) => {
    incrementFileDownloads(file.fileId).catch(() => {});
    if (file.webContentLink) window.open(file.webContentLink, '_blank');
  };

  /* ── Loading ──────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[1, 2].map((i) => (
          <div key={i} className="skeleton" style={{ height: '48px' }} />
        ))}
      </div>
    );
  }

  /* ── Empty ────────────────────────────────────────────────── */
  if (files.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '24px 12px',
          border: '1px dashed rgba(255,255,255,0.1)',
          borderRadius: '10px',
        }}
      >
        <BookOpen
          size={22}
          strokeWidth={1.5}
          style={{ margin: '0 auto 8px', color: 'var(--text-3)' }}
        />
        <p
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic',
            fontSize: '14px',
            color: 'var(--text-2)',
            marginBottom: '4px',
          }}
        >
          No files yet
        </p>
        <p style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '10px' }}>
          Be the first to upload!
        </p>
        <a
          href={getLibgenSearchURL(currentCourseName || courseCode)}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '11px', color: 'var(--gold)', textDecoration: 'underline' }}
        >
          Search LibGen for textbooks →
        </a>
      </div>
    );
  }

  /* ── File rows ───────────────────────────────────────────── */
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {files.map((file, i) => {
          const badge = BADGE[file.fileType] || BADGE.other;
          return (
            <motion.div
              key={file.fileId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="glass-hover"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '9px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                cursor: 'default',
              }}
            >
              {/* Badge */}
              <span
                className={badge.cls}
                style={{
                  fontSize: '9px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '2px 7px',
                  borderRadius: '20px',
                  flexShrink: 0,
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                {badge.label}
              </span>

              {/* File info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 500,
                    color: 'var(--text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: '2px',
                  }}
                >
                  {file.fileName}
                </p>
                <p
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-3)',
                    letterSpacing: '0.02em',
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  {formatFileSize(100000)}
                  &nbsp;·&nbsp;
                  {new Date(file.uploadDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                  {file.uploaderName && file.uploaderName !== 'Anonymous' && (
                    <> &nbsp;·&nbsp; {file.uploaderName}</>
                  )}
                </p>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => setPreviewFileId(file.fileId)}
                  title="Preview"
                  style={{
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '7px',
                    cursor: 'pointer',
                    color: 'var(--text-2)',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(116,198,157,0.15)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--green-bright)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)';
                  }}
                >
                  <Eye size={13} strokeWidth={2} />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => handleDownload(file)}
                  title="Download"
                  style={{
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(212,168,83,0.15)',
                    border: '1px solid rgba(212,168,83,0.25)',
                    borderRadius: '7px',
                    cursor: 'pointer',
                    color: 'var(--gold)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(212,168,83,0.28)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(212,168,83,0.15)';
                  }}
                >
                  <Download size={13} strokeWidth={2} />
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Preview modal ─────────────────────────────────── */}
      <AnimatePresence>
        {previewFileId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setPreviewFileId(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 60,
              padding: '20px',
            }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '900px',
                height: '82vh',
                background: 'rgba(10,26,15,0.95)',
                border: '1px solid rgba(116,198,157,0.2)',
                borderRadius: '16px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                backdropFilter: 'blur(20px)',
              }}
            >
              {/* Modal header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--text-3)',
                  }}
                >
                  Preview
                </span>
                <button
                  onClick={() => setPreviewFileId(null)}
                  style={{
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '7px',
                    cursor: 'pointer',
                    color: 'var(--text-2)',
                  }}
                >
                  <X size={13} strokeWidth={2.2} />
                </button>
              </div>
              <iframe
                src={`https://drive.google.com/file/d/${previewFileId}/preview`}
                style={{ flex: 1, border: 'none', width: '100%' }}
                allowFullScreen
                loading="lazy"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}