'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, FileText } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import CvViewDownloadButtons from '@/components/student/CvViewDownloadButtons';
import { collegeStudentCvDownloadUrl, collegeStudentCvViewUrl } from '@/lib/studentCvApiPaths';
import { studentCvRowMissingFile } from '@/lib/studentCvLoadClient';
import { reportClientApiFailure } from '@/lib/clientPlatformErrorReport';
import { formatErrorReference } from '@/lib/errorReference';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

function formatVerifiedAt(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return String(value);
  }
}

/** Strip platform-ops boilerplate from API errors before showing college users. */
function cleanCollegeCvError(raw) {
  const cleaned = String(raw || '')
    .replace(/\s*Full details were saved for the platform administrator\.?/gi, '')
    .replace(/\s*Reference:\s*\S+/gi, '')
    .replace(/\s*\[Ref:[^\]]+\]/gi, '')
    .trim();
  return cleaned || 'We could not load student CVs right now.';
}

const EMPTY_HINT = 'No labelled CVs uploaded yet.';
const REQUEST_FAILED_HINT = 'We could not load student CVs right now. Try again in a moment.';

export default function CollegeStudentCvsPanel({ studentId }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [emptyHint, setEmptyHint] = useState('');
  const [loadKind, setLoadKind] = useState('ok'); // ok | empty | request_failed | unavailable
  const [meta, setMeta] = useState({
    requireCvVerification: false,
    canVerify: false,
  });
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setEmptyHint('');
    setLoadKind('ok');
    try {
      let res = await fetch(`/api/college/students/${studentId}/student-cv-list`);
      if (res.status === 404) {
        res = await fetch(`/api/college/students/${studentId}/cvs`);
      }
      const json = await res.json().catch(() => ({}));
      const ensureLogged = async (message, statusCode) => {
        const existing = json.reference || formatErrorReference(json.referenceId);
        if (existing) return existing;
        return reportClientApiFailure({
          context: 'client_college_student_cv_list',
          route: `/api/college/students/${studentId}/student-cv-list`,
          statusCode,
          message,
          responseBody: json,
          severity: 'error',
          errorCode: json.errorCode || null,
          details: { source: 'college_student_cvs_panel' },
        });
      };

      if (!res.ok) {
        setItems([]);
        setLoadKind(res.status === 404 ? 'unavailable' : 'request_failed');
        const hint = cleanCollegeCvError(
          json.error
            || json.userMessage
            || (res.status === 404 ? 'CV management is not available yet.' : REQUEST_FAILED_HINT),
        );
        setEmptyHint(hint);
        void ensureLogged(hint, res.status);
        return;
      }
      const nextItems = Array.isArray(json.items) ? json.items : [];
      setItems(nextItems);
      setMeta({
        requireCvVerification: Boolean(json.requireCvVerification),
        canVerify: Boolean(json.canVerify),
      });
      if (json.warning || json.unavailable) {
        setLoadKind('request_failed');
        const hint = cleanCollegeCvError(json.warning || json.error || REQUEST_FAILED_HINT);
        setEmptyHint(hint);
        void ensureLogged(hint, res.status);
      } else if (json.cvManagementAvailable === false) {
        setLoadKind('unavailable');
        setEmptyHint(EMPTY_HINT);
      } else if (!nextItems.length) {
        setLoadKind('empty');
        setEmptyHint(EMPTY_HINT);
      } else {
        setLoadKind('ok');
      }
    } catch {
      setItems([]);
      setLoadKind('request_failed');
      setEmptyHint(REQUEST_FAILED_HINT);
      void reportClientApiFailure({
        context: 'client_college_student_cv_list',
        route: `/api/college/students/${studentId}/student-cv-list`,
        message: REQUEST_FAILED_HINT,
        severity: 'error',
        errorCode: 'PH-CLIENT-NETWORK',
        details: { source: 'college_student_cvs_panel' },
      });
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleVerify = async (cvId, verified) => {
    if (!studentId || !meta.canVerify) return;
    setUpdatingId(cvId);
    try {
      let res = await fetch(
        `/api/college/students/${studentId}/student-cv-verify/${encodeURIComponent(cvId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ verified }),
        },
      );
      if (res.status === 404) {
        res = await fetch(`/api/college/students/${studentId}/cvs/${cvId}/verify`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ verified }),
        });
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(cleanCollegeCvError(json.error || 'Failed to update verification'));
      setItems((prev) =>
        prev.map((item) => (item.id === cvId ? { ...item, ...json.item } : item)),
      );
      addToast(verified ? 'CV marked as verified' : 'CV verification cleared', 'success');
    } catch (e) {
      addToast(cleanCollegeCvError(e.message) || 'Failed to update verification', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading uploaded CVs…</p>;
  }

  if (!items.length) {
    const isFailed = loadKind === 'request_failed' || loadKind === 'unavailable';
    return isFailed ? (
      <Alert>
        <CircleAlert aria-hidden />
        <AlertTitle>CVs unavailable</AlertTitle>
        <AlertDescription>{emptyHint || EMPTY_HINT}</AlertDescription>
      </Alert>
    ) : (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        {emptyHint || EMPTY_HINT}
        {loadKind === 'empty' && meta.requireCvVerification
          ? ' When CV verification is enabled, students need a verified CV before applying to drives and internships.'
          : ''}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {meta.requireCvVerification ? (
        <Alert>
          <CircleAlert aria-hidden />
          <AlertTitle>CV verification required</AlertTitle>
          <AlertDescription>
            Students need a verified CV for drives and internships.
            {!meta.canVerify ? ' Only college admins can verify CVs unless delegation is enabled in Settings.' : ''}
          </AlertDescription>
        </Alert>
      ) : null}
      {items.map((cv) => (
        <Card key={cv.id} size="sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-medium">
                <FileText aria-hidden />
                {cv.label}
                {cv.isDefault ? (
                  <StatusBadge tone="green">Default</StatusBadge>
                ) : null}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {studentCvRowMissingFile(cv) ? (
                  'File missing — ask the student to re-upload'
                ) : cv.isVerified ? (
                  <>
                    <CheckCircle2 className="inline" aria-hidden />
                    {' '}
                    Verified{cv.cvVerifiedAt ? ` · ${formatVerifiedAt(cv.cvVerifiedAt)}` : ''}
                  </>
                ) : meta.requireCvVerification ? (
                  <>
                    <CircleAlert className="inline" aria-hidden />
                    {' '}
                    Pending verification
                  </>
                ) : (
                  'Not verified'
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!studentCvRowMissingFile(cv) ? (
                <CvViewDownloadButtons
                  viewUrl={collegeStudentCvViewUrl(studentId, cv.id)}
                  downloadUrl={collegeStudentCvDownloadUrl(studentId, cv.id)}
                />
              ) : null}
              {meta.canVerify && !studentCvRowMissingFile(cv) ? (
                cv.isVerified ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={updatingId === cv.id}
                    onClick={() => toggleVerify(cv.id, false)}
                  >
                    Clear verification
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={updatingId === cv.id}
                    onClick={() => toggleVerify(cv.id, true)}
                  >
                    <CheckCircle2 data-icon="inline-start" aria-hidden />
                    Mark verified
                  </Button>
                )
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
