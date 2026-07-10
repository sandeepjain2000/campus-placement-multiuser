'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';
import PageError from '@/components/PageError';

const fetcher = (url) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to load documents');
  return res.json();
});

function formatSize(bytes) {
  if (bytes == null || Number.isNaN(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function StudentDocumentsPage() {
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/student/documents', fetcher);
  const [showUpload, setShowUpload] = useState(false);
  const [view, setView] = useState('cards');
  const [docType, setDocType] = useState('resume');
  const [uploading, setUploading] = useState(false);

  const documents = data?.documents || [];

  const docTypes = {
    resume: { label: 'Resume', icon: '📄', color: 'indigo' },
    id_proof: { label: 'ID Proof', icon: '🪪', color: 'blue' },
    academic: { label: 'Academic', icon: '🎓', color: 'green' },
    certificate: { label: 'Certificate', icon: '🏆', color: 'amber' },
    other: { label: 'Other', icon: '📎', color: 'gray' },
  };

  const onFileSelected = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const presignRes = await fetch('/api/student/documents/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          fileSize: file.size,
        }),
      });
      const presign = await presignRes.json();
      if (!presignRes.ok) {
        addToast(presign.error + (presign.hint ? ` — ${presign.hint}` : ''), 'warning');
        return;
      }

      const putHeaders = {};
      if (presign.contentType) {
        putHeaders['Content-Type'] = String(presign.contentType).split(';')[0].trim();
      }
      const putRes = await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: putHeaders,
        body: file,
      });
      if (!putRes.ok) {
        const raw = (await putRes.text()).replace(/\s+/g, ' ').trim();
        const code = (raw.match(/<Code>([^<]+)<\/Code>/) || [])[1];
        const msg = (raw.match(/<Message>([^<]+)<\/Message>/) || [])[1];
        const hint = code || msg ? `${code || 'Error'}${msg ? `: ${msg}` : ''}` : raw.slice(0, 140);
        addToast(
          `Upload failed (${putRes.status}). ${hint || 'Check bucket CORS (include your exact Vercel origin) and IAM PutObject on students/*.'}`,
          'warning',
        );
        return;
      }

      const completeRes = await fetch('/api/student/documents/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_type: docType,
          document_name: file.name,
          file_url: presign.fileUrl,
          file_size: file.size,
        }),
      });
      const complete = await completeRes.json();
      if (!completeRes.ok) {
        addToast(complete.error || 'Could not save document metadata', 'warning');
        return;
      }

      mutate();
      setShowUpload(false);
      addToast('Document uploaded.', 'info');
    } catch {
      addToast('Upload failed (network).', 'warning');
    } finally {
      setUploading(false);
    }
  }, [addToast, docType, mutate]);

  const removeDoc = async (id) => {
    if (!confirm('Remove this document record from your profile?')) return;
    const res = await fetch(`/api/student/documents?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      addToast(j.error || 'Delete failed', 'warning');
      return;
    }
    mutate();
    addToast('Document removed.', 'info');
  };

  if (error) return <PageError error={error} />;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>📄 My documents</h1>
          <p>
            Upload resumes, certificates, ID proofs, and scans — files are stored in <strong>S3</strong> (same AWS env as
            profile photo); metadata is saved in Postgres.
          </p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <div className="view-toggle" role="group" aria-label="Document view">
            <button type="button" className={view === 'cards' ? 'active' : ''} onClick={() => setView('cards')}>Cards</button>
            <button type="button" className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>Table</button>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setShowUpload(!showUpload)}>+ Upload</button>
        </div>
      </div>

      {showUpload && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '2px dashed var(--primary-300)' }}>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '0.75rem' }}>Upload a file</h3>
            <p className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>
              PDF, Word (.doc / .docx), JPEG, PNG, WebP, GIF · max 5MB · needs AWS/S3 env vars on the server (Vercel).
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
              <select className="form-select" style={{ width: 'auto' }} value={docType} onChange={(e) => setDocType(e.target.value)} disabled={uploading}>
                <option value="resume">Resume</option>
                <option value="id_proof">ID proof</option>
                <option value="academic">Academic</option>
                <option value="certificate">Certificate</option>
                <option value="other">Other</option>
              </select>
              <label className="btn btn-primary" style={{ cursor: uploading ? 'wait' : 'pointer', margin: 0 }}>
                {uploading ? 'Uploading…' : 'Choose file'}
                <input
                  type="file"
                  hidden
                  accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp,image/gif"
                  disabled={uploading}
                  onChange={onFileSelected}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {isLoading && <p className="text-sm text-secondary">Loading documents…</p>}

      {!isLoading && view === 'cards' && (
        <div className="grid grid-3">
          {documents.map((doc) => {
            const dtype = docTypes[doc.document_type] || docTypes.other;
            return (
              <div key={doc.id} className="card card-hover">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div className={`stats-card-icon ${dtype.color}`} style={{ width: 40, height: 40, fontSize: '1.125rem' }}>
                    {dtype.icon}
                  </div>
                  <span className={`badge badge-${doc.is_verified ? 'green' : 'amber'}`}>
                    {doc.is_verified ? '✅ Verified' : '⏳ Pending'}
                  </span>
                </div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', wordBreak: 'break-word' }}>{doc.document_name}</h4>
                <div className="text-xs text-tertiary" style={{ marginBottom: '0.75rem' }}>
                  {dtype.label} • {formatSize(doc.file_size)} • {formatDate(doc.uploaded_at)}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <a className="btn btn-ghost btn-sm" style={{ flex: 1 }} href={doc.file_url} target="_blank" rel="noopener noreferrer">Open</a>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger-500)' }} onClick={() => removeDoc(doc.id)}>Remove</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && view === 'table' && (
        <div className="card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th>Verified</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const dtype = docTypes[doc.document_type] || docTypes.other;
                  return (
                    <tr key={doc.id}>
                      <td className="font-semibold">{doc.document_name}</td>
                      <td>{dtype.label}</td>
                      <td>{formatSize(doc.file_size)}</td>
                      <td>{formatDate(doc.uploaded_at)}</td>
                      <td>{doc.is_verified ? 'Yes' : 'Pending'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <a className="btn btn-ghost btn-sm" href={doc.file_url} target="_blank" rel="noopener noreferrer">Open</a>
                        <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger-500)' }} onClick={() => removeDoc(doc.id)}>Remove</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {documents.length === 0 && (
            <p className="text-sm text-secondary" style={{ padding: '1rem' }}>
              No documents yet. Use Upload above — files go to S3 when AWS credentials are set.
            </p>
          )}
        </div>
      )}

      {!isLoading && view === 'cards' && documents.length === 0 && !showUpload && (
        <p className="text-sm text-secondary" style={{ marginTop: '1rem' }}>No documents yet.</p>
      )}
    </div>
  );
}
