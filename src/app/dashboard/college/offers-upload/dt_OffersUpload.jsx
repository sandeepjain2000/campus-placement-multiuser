'use client';

import Link from 'next/link';
import { useState } from 'react';
import { mutate } from 'swr';
import { FileUp, Send } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import {
  CollegeOffersUploadMeta,
  useCollegeOffersUploadActions,
} from '@/components/college/CollegeOffersUploadPanel';

export default function DtCollegeOffersUpload() {
  const { addToast } = useToast();
  const [uploading, setUploading] = useState(false);

  const refreshMeta = () => mutate('/api/college/offers/upload-meta');

  const { downloadAssessmentStarter, onUploadCsv, downloadBlankTemplate } = useCollegeOffersUploadActions({
    addToast,
    onUploadSuccess: refreshMeta,
  });

  const handleUpload = async (e) => {
    setUploading(true);
    try {
      await onUploadCsv(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <FileUp size={24} aria-hidden />
            Upload offers (CSV)
          </h1>
          <p className="text-secondary" style={{ margin: '0.35rem 0 0', fontSize: '0.9375rem', maxWidth: 640 }}>
            Bulk-import offers for students on your master list. View and edit the full table on{' '}
            <Link href="/dashboard/college/offers" className="link-inline" style={{ fontWeight: 600 }}>
              Offers
            </Link>
            .
          </p>
        </div>
        <div className="page-header-actions">
          <Link href="/dashboard/college/offers" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Send size={16} aria-hidden />
            View all offers
          </Link>
        </div>
      </div>

      <CollegeOffersUploadMeta />

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2 className="card-title" style={{ marginBottom: '0.75rem' }}>
          Step 1 — Download template
        </h2>
        <p className="text-sm text-secondary" style={{ marginBottom: '1rem', lineHeight: 1.55 }}>
          Columns: <code>roll_number</code>, <code>company_name</code>, <code>job_title</code>, plus optional salary, location, deadline, status.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={downloadBlankTemplate}>
            Blank template
          </button>
          <button type="button" className="btn btn-secondary" onClick={downloadAssessmentStarter}>
            All students (assessment prefill)
          </button>
        </div>
        <p className="text-xs text-tertiary" style={{ margin: '0.75rem 0 0', lineHeight: 1.5 }}>
          The all-students file includes every roll on your{' '}
          <Link href="/dashboard/college/students">master list</Link>. <code>company_name</code> is filled from the{' '}
          <Link href="/dashboard/college/hiring-assessment">newest assessment upload</Link> when available.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2 className="card-title" style={{ marginBottom: '0.75rem' }}>
          Step 2 — Upload filled CSV
        </h2>
        <p className="text-sm text-secondary" style={{ marginBottom: '1rem', lineHeight: 1.55 }}>
          Each <strong>roll number</strong> must exist on your Students screen.
        </p>
        <label className="btn btn-primary" style={{ cursor: uploading ? 'wait' : 'pointer', margin: 0 }}>
          {uploading ? 'Importing…' : 'Choose CSV file'}
          <input type="file" accept=".csv,text/csv" hidden disabled={uploading} onChange={handleUpload} />
        </label>
      </div>

      <div className="directive-panel" role="region" aria-label="Offer import rules">
        <p className="directive-panel__title">After import</p>
        <p className="text-sm text-secondary" style={{ margin: 0, lineHeight: 1.55 }}>
          Students see pending rows on <strong>My Offers</strong> and can accept or decline. Optional status in CSV: pending, accepted, rejected, expired, revoked (defaults to pending).
        </p>
      </div>
    </div>
  );
}

