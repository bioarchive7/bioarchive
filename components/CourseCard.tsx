'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Course } from '@/data/curriculum';
import FileList from './FileList';

interface CourseCardProps {
  course: Course;
  semester: number;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export default function CourseCard({
  course,
  semester,
  isExpanded = false,
  onToggle,
}: CourseCardProps) {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered]   = useState(false);

  const initials = course.code
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered || isExpanded
          ? 'rgba(255,255,255,0.07)'
          : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isExpanded ? 'rgba(116,198,157,0.3)' : hovered ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: '14px',
        overflow: 'hidden',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
        boxShadow: isExpanded
          ? '0 0 0 1px rgba(116,198,157,0.15), 0 8px 32px rgba(0,0,0,0.3)'
          : hovered
            ? '0 4px 24px rgba(0,0,0,0.25)'
            : 'none',
      }}
    >
      {/* ── Card header ──────────────────────────────────── */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '14px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          color: 'var(--text)',
        }}
      >
        {/* Icon block */}
        <div
          style={{
            flexShrink: 0,
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(45,106,79,0.6), rgba(10,26,15,0.8))',
            border: '1px solid rgba(116,198,157,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {course.image && !imgError ? (
            <img
              src={`/${course.image}`}
              alt={course.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setImgError(true)}
            />
          ) : (
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--green-bright)',
                letterSpacing: '-0.01em',
              }}
            >
              {initials}
            </span>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--gold)',
                  marginBottom: '3px',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                {course.code}
              </p>
              <h3
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '13.5px',
                  fontWeight: 500,
                  color: 'var(--text)',
                  lineHeight: 1.3,
                  marginBottom: '4px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                } as React.CSSProperties}
              >
                {course.name}
              </h3>
              {course.description && (
                <p
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-3)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {course.description}
                </p>
              )}
            </div>

            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              style={{ flexShrink: 0, color: isExpanded ? 'var(--green-bright)' : 'var(--text-3)', marginTop: '2px' }}
            >
              <ChevronDown size={15} strokeWidth={2} />
            </motion.div>
          </div>
        </div>
      </button>

      {/* ── File list ─────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="files"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '0 16px 16px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                paddingTop: '12px',
              }}
            >
              <FileList courseCode={course.code} semester={semester.toString()} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}