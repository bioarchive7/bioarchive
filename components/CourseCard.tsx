'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Course } from '@/data/curriculum';

interface CourseCardProps {
  course: Course;
  semester: number;
}

export default function CourseCard({ course, semester }: CourseCardProps) {
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);

  const initials = course.code
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 2)
    .toUpperCase();

  const handleClick = () => {
    router.push(`/course/${course.code.toLowerCase()}?semester=${semester}`);
  };

  return (
    <motion.button
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      style={{
        width: '100%',
        background: hovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: '14px',
        overflow: 'hidden',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
        boxShadow: hovered ? '0 4px 24px rgba(0,0,0,0.25)' : 'none',
        cursor: 'pointer',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        // overflow: 'visible',
      }}
    >
      {/* ── Card Content ────────────────────────────────────── */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
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
        <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
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
            animate={{ x: hovered ? 4 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ flexShrink: 0, color: hovered ? 'var(--green-bright)' : 'var(--text-3)', marginTop: '2px' }}
          >
            <ChevronRight size={16} strokeWidth={2} />
          </motion.div>
        </div>
      </div>

      {/* ── Bottom accent ────────────────────────────────────── */}
      {hovered && (
        <motion.div
          layoutId={`course-${course.code}`}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 2 }}
          exit={{ opacity: 0, height: 0 }}
          style={{
            background: 'linear-gradient(90deg, var(--green-bright), transparent)',
            height: '2px',
            marginTop: 'auto',
          }}
        />
      )}
    </motion.button>
  );
}