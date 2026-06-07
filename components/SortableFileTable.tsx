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
  { key: 'fileName', label: 'File Name', width: '32%', sortable: true },
  { key: 'professor', label: 'Professor', width: '20%', sortable: true },
  { key: 'year', label: 'Year', width: '12%', sortable: true },
  { key: 'examType', label: 'Type', width: '15%', sortable: true },
  { key: 'downloadCount', label: 'Downloads', width: '10%', sortable: true },
  { key: 'actions', label: '', width: '11%', sortable: false }, // Actions column
];

export default function SortableFileTable({
  files,
//   fileType,
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

  const getYearFromFileName = (fileName: string) => {
    const match = fileName.match(/_(\d{4})_/);
    return match ? match[1] : '—';
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
                  onClick={() => col.sortable && onSort(col.key)}
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

                  {/* Year */}
                  <div>
                    <p
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-2)',
                        margin: 0,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {getYearFromFileName(file.fileName)}
                    </p>
                  </div>

                  {/* Exam Type */}
                  <div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: examTypeColors.text,
                        backgroundColor: examTypeColors.bg,
                        padding: '3px 6px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                        display: 'inline-block',
                      }}
                    >
                      {formatExamType(file.examType)}
                    </span>
                  </div>

                  {/* Downloads */}
                  <div style={{ textAlign: 'right' }}>
                    <p
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-3)',
                        margin: 0,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {file.downloadCount || 0}
                    </p>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setPreviewFileId(file.fileId)}
                      title="Preview"
                      style={{
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: 'var(--text-2)',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = `${accentColor}20`;
                        (e.currentTarget as HTMLButtonElement).style.color = accentColor;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)';
                      }}
                    >
                      <Eye size={12} strokeWidth={2} />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDownload(file)}
                      title="Download"
                      style={{
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: `${accentColor}20`,
                        border: `1px solid ${accentColor}40`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: accentColor,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = `${accentColor}35`;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = `${accentColor}20`;
                      }}
                    >
                      <Download size={12} strokeWidth={2} />
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
                  background: 'rgba(0,0,0,0.85)',
                  backdropFilter: 'blur(12px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
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
                    height: '85vh',
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

  // Mobile Card View
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {files.map((file, i) => {
          const examTypeColors = getExamTypeBadgeColor(file.examType);
          const year = getYearFromFileName(file.fileName);
          return (
            <motion.button
              key={file.fileId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedFileIndex(i)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--text)',
                      margin: '0 0 4px 0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {file.fileName.replace(/\.[^.]*$/, '')}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '3px',
                        background: examTypeColors.bg,
                        color: examTypeColors.text,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatExamType(file.examType)}
                    </span>
                    {year !== '—' && (
                      <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                        {year}
                      </span>
                    )}
                    {file.professor && file.professor !== 'Other' && (
                      <span style={{ fontSize: '10px', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.professor}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={18} color="var(--text-3)" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--text-3)' }}>
                <span>{file.downloadCount || 0} downloads</span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* ── Mobile File Detail Modal ────────────────────────────────────────── */}
      {mounted && selectedFileIndex !== null && typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedFileIndex(null)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                zIndex: 9998,
              }}
            >
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'fixed',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  maxHeight: '85vh',
                  background: 'rgba(10,26,15,0.98)',
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px 16px 0 0',
                  backdropFilter: 'blur(20px)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  zIndex: 9999,
                  boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--text-3)',
                    }}
                  >
                    File Details
                  </span>
                  <button
                    onClick={() => setSelectedFileIndex(null)}
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

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                  {selectedFileIndex !== null && (
                    <>
                      <div style={{ marginBottom: '20px' }}>
                        <p style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                          File Name
                        </p>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', margin: 0, wordBreak: 'break-word' }}>
                          {files[selectedFileIndex].fileName}
                        </p>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div>
                          <p style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                            Exam Type
                          </p>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: getExamTypeBadgeColor(files[selectedFileIndex].examType).bg,
                              color: getExamTypeBadgeColor(files[selectedFileIndex].examType).text,
                              display: 'inline-block',
                            }}
                          >
                            {formatExamType(files[selectedFileIndex].examType)}
                          </span>
                        </div>
                        <div>
                          <p style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                            Year
                          </p>
                          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', margin: 0 }}>
                            {getYearFromFileName(files[selectedFileIndex].fileName)}
                          </p>
                        </div>
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <p style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                          Professor
                        </p>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', margin: 0 }}>
                          {files[selectedFileIndex].professor || 'Not specified'}
                        </p>
                      </div>

                      <div>
                        <p style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                          Downloads
                        </p>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', margin: 0 }}>
                          {files[selectedFileIndex].downloadCount || 0}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Actions */}
                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    padding: '16px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    flexShrink: 0,
                  }}
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (selectedFileIndex !== null) {
                        setPreviewFileId(files[selectedFileIndex].fileId);
                      }
                    }}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      color: 'var(--text)',
                      fontSize: '13px',
                      fontWeight: 500,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                    }}
                  >
                    <Eye size={16} />
                    Preview
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (selectedFileIndex !== null) {
                        handleDownload(files[selectedFileIndex]);
                      }
                    }}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'var(--gold)',
                      color: '#0a1a0f',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      transition: 'filter 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)';
                    }}
                  >
                    <Download size={16} />
                    Download
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}

      {/* ── Preview Modal for Mobile ────────────────────────────────────────── */}
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