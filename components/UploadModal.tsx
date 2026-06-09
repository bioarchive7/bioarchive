'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, CheckCircle, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { CURRICULUM } from '@/data/curriculum';
import config from '@/config';
import { FileType, formatFileSize } from '@/lib/utils';
import { uploadFileDirectToDrive } from '@/lib/direct-upload-client';
import { generateRenamedFilename } from '@/lib/file-renaming';

interface UploadModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

type Step = 1 | 2 | 3;

const EXAM_TYPES = [
  { value: 'midSem',  label: 'Mid Semester' },
  { value: 'endSem',  label: 'End Semester' },
  { value: 'quiz',    label: 'Quiz' },
];

const FILE_TYPE_OPTIONS = [
  { value: 'qpaper', label: 'Question Paper' },
  { value: 'notes', label: 'Notes' },
  { value: 'slides', label: 'Slides' },
  { value: 'lab', label: 'Lab Manual' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'other', label: 'Other' },
];

const MULTI_FILE_TYPES = ['qpaper', 'notes', 'slides', 'lab', 'assignment'];

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  padding: '10px 14px',
  fontSize: '13px',
  color: 'var(--text)',
  outline: 'none',
  fontFamily: "'Outfit', sans-serif",
  transition: 'border-color 0.2s',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--text-3)',
  marginBottom: '6px',
  fontFamily: "'Outfit', sans-serif",
};

export default function UploadModal({ isOpen = false, onClose }: UploadModalProps) {
  const [step,           setStep]          = useState<Step>(1);
  const [uploadProgress, setUploadProgress]= useState(0);
  const [uploadStatus,   setUploadStatus]  = useState<'idle'|'uploading'|'success'|'duplicate'|'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [semester,     setSemester]    = useState('');
  const [courseCode,   setCourseCode]  = useState('');
  const [courseName,   setCourseName]  = useState('');
  const [professor,    setProfessor]   = useState('');
  const [professor2,   setProfessor2]  = useState('');
  const [professor3,   setProfessor3]  = useState('');
  const [otherProfessor, setOtherProfessor] = useState('');
  const [fileType,     setFileType]    = useState('');
  const [otherFileType, setOtherFileType] = useState('');
  const [examType,     setExamType]    = useState('');
  const [otherExamType, setOtherExamType] = useState('');
  const [year,         setYear]        = useState('');
  const [uploadedFiles, setUploadedFiles]= useState<File[]>([]);
  const [uploaderName, setUploaderName]= useState('');
  const [consent,      setConsent]     = useState(false);
  const [remarks,      setRemarks]     = useState('');
  const [uploadMessage,setUploadMessage]=useState('');

  const courses         = semester ? CURRICULUM[semester] || [] : [];
  const selectedCourse  = courses.find((c) => c.code === courseCode);
  const professors      = selectedCourse?.professors || [];
  const isMultiFileType = !!(fileType && MULTI_FILE_TYPES.includes(fileType));
  const showOtherFileTypeField = fileType === 'other';
  const showOtherProfessorField = professor === 'Other' || professor2 === 'Other' || professor3 === 'Other';
  const showOtherExamTypeField = examType === 'other';

  const handleFileSelect = (newFiles: FileList | null) => {
    if (!newFiles) return;
    
    const filesToAdd: File[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      
      if (!config.ALLOWED_FILE_TYPES.includes(ext)) {
        setUploadStatus('error');
        setUploadMessage(`File type .${ext} not allowed. Allowed: ${config.ALLOWED_FILE_TYPES.join(', ')}`);
        return;
      }
      if (file.size > config.MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
        setUploadStatus('error');
        setUploadMessage(`File exceeds ${config.MAX_UPLOAD_SIZE_MB}MB. Your file: ${formatFileSize(file.size)}`);
        return;
      }
      filesToAdd.push(file);
    }
    
    if (isMultiFileType) {
      setUploadedFiles([...uploadedFiles, ...filesToAdd]);
    } else {
      setUploadedFiles(filesToAdd.slice(0, 1));
    }
    
    setUploadStatus('idle');
    setUploadMessage('');
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!semester || !courseCode || !fileType || uploadedFiles.length === 0 || !professor) {
      setUploadStatus('error');
      setUploadMessage('Please fill in all required fields and upload at least one file');
      return;
    }

    if (!year) {
      setUploadStatus('error');
      setUploadMessage('Please enter the year');
      return;
    }

    if (fileType === 'other' && !otherFileType.trim()) {
      setUploadStatus('error');
      setUploadMessage('Please specify what "other" file type means');
      return;
    }

    if ((professor === 'Other' || professor2 === 'Other' || professor3 === 'Other') && !otherProfessor.trim()) {
      setUploadStatus('error');
      setUploadMessage('Please specify who "other" professor is');
      return;
    }

    if (fileType === 'qpaper') {
      if (!examType) {
        setUploadStatus('error');
        setUploadMessage('Please select the exam type for question papers');
        return;
      }
      if (examType === 'other' && !otherExamType.trim()) {
        setUploadStatus('error');
        setUploadMessage('Please specify what "other" exam type means');
        return;
      }
    }

    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploadMessage('');

    try {
      let successCount = 0;
      let duplicateCount = 0;
      let errorOccurred = false;

      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const fileProgress = (i / uploadedFiles.length) * 100;
        setUploadProgress(Math.round(fileProgress));

        // Generate renamed filename
        const renamedFileName = generateRenamedFilename(file.name, {
          courseCode,
          courseName,
          fileType: fileType === 'other' ? otherFileType : fileType,
          year,
          examType: fileType === 'qpaper' ? (examType === 'other' ? otherExamType : examType) : undefined,
        });

        // FIX: Build remarks string that includes custom file type if 'other' is selected
        let finalRemarks = remarks;
        if (fileType === 'other' && otherFileType) {
          finalRemarks = remarks 
            ? `[File Type: ${otherFileType}] ${remarks}`
            : `[File Type: ${otherFileType}]`;
        }

        const result = await uploadFileDirectToDrive(
          file,
          {
            fileName: renamedFileName,
            semester,
            courseCode,
            courseName,
            professor: professor === 'Other' ? otherProfessor : professor,
            professor2: professor2 ? (professor2 === 'Other' ? otherProfessor : professor2) : undefined,
            professor3: professor3 ? (professor3 === 'Other' ? otherProfessor : professor3) : undefined,
            examType: fileType === 'qpaper' ? (examType === 'other' ? otherExamType : examType) : 'na',
            // FIX: Always store fileType as 'other' when user selects 'other', don't replace with custom type
            fileType: fileType,
            year,
            uploaderName: uploaderName || 'Anonymous',
            remarks: finalRemarks || undefined,
          },
          (progress) => {
            const totalProgress = fileProgress + (progress / uploadedFiles.length);
            setUploadProgress(Math.round(totalProgress));
          }
        );

        if (result.status === 'success') {
          successCount++;
        } else if (result.status === 'duplicate') {
          duplicateCount++;
          setUploadStatus('duplicate');
          setUploadMessage(result.message);
          errorOccurred = true;
          break;
        } else {
          setUploadStatus('error');
          setUploadMessage(result.message);
          errorOccurred = true;
          break;
        }
      }

      // Automatically unmount/close modal box panel window after a 2.5s display delay on successful/duplicate submissions
      if (!errorOccurred) {
        setUploadProgress(100);
        setUploadStatus('success');
        setUploadMessage(
          `${successCount} file${successCount !== 1 ? 's' : ''} uploaded successfully!`
        );
        setTimeout(() => { handleClose(); }, 2500);
      } else if (uploadStatus === 'duplicate' || duplicateCount > 0) {
        setTimeout(() => { handleClose(); }, 3500);
      }
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage(
        `Upload failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const resetForm = () => {
    setStep(1); 
    setSemester(''); 
    setCourseCode(''); 
    setCourseName('');
    setProfessor('');
    setProfessor2('');
    setProfessor3('');
    setOtherProfessor('');
    setFileType('');
    setOtherFileType('');
    setExamType('');
    setOtherExamType('');
    setYear('');
    setUploadedFiles([]);
    setUploaderName('');
    setConsent(false);
    setRemarks('');
    setUploadStatus('idle');
    setUploadMessage('');
  };

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5000,
        padding: '20px',
      }}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          background: 'rgba(10, 26, 15, 0.95)',
          border: '1px solid rgba(116, 198, 157, 0.25)',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text)',
              margin: 0,
            }}
          >
            Upload Course Material
          </h2>
          <button
            onClick={handleClose}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--text)',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                {/* Semester */}
                <div>
                  <label style={labelStyle}>Semester</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    style={{...inputStyle, cursor: 'pointer'}}
                  >
                    <option value="">Select semester</option>
                    {config.NISER_SEMESTERS.map((sem) => (
                      <option key={sem} value={sem}>
                        Semester {sem}
                      </option>
                    ))}
                    <option value="ADVANCE COURSES">Advanced Courses</option>
                  </select>
                </div>

                {/* Course */}
                <div>
                  <label style={labelStyle}>Course</label>
                  <select
                    value={courseCode}
                    onChange={(e) => {
                      const course = courses.find((c) => c.code === e.target.value);
                      setCourseCode(e.target.value);
                      setCourseName(course?.name || '');
                    }}
                    style={{...inputStyle, cursor: 'pointer'}}
                    disabled={!semester}
                  >
                    <option value="">Select course</option>
                    {courses.map((course) => (
                      <option key={course.code} value={course.code}>
                        {course.code} — {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* File Type */}
                <div>
                  <label style={labelStyle}>File Type</label>
                  <select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value)}
                    style={{...inputStyle, cursor: 'pointer'}}
                    disabled={!courseCode}
                  >
                    <option value="">Select file type</option>
                    {FILE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom File Type (for "other") */}
                {showOtherFileTypeField && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label style={labelStyle}>What type of file is this?</label>
                    <input
                      type="text"
                      placeholder="e.g., Tutorial Guides, Research Papers, etc."
                      value={otherFileType}
                      onChange={(e) => setOtherFileType(e.target.value)}
                      style={inputStyle}
                    />
                  </motion.div>
                )}

                {/* Exam Type (for question papers) */}
                {fileType === 'qpaper' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                  >
                    <label style={labelStyle}>Exam Type</label>
                    {EXAM_TYPES.map((exam) => (
                      <label
                        key={exam.value}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          padding: '8px',
                          borderRadius: '8px',
                          background: examType === exam.value ? 'rgba(116, 198, 157, 0.2)' : 'transparent',
                          transition: 'background 0.2s',
                        }}
                      >
                        <input
                          type="radio"
                          name="examType"
                          value={exam.value}
                          checked={examType === exam.value}
                          onChange={(e) => setExamType(e.target.value)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '13px', color: 'var(--text)' }}>{exam.label}</span>
                      </label>
                    ))}
                  </motion.div>
                )}

                {/* Custom Exam Type */}
                {showOtherExamTypeField && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label style={labelStyle}>Other exam type (specify):</label>
                    <input
                      type="text"
                      placeholder="e.g., Practical Exam, Viva, etc."
                      value={otherExamType}
                      onChange={(e) => setOtherExamType(e.target.value)}
                      style={inputStyle}
                    />
                  </motion.div>
                )}

                {/* Year */}
                <div>
                  <label style={labelStyle}>Academic Year</label>
                  <input
                    type="number"
                    placeholder="e.g., 2023"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    style={inputStyle}
                    min="2000"
                    max={new Date().getFullYear()}
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                {/* Professor */}
                <div>
                  <label style={labelStyle}>Professor(s)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <select
                      value={professor}
                      onChange={(e) => setProfessor(e.target.value)}
                      style={{...inputStyle, cursor: 'pointer'}}
                    >
                      <option value="">Select primary professor</option>
                      {professors.map((prof) => (
                        <option key={prof} value={prof}>
                          {prof}
                        </option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                    {professor2 && (
                      <select
                        value={professor2}
                        onChange={(e) => setProfessor2(e.target.value)}
                        style={{...inputStyle, cursor: 'pointer'}}
                      >
                        <option value="">No second professor</option>
                        {professors.map((prof) => (
                          <option key={prof} value={prof}>
                            {prof}
                          </option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                    )}
                    {professor3 && (
                      <select
                        value={professor3}
                        onChange={(e) => setProfessor3(e.target.value)}
                        style={{...inputStyle, cursor: 'pointer'}}
                      >
                        <option value="">No third professor</option>
                        {professors.map((prof) => (
                          <option key={prof} value={prof}>
                            {prof}
                          </option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                    )}
                  </div>
                </div>

                {showOtherProfessorField && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label style={labelStyle}>Other Professor Name</label>
                    <input
                      type="text"
                      placeholder="Enter professor name"
                      value={otherProfessor}
                      onChange={(e) => setOtherProfessor(e.target.value)}
                      style={inputStyle}
                    />
                  </motion.div>
                )}

                {/* Uploader Info */}
                <div>
                  <label style={labelStyle}>Your Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="Your name or anonymous"
                    value={uploaderName}
                    onChange={(e) => setUploaderName(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {/* Remarks */}
                <div>
                  <label style={labelStyle}>Additional Notes (Optional)</label>
                  <textarea
                    placeholder="E.g., 'Handwritten notes', 'Contains solutions', etc."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    style={{...inputStyle, minHeight: '80px', fontFamily: "'Outfit', sans-serif", resize: 'none'}}
                  />
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                {uploadStatus === 'uploading' ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        margin: '0 auto 20px',
                        borderRadius: '50%',
                        border: '3px solid rgba(116, 198, 157, 0.2)',
                        borderTopColor: 'var(--green-bright)',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    <p style={{ fontSize: '14px', color: 'var(--text)', margin: '0 0 8px 0' }}>
                      Uploading files...
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
                      {uploadProgress}%
                    </p>
                    <div
                      style={{
                        width: '100%',
                        height: '4px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        borderRadius: '2px',
                        marginTop: '12px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          background: 'var(--green-bright)',
                          width: `${uploadProgress}%`,
                          transition: 'width 0.2s',
                        }}
                      />
                    </div>
                  </div>
                ) : uploadStatus === 'success' ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <CheckCircle size={60} style={{ color: 'var(--green-bright)', margin: '0 auto 20px' }} />
                    <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', margin: '0 0 8px 0' }}>
                      {uploadMessage}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
                      Thank you for contributing!
                    </p>
                  </div>
                ) : uploadStatus === 'duplicate' ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <AlertCircle size={60} style={{ color: '#fca5a5', margin: '0 auto 20px' }} />
                    <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', margin: '0 0 8px 0' }}>
                      File Already Exists
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
                      {uploadMessage}
                    </p>
                  </div>
                ) : uploadStatus === 'error' ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <AlertCircle size={60} style={{ color: '#fca5a5', margin: '0 auto 20px' }} />
                    <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', margin: '0 0 8px 0' }}>
                      Upload Failed
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
                      {uploadMessage}
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label style={labelStyle}>Upload Files</label>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          border: '2px dashed rgba(116, 198, 157, 0.5)',
                          borderRadius: '12px',
                          padding: '24px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          background: 'rgba(116, 198, 157, 0.05)',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background = 'rgba(116, 198, 157, 0.1)';
                          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(116, 198, 157, 0.8)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background = 'rgba(116, 198, 157, 0.05)';
                          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(116, 198, 157, 0.5)';
                        }}
                      >
                        <Upload size={32} style={{ color: 'var(--green-bright)', margin: '0 auto 8px' }} />
                        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', margin: '0 0 4px 0' }}>
                          Click to upload or drag and drop
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: 0 }}>
                          Max {config.MAX_UPLOAD_SIZE_MB}MB per file
                        </p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple={isMultiFileType}
                        onChange={(e) => handleFileSelect(e.target.files)}
                        style={{ display: 'none' }}
                      />
                    </div>

                    {uploadedFiles.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={labelStyle}>
                          Selected Files ({uploadedFiles.length})
                        </label>
                        {uploadedFiles.map((file, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 12px',
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: '8px',
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p
                                style={{
                                  fontSize: '13px',
                                  color: 'var(--text)',
                                  margin: '0 0 2px 0',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={file.name}
                              >
                                {file.name}
                              </p>
                              <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: 0 }}>
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                            <button
                              onClick={() => removeFile(i)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-3)',
                                cursor: 'pointer',
                                padding: '4px',
                                marginLeft: '12px',
                              }}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Consent */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        cursor: 'pointer',
                        padding: '8px',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        style={{ cursor: 'pointer', marginTop: '2px' }}
                      />
                      <span style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.4 }}>
                        I confirm that I have the rights to share this material and it complies with
                        academic integrity guidelines.
                      </span>
                    </label>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error message display */}
          {uploadStatus === 'error' && uploadMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '12px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
              }}
            >
              <p style={{ fontSize: '12px', color: '#fca5a5', margin: 0 }}>{uploadMessage}</p>
            </motion.div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            padding: '16px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            background: 'rgba(0, 0, 0, 0.1)',
          }}
        >
          {['uploading', 'success', 'duplicate', 'error'].includes(uploadStatus) ? (
            <button
              onClick={handleClose}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: 'rgba(116, 198, 157, 0.2)',
                border: '1px solid rgba(116, 198, 157, 0.4)',
                borderRadius: '8px',
                color: 'var(--green-bright)',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '13px',
              }}
            >
              Close
            </button>
          ) : (
            <>
              {step > 1 && (
                <button
                  onClick={() => setStep((s) => (s - 1) as Step)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '13px',
                  }}
                >
                  <ChevronLeft size={14} />
                  Back
                </button>
              )}

              {step < 3 ? (
                <button
                  onClick={() => {
                    if (step === 1 && (!semester || !courseCode || !fileType)) {
                      setUploadStatus('error');
                      setUploadMessage('Please fill in all required fields');
                      return;
                    }
                    if (fileType === 'qpaper' && !examType) {
                      setUploadStatus('error');
                      setUploadMessage('Please select the exam type');
                      return;
                    }
                    if (fileType === 'other' && !otherFileType) {
                      setUploadStatus('error');
                      setUploadMessage('Please specify the file type');
                      return;
                    }
                    if (!year) {
                      setUploadStatus('error');
                      setUploadMessage('Please enter the year');
                      return;
                    }
                    setUploadStatus('idle');
                    setUploadMessage('');
                    setStep((s) => (s + 1) as Step);
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    background: 'var(--gold)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#0a1a0f',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!consent || uploadedFiles.length === 0}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    background: consent && uploadedFiles.length > 0 ? 'var(--gold)' : 'rgba(116, 198, 157, 0.2)',
                    border: 'none',
                    borderRadius: '8px',
                    color: consent && uploadedFiles.length > 0 ? '#0a1a0f' : 'var(--text-3)',
                    cursor: consent && uploadedFiles.length > 0 ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                >
                  <Upload size={14} />
                  Upload
                </button>
              )}
            </>
          )}
        </div>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </motion.div>
    </motion.div>
  );
}