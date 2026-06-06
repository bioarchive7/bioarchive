/**
 * SemesterBlock component
 * Displays courses for a single semester with expand/collapse
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Course } from '@/data/curriculum';
import CourseCard from './CourseCard';
import { fetchFilesByCourse } from '@/lib/api-client';

interface SemesterBlockProps {
  semesterNumber: number;
  label?: string;           // optional custom label
  courses: Course[];
  isExpanded?: boolean;
  onToggle?: () => void;
}

export default function SemesterBlock({
  semesterNumber,
  label,
  courses,
  isExpanded = false,
  onToggle,
}: SemesterBlockProps) {
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [fileCount, setFileCount] = useState(0);
  const [isLoadingCount, setIsLoadingCount] = useState(false);

  // Fetch file counts for this semester
  useEffect(() => {
    const fetchCounts = async () => {
      setIsLoadingCount(true);
      try {
        let totalCount = 0;
        for (const course of courses) {
          const files = await fetchFilesByCourse(semesterNumber.toString(), course.code);
          totalCount += files.length;
        }
        setFileCount(totalCount);
      } catch (error) {
        console.error('Error fetching file counts:', error);
      } finally {
        setIsLoadingCount(false);
      }
    };

    if (isExpanded) {
      fetchCounts();
    }
  }, [isExpanded, courses, semesterNumber]);

  return (
    <motion.div
      layout
      className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <motion.button
        onClick={onToggle}
        className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4 flex-1">
          <h2 className="text-xl font-bold text-[#1a4a2e]">
            {label || `Semester ${semesterNumber}`}
          </h2>
          <div className="text-sm text-gray-600">
            {courses.length} course{courses.length !== 1 ? 's' : ''}
            {!isLoadingCount && fileCount > 0 && ` • ${fileCount} file${fileCount !== 1 ? 's' : ''}`}
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown size={24} className="text-[#d4a853]" />
        </motion.div>
      </motion.button>

      {/* Courses Grid */}
      <motion.div
        initial={false}
        animate={{
          height: isExpanded ? 'auto' : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="p-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <motion.div
                key={course.code}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <CourseCard
                  course={course}
                  semester={semesterNumber}
                  isExpanded={expandedCourse === course.code}
                  onToggle={() =>
                    setExpandedCourse(expandedCourse === course.code ? null : course.code)
                  }
                />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
