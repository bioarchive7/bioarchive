'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
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

  const initials = course.code
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.div
      layout
      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
    >
      <motion.button
        onClick={onToggle}
        className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex gap-4">

          {/* Course Image / Fallback Initials */}
          <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-[#1a4a2e] to-[#0f2f1e] flex items-center justify-center text-white font-bold text-lg">
            {course.image && !imgError ? (
              <>
              {console.log('IMG SRC:', `/${course.image}`)}
              <img
                src={`/${course.image}`}
                alt={course.name}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            </>
            ) : (
              <span>{initials}</span>
            )}
          </div>

          {/* Course Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-[#1c1c1e] text-sm">{course.code}</h3>
                <p className="text-gray-700 font-medium leading-tight line-clamp-2">
                  {course.name}
                </p>
              </div>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown size={18} className="text-[#d4a853] flex-shrink-0" />
              </motion.div>
            </div>
            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
              {course.description}
            </p>
          </div>
        </div>
      </motion.button>

      {/* File List (Expandable) */}
      <motion.div
        initial={false}
        animate={{
          height: isExpanded ? 'auto' : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden border-t border-gray-200"
      >
        <div className="p-4 bg-gray-50">
          <FileList courseCode={course.code} semester={semester.toString()} />
        </div>
      </motion.div>
    </motion.div>
  );
}