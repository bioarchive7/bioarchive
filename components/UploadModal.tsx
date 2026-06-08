'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, CheckCircle, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { CURRICULUM } from '@/data/curriculum';
import config from '@/config';
import { FileType, formatFileSize } from '@/lib/utils';
import { uploadFileDirectToDrive } from '@/lib/direct-upload-client';

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
  const isMultiFileType = fileType && MULTI_FILE_TYPES.includes(fileType);
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
    
    // For single file types or if adding to existing
    if (isMultiFileType) {
      setUploadedFiles([...uploadedFiles, ...filesToAdd]);
    } else {
      setUploadedFiles(filesToAdd.slice(0, 1)); // Only one file for non-multi types
    }
    
    setUploadStatus('idle');
    setUploadMessage('');
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validation
    if (!semester || !courseCode || !fileType || uploadedFiles.length === 0 || !professor) {
      setUploadStatus('error');
      setUploadMessage('Please fill in all required fields and upload at least one file');
      return;
    }

    // Year is required for all file types
    if (!year) {
      setUploadStatus('error');
      setUploadMessage('Please enter the year');
      return;
    }

    // Check for "other" field explanations
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
      // Upload each file using the new direct-to-Drive method
      let successCount = 0;
      let errorOccurred = false;

      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        
        // Update progress for each file
        const fileProgress = (i / uploadedFiles.length) * 100;
        setUploadProgress(Math.round(fileProgress));

        const result = await uploadFileDirectToDrive(
          file,
          {
            fileName: file.name,
            semester,
            courseCode,
            courseName,
            professor: professor === 'Other' ? otherProfessor : professor,
            professor2: professor2 ? (professor2 === 'Other' ? otherProfessor : professor2) : undefined,
            professor3: professor3 ? (professor3 === 'Other' ? otherProfessor : professor3) : undefined,
            examType: fileType === 'qpaper' ? (examType === 'other' ? otherExamType : examType) : 'na',
            fileType: fileType === 'other' ? otherFileType : fileType,
            year,
            uploaderName: uploaderName || 'Anonymous',
            remarks: remarks || undefined,
          },
          (progress) => {
            // Adjust progress to account for multiple files
            const totalProgress = fileProgress + (progress / uploadedFiles.length);
            setUploadProgress(Math.round(totalProgress));
          }
        );

        if (result.status === 'success') {
          successCount++;
        } else if (result.status === 'duplicate') {
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

      if (!errorOccurred) {
        setUploadProgress(100);
        setUploadStatus('success');
        setUploadMessage(
          `${successCount} file${successCount !== 1 ? 's' : ''} uploaded successfully!`
        );
        setTimeout(() => { resetForm(); onClose?.(); }, 2500);
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
    setUploadProgress(0); 
    setUploadStatus('idle'); 
    setUploadMessage('');
  };

  const handleClose = () => { resetForm(); onClose?.(); };

  const canStep1 = !!(semester && courseCode && professor && year);
  const canStep2 = !!(fileType && uploadedFiles.length > 0 && (fileType !== 'qpaper' || !!examType));

  const contentVar = {
    hidden:  { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.22 } },
    exit:    { opacity: 0, x: -20, transition: { duration: 0.18 } },
  };

  if (!isOpen) return null;

  const allProfessors = [
    ...professors.filter((p) => p && p !== 'Other'),
    'Other',
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '540px',
              background: 'var(--bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
              maxHeight: '85vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* ── Header ──────────────────────────────────── */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px',
                borderBottom: '1px solid var(--glass-border)',
                flexShrink: 0,
              }}
            >
              <p
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--text)',
                  margin: 0,
                }}
              >
                {uploadStatus === 'success' || uploadStatus === 'duplicate' ? '✓ Upload Complete' : 'Upload Study Material'}
              </p>
              <button
                onClick={handleClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-3)',
                  padding: 0,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Content ─────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {uploadStatus === 'success' || uploadStatus === 'duplicate' ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ textAlign: 'center', padding: '40px 20px' }}
                >
                  <CheckCircle size={48} style={{ color: 'var(--green-bright)', margin: '0 auto 16px' }} />
                  <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                    {uploadStatus === 'duplicate' ? 'File Already Exists' : 'Upload Successful!'}
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6 }}>
                    {uploadMessage}
                  </p>
                </motion.div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <AnimatePresence mode="wait">
                    {step === 1 && (
                      <motion.div key="s1" variants={contentVar} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.22 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div>
                            <label style={labelStyle}>Semester <span style={{ color: '#fca5a5' }}>*</span></label>
                            <select value={semester} onChange={(e) => { setSemester(e.target.value); setCourseCode(''); }} style={{ ...inputStyle, appearance: 'none' }} onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(116,198,157,0.4)')} onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}>
                              <option value="" style={{ background: '#0a1a0f' }}>Select Semester</option>
                              {config.NISER_SEMESTERS.map((s) => <option key={s} value={s} style={{ background: '#0a1a0f' }}>Semester {s}</option>)}
                            </select>
                          </div>

                          <div>
                            <label style={labelStyle}>Year <span style={{ color: '#fca5a5' }}>*</span></label>
                            <input type="text" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g., 2024 or 2023-24" style={inputStyle} onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(116,198,157,0.4)')} onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')} />
                          </div>

                          <div>
                            <label style={labelStyle}>Course <span style={{ color: '#fca5a5' }}>*</span></label>
                            <select value={courseCode} onChange={(e) => { setCourseCode(e.target.value); const c = courses.find((x) => x.code === e.target.value); setCourseName(c?.name || ''); }} style={{ ...inputStyle, appearance: 'none' }} onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(116,198,157,0.4)')} onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}>
                              <option value="" style={{ background: '#0a1a0f' }}>Select Course</option>
                              {courses.map((c) => <option key={c.code} value={c.code} style={{ background: '#0a1a0f' }}>{c.code} — {c.name}</option>)}
                            </select>
                          </div>

                          <div>
                            <label style={labelStyle}>Professor <span style={{ color: '#fca5a5' }}>*</span></label>
                            <select value={professor} onChange={(e) => setProfessor(e.target.value)} style={{ ...inputStyle, appearance: 'none' }} onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(116,198,157,0.4)')} onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}>
                              <option value="" style={{ background: '#0a1a0f' }}>Select Primary Professor</option>
                              {allProfessors.map((p) => <option key={p} value={p} style={{ background: '#0a1a0f' }}>{p}</option>)}
                            </select>
                          </div>

                          {showOtherProfessorField && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                              <label style={labelStyle}>Mention Other Professor <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
                              <input type="text" value={otherProfessor} onChange={(e) => setOtherProfessor(e.target.value)} placeholder="Enter professor name" style={inputStyle} onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(116,198,157,0.4)')} onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')} />
                            </motion.div>
                          )}

                          <div>
                            <label style={labelStyle}>Professor 2 <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
                            <select value={professor2} onChange={(e) => setProfessor2(e.target.value)} style={{ ...inputStyle, appearance: 'none' }} onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(116,198,157,0.4)')} onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}>
                              <option value="" style={{ background: '#0a1a0f' }}>Select Professor (optional)</option>
                              {allProfessors.map((p) => <option key={p} value={p} style={{ background: '#0a1a0f' }}>{p}</option>)}
                            </select>
                          </div>

                          <div>
                            <label style={labelStyle}>Professor 3 <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
                            <select value={professor3} onChange={(e) => setProfessor3(e.target.value)} style={{ ...inputStyle, appearance: 'none' }} onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(116,198,157,0.4)')} onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}>
                              <option value="" style={{ background: '#0a1a0f' }}>Select Professor (optional)</option>
                              {allProfessors.map((p) => <option key={p} value={p} style={{ background: '#0a1a0f' }}>{p}</option>)}
                            </select>
                          </div>

                          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                            <button onClick={handleClose} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', borderRadius: '10px' }}>Cancel</button>
                            <button onClick={() => setStep(2)} disabled={!canStep1} className="btn-gold" style={{ flex: 1, justifyContent: 'center', borderRadius: '10px', opacity: canStep1 ? 1 : 0.4, cursor: canStep1 ? 'pointer' : 'not-allowed' }}>
                              Next <ChevronRight size={15} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {step === 2 && (
                      <motion.div key="s2" variants={contentVar} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.22 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div>
                            <label style={labelStyle}>File Type <span style={{ color: '#fca5a5' }}>*</span></label>
                            <select value={fileType} onChange={(e) => setFileType(e.target.value)} style={{ ...inputStyle, appearance: 'none' }} onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(116,198,157,0.4)')} onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}>
                              <option value="" style={{ background: '#0a1a0f' }}>Select File Type</option>
                              {FILE_TYPE_OPTIONS.map((ft) => <option key={ft.value} value={ft.value} style={{ background: '#0a1a0f' }}>{ft.label}</option>)}
                            </select>
                          </div>

                          {showOtherFileTypeField && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                              <label style={labelStyle}>Mention Other File Type <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
                              <input type="text" value={otherFileType} onChange={(e) => setOtherFileType(e.target.value)} placeholder="What type of file is this?" style={inputStyle} onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(116,198,157,0.4)')} onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')} />
                            </motion.div>
                          )}

                          {fileType === 'qpaper' && (
                            <AnimatePresence>
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                <label style={labelStyle}>Exam Type <span style={{ color: '#fca5a5' }}>*</span></label>
                                <select value={examType} onChange={(e) => setExamType(e.target.value)} style={{ ...inputStyle, appearance: 'none' }} onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(116,198,157,0.4)')} onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}>
                                  <option value="" style={{ background: '#0a1a0f' }}>Select Exam Type</option>
                                  {EXAM_TYPES.map((et) => <option key={et.value} value={et.value} style={{ background: '#0a1a0f' }}>{et.label}</option>)}
                                  <option value="other" style={{ background: '#0a1a0f' }}>Other</option>
                                </select>
                              </motion.div>

                              {showOtherExamTypeField && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ marginTop: '12px' }}>
                                  <label style={labelStyle}>Mention Other Exam Type <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
                                  <input type="text" value={otherExamType} onChange={(e) => setOtherExamType(e.target.value)} placeholder="e.g., Pre-Sem Exam" style={inputStyle} onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(116,198,157,0.4)')} onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')} />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          )}

                          <div>
                            <label style={labelStyle}>
                              Files <span style={{ color: '#fca5a5' }}>*</span>
                              {isMultiFileType && <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> (Multiple files allowed)</span>}
                            </label>
                            <div
                              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleFileSelect(e.dataTransfer.files); }}
                              onClick={() => fileInputRef.current?.click()}
                              style={{
                                border: '1px dashed rgba(212,168,83,0.4)',
                                borderRadius: '12px',
                                padding: '28px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                background: 'rgba(212,168,83,0.04)',
                                transition: 'background 0.2s',
                              }}
                              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(212,168,83,0.08)')}
                              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(212,168,83,0.04)')}
                            >
                              <Upload size={28} style={{ margin: '0 auto 8px', color: 'var(--gold)' }} />
                              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-2)', marginBottom: '4px' }}>
                                Drag and drop or click to select
                              </p>
                              <p style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                                {config.ALLOWED_FILE_TYPES.map((t) => `.${t}`).join(', ')} · Max {config.MAX_UPLOAD_SIZE_MB}MB per file
                              </p>
                              <input ref={fileInputRef} type="file" onChange={(e) => handleFileSelect(e.target.files)} style={{ display: 'none' }} multiple={!!isMultiFileType} />
                            </div>

                            {uploadedFiles.length > 0 && (
                              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {uploadedFiles.map((file, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      padding: '10px 14px',
                                      background: 'rgba(82,183,136,0.1)',
                                      border: '1px solid rgba(82,183,136,0.25)',
                                      borderRadius: '10px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '10px',
                                    }}
                                  >
                                    <div>
                                      <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--green-bright)', marginBottom: '2px' }}>{file.name}</p>
                                      <p style={{ fontSize: '11px', color: 'var(--text-3)' }}>{formatFileSize(file.size)}</p>
                                    </div>
                                    <button onClick={() => removeFile(idx)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
                                      <X size={15} />
                                    </button>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </div>

                          {uploadStatus === 'error' && (
                            <p style={{ fontSize: '12px', color: '#fca5a5', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 12px' }}>
                              {uploadMessage}
                            </p>
                          )}

                          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                            <button onClick={() => setStep(1)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', borderRadius: '10px' }}><ChevronLeft size={15} /> Back</button>
                            <button onClick={() => setStep(3)} disabled={!canStep2} className="btn-gold" style={{ flex: 1, justifyContent: 'center', borderRadius: '10px', opacity: canStep2 ? 1 : 0.4, cursor: canStep2 ? 'pointer' : 'not-allowed' }}>
                              Next <ChevronRight size={15} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {step === 3 && (
                      <motion.div key="s3" variants={contentVar} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.22 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '12px', lineHeight: 1.7 }}>
                            <p style={{ fontWeight: 600, color: 'var(--green-bright)', marginBottom: '6px', letterSpacing: '0.04em' }}>Upload Summary</p>
                            {[
                              ['Course', `${courseCode} — ${courseName}`],
                              ['Professor', [professor === 'Other' ? otherProfessor : professor, professor2 === 'Other' ? otherProfessor : professor2, professor3 === 'Other' ? otherProfessor : professor3].filter(Boolean).join(', ')],
                              ['Type', `${fileType === 'other' ? otherFileType : fileType}${examType ? ` (${examType === 'other' ? otherExamType : EXAM_TYPES.find((e) => e.value === examType)?.label})` : ''}${year ? ` · ${year}` : ''}`],
                              ['Files', `${uploadedFiles.length} file${uploadedFiles.length !== 1 ? 's' : ''}`],
                            ].map(([k, v]) => (
                              <p key={k}><span style={{ color: 'var(--text-3)' }}>{k}:</span> <span style={{ color: 'var(--text-2)' }}>{v}</span></p>
                            ))}
                          </div>

                          <div>
                            <label style={labelStyle}>Your Name <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
                            <input type="text" value={uploaderName} onChange={(e) => setUploaderName(e.target.value)} placeholder="Leave blank to stay anonymous" style={inputStyle} onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(116,198,157,0.4)')} onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')} />
                          </div>

                          <div>
                            <label style={labelStyle}>Remarks <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
                            <textarea
                              value={remarks}
                              onChange={(e) => setRemarks(e.target.value)}
                              placeholder="Any additional notes about these files..."
                              style={{
                                ...inputStyle,
                                fontFamily: "'Outfit', sans-serif",
                                minHeight: '80px',
                                resize: 'vertical',
                              }}
                              onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(116,198,157,0.4)')}
                              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                            />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', background: 'rgba(116,198,157,0.06)', border: '1px solid rgba(116,198,157,0.15)', borderRadius: '10px' }}>
                            <input type="checkbox" id="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: '2px', accentColor: 'var(--green-bright)', width: '14px', height: '14px' }} />
                            <label htmlFor="consent" style={{ fontSize: '12px', color: 'var(--text-2)', cursor: 'pointer', lineHeight: 1.5 }}>
                              I consent to having my name displayed with this upload
                            </label>
                          </div>

                          {uploadStatus === 'uploading' && (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>Uploading…</span>
                                <span style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 500 }}>{uploadProgress}%</span>
                              </div>
                              <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                                <motion.div initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} style={{ height: '100%', background: 'linear-gradient(90deg, var(--green-light), var(--gold))', borderRadius: '4px' }} />
                              </div>
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                            <button onClick={() => setStep(2)} disabled={uploadStatus === 'uploading'} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', borderRadius: '10px', opacity: uploadStatus === 'uploading' ? 0.4 : 1 }}><ChevronLeft size={15} /> Back</button>
                            <button onClick={handleSubmit} disabled={uploadStatus === 'uploading'} className="btn-gold" style={{ flex: 1, justifyContent: 'center', borderRadius: '10px', opacity: uploadStatus === 'uploading' ? 0.6 : 1 }}>
                              {uploadStatus === 'uploading' ? 'Uploading…' : 'Submit'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}