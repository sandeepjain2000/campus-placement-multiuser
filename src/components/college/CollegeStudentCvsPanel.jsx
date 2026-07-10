'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, FileText } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

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

export default function CollegeStudentCvsPanel({ studentId }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({
    requireCvVerification: false,
    canVerify: false,
  });
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      let res = await fetch(`/api/college/students/${studentId}/student-cv-list`);
      if (res.status === 404) {
        res = await fetch(`/api/college/students/${studentId}/cvs`);
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to load CVs');
      setItems(Array.isArray(json.items) ? json.items : []);
      setMeta({
        requireCvVerification: Boolean(json.requireCvVerification),
        canVerify: Boolean(json.canVerify),
      });
    } catch (e) {
      addToast(e.message || 'Failed to load CVs', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [addToast, studentId]);

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
      if (!res.ok) throw new Error(json.error || 'Failed to update verification');
      setItems((prev) =>
        prev.map((item) => (item.id === cvId ? { ...item, ...json.item } : item)),
      );
      addToast(verified ? 'CV marked as verified' : 'CV verification cleared', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to update verification', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-secondary">Loading uploaded CVs…</p>;
  }

  if (!items.length) {
    return (
      <p className="text-sm text-secondary" style={{ margin: 0 }}>
        No labelled CVs uploaded yet.
        {meta.requireCvVerification
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
                {cv.isVerified ? (
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
            {meta.canVerify ? (
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
        </article>
      ))}
    </div>
  );
}
