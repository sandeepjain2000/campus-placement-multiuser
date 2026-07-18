'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import DataTableToolbar from '@/components/DataTableToolbar';
import { useDataTableQuery } from '@/hooks/useDataTableQuery';
import { COMMON_SORT_OPTIONS } from '@/lib/tableQueryPresets';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';
import PageError from '@/components/PageError';
import PageLoading from '@/components/PageLoading';
import ConfirmDialog from '@/components/ConfirmDialog';
import { STUDENT_DOCUMENT_ACCEPT_ATTR } from '@/lib/studentDocumentUpload';
import { uploadStudentDocumentViaServer } from '@/lib/clientStudentDocumentUpload';

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
  const [docType, setDocType] = useState('academic');
  const [uploading, setUploading] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);

  const documents = useMemo(
    () =>
      (data?.documents || []).filter(
        (d) => String(d.document_type || '').toLowerCase() !== 'resume',
      ),
    [data],
  );

  const {
    search,
    setSearch,
    sort,
    setSort,
    filtered: displayDocuments,
    filteredCount,
    totalCount,
    hasActiveFilters,
    clearFilters,
  } = useDataTableQuery(documents, {
    getSearchText: (doc) =>
      [
        doc.document_name,
        doc.document_type,
        doc.is_primary_resume ? 'primary cv' : '',
        doc.is_verified ? 'verified' : 'pending',
      ]
        .filter(Boolean)
        .join(' '),
    sortOptions: COMMON_SORT_OPTIONS,
    defaultSort: 'date_desc',
  });

  const otherDocuments = documents;

  const docTypes = {
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
      const result = await uploadStudentDocumentViaServer(file, {
        documentType: docType,
        setAsPrimaryResume: false,
      });
      if (!result.ok) {
        addToast(result.error + (result.hint ? ` — ${result.hint}` : ''), 'warning');
        return;
      }

      mutate();
      setShowUpload(false);
      addToast('Document uploaded.', 'success');
    } catch {
      addToast('Upload failed (network).', 'warning');
    } finally {
      setUploading(false);
    }
  }, [addToast, docType, mutate]);

  const removeDoc = async (id) => {
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
            CVs are managed separately with mandatory labels.{' '}
            <Link href="/dashboard/student/my-cvs" style={{ fontWeight: 600 }}>
              My CVs
            </Link>{' '}
            — use this page for ID proof, academic records, certificates, and other files.
          </p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <div className="view-toggle" role="group" aria-label="Document view">
            <button type="button" className={view === 'cards' ? 'active' : ''} onClick={() => setView('cards')}>Cards</button>
            <button type="button" className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>Table</button>
          </div>
          <Link href="/dashboard/student/my-cvs" className="btn btn-secondary">
            My CVs
          </Link>
          <button type="button" className="btn btn-primary" onClick={() => setShowUpload(!showUpload)}>
            + Other document
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem', border: '1px solid var(--primary-200)', background: 'var(--primary-50)' }}>
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-900)' }}>
            CVs / résumés
          </h3>
          <p className="text-sm text-secondary" style={{ margin: '0 0 0.75rem', lineHeight: 1.55 }}>
            Upload labelled CVs, choose which one to send with each application, and archive old versions. Employers see your
            label only — not the original file name.
          </p>
          <Link href="/dashboard/student/my-cvs" className="btn btn-primary btn-sm">
            Go to My CVs
          </Link>
        </div>
      </div>

      {showUpload && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '2px dashed var(--primary-300)' }}>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '0.75rem' }}>Upload another document</h3>
            <p className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>
              ID proof, academic records, certificates, and other files. For CVs, use{' '}
              <Link href="/dashboard/student/my-cvs">My CVs</Link>.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
              <select className="form-select" style={{ width: 'auto' }} value={docType} onChange={(e) => setDocType(e.target.value)} disabled={uploading}>
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
                  accept={STUDENT_DOCUMENT_ACCEPT_ATTR}
                  disabled={uploading}
                  onChange={onFileSelected}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {isLoading && <PageLoading message="Loading documents…" inline />}

      {!isLoading && view === 'cards' && (
        <>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Other documents</h2>
          <div className="grid grid-3">
            {otherDocuments.map((doc) => {
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
                    <a
                      className="btn btn-ghost btn-sm"
                      style={{ flex: 1 }}
                      href={`/api/student/documents/view?id=${encodeURIComponent(doc.id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open
                    </a>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--danger-500)' }}
                      onClick={() => setRemoveTarget({ id: doc.id, name: doc.document_name })}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {otherDocuments.length === 0 && (
            <p className="text-sm text-secondary" style={{ marginTop: '0.5rem' }}>
              No other documents yet. Use the upload buttons above.
            </p>
          )}
        </>
      )}

      {!isLoading && view === 'table' && (
        <div className="card">
          {totalCount > 0 ? (
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search document name or type…"
              sort={sort}
              onSortChange={setSort}
              sortOptions={COMMON_SORT_OPTIONS}
              filteredCount={filteredCount}
              totalCount={totalCount}
              hasActiveFilters={hasActiveFilters}
              onClear={clearFilters}
              style={{ marginBottom: 0, borderRadius: 0, border: 'none', borderBottom: '1px solid var(--border-default)' }}
            />
          ) : null}
          <div className="table-container">
            <table className="data-table data-table-mobile-cards">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Role</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th>Verified</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {displayDocuments.length === 0 && totalCount > 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-secondary">
                      No documents match your search.
                    </td>
                  </tr>
                ) : null}
                {displayDocuments.map((doc) => {
                  const dtype = docTypes[doc.document_type] || docTypes.other;
                  return (
                    <tr key={doc.id}>
                      <td className="font-semibold" data-label="Name">{doc.document_name}</td>
                      <td data-label="Type">{dtype.label}</td>
                      <td data-label="Role">—</td>
                      <td data-label="Size">{formatSize(doc.file_size)}</td>
                      <td data-label="Uploaded">{formatDate(doc.uploaded_at)}</td>
                      <td data-label="Verified">{doc.is_verified ? 'Yes' : 'Pending'}</td>
                      <td data-label="Actions" style={{ whiteSpace: 'nowrap' }}>
                        <a
                          className="btn btn-ghost btn-sm"
                          href={`/api/student/documents/view?id=${encodeURIComponent(doc.id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open
                        </a>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--danger-500)' }}
                          onClick={() => setRemoveTarget({ id: doc.id, name: doc.document_name })}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalCount === 0 && (
            <p className="text-sm text-secondary" style={{ padding: '1rem' }}>
              No documents yet. Upload your primary CV on Profile, or use the buttons above.
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove document?"
        message={
          removeTarget
            ? `"${removeTarget.name}" will be removed from your document list.`
            : ''
        }
        confirmLabel="Remove document"
        onCancel={() => setRemoveTarget(null)}
        onConfirm={async () => {
          if (!removeTarget) return;
          const targetId = removeTarget.id;
          setRemoveTarget(null);
          await removeDoc(targetId);
        }}
      />
    </div>
  );
}
