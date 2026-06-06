/**
 * Navbar component
 * Main navigation component for BioArchive
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload } from 'lucide-react';
import UploadModal from './UploadModal';

export default function Navbar() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const navVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <>
      <motion.nav
        initial="hidden"
        animate="visible"
        variants={navVariants}
        className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200/30"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div className="w-8 h-8 bg-[#1a4a2e] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <h1 className="text-xl font-bold text-[#1a4a2e]">BioArchive</h1>
            </motion.div>

            {/* Upload Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#d4a853] text-white font-medium rounded-full hover:bg-amber-600 transition-colors shadow-sm"
            >
              <Upload size={18} />
              <span className="hidden sm:inline">Upload</span>
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Upload Modal */}
      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />

      {/* Spacer to prevent content from hiding under fixed nav */}
      <div className="h-16" />
    </>
  );
}
