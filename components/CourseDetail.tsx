'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Download, Eye, ChevronUp, BookOpen } from 'lucide-react';
import { SheetRow } from '@/lib/sheets';
import { fetchFilesByCourse } from '@/lib/api-client';
import { CURRICULUM, Course } from '@/data/curriculum';
import SortableFileTable from '@/components/SortableFileTable';

interface CourseDetailProps {
  courseCode: string;
  semester: string;
}

type SortField = 'fileName' | 'professor' | 'examType' | 'year' | 'downloadCount';
type SortOrder = 'asc' | 'desc';

const FILE_TYPE_CONFIG = {
  qpaper: {
    label: 'Question Papers',
    icon: '📋',
    color: '#fca5a5',
    bg: 'rgba(239,68,68,0.08)',
    description: 'Past question papers organized by exam type and year',
  },
  notes: {
    label: 'Notes',
    icon: '📝',
    color: '#93c5fd',
    bg: 'rgba(59,130,246,0.08)',
    description: 'Lecture notes and study materials',
  },
  slides: {
    label: 'Slides',
    icon: '🎯',
    color: '#d8b4fe',
    bg: 'rgba(168,85,247,0.08)',
    description: 'Presentation slides from lectures',
  },
  lab: {
    label: 'Lab Manuals',
    icon: '🧪',
    color: '#86efac',
    bg: 'rgba(34,197,94,0.08)',
    description: 'Laboratory procedures and protocols',
  },
  assignment: {
    label: 'Assignments',
    icon: '✓',
    color: '#fdba74',
    bg: 'rgba(249,115,22,0.08)',
    description: 'Problem sets and assignment sheets',
  },
  other: {
    label: 'Other Resources',
    icon: '📚',
    color: 'var(--text-2)',
    bg: 'rgba(255,255,255,0.04)',
    description: 'Additional study materials',
  },
};

export default function CourseDetail({ courseCode, semester }: CourseDetailProps) {
  const router = useRouter();
  const [files, setFiles] = useState<SheetRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [courseInfo, setCourseInfo] = useState<Course | null>(null);
  const [expandedType, setExpandedType] = useState<string>('qpaper');
  const [sortState, setSortState] = useState<Record<string, { field: SortField; order: SortOrder }>>({
    qpaper: { field: 'year', order: 'desc' },
    notes: { field: 'year', order: 'desc' },
    slides: { field: 'year', order: 'desc' },
    lab: { field: 'year', order: 'desc' },
    assignment: { field: 'year', order: 'desc' },
    other: { field: 'year', order: 'desc' },
  });

  // Fetch course info and files
  useEffect(() => {
    const getCourseInfo = () => {
      for (const semKey in CURRICULUM) {
        const courses = CURRICULUM[semKey];
        const found = courses.find((c) => c.code === courseCode);
        if (found) {
          setCourseInfo(found);
          break;
        }
      }
    };

    const getFiles = async () => {
      setIsLoading(true);
      const result = await fetchFilesByCourse(courseCode, semester);
      setFiles(result);
      setIsLoading(false);
    };

    getCourseInfo();
    getFiles();
  }, [courseCode, semester]);

  // Group files by type
  const filesByType = Object.keys(FILE_TYPE_CONFIG).reduce(
    (acc, type) => {
      acc[type] = files.filter((f) => f.fileType === type);
      return acc;
    },
    {} as Record<string, SheetRow[]>
  );

  // FIX: Add files with unknown/custom types to 'other' category
  const predefinedTypes = Object.keys(FILE_TYPE_CONFIG);
  const unknownTypeFiles = files.filter((f) => !predefinedTypes.includes(f.fileType));
  if (unknownTypeFiles.length > 0) {
    filesByType['other'] = [...(filesByType['other'] || []), ...unknownTypeFiles];
  }

  // Get files for a type and sort them
  const getSortedFiles = (type: string, fileList: SheetRow[]) => {
    const state = sortState[type] || { field: 'year', order: 'desc' };
    const sorted = [...fileList].sort((a, b) => {
      let aVal: any = a[state.field as keyof SheetRow];
      let bVal: any = b[state.field as keyof SheetRow];

      if (state.field === 'year') {
        // FIX: Use actual year field from database instead of extracting from filename
        const aYear = parseInt(a.year) || 0;
        const bYear = parseInt(b.year) || 0;
        aVal = aYear;
        bVal = bYear;
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
        return state.order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number') {
        return state.order === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return sorted;
  };

  const handleSort = (type: string, field: SortField) => {
    setSortState((prev) => {
      const current = prev[type];
      const newOrder = current.field === field && current.order === 'asc' ? 'desc' : 'asc';
      return {
        ...prev,
        [type]: { field, order: newOrder },
      };
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* ── Header ────────────────────────────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'rgba(10,26,15,0.75)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '16px 32px',
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-2)',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '12px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-2)')}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div>
          <p style={{ fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
            {courseInfo?.description || 'Course'}
          </p>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '32px',
              fontWeight: 700,
              color: 'var(--text)',
              letterSpacing: '-0.01em',
              marginBottom: '8px',
            }}
          >
            {courseCode} — {courseInfo?.name}
          </h1>
          {courseInfo?.professors && courseInfo.professors.length > 0 && (
            <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '0' }}>
              {courseInfo.professors.filter((p) => p && p !== 'Other').join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      <div style={{ padding: '32px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 32px' }}>
            <div className="skeleton" style={{ height: '200px', marginBottom: '20px' }} />
            <div className="skeleton" style={{ height: '300px' }} />
          </div>
        ) : Object.values(filesByType).every((list) => list.length === 0) ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              textAlign: 'center',
              padding: '80px 32px',
              border: '1px dashed rgba(255,255,255,0.1)',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <BookOpen size={48} style={{ color: 'var(--text-3)', margin: '0 auto 16px', opacity: 0.5 }} />
            <p style={{ fontSize: '18px', color: 'var(--text)', marginBottom: '8px', fontWeight: 500 }}>
              No files uploaded yet
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '24px' }}>
              Be the first to contribute to this course!
            </p>
            <button
              onClick={() => router.back()}
              style={{
                padding: '8px 16px',
                background: 'var(--gold)',
                color: '#0a1a0f',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '13px',
              }}
            >
              Upload Now
            </button>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {Object.entries(filesByType).map(([type, typeFiles]) => {
              if (typeFiles.length === 0) return null;

              const config = FILE_TYPE_CONFIG[type as keyof typeof FILE_TYPE_CONFIG];
              const isExpanded = expandedType === type;
              const sorted = getSortedFiles(type, typeFiles);
              const state = sortState[type];

              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {/* ── Category Header ─────────────────────────────── */}
                  <button
                    onClick={() => setExpandedType(isExpanded ? '' : type)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      padding: '16px 20px',
                      background: config.bg,
                      border: `1px solid ${config.color}33`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = config.bg.replace('0.08', '0.12');
                      (e.currentTarget as HTMLButtonElement).style.borderColor = config.color + '55';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = config.bg;
                      (e.currentTarget as HTMLButtonElement).style.borderColor = config.color + '33';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, textAlign: 'left' }}>
                      <span style={{ fontSize: '24px' }}>{config.icon}</span>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', margin: '0 0 2px 0' }}>
                          {config.label}
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: 0 }}>
                          {typeFiles.length} file{typeFiles.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronUp size={18} color={config.color} />
                    </motion.div>
                  </button>

                  {/* ── Table ────────────────────────────────────────── */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ overflow: 'hidden', marginTop: '12px' }}
                      >
                        <SortableFileTable
                          files={sorted}
                          fileType={type}
                          sortField={state.field}
                          sortOrder={state.order}
                          onSort={(field) => handleSort(type, field)}
                          accentColor={config.color}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}