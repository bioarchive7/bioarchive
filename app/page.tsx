'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/sidebar';
import SemesterBlock from '@/components/SemesterBlock';
import UploadModal from '@/components/UploadModal';
import config from '@/config';
import { CURRICULUM } from '@/data/curriculum';

const fadeUp = {
  hidden:  { opacity: 0, y: 18 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Home() {
  const [mounted,          setMounted]         = useState(false);
  const [menuOpen,         setMenuOpen]        = useState(false);
  const [uploadOpen,       setUploadOpen]      = useState(false);
  const [activeSemester,   setActiveSemester]  = useState<number>(1);
  const [expandedSemester, setExpandedSemester]= useState<number>(1);
  const [activeCourse,     setActiveCourse]    = useState<string | null>(null);

  // Refs to semester section headings for scroll-into-view
  const semRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => { setMounted(true); }, []);

  // Scroll to semester section when selected from sidebar
  const handleSemesterSelect = (sem: number) => {
    setActiveSemester(sem);
    setExpandedSemester(sem);
    const el = semRefs.current[sem];
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  };

  // Scroll to course within semester
  const handleCourseSelect = (semNum: number, code: string) => {
    setActiveSemester(semNum);
    setExpandedSemester(semNum);
    setActiveCourse(code);
    const el = semRefs.current[semNum];
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  };

  return (
    <>
      {/* ── App shell ─────────────────────────────────────── */}
      <div className="app-layout">

        {/* ── Sidebar (fixed left on desktop, drawer on mobile) ── */}
        <Sidebar
          activeSemester={activeSemester}
          activeCourse={activeCourse}
          onSemesterSelect={handleSemesterSelect}
          onCourseSelect={handleCourseSelect}
          onUploadClick={() => setUploadOpen(true)}
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
        />

        {/* ── Main area ──────────────────────────────────────── */}
        <div className="main-content">

          {/* Top navbar (has hamburger on mobile) */}
          <Navbar
            onMenuToggle={() => setMenuOpen((v) => !v)}
            menuOpen={menuOpen}
          />

          {/* ── Hero ─────────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            style={{
              padding: 'clamp(32px, 4vw, 56px) 32px clamp(24px, 3vw, 40px) 24px',
              borderBottom: '1px solid var(--glass-border)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Decorative glow behind hero text */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '50%',
                left: '30%',
                transform: 'translate(-50%, -50%)',
                width: '500px',
                height: '300px',
                background: 'radial-gradient(ellipse, rgba(45,106,79,0.18) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            <motion.p
              custom={0} variants={fadeUp} initial="hidden" animate="visible"
              style={{
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--text-3)',
                marginBottom: '16px',
              }}
            >
              School of Biological Sciences · NISER
            </motion.p>

            <motion.h1
              custom={1} variants={fadeUp} initial="hidden" animate="visible"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 'clamp(36px, 6vw, 72px)',
                fontWeight: 700,
                lineHeight: 0.9,
                letterSpacing: '-0.02em',
                color: 'var(--text)',
                marginBottom: '20px',
              }}
            >
              BIO{' '}
              <em style={{ fontStyle: 'italic', color: 'var(--green-bright)' }}>
                Archive
              </em>
            </motion.h1>

            <motion.p
              custom={2} variants={fadeUp} initial="hidden" animate="visible"
              style={{
                fontSize: 'clamp(13px, 1.5vw, 15px)',
                color: 'var(--text-2)',
                lineHeight: 1.7,
                maxWidth: '480px',
                marginBottom: '32px',
              }}
            >
            </motion.p>

            {/* Stat pills
            <motion.div
              custom={3} variants={fadeUp} initial="hidden" animate="visible"
              style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}
            >
              {[
                { n: config.NISER_SEMESTERS.length, label: 'Semesters' },
                { n: Object.values(CURRICULUM).flat().length, label: 'Courses' },
                { n: config.ALLOWED_FILE_TYPES.length, label: 'File types' },
              ].map(({ n, label }) => (
                <div
                  key={label}
                  className="glass"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '24px',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '6px',
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
                  <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>{label}</span>
                </div>
              ))}
            </motion.div> */}
          </motion.section>

          {/* ── Semester blocks ──────────────────────────────── */}
          <div
            style={{
              padding: 'clamp(16px, 2vw, 32px) 32px clamp(16px, 3vw, 40px) 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0',
            }}
          >
            {mounted && (
              <>
                {config.NISER_SEMESTERS.map((sem, i) => (
                  <motion.div
                    key={sem}
                    ref={(el) => { semRefs.current[sem] = el; }}
                    custom={i}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                  >
                    <SemesterBlock
                      semesterNumber={sem}
                      courses={CURRICULUM[sem.toString()] || []}
                      isExpanded={expandedSemester === sem}
                      activeCourse={activeSemester === sem ? activeCourse : null}
                      onToggle={() =>
                        setExpandedSemester(expandedSemester === sem ? -99 : sem)
                      }
                      onCourseActivate={(code) => {
                        setActiveCourse(code);
                        setActiveSemester(sem);
                      }}
                    />
                  </motion.div>
                ))}

                {/* Advanced */}
                <motion.div
                  ref={(el) => { semRefs.current[-1] = el; }}
                  custom={config.NISER_SEMESTERS.length}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                >
                  <SemesterBlock
                    semesterNumber={-1}
                    label="Advanced Courses"
                    courses={CURRICULUM['ADVANCE COURSES'] || []}
                    isExpanded={expandedSemester === -1}
                    activeCourse={activeSemester === -1 ? activeCourse : null}
                    onToggle={() =>
                      setExpandedSemester(expandedSemester === -1 ? -99 : -1)
                    }
                    onCourseActivate={(code) => {
                      setActiveCourse(code);
                      setActiveSemester(-1);
                    }}
                  />
                </motion.div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Upload modal (triggered from sidebar or navbar) */}
      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
    </>
  );
}
