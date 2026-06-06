'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import SemesterBlock from '@/components/SemesterBlock';
import config from '@/config';
import { CURRICULUM } from '@/data/curriculum';

export default function Home() {
  const [expandedSemester, setExpandedSemester] = useState<number>(1); // Semester 1 open by default
  const [mounted, setMounted] = useState(false);

  // Trigger animations after mount to respect prefers-reduced-motion
  useEffect(() => {
    setMounted(true);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { 
        duration: 0.5,
        ease: [0.23, 1, 0.82, 1], // custom ease for smoother animation
      },
    },
  };

  const heroGradient = {
    background: 'linear-gradient(135deg, rgba(26, 74, 46, 0.03) 0%, rgba(212, 168, 83, 0.03) 100%)',
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      {/* Hero Section */}
      <motion.section
        style={heroGradient}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="border-b border-gray-200/40"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-[#2e8b57] mb-4">
              {config.SITE_NAME}
            </h1>
            {/* <p className="text-lg md:text-xl text-gray-700 mb-2">
              {config.SITE_TAGLINE}
            </p> */}
            {/* <p className="text-gray-500 mb-8">
            </p> */}
          </motion.div>

          {/* Quick Stats
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-8 text-sm md:text-base"
          >
            <div className="flex flex-col items-center">
              <span className="text-2xl md:text-3xl font-bold text-[#d4a853]">10</span>
              <span className="text-gray-600">Semesters</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl md:text-3xl font-bold text-[#d4a853]">
                {config.ALLOWED_FILE_TYPES.length}
              </span>
              <span className="text-gray-600">File Types</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl md:text-3xl font-bold text-[#d4a853]">∞</span>
              <span className="text-gray-600">Community</span>
            </div>
          </motion.div> */}
        </div>
      </motion.section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-[#2e8b57]">
            School of Biological Sciences
          </h2>
          <p className="text-gray-600 mt-2">
            Browse study materials by semester ⬇️.
          </p>
        </motion.div>

        {/* Semester Blocks */}
        {mounted && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            {config.NISER_SEMESTERS.map((semester) => (
              <motion.div key={semester} variants={itemVariants}>
                <SemesterBlock
                  semesterNumber={semester}
                  courses={CURRICULUM[semester.toString()] || []}
                  isExpanded={expandedSemester === semester}
                  onToggle={() =>
                    setExpandedSemester(expandedSemester === semester ? -1 : semester)
                  }
                />
              </motion.div>
            ))}

            {/* Advanced Courses Block */}
            <motion.div variants={itemVariants}>
              <SemesterBlock
                semesterNumber={-1}
                label="Advanced Courses"
                courses={CURRICULUM['ADVANCE COURSES'] || []}
                isExpanded={expandedSemester === -1}
                onToggle={() =>
                  setExpandedSemester(expandedSemester === -1 ? -2 : -1)
                }
              />
            </motion.div>
          </motion.div>
        )}

        {/* Info Section */}
        {/* <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="text-4xl mb-3">📚</div>
            <h3 className="text-lg font-bold text-[#1c1c1e] mb-2">Study Materials</h3>
            <p className="text-gray-600 text-sm">
              Access question papers, lecture notes, slides, lab manuals, and assignments from your peers.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="text-4xl mb-3">🤝</div>
            <h3 className="text-lg font-bold text-[#1c1c1e] mb-2">Community Driven</h3>
            <p className="text-gray-600 text-sm">
              Contribute your own materials and help fellow students. All contributors are credited.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-lg font-bold text-[#1c1c1e] mb-2">Easy Discovery</h3>
            <p className="text-gray-600 text-sm">
              Find resources by semester, course, or file type. Filter and search at your convenience.
            </p>
          </div>
        </motion.section> */}

        {/* CTA Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 bg-gradient-to-r from-[#1a4a2e] to-[#0f2f1e] rounded-xl p-8 text-white text-center"
        >
          <h3 className="text-2xl font-bold mb-3">Ready to share your materials?</h3>
          <p className="text-blue-100 mb-6">
            Upload your study materials using the Upload button above. Just a few clicks to help your Juniors!
          </p>
          <p className="text-sm text-blue-200">
            ✓ PDF • PPTX • DOCX • XLSX • ZIP • PNG • JPG • JPEG  formats supported (up to 100MB/file)
          </p>
        </motion.section>
      </div>
    </div>
  );
}
