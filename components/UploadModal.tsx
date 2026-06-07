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
  { value: 'midSem',  label: 'Mid Semester' },
  { value: 'endSem',  label: 'End Semester' },
  { value: 'quiz',    label: 'Quiz' },
];

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

  const [semester,     setSemester]    = useState('');
  const [courseCode,   setCourseCode]  = useState('');
  const [courseName,   setCourseName]  = useState('');
  const [professor,    setProfessor]   = useState('');
  const [fileType,     setFileType]    = useState('');
  const [examType,     setExamType]    = useState('');
  const [year,         setYear]        = useState('');
  const [uploadedFile, setUploadedFile]= useState<File | null>(null);
  const [uploaderName, setUploaderName]= useState('');
  const [consent,      setConsent]     = useState(false);
  const [uploadMessage,setUploadMessage]=useState('');

  const courses         = semester ? CURRICULUM[semester] || [] : [];
  const selectedCourse  = courses.find((c) => c.code === courseCode);
  const professors      = selectedCourse?.professors || [];

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
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
    setUploadedFile(file);
    setUploadStatus('idle');
    setUploadMessage('');
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

    const fd = new FormData();
    fd.append('file', uploadedFile);
    fd.append('semester', semester);
    fd.append('courseCode', courseCode);
    fd.append('courseName', courseName);
    fd.append('professor', professor);
    fd.append('examType', fileType === 'qpaper' ? examType : 'na');
    fd.append('fileType', fileType);
    if (year) fd.append('year', year);
    fd.append('uploaderName', uploaderName || 'Anonymous');
    fd.append('consent', consent ? 'true' : 'false');

    const res: UploadResponse = await uploadFile(fd, (pct) => setUploadProgress(pct));
    if (res.status === 'success') {
      setUploadStatus('success');
      setUploadMessage(res.message);
      setTimeout(() => { resetForm(); onClose?.(); }, 2500);
    } else if (res.status === 'duplicate') {
      setUploadStatus('duplicate');
      setUploadMessage(res.message);
      setTimeout(() => { resetForm(); onClose?.(); }, 2500);
    } else {
      setUploadStatus('error');
      setUploadMessage(res.message);
    }
  };

  const resetForm = () => {
    setStep(1); setSemester(''); setCourseCode(''); setCourseName('');
    setProfessor(''); setFileType(''); setExamType(''); setYear('');
    setUploadedFile(null); setUploaderName(''); setConsent(false);
    setUploadProgress(0); setUploadStatus('idle'); setUploadMessage('');
  };

  const handleClose = () => { resetForm(); onClose?.(); };

  const canStep1 = !!(semester && courseCode && professor);
  const canStep2 = !!(fileType && uploadedFile && (fileType !== 'qpaper' || (!!examType && !!year)));

  const contentVar = {
    hidden:  { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: -8 },
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '16px',
        }}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'rgba(10,26,15,0.96)',
            border: '1px solid rgba(116,198,157,0.2)',
            borderRadius: '18px',
            maxWidth: '520px',
            width: '100%',
            maxHeight: 'calc(100vh - 32px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header Block */}
          <div
            style={{
              padding: '20px 22px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              background: 'rgba(10,26,15,0.98)',
              borderRadius: '18px 18px 0 0',
              flexShrink: 0,
              zIndex: 1,
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'var(--text)',
                  letterSpacing: '-0.01em',
                  marginBottom: '3px',
                }}
              >
                Upload Study Material
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                Step {step} of 3 —{' '}
                {step === 1 ? 'Course Details' : step === 2 ? 'File Details' : 'Your Info'}
              </p>
            </div>
            <button
              onClick={handleClose}
              style={{
                width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', cursor: 'pointer',
                color: 'var(--text-2)',
              }}
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>

          <div style={{ height: '2px', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <motion.div
              animate={{ width: `${(step / 3) * 100}%` }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, var(--green-light), var(--gold))',
              }}
            />
          </div>

          {/* Scrollable Form Body Container */}
          <div style={{ padding: '22px', overflowY: 'auto', flex: 1 }}>
            {(uploadStatus === 'success' || uploadStatus === 'duplicate' || uploadStatus === 'error') && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: 'center', padding: '32px 16px' }}
              >
                {uploadStatus === 'success' && (
                  <>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
                      <CheckCircle size={48} style={{ margin: '0 auto 16px', color: 'var(--green-bright)' }} />
                    </motion.div>
                    <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 700, color: 'var(--green-bright)', marginBottom: '8px' }}>
                      Upload Successful!
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-2)' }}>{uploadMessage}</p>
                  </>
                )}
                {uploadStatus === 'duplicate' && (
                  <>
                    <AlertCircle size={48} style={{ margin: '0 auto 16px', color: 'var(--gold)' }} />
                    <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 700, color: 'var(--gold)', marginBottom: '8px' }}>
                      Duplicate Detected
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-2)' }}>{uploadMessage}</p>
                  </>
                )}
                {uploadStatus === 'error' && (
                  <>
                    <AlertCircle size={48} style={{ margin: '0 auto 16px', color: '#fca5a5' }} />
                    <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 700, color: '#fca5a5', marginBottom: '8px' }}>
                      Upload Failed
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '16px' }}>{uploadMessage}</p>
                    <button
                      onClick={() => setUploadStatus('idle')}
                      className="btn-gold"
                      style={{ borderRadius: '10px' }}
                    >
                      Try Again
                    </button>
                  </>
                )}
              </motion.div>
            )}

            {uploadStatus !== 'success' && uploadStatus !== 'duplicate' && (
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="s1" variants={contentVar} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.22 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <label style={labelStyle}>Semester <span style={{ color: '#fca5a5' }}>*</span></label>
                        <select
                          value={semester}
                          onChange={(e) => { setSemester(e.target.value); setCourseCode(''); setCourseName(''); setProfessor(''); }}
                          style={{ ...inputStyle, appearance: 'none' }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(116,198,157,0.4)')}
                          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                        >
                          <option value="" style={{ background: '#0a1a0f' }}>Select Semester</option>
                          {config.NISER_SEMESTERS.map((s) => (
                            <option key={s} value={s} style={{ background: '#0a1a0f' }}>Semester {s}</option>
                          ))}
                          <option value="ADVANCE COURSES" style={{ background: '#0a1a0f' }}>Advanced Courses</option>
                        </select>
                      </div>

                      <div>
                        <label style={labelStyle}>Course <span style={{ color: '#fca5a5' }}>*</span></label>
                        <select
                          value={courseCode}
                          onChange={(e) => { const s = courses.find((c) => c.code === e.target.value); setCourseCode(e.target.value); setCourseName(s?.name || ''); setProfessor(''); }}
                          disabled={!semester}
                          style={{ ...inputStyle, opacity: semester ? 1 : 0.5, appearance: 'none' }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(116,198,157,0.4)')}
                          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                        >
                          <option value="" style={{ background: '#0a1a0f' }}>Select Course</option>
                          {courses.map((c) => (
                            <option key={c.code} value={c.code} style={{ background: '#0a1a0f' }}>{c.code} — {c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={labelStyle}>Professor <span style={{ color: '#fca5a5' }}>*</span></label>
                        <select
                          value={professor}
                          onChange={(e) => setProfessor(e.target.value)}
                          disabled={!courseCode}
                          style={{ ...inputStyle, opacity: courseCode ? 1 : 0.5, appearance: 'none' }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(116,198,157,0.4)')}
                          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                        >
                          <option value="" style={{ background: '#0a1a0f' }}>{courseCode ? 'Select Professor' : 'Select a course first'}</option>
                          {professors.map((p) => (
                            <option key={p} value={p} style={{ background: '#0a1a0f' }}>{p}</option>
                          ))}
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
                        <select
                          value={fileType}
                          onChange={(e) => { setFileType(e.target.value); setExamType(''); }}
                          style={{ ...inputStyle, appearance: 'none' }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(116,198,157,0.4)')}
                          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                        >
                          <option value="" style={{ background: '#0a1a0f' }}>Select File Type</option>
                          {['qpaper','notes','slides','lab','assignment','other'].map((t) => (
                            <option key={t} value={t} style={{ background: '#0a1a0f' }}>
                              {{ qpaper:'Question Paper', notes:'Notes', slides:'Slides', lab:'Lab Manual', assignment:'Assignment', other:'Other' }[t]}
                            </option>
                          ))}
                        </select>
                      </div>

                      {fileType === 'qpaper' && (
                        <AnimatePresence>
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                            <label style={labelStyle}>Exam Type <span style={{ color: '#fca5a5' }}>*</span></label>
                            <select value={examType} onChange={(e) => setExamType(e.target.value)} style={{ ...inputStyle, appearance: 'none' }} onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(116,198,157,0.4)')} onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}>
                              <option value="" style={{ background: '#0a1a0f' }}>Select Exam Type</option>
                              {EXAM_TYPES.map((et) => <option key={et.value} value={et.value} style={{ background: '#0a1a0f' }}>{et.label}</option>)}
                            </select>
                          </motion.div>
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginTop: '12px' }}>
                            <label style={labelStyle}>Year <span style={{ color: '#fca5a5' }}>*</span></label>
                            <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2023" min="2000" max={new Date().getFullYear()} style={inputStyle} onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(116,198,157,0.4)')} onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')} />
                          </motion.div>
                        </AnimatePresence>
                      )}

                      <div>
                        <label style={labelStyle}>File <span style={{ color: '#fca5a5' }}>*</span></label>
                        <div
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleFileSelect(e.dataTransfer.files[0]); }}
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
                            {config.ALLOWED_FILE_TYPES.map((t) => `.${t}`).join(', ')} · Max {config.MAX_UPLOAD_SIZE_MB}MB
                          </p>
                          <input ref={fileInputRef} type="file" onChange={(e) => handleFileSelect(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                        </div>

                        {uploadedFile && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                              marginTop: '10px',
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
                              <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--green-bright)', marginBottom: '2px' }}>{uploadedFile.name}</p>
                              <p style={{ fontSize: '11px', color: 'var(--text-3)' }}>{formatFileSize(uploadedFile.size)}</p>
                            </div>
                            <button onClick={() => setUploadedFile(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
                              <X size={15} />
                            </button>
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
                        {[['Course', `${courseCode} — ${courseName}`], ['Professor', professor], ['Type', `${fileType}${examType ? ` (${EXAM_TYPES.find((e) => e.value === examType)?.label})` : ''}${year ? ` · ${year}` : ''}`], ['File', uploadedFile?.name || '']].map(([k, v]) => (
                          <p key={k}><span style={{ color: 'var(--text-3)' }}>{k}:</span> <span style={{ color: 'var(--text-2)' }}>{v}</span></p>
                        ))}
                      </div>

                      <div>
                        <label style={labelStyle}>Your Name <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
                        <input type="text" value={uploaderName} onChange={(e) => setUploaderName(e.target.value)} placeholder="Leave blank to stay anonymous" style={inputStyle} onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(116,198,157,0.4)')} onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')} />
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
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}