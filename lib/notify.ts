/**
 * Mod notification system
 * Sends email to all moderators when a new file is uploaded.
 * To add/remove mods: update MOD_EMAILS in .env.local only.
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Read mod emails from env — comma separated
// To change mods, update MOD_EMAILS in .env.local
const MOD_EMAILS = (process.env.MOD_EMAILS || '')
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean);

export interface UploadNotificationParams {
  fileName: string;
  courseCode: string;
  courseName: string;
  semester: string;
  professor: string;
  fileType: string;
  examType: string;
  uploaderName: string;
  webViewLink: string;
}

/**
 * Send upload notification to all mods.
 * Fire-and-forget — never throws, logs errors silently.
 */
export async function notifyModsOfUpload(
  params: UploadNotificationParams
): Promise<void> {
  if (MOD_EMAILS.length === 0) {
    console.warn('No MOD_EMAILS configured — skipping notification');
    return;
  }

  const {
    fileName,
    courseCode,
    courseName,
    semester,
    professor,
    fileType,
    examType,
    uploaderName,
    webViewLink,
  } = params;

  const fileTypeLabel: Record<string, string> = {
    qpaper: 'Question Paper',
    notes: 'Notes',
    slides: 'Slides',
    lab: 'Lab Manual',
    assignment: 'Assignment',
    other: 'Other',
  };

  const examTypeLabel: Record<string, string> = {
    midSem: 'Mid Semester',
    endSem: 'End Semester',
    quiz: 'Quiz',
    na: '',
  };

  const examLine = examType && examType !== 'na'
    ? `<tr><td style="color:#666;padding:4px 0">Exam Type</td><td style="padding:4px 0;font-weight:500">${examTypeLabel[examType] || examType}</td></tr>`
    : '';

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="background:#1a4a2e;padding:24px">
        <h2 style="color:white;margin:0;font-size:20px">📁 New Upload — BioArchive</h2>
        <p style="color:#86efac;margin:4px 0 0;font-size:13px">A new file has been submitted</p>
      </div>
      <div style="padding:24px">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="color:#666;padding:4px 0">File Name</td><td style="padding:4px 0;font-weight:500">${fileName}</td></tr>
          <tr><td style="color:#666;padding:4px 0">Course</td><td style="padding:4px 0;font-weight:500">${courseCode} — ${courseName}</td></tr>
          <tr><td style="color:#666;padding:4px 0">Semester</td><td style="padding:4px 0;font-weight:500">${semester}</td></tr>
          <tr><td style="color:#666;padding:4px 0">Professor</td><td style="padding:4px 0;font-weight:500">${professor}</td></tr>
          <tr><td style="color:#666;padding:4px 0">File Type</td><td style="padding:4px 0;font-weight:500">${fileTypeLabel[fileType] || fileType}</td></tr>
          ${examLine}
          <tr><td style="color:#666;padding:4px 0">Uploaded by</td><td style="padding:4px 0;font-weight:500">${uploaderName}</td></tr>
        </table>
        <div style="margin-top:20px">
          <a href="${webViewLink}"
            style="display:inline-block;background:#d4a853;color:white;padding:10px 20px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:500">
            View File on Drive →
          </a>
        </div>
        <p style="color:#9ca3af;font-size:12px;margin-top:16px">
          This is an automated notification from BioArchive.
        </p>
      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: 'BioArchive <onboarding@resend.dev>', // update after adding domain in Resend
      to: MOD_EMAILS,
      subject: `[BioArchive] New upload: ${fileName}`,
      html,
    });
  } catch (error) {
    // Never crash the upload because notification failed
    console.error('Failed to send mod notification:', error);
  }
}