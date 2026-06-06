/**
 * UploadModal component
 * Multi-step modal for uploading new study materials
 */

'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, CheckCircle, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { CURRICULUM } from '@/data/curriculum';
import config from '@/config';
import { uploadFile, UploadResponse } from '@/lib/api-client';
import { FileType, formatFileSize } from '@/lib/utils';

interface UploadModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

type Step = 1 | 2 | 3;

const EXAM_TYPES = [
  { value: 'midSem', label: 'Mid Semester' },
  { value: 'endSem', label: 'End Semester' },
  { value: 'quiz', label: 'Quiz' },
];

export default function UploadModal({ isOpen = false, onClose }: UploadModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'duplicate' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [semester, setSemester] = useState<string>('');
  const [courseCode, setCourseCode] = useState<string>('');
  const [courseName, setCourseName] = useState<string>('');
  const [professor, setProfessor] = useState<string>('');
  const [fileType, setFileType] = useState<string>('');
  const [examType, setExamType] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploaderName, setUploaderName] = useState<string>('');
  const [consent, setConsent] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  // Derived data
  const courses = semester ? CURRICULUM[semester] || [] : [];
  const selectedCourse = courses.find((c) => c.code === courseCode);
  const professors = selectedCourse?.professors || [];

  const handleFileSelect = (file: File | null) => {
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!config.ALLOWED_FILE_TYPES.includes(ext)) {
        setUploadStatus('error');
        setUploadMessage(`File type .${ext} not allowed. Allowed: ${config.ALLOWED_FILE_TYPES.join(', ')}`);
        return;
      }
      if (file.size > config.MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
        setUploadStatus('error');
        setUploadMessage(`File exceeds ${config.MAX_UPLOAD_SIZE_MB}MB limit. Your file: ${formatFileSize(file.size)}`);
        return;
      }
      setUploadedFile(file);
      setUploadStatus('idle');
      setUploadMessage('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleSubmit = async () => {
    if (!semester || !courseCode || !fileType || !uploadedFile || !professor) {
      setUploadStatus('error');
      setUploadMessage('Please fill in all required fields');
      return;
    }
    if (fileType === 'qpaper' && !examType) {
      setUploadStatus('error');
      setUploadMessage('Please select the exam type for question papers');
      return;
    }

    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploadMessage('');

    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('semester', semester);
    formData.append('courseCode', courseCode);
    formData.append('courseName', courseName);
    formData.append('professor', professor);
    formData.append('examType', fileType === 'qpaper' ? examType : 'na');
    formData.append('fileType', fileType);
    if (year) formData.append('year', year);
    formData.append('uploaderName', uploaderName || 'Anonymous');
    formData.append('consent', consent ? 'true' : 'false');

    const response: UploadResponse = await uploadFile(formData, (percent) => {
      setUploadProgress(percent);
    });

    if (response.status === 'success') {
      setUploadStatus('success');
      setUploadMessage(response.message);
      setTimeout(() => { resetForm(); onClose?.(); }, 2500);
    } else if (response.status === 'duplicate') {
      setUploadStatus('duplicate');
      setUploadMessage(response.message);
      setTimeout(() => { resetForm(); onClose?.(); }, 2500);
    } else {
      setUploadStatus('error');
      setUploadMessage(response.message);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSemester('');
    setCourseCode('');
    setCourseName('');
    setProfessor('');
    setFileType('');
    setExamType('');
    setYear('');
    setUploadedFile(null);
    setUploaderName('');
    setConsent(false);
    setUploadProgress(0);
    setUploadStatus('idle');
    setUploadMessage('');
  };

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  // Step validation
  const canProceedStep1 = semester && courseCode && professor;
  const canProceedStep2 =
    fileType &&
    uploadedFile &&
    (fileType !== 'qpaper' || (!!examType && !!year));

  const modalVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const contentVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
    exit: { y: 20, opacity: 0 },
  };

  if (!isOpen) return null;

  return (
    <motion.div
      variants={modalVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <motion.div
        variants={contentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="bg-[#1a4a2e] text-white p-6 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold">Upload Study Material</h2>
            <p className="text-green-200 text-sm mt-0.5">
              Step {step} of 3 —{' '}
              {step === 1 ? 'Course Details' : step === 2 ? 'File Details' : 'Your Info'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="hover:bg-white/20 p-1 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-200">
          <motion.div
            animate={{ width: `${(step / 3) * 100}%` }}
            transition={{ duration: 0.3 }}
            className="h-full bg-[#d4a853]"
          />
        </div>

        {/* Content */}
        <div className="p-6">
          {uploadStatus === 'success' || uploadStatus === 'duplicate' || uploadStatus === 'error' ? (
            <motion.div className="text-center py-8">
              {uploadStatus === 'success' && (
                <>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex justify-center mb-4">
                    <CheckCircle size={48} className="text-green-600" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-[#1a4a2e] mb-2">Upload Successful!</h3>
                  <p className="text-gray-600">{uploadMessage}</p>
                </>
              )}
              {uploadStatus === 'duplicate' && (
                <>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex justify-center mb-4">
                    <AlertCircle size={48} className="text-amber-600" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-amber-600 mb-2">Duplicate Detected</h3>
                  <p className="text-gray-600">{uploadMessage}</p>
                </>
              )}
              {uploadStatus === 'error' && (
                <>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex justify-center mb-4">
                    <AlertCircle size={48} className="text-red-600" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-red-600 mb-2">Upload Failed</h3>
                  <p className="text-gray-600">{uploadMessage}</p>
                  <button
                    onClick={() => setUploadStatus('idle')}
                    className="mt-4 px-6 py-2 bg-[#d4a853] text-white rounded-full hover:bg-amber-600 transition-colors"
                  >
                    Try Again
                  </button>
                </>
              )}
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">

              {/* ── STEP 1 — Course Details ── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  variants={contentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-4"
                >
                  {/* Semester */}
                  <div>
                    <label className="block text-sm font-semibold text-[#1c1c1e] mb-2">
                      Semester <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={semester}
                      onChange={(e) => {
                        setSemester(e.target.value);
                        setCourseCode('');
                        setCourseName('');
                        setProfessor('');
                      }}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1a4a2e] focus:border-transparent outline-none"
                    >
                      <option value="">Select Semester</option>
                      {config.NISER_SEMESTERS.map((sem) => (
                        <option key={sem} value={sem}>Semester {sem}</option>
                      ))}
                      <option value="ADVANCE COURSES">Advanced Courses</option>
                    </select>
                  </div>

                  {/* Course */}
                  <div>
                    <label className="block text-sm font-semibold text-[#1c1c1e] mb-2">
                      Course <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={courseCode}
                      onChange={(e) => {
                        const selected = courses.find((c) => c.code === e.target.value);
                        setCourseCode(e.target.value);
                        setCourseName(selected?.name || '');
                        setProfessor(''); // reset professor when course changes
                      }}
                      disabled={!semester}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1a4a2e] focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Course</option>
                      {courses.map((course) => (
                        <option key={course.code} value={course.code}>
                          {course.code} — {course.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Professor */}
                  <div>
                    <label className="block text-sm font-semibold text-[#1c1c1e] mb-2">
                      Professor who taught this course <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={professor}
                      onChange={(e) => setProfessor(e.target.value)}
                      disabled={!courseCode}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1a4a2e] focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {courseCode ? 'Select Professor' : 'Select a course first'}
                      </option>
                      {professors.map((prof) => (
                        <option key={prof} value={prof}>{prof}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                    <button
                      onClick={handleClose}
                      className="flex-1 px-4 py-2 text-[#1c1c1e] border border-gray-300 rounded-full hover:bg-gray-50 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setStep(2)}
                      disabled={!canProceedStep1}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#d4a853] text-white rounded-full hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Next <ChevronRight size={18} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 2 — File Details ── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  variants={contentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-4"
                >
                  {/* File Type */}
                  <div>
                    <label className="block text-sm font-semibold text-[#1c1c1e] mb-2">
                      File Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={fileType}
                      onChange={(e) => {
                        setFileType(e.target.value);
                        setExamType(''); // reset exam type when file type changes
                      }}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1a4a2e] focus:border-transparent outline-none"
                    >
                      <option value="">Select File Type</option>
                      <option value="qpaper">Question Paper</option>
                      <option value="notes">Notes</option>
                      <option value="slides">Slides</option>
                      <option value="lab">Lab Manual</option>
                      <option value="assignment">Assignment</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Exam Type — only for question papers */}
                  {fileType === 'qpaper' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <label className="block text-sm font-semibold text-[#1c1c1e] mb-2">
                        Exam Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={examType}
                        onChange={(e) => setExamType(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1a4a2e] focus:border-transparent outline-none"
                      >
                        <option value="">Select Exam Type</option>
                        {EXAM_TYPES.map((et) => (
                          <option key={et.value} value={et.value}>{et.label}</option>
                        ))}
                      </select>
                    </motion.div>
                  )}

                  {/* Year — only for question papers */}
                  {fileType === 'qpaper' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      <label className="block text-sm font-semibold text-[#1c1c1e] mb-2">
                        Year <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        placeholder="e.g., 2023"
                        min="2000"
                        max={new Date().getFullYear()}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1a4a2e] focus:border-transparent outline-none"
                      />
                    </motion.div>
                  )}

                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-[#1c1c1e] mb-2">
                      File <span className="text-red-500">*</span>
                    </label>
                    <div
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#d4a853] rounded-lg p-8 text-center cursor-pointer hover:bg-amber-50 transition-colors"
                    >
                      <Upload size={32} className="mx-auto text-[#d4a853] mb-2" />
                      <p className="text-gray-700 font-medium">Drag and drop or click to select</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {config.ALLOWED_FILE_TYPES.map(t => `.${t}`).join(', ')} • Max {config.MAX_UPLOAD_SIZE_MB}MB
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </div>

                    {uploadedFile && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-medium text-green-900 text-sm">{uploadedFile.name}</p>
                          <p className="text-xs text-green-700">{formatFileSize(uploadedFile.size)}</p>
                        </div>
                        <button onClick={() => setUploadedFile(null)} className="text-green-600 hover:text-green-800">
                          <X size={18} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-[#1c1c1e] border border-gray-300 rounded-full hover:bg-gray-50 transition-colors font-medium"
                    >
                      <ChevronLeft size={18} /> Back
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      disabled={!canProceedStep2}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#d4a853] text-white rounded-full hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Next <ChevronRight size={18} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 3 — Uploader Info ── */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  variants={contentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-4"
                >
                  {/* Summary */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm space-y-1">
                    <p className="font-semibold text-[#1a4a2e] mb-2">Upload Summary</p>
                    <p><span className="text-gray-500">Course:</span> {courseCode} — {courseName}</p>
                    <p><span className="text-gray-500">Professor:</span> {professor}</p>
                    <p><span className="text-gray-500">Type:</span> {fileType}{examType ? ` (${EXAM_TYPES.find(e => e.value === examType)?.label})` : ''}{year ? ` • ${year}` : ''}</p>
                    <p><span className="text-gray-500">File:</span> {uploadedFile?.name}</p>
                  </div>

                  {/* Uploader Name */}
                  <div>
                    <label className="block text-sm font-semibold text-[#1c1c1e] mb-2">
                      Your Name <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={uploaderName}
                      onChange={(e) => setUploaderName(e.target.value)}
                      placeholder="Leave blank to remain anonymous"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1a4a2e] focus:border-transparent outline-none"
                    />
                  </div>

                  {/* Consent */}
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <input
                      type="checkbox"
                      id="consent"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-1 w-4 h-4 accent-[#1a4a2e]"
                    />
                    <label htmlFor="consent" className="text-sm text-blue-900 cursor-pointer">
                      I consent to having my name displayed with this upload
                    </label>
                  </div>

                  {/* Upload Progress */}
                  {uploadStatus === 'uploading' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Uploading...</span>
                        <span className="text-[#d4a853] font-medium">{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          className="h-full bg-[#d4a853]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setStep(2)}
                      disabled={uploadStatus === 'uploading'}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-[#1c1c1e] border border-gray-300 rounded-full hover:bg-gray-50 disabled:bg-gray-100 transition-colors font-medium"
                    >
                      <ChevronLeft size={18} /> Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={uploadStatus === 'uploading'}
                      className="flex-1 px-4 py-2 bg-[#1a4a2e] text-white rounded-full hover:bg-[#0f2f1e] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {uploadStatus === 'uploading' ? 'Uploading...' : 'Submit'}
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}