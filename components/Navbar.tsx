'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X } from 'lucide-react';
import UploadModal from './UploadModal';

interface NavbarProps {
  onMenuToggle?: () => void;
  menuOpen?: boolean;
}

export default function Navbar({ onMenuToggle, menuOpen }: NavbarProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          height: 'var(--nav-h)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          background: 'rgba(10,26,15,0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--glass-border)',
        }}
      >
        {/* Left: hamburger (mobile) + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Hamburger — only visible on mobile via CSS */}
          <button
            className={`ham-btn ${menuOpen ? 'open' : ''}`}
            onClick={onMenuToggle}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            <span className="ham-line" />
            <span className="ham-line" />
            <span className="ham-line" />
          </button>

          {/* Wordmark */}
          <a
            href="/"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: '1px' }}
          >
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '22px',
                fontWeight: 700,
                fontStyle: 'italic',
                color: 'var(--green-bright)',
                letterSpacing: '-0.01em',
                lineHeight: 1,
              }}
            >
              Bio
            </span>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '22px',
                fontWeight: 600,
                color: 'var(--text)',
                letterSpacing: '-0.01em',
                lineHeight: 1,
              }}
            >
              Archive
            </span>
          </a>
        </div>

        {/* Right: NISER tag + upload */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 500,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--text-3)',
            }}
            className="niser-tag"
          >
            NISER · SBS
          </span>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setIsUploadOpen(true)}
            className="btn-gold"
            style={{ fontSize: '13px' }}
          >
            <Upload size={14} strokeWidth={2.2} />
            <span>Upload</span>
          </motion.button>
        </div>
      </motion.nav>

      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </>
  );
}