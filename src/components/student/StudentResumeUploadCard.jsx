'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  STUDENT_RESUME_ACCEPT_ATTR,
  STUDENT_RESUME_VALIDATION_ERROR,
  validateStudentResumeFileAsync,
} from '@/lib/studentDocumentUpload';
import { CvLabelInput } from '@/components/student/StudentCvApply';
import CvViewDownloadButtons from '@/components/student/CvViewDownloadButtons';
import { appendCvDownloadParam } from '@/lib/studentCvApiPaths';
import { CV_LABEL_MAX_LENGTH } from '@/lib/studentCvShared';

/**
 * Résumé card on student profile — uploads go through labelled CV API when enabled.
 */
export default function StudentResumeUploadCard({
  resumeViewUrl = '',
  resumeLabel = '',
  cvUploading = false,
  onCvUpload,
  useCvApi = false,
}) {
  const [cvError, setCvError] = useState('');
  const [label, setLabel] = useState('');
  const hasResume = Boolean(resumeViewUrl || resumeLabel);

  const handleCvInputChange = async (e) => {
    const file = e.target.files?.[0];
    setCvError('');

    if (!file) return;

    const validated = await validateStudentResumeFileAsync(file);
    if (!validated.ok) {
      setCvError(validated.error || STUDENT_RESUME_VALIDATION_ERROR);
      e.target.value = '';
      return;
    }

    if (useCvApi) {
      const trimmed = label.trim();
      if (!trimmed) {
        setCvError('CV label is required');
        e.target.value = '';
        return;
      }
      if (trimmed.length > CV_LABEL_MAX_LENGTH) {
        setCvError(`Label must be at most ${CV_LABEL_MAX_LENGTH} characters`);
        e.target.value = '';
        return;
      }
      if (typeof onCvUpload === 'function') {
        onCvUpload({ file, label: trimmed });
      }
      e.target.value = '';
      return;
    }

    if (typeof onCvUpload === 'function') {
      onCvUpload({ file, event: e });
    }
  };

  return (
    <section
      className="card profile-resume-card"
      aria-labelledby="profile-resume-heading"
      style={{ marginBottom: '1rem', padding: '1rem 1.25rem' }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
        }}
      >
        <div style={{ flex: '1 1 12rem', minWidth: 0 }}>
          <h3 id="profile-resume-heading" style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>
            Résumé / CV
          </h3>
          <p className="text-sm text-secondary" style={{ margin: '0.35rem 0 0', lineHeight: 1.5 }}>
            {hasResume
              ? 'Labelled CVs are attached when you apply. Employers see your label — not the original file name.'
              : 'Upload a labelled CV to apply to drives and opportunities.'}
          </p>
          {hasResume ? (
            <p className="text-sm" style={{ margin: '0.5rem 0 0', fontWeight: 600 }}>
              <span aria-hidden="true">📄 </span>
              {resumeLabel || 'CV on file'}
            </p>
          ) : (
            <p
              className="text-xs"
              style={{
                margin: '0.5rem 0 0',
                color: 'var(--warning-700, #b45309)',
                fontWeight: 600,
              }}
            >
              No résumé uploaded yet
            </p>
          )}
          <p className="text-xs text-tertiary" style={{ margin: '0.25rem 0 0' }}>
            PDF or Word, up to 5 MB · manage multiple versions in{' '}
            <Link href="/dashboard/student/my-cvs" style={{ fontWeight: 600 }}>
              My CVs
            </Link>
          </p>
          {cvError ? (
            <p
              className="text-sm"
              role="alert"
              style={{ margin: '0.5rem 0 0', color: 'var(--danger-600, #dc2626)', fontWeight: 500 }}
            >
              {cvError}
            </p>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            alignItems: 'stretch',
            flexShrink: 0,
            minWidth: 200,
          }}
        >
          {useCvApi ? (
            <CvLabelInput label={label} onChange={setLabel} disabled={cvUploading} />
          ) : null}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            {hasResume && resumeViewUrl ? (
              <CvViewDownloadButtons
                viewUrl={resumeViewUrl}
                downloadUrl={appendCvDownloadParam(resumeViewUrl)}
                viewLabel="View résumé"
              />
            ) : null}
            <label
              className={`btn btn-primary btn-sm${cvUploading ? ' disabled' : ''}`}
              style={{
                cursor: cvUploading ? 'wait' : 'pointer',
                margin: 0,
                opacity: cvUploading ? 0.85 : 1,
              }}
              aria-label={cvUploading ? 'Uploading résumé' : hasResume ? 'Replace résumé' : 'Upload résumé'}
            >
              {cvUploading ? 'Uploading…' : hasResume ? 'Replace résumé' : 'Upload résumé'}
              <input
                type="file"
                accept={STUDENT_RESUME_ACCEPT_ATTR}
                hidden
                disabled={cvUploading}
                onChange={handleCvInputChange}
              />
            </label>
            <Link href="/dashboard/student/my-cvs" className="btn btn-ghost btn-sm">
              My CVs
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
