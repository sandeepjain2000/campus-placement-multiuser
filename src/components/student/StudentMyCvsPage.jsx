'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useToast } from '@/components/ToastProvider';
import { CvLabelInput } from '@/components/student/StudentCvApply';
import { CV_LABEL_MAX_LENGTH } from '@/lib/studentCvShared';
import { patchStudentCv, postStudentCvUpload, studentCvDownloadUrl, studentCvViewUrl } from '@/lib/studentCvApiPaths';
import CvViewDownloadButtons from '@/components/student/CvViewDownloadButtons';
import { Archive, CheckCircle2, CircleAlert, FileText, Star, Upload } from 'lucide-react';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to load CVs');
  return json;
};

export default function StudentMyCvsPage() {
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/student/cv-list?includeArchived=1', fetcher);
  const items = Array.isArray(data?.items) ? data.items : [];

  const [label, setLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');

  const active = items.filter((c) => !c.archivedAt);
  const archived = items.filter((c) => c.archivedAt);
  const cvVerification = data?.cvVerification || { required: false, hasVerifiedCv: true };

  const onUpload = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      const trimmed = label.trim();
      if (!trimmed) {
        addToast('CV label is required', 'error');
        return;
      }
      if (trimmed.length > CV_LABEL_MAX_LENGTH) {
        addToast(`Label must be at most ${CV_LABEL_MAX_LENGTH} characters`, 'error');
        return;
      }

      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('label', trimmed);
        fd.append('set_as_default', active.length === 0 ? '1' : '0');
        const res = await postStudentCvUpload(fd);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Upload failed');
        addToast('CV uploaded', 'success');
        setLabel('');
        await mutate();
      } catch (err) {
        addToast(err.message || 'Upload failed', 'error');
      } finally {
        setUploading(false);
      }
    },
    [active.length, addToast, label, mutate],
  );

  const patchCv = async (id, body) => {
    const res = await patchStudentCv(id, body);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Update failed');
    await mutate();
    return json.item;
  };

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <span
          style={{
            display: 'flex',
            padding: '0.5rem',
            background: 'var(--primary-50)',
            borderRadius: 10,
            color: 'var(--primary-600)',
          }}
        >
          <FileText size={24} />
        </span>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.35rem' }}>My CVs</h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Label each CV (max {CV_LABEL_MAX_LENGTH} characters). Choose which CV to send with each application.
            CVs shared with employers cannot be deleted — archive instead.
          </p>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <p style={{ margin: 0 }}>{error.message}</p>
        </div>
      )}

      {cvVerification.required && !cvVerification.hasVerifiedCv ? (
        <div className="card" style={{ padding: '1rem', marginBottom: '1rem', borderColor: 'var(--warning-300)' }}>
          <p style={{ margin: 0, display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <CircleAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
            <span>
              Your college requires CV verification before you can apply to drives and internships.
              Ask your placement office to verify an uploaded CV below.
            </span>
          </p>
        </div>
      ) : null}

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Upload a new CV</h2>
        <div style={{ display: 'grid', gap: '0.75rem', maxWidth: 480 }}>
          <CvLabelInput label={label} onChange={setLabel} disabled={uploading} />
          <label className="btn btn-primary" style={{ width: 'fit-content', cursor: uploading ? 'wait' : 'pointer' }}>
            <Upload size={16} style={{ marginRight: 6 }} />
            {uploading ? 'Uploading…' : 'Choose file'}
            <input type="file" accept=".pdf,.doc,.docx" hidden disabled={uploading} onChange={onUpload} />
          </label>
        </div>
      </div>

      {isLoading ? (
        <p className="text-secondary">Loading…</p>
      ) : (
        <>
          <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Active CVs ({active.length})</h2>
          {active.length === 0 ? (
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No CVs yet. Upload one to apply to opportunities.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {active.map((cv) => (
                <div key={cv.id} className="card" style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      {editingId === cv.id ? (
                        <input
                          className="form-input"
                          value={editLabel}
                          maxLength={CV_LABEL_MAX_LENGTH}
                          onChange={(e) => setEditLabel(e.target.value)}
                          style={{ maxWidth: 240 }}
                        />
                      ) : (
                        <strong>{cv.label}</strong>
                      )}
                      {cv.isDefault && (
                        <span className="badge badge-green" style={{ marginLeft: 8 }}>
                          Default
                        </span>
                      )}
                      {cvVerification.required ? (
                        cv.isVerified ? (
                          <span className="badge badge-green" style={{ marginLeft: 8 }}>
                            <CheckCircle2 size={12} style={{ display: 'inline', verticalAlign: 'text-bottom' }} aria-hidden />
                            {' '}
                            Verified
                          </span>
                        ) : (
                          <span className="badge badge-amber" style={{ marginLeft: 8 }}>
                            Pending verification
                          </span>
                        )
                      ) : null}
                      {(cv.usedOnApplications || 0) > 0 && (
                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Used on {cv.usedOnApplications} application{cv.usedOnApplications === 1 ? '' : 's'}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {editingId === cv.id ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={async () => {
                              try {
                                await patchCv(cv.id, { label: editLabel });
                                setEditingId(null);
                                addToast('Label updated', 'success');
                              } catch (e) {
                                addToast(e.message, 'error');
                              }
                            }}
                          >
                            Save
                          </button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setEditingId(cv.id);
                              setEditLabel(cv.label);
                            }}
                          >
                            Edit label
                          </button>
                          {!cv.isDefault && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={async () => {
                                try {
                                  await patchCv(cv.id, { action: 'set_default' });
                                  addToast('Default CV updated', 'success');
                                } catch (e) {
                                  addToast(e.message, 'error');
                                }
                              }}
                            >
                              <Star size={14} style={{ marginRight: 4 }} />
                              Set default
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={async () => {
                              if (!window.confirm('Archive this CV? It stays available for past applications.')) return;
                              try {
                                await patchCv(cv.id, { action: 'archive' });
                                addToast('CV archived', 'success');
                              } catch (e) {
                                addToast(e.message, 'error');
                              }
                            }}
                          >
                            <Archive size={14} style={{ marginRight: 4 }} />
                            Archive
                          </button>
                          <CvViewDownloadButtons
                            viewUrl={studentCvViewUrl(cv.id)}
                            downloadUrl={studentCvDownloadUrl(cv.id)}
                            viewLabel="View"
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {archived.length > 0 && (
            <>
              <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Archived ({archived.length})</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Archived CVs are hidden from new applications but remain available to employers for applications that
                already used them.
              </p>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {archived.map((cv) => (
                  <div key={cv.id} className="card" style={{ padding: '0.75rem 1rem', opacity: 0.85 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div>
                        <strong>{cv.label}</strong>
                        <span className="badge badge-gray" style={{ marginLeft: 8 }}>
                          Archived
                        </span>
                      </div>
                      <CvViewDownloadButtons
                        viewUrl={studentCvViewUrl(cv.id)}
                        downloadUrl={studentCvDownloadUrl(cv.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <p style={{ marginTop: '1.5rem', fontSize: '0.8rem' }}>
        <Link href="/dashboard/student/documents">Other documents</Link>
        {' · '}
        <Link href="/dashboard/student/profile">My profile</Link>
      </p>
    </div>
  );
}
