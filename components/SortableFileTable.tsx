'use client';

import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Eye, X, ArrowUp, ArrowDown, ChevronRight } from 'lucide-react';
import { SheetRow } from '@/lib/sheets';
import { incrementFileDownloads } from '@/lib/api-client';
import { formatFileSize } from '@/lib/utils';

type SortField = 'fileName' | 'professor' | 'examType' | 'year' | 'downloadCount';
type SortOrder = 'asc' | 'desc';

interface SortableFileTableProps {
  files: SheetRow[];
  fileType: string;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  accentColor: string;
}

const COLUMNS: { key: SortField | 'actions'; label: string; width: string; sortable: boolean }[] = [
  { key: 'fileName', label: 'File Name', width: '40%', sortable: true },
  { key: 'professor', label: 'Professor', width: '25%', sortable: true },
  { key: 'year', label: 'Year', width: '12%', sortable: true },
  { key: 'downloadCount', label: 'Downloads', width: '13%', sortable: true },
  { key: 'actions', label: '', width: '10%', sortable: false }, // Actions column
];

export default function SortableFileTable({
  files,
  sortField,
  sortOrder,
  onSort,
  accentColor,
}: SortableFileTableProps) {
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);

  // Hydration fix: only render portal after mount
  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDownload = (file: SheetRow) => {
    incrementFileDownloads(file.fileId).catch(() => {});
    if (file.webContentLink) window.open(file.webContentLink, '_blank');
  };

  const formatExamType = (examType: string) => {
    const typeMap: Record<string, string> = {
      midSem: 'Mid Sem',
      endSem: 'End Sem',
      quiz: 'Quiz',
      na: '—',
    };
    return typeMap[examType] || examType;
  };

  const getExamTypeBadgeColor = (examType: string) => {
    const colorMap: Record<string, { bg: string; text: string }> = {
      midSem: { bg: 'rgba(168,85,247,0.2)', text: '#d8b4fe' },
      endSem: { bg: 'rgba(239,68,68,0.2)', text: '#fca5a5' },
      quiz: { bg: 'rgba(59,130,246,0.2)', text: '#93c5fd' },
      na: { bg: 'rgba(255,255,255,0.06)', text: 'var(--text-3)' },
    };
    return colorMap[examType] || { bg: 'rgba(255,255,255,0.06)', text: 'var(--text-2)' };
  };

  // Desktop Table View
  if (!isMobile) {
    return (
      <>
        <div
          style={{
            borderRadius: '12px',
            border: `1px solid ${accentColor}33`,
            background: 'rgba(255,255,255,0.02)',
            overflow: 'hidden',
          }}
        >
          {/* ── Table Header ────────────────────────────────────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: COLUMNS.map((c) => c.width).join(' '),
              gap: '0',
              padding: '14px 16px',
              background: `${accentColor}14`,
              borderBottom: `1px solid ${accentColor}22`,
              position: 'sticky',
              top: 0,
              zIndex: 10,
              alignItems: 'center',
            }}
          >
            {COLUMNS.map((col) => {
              if (col.key === 'actions') {
                return <div key={col.key} style={{ textAlign: 'center' }} />;
              }
              return (
                <button
                  key={col.key}
                  onClick={() => col.sortable && col.key !== 'actions' && onSort(col.key as SortField)}
                  style={{
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    cursor: col.sortable ? 'pointer' : 'default',
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--text-3)',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (col.sortable) (e.currentTarget as HTMLButtonElement).style.color = accentColor;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)';
                  }}
                >
                  {col.label}
                  {col.sortable && (
                    <motion.div
                      initial={false}
                      animate={{
                        opacity: sortField === col.key ? 1 : 0.3,
                        rotate: sortField === col.key && sortOrder === 'desc' ? 180 : 0,
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <ArrowUp size={12} />
                    </motion.div>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Table Rows ────────────────────────────────────────── */}
          <div>
            {files.map((file, i) => {
              const examTypeColors = getExamTypeBadgeColor(file.examType);
              return (
                  <motion.div
                    key={file.fileId}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: COLUMNS.map((c) => c.width).join(' '),
                      gap: '0',
                      padding: '12px 16px',
                      alignItems: 'center',
                      borderBottom: `1px solid rgba(255,255,255,0.04)`,
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = `${accentColor}08`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background =
                        i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)';
                    }}
                  >
                  {/* File Name with Exam Type Badge */}
                  <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '3px',
                        background: examTypeColors.bg,
                        color: examTypeColors.text,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {formatExamType(file.examType)}
                    </span>
                    <p
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 500,
                        color: 'var(--text)',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                      }}
                      title={file.fileName}
                    >
                      {file.fileName.replace(/\.[^.]*$/, '')}
                    </p>
                  </div>

                  {/* Professor */}
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-2)',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={file.professor || '—'}
                    >
                      {file.professor || '—'}
                    </p>
                  </div>

                  {/* Year - FIX: Use file.year directly instead of extracting from filename */}
                  <div>
                    <p
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-2)',
                        margin: 0,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {file.year || '—'}
                    </p>
                  </div>

                  {/* Downloads */}
                  <div style={{ textAlign: 'center' }}>
                    <p
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-2)',
                        margin: 0,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {file.downloadCount || 0}
                    </p>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setPreviewFileId(file.fileId)}
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
                        color: 'var(--text-3)',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = `${accentColor}44`;
                        (e.currentTarget as HTMLButtonElement).style.color = accentColor;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)';
                      }}
                    >
                      <Eye size={14} strokeWidth={2} />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDownload(file)}
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
                        color: 'var(--text-3)',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = `${accentColor}44`;
                        (e.currentTarget as HTMLButtonElement).style.color = accentColor;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)';
                      }}
                    >
                      <Download size={14} strokeWidth={2} />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Preview Modal ────────────────────────────────────────── */}
        {mounted && previewFileId && typeof document !== 'undefined' &&
          createPortal(
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setPreviewFileId(null)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.9)',
                  backdropFilter: 'blur(12px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10000,
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
                    maxWidth: '1000px',
                    height: 'min(85vh, 600px)',
                    background: 'rgba(10,26,15,0.98)',
                    border: '1px solid rgba(116,198,157,0.25)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 20px',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      flexShrink: 0,
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
                      Document Preview
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
      </>
    );
  }

  // Mobile Table View
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {files.map((file, i) => {
          const examTypeColors = getExamTypeBadgeColor(file.examType);

          return (
            <motion.div
              key={file.fileId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedFileIndex(i)}
              style={{
                padding: '14px',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${accentColor}22`,
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = `${accentColor}14`;
                (e.currentTarget as HTMLDivElement).style.borderColor = `${accentColor}44`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
                (e.currentTarget as HTMLDivElement).style.borderColor = `${accentColor}22`;
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '3px',
                    background: examTypeColors.bg,
                    color: examTypeColors.text,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {formatExamType(file.examType)}
                </span>
                <p
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--text)',
                    margin: 0,
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={file.fileName}
                >
                  {file.fileName.replace(/\.[^.]*$/, '')}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                  {file.professor || '—'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                  {file.year || '—'} • {file.downloadCount || 0} downloads
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewFileId(file.fileId);
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px',
                    fontSize: '11px',
                    fontWeight: 500,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  <Eye size={12} />
                  Preview
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(file);
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: accentColor,
                    border: 'none',
                    borderRadius: '8px',
                    color: '#0a1a0f',
                    cursor: 'pointer',
                  }}
                >
                  <Download size={12} />
                  Get
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Mobile Preview Modal */}
      {mounted && previewFileId && typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setPreviewFileId(null)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.9)',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
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
                  maxWidth: '1000px',
                  height: 'min(85vh, 600px)',
                  background: 'rgba(10,26,15,0.98)',
                  border: '1px solid rgba(116,198,157,0.25)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    flexShrink: 0,
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
                    Document Preview
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
    </>
  );
}