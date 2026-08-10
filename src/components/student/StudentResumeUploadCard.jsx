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
import { FileText, Upload } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup } from '@/components/ui/field';
import { StatusBadge } from '@/components/ui/status-badge';

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
    <Card aria-labelledby="profile-resume-heading">
      <CardHeader>
        <CardTitle id="profile-resume-heading" className="flex items-center gap-2">
          <FileText aria-hidden="true" /> Résumé / CV
        </CardTitle>
        <CardDescription>
            {hasResume
              ? 'Labelled CVs are attached when you apply. Employers see your label — not the original file name.'
              : 'Upload a labelled CV to apply to drives and opportunities.'}
        </CardDescription>
        <CardAction>
          {hasResume ? (
            <StatusBadge tone="green" showDot>{resumeLabel || 'CV on file'}</StatusBadge>
          ) : (
            <StatusBadge tone="amber" showDot>No résumé uploaded</StatusBadge>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <FieldDescription>
            PDF or Word, up to 5 MB · manage multiple versions in <Link href="/dashboard/student/my-cvs">My CVs</Link>.
          </FieldDescription>
          {cvError ? (
            <Alert variant="destructive">
              <AlertTitle>Could Not Upload Résumé</AlertTitle>
              <AlertDescription>{cvError}</AlertDescription>
            </Alert>
          ) : null}
          {useCvApi ? (
            <Field className="max-w-md">
              <CvLabelInput label={label} onChange={setLabel} disabled={cvUploading} />
            </Field>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {hasResume && resumeViewUrl ? (
              <CvViewDownloadButtons
                viewUrl={resumeViewUrl}
                downloadUrl={appendCvDownloadParam(resumeViewUrl)}
                viewLabel="View résumé"
              />
            ) : null}
            <Button
              size="sm"
              render={<label htmlFor="profile-resume-file" />}
              nativeButton={false}
              aria-label={cvUploading ? 'Uploading résumé' : hasResume ? 'Replace résumé' : 'Upload résumé'}
            >
              <Upload data-icon="inline-start" aria-hidden="true" />
              {cvUploading ? 'Uploading…' : hasResume ? 'Replace résumé' : 'Upload résumé'}
              <input
                id="profile-resume-file"
                type="file"
                accept={STUDENT_RESUME_ACCEPT_ATTR}
                hidden
                disabled={cvUploading}
                onChange={handleCvInputChange}
              />
            </Button>
            <Button variant="ghost" size="sm" render={<Link href="/dashboard/student/my-cvs" />} nativeButton={false}>My CVs</Button>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
