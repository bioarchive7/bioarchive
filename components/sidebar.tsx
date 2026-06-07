'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Upload, BookOpen, Layers, Search } from 'lucide-react';
import { CURRICULUM, Course } from '@/data/curriculum';
import config from '@/config';

interface SidebarProps {
  activeSemester: number;
  activeCourse: string | null;
  onSemesterSelect: (sem: number) => void;
  onCourseSelect: (semesterNum: number, courseCode: string) => void;
  onUploadClick: () => void;
  isOpen: boolean;          // mobile open state
  onClose: () => void;
}

const SEMESTERS = config.NISER_SEMESTERS;

export default function Sidebar({
  activeSemester,
  activeCourse,
  onSemesterSelect,
  onCourseSelect,
  onUploadClick,
  isOpen,
  onClose,
}: SidebarProps) {
  const [expandedSem, setExpandedSem] = useState<number>(activeSemester);
  const [search, setSearch] = useState('');
  const courseListRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Sync expanded with active
  useEffect(() => {
    setExpandedSem(activeSemester);
  }, [activeSemester]);

  // Animate course list height
  useEffect(() => {
    SEMESTERS.forEach((s) => {
      const el = courseListRefs.current[s];
      if (!el) return;
      const courses = CURRICULUM[s.toString()] || [];
      const rowH = 38;
      if (s === expandedSem) {
        el.style.maxHeight = `${courses.length * rowH + 8}px`;
        el.style.opacity = '1';
      } else {
        el.style.maxHeight = '0px';
        el.style.opacity = '0';
      }
    });
    // Advanced
    const advEl = courseListRefs.current[-1];
    if (advEl) {
      const courses = CURRICULUM['ADVANCE COURSES'] || [];
      const rowH = 38;
      if (expandedSem === -1) {
        advEl.style.maxHeight = `${courses.length * rowH + 8}px`;
        advEl.style.opacity = '1';
      } else {
        advEl.style.maxHeight = '0px';
        advEl.style.opacity = '0';
      }
    }
  }, [expandedSem]);

  const handleSemToggle = (sem: number) => {
    const next = expandedSem === sem ? -99 : sem;
    setExpandedSem(next);
    onSemesterSelect(sem);
  };

  const handleCourseClick = (semNum: number, code: string) => {
    onCourseSelect(semNum, code);
    onClose(); // close mobile sidebar on selection
  };

  // Search filter
  const filteredSems = search.trim()
    ? SEMESTERS.filter((s) => {
        const courses = CURRICULUM[s.toString()] || [];
        return courses.some(
          (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.code.toLowerCase().includes(search.toLowerCase())
        );
      })
    : SEMESTERS;

  const totalFiles = 0; // placeholder

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>

        {/* ── Brand block ─────────────────────────────────────── */}
        <div
          style={{
            padding: '20px 20px 16px',
            borderBottom: '1px solid var(--glass-border)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', marginBottom: '4px' }}>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '26px',
                fontWeight: 700,
                fontStyle: 'italic',
                color: 'var(--green-bright)',
                lineHeight: 1,
              }}
            >
              Bio
            </span>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '26px',
                fontWeight: 600,
                color: 'var(--text)',
                lineHeight: 1,
              }}
            >
              Archive
            </span>
          </div>
          <p
            style={{
              fontSize: '10px',
              fontWeight: 500,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--text-3)',
            }}
          >
            NISER · Biological Sciences
          </p>
        </div>

        {/* ── Quick stats ─────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1px',
            background: 'var(--glass-border)',
            borderBottom: '1px solid var(--glass-border)',
            flexShrink: 0,
          }}
        >
          {[
            { n: SEMESTERS.length, label: 'Semesters' },
            { n: Object.values(CURRICULUM).flat().length, label: 'Courses' },
          ].map(({ n, label }) => (
            <div
              key={label}
              style={{
                background: 'rgba(10,26,15,0.6)',
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <span
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'var(--green-bright)',
                  lineHeight: 1,
                }}
              >
                {n}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  color: 'var(--text-3)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Search ──────────────────────────────────────────── */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--glass-border)', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-3)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses..."
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                padding: '7px 10px 7px 30px',
                fontSize: '12px',
                color: 'var(--text)',
                outline: 'none',
                fontFamily: "'Outfit', sans-serif",
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(116,198,157,0.4)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--glass-border)')}
            />
          </div>
        </div>

        {/* ── Semester list (scrollable) ───────────────────────── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {/* Regular semesters */}
          {filteredSems.map((sem) => {
            const courses = CURRICULUM[sem.toString()] || [];
            const isExpanded = expandedSem === sem;
            const isActive = activeSemester === sem;

            return (
              <div className="sem-item" key={sem}>
                <button
                  className={`sem-trigger ${isActive ? 'active' : ''}`}
                  onClick={() => handleSemToggle(sem)}
                >
                  <div className="sem-trigger-left">
                    <span className={`sem-badge ${isActive ? 'active' : ''}`}>
                      S{sem < 10 ? `0${sem}` : sem}
                    </span>
                    <span className="sem-label">Semester {sem}</span>
                  </div>
                  <span className="sem-count">{courses.length}</span>
                  <ChevronDown
                    size={14}
                    className={`sem-chevron ${isExpanded ? 'open' : ''}`}
                  />
                </button>

                <div
                  className={`course-list ${isExpanded ? 'open' : ''}`}
                  ref={(el) => { courseListRefs.current[sem] = el; }}
                >
                  {courses.map((course) => (
                    <div
                      key={course.code}
                      className={`course-item ${activeCourse === course.code && activeSemester === sem ? 'active' : ''}`}
                      onClick={() => handleCourseClick(sem, course.code)}
                    >
                      <span className="course-dot" />
                      <span className="course-item-code">{course.code}</span>
                      <span className="course-item-name">{course.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Advanced courses */}
          {(() => {
            const advCourses = CURRICULUM['ADVANCE COURSES'] || [];
            const isExpanded = expandedSem === -1;
            const isActive = activeSemester === -1;
            if (search && !advCourses.some(
              (c) =>
                c.name.toLowerCase().includes(search.toLowerCase()) ||
                c.code.toLowerCase().includes(search.toLowerCase())
            )) return null;
            return (
              <div className="sem-item">
                <button
                  className={`sem-trigger ${isActive ? 'active' : ''}`}
                  onClick={() => handleSemToggle(-1)}
                >
                  <div className="sem-trigger-left">
                    <span className={`sem-badge ${isActive ? 'active' : ''}`}>ADV</span>
                    <span className="sem-label">Advanced</span>
                  </div>
                  <span className="sem-count">{advCourses.length}</span>
                  <ChevronDown
                    size={14}
                    className={`sem-chevron ${isExpanded ? 'open' : ''}`}
                  />
                </button>
                <div
                  className={`course-list ${isExpanded ? 'open' : ''}`}
                  ref={(el) => { courseListRefs.current[-1] = el; }}
                >
                  {advCourses.map((course) => (
                    <div
                      key={course.code}
                      className={`course-item ${activeCourse === course.code && activeSemester === -1 ? 'active' : ''}`}
                      onClick={() => handleCourseClick(-1, course.code)}
                    >
                      <span className="course-dot" />
                      <span className="course-item-code">{course.code}</span>
                      <span className="course-item-name">{course.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ── Bottom: Upload CTA ───────────────────────────────── */}
        <div
          style={{
            padding: '14px 16px',
            borderTop: '1px solid var(--glass-border)',
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => { onUploadClick(); onClose(); }}
            className="btn-gold"
            style={{ width: '100%', justifyContent: 'center', fontSize: '13px', borderRadius: '10px' }}
          >
            <Upload size={14} strokeWidth={2.2} />
            Upload Study Material
          </button>
          <p
            style={{
              textAlign: 'center',
              fontSize: '10px',
              color: 'var(--text-3)',
              marginTop: '8px',
              lineHeight: 1.5,
            }}
          >
            PDF · PPTX · DOCX · XLSX · ZIP · PNG
          </p>
        </div>
      </aside>
    </>
  );
}