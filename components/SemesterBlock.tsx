'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Course } from '@/data/curriculum';
import CourseCard from './CourseCard';
import { fetchFilesByCourse } from '@/lib/api-client';

interface SemesterBlockProps {
  semesterNumber: number;
  label?: string;
  courses: Course[];
  isExpanded?: boolean;
  activeCourse?: string | null;
  onToggle?: () => void;
  onCourseActivate?: (code: string) => void;
}

export default function SemesterBlock({
  semesterNumber,
  label,
  courses,
  isExpanded = false,
  activeCourse,
  onToggle,
  onCourseActivate,
}: SemesterBlockProps) {
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [fileCount, setFileCount]           = useState(0);

  // If sidebar selects a course, expand it
  useEffect(() => {
    if (activeCourse && courses.find((c) => c.code === activeCourse)) {
      setExpandedCourse(activeCourse);
    }
  }, [activeCourse, courses]);

  // File count fetch
  useEffect(() => {
    if (!isExpanded) return;
    let cancelled = false;
    (async () => {
      let total = 0;
      for (const course of courses) {
        try {
          const files = await fetchFilesByCourse(semesterNumber.toString(), course.code);
          total += files.length;
        } catch { /* silent */ }
      }
      if (!cancelled) setFileCount(total);
    })();
    return () => { cancelled = true; };
  }, [isExpanded, courses, semesterNumber]);

  const shortLabel = label
    ? 'ADV'
    : `S${semesterNumber < 10 ? `0${semesterNumber}` : semesterNumber}`;

  return (
    <div
      style={{
        borderBottom: '1px solid var(--glass-border)',
      }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 0',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          gap: '14px',
          color: 'var(--text)',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          {/* Badge */}
          <span
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '3px 8px',
              borderRadius: '20px',
              background: isExpanded ? 'rgba(45,106,79,0.5)' : 'rgba(45,106,79,0.2)',
              color: 'var(--green-bright)',
              border: `1px solid ${isExpanded ? 'rgba(116,198,157,0.4)' : 'rgba(116,198,157,0.15)'}`,
              flexShrink: 0,
              transition: 'background 0.2s, border-color 0.2s',
            }}
          >
            {shortLabel}
          </span>

          {/* Title */}
          <span
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'clamp(16px, 2.5vw, 22px)',
              fontWeight: 600,
              color: isExpanded ? 'var(--green-bright)' : 'var(--text)',
              letterSpacing: '-0.01em',
              transition: 'color 0.2s',
            }}
          >
            {label || `Semester ${semesterNumber}`}
          </span>

          {/* Meta */}
          <span
            style={{
              fontSize: '12px',
              color: 'var(--text-3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {courses.length} course{courses.length !== 1 ? 's' : ''}
            {fileCount > 0 && (
              <>
                <span style={{ color: 'var(--glass-border)' }}>·</span>
                <span style={{ color: 'var(--gold)', fontWeight: 500 }}>
                  {fileCount} file{fileCount !== 1 ? 's' : ''}
                </span>
              </>
            )}
          </span>
        </div>

        {/* Chevron */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          style={{ flexShrink: 0, color: 'var(--text-3)' }}
        >
          <ChevronDown size={18} />
        </motion.div>
      </button>

      {/* ── Courses grid ───────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                paddingBottom: '24px',
                paddingTop: '4px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '12px',
              }}
            >
              {courses.map((course, i) => (
                <motion.div
                  key={course.code}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <CourseCard
                    course={course}
                    semester={semesterNumber}
                    isExpanded={expandedCourse === course.code}
                    onToggle={() => {
                      const next = expandedCourse === course.code ? null : course.code;
                      setExpandedCourse(next);
                      if (next) onCourseActivate?.(next);
                    }}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}