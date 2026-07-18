'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, FileText } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import CvViewDownloadButtons from '@/components/student/CvViewDownloadButtons';
import { collegeStudentCvDownloadUrl, collegeStudentCvViewUrl } from '@/lib/studentCvApiPaths';
import { studentCvRowMissingFile } from '@/lib/studentCvLoadClient';
import { reportClientApiFailure } from '@/lib/clientPlatformErrorReport';
import { formatErrorReference } from '@/lib/errorReference';

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
    return <p className="text-sm text-secondary">Loading uploaded CVs…</p>;
  }

  if (!items.length) {
    const isFailed = loadKind === 'request_failed' || loadKind === 'unavailable';
    return (
      <p
        className="text-sm"
        style={{
          margin: 0,
          color: isFailed ? 'var(--warning-800, #92400e)' : 'var(--text-secondary)',
        }}
        role={isFailed ? 'status' : undefined}
      >
        {emptyHint || EMPTY_HINT}
        {loadKind === 'empty' && meta.requireCvVerification
          ? ' When CV verification is enabled, students need a verified CV before applying to drives and internships.'
          : ''}
      </p>
    );
  }

  return (
    <div className="student-list-stack">
      {meta.requireCvVerification ? (
        <p className="text-sm text-secondary" style={{ margin: '0 0 0.75rem' }}>
          CV verification is required for drives and internships.
          {!meta.canVerify ? ' Only college admins can verify CVs unless delegation is enabled in Settings.' : ''}
        </p>
      ) : null}
      {items.map((cv) => (
        <article key={cv.id} className="student-list-row">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              width: '100%',
            }}
          >
            <div>
              <div className="student-list-title" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <FileText size={15} aria-hidden />
                {cv.label}
                {cv.isDefault ? (
                  <span className="badge badge-green" style={{ marginLeft: 4 }}>
                    Default
                  </span>
                ) : null}
              </div>
              <div className="student-list-meta">
                {studentCvRowMissingFile(cv) ? (
                  'File missing — ask the student to re-upload'
                ) : cv.isVerified ? (
                  <>
                    <CheckCircle2 size={13} style={{ display: 'inline', verticalAlign: 'text-bottom' }} aria-hidden />
                    {' '}
                    Verified{cv.cvVerifiedAt ? ` · ${formatVerifiedAt(cv.cvVerifiedAt)}` : ''}
                  </>
                ) : meta.requireCvVerification ? (
                  <>
                    <CircleAlert size={13} style={{ display: 'inline', verticalAlign: 'text-bottom' }} aria-hidden />
                    {' '}
                    Pending verification
                  </>
                ) : (
                  'Not verified'
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
              {!studentCvRowMissingFile(cv) ? (
                <CvViewDownloadButtons
                  viewUrl={collegeStudentCvViewUrl(studentId, cv.id)}
                  downloadUrl={collegeStudentCvDownloadUrl(studentId, cv.id)}
                />
              ) : null}
              {meta.canVerify && !studentCvRowMissingFile(cv) ? (
                cv.isVerified ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={updatingId === cv.id}
                    onClick={() => toggleVerify(cv.id, false)}
                  >
                    Clear verification
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={updatingId === cv.id}
                    onClick={() => toggleVerify(cv.id, true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <CheckCircle2 size={14} aria-hidden />
                    Mark verified
                  </button>
                )
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
