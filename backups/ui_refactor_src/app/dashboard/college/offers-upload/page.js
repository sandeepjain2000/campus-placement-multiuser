'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FileUp, Send } from 'lucide-react';
import { downloadCollegeOffersTemplate } from '@/lib/collegeOffersCsvTemplate';
import { COLLEGE_OFFERS_ALL_STUDENTS_CSV_FILENAME } from '@/lib/offersAssessmentStarterCsv';
import { downloadCsvFromApi } from '@/lib/downloadCsvFromApi';
import { useToast } from '@/components/ToastProvider';

export default function CollegeOffersUploadPage() {
  const { addToast } = useToast();
  const [uploading, setUploading] = useState(false);

  const downloadAssessmentStarter = async () => {
    try {
      await downloadCsvFromApi('/api/college/offers/assessment-starter', COLLEGE_OFFERS_ALL_STUDENTS_CSV_FILENAME);
      addToast('Every campus master-list student is included (company from newest assessment when present).', 'success');
    } catch (e) {
      addToast(e.message || 'Download failed', 'error');
    }
  };

  const onUploadCsv = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/college/offers/upload', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Upload failed');
      const { accepted, errors } = json;
      addToast(
        `Imported ${accepted} row(s).${errors?.length ? ` ${errors.length} issue(s) — see below.` : ''}`,
        accepted ? 'success' : 'warning',
      );
      if (errors?.length) {
        addToast(errors.slice(0, 5).map((x) => `Line ${x.line}: ${x.message}`).join(' · '), 'error');
      }
    } catch (err) {
      addToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileUp size={24} aria-hidden /> Upload offers (CSV)
          </h1>
          <p className="text-secondary" style={{ margin: '0.25rem 0 0', fontSize: '0.9375rem' }}>
            College placement office: bulk-import offers for students on your master list. For the full table and manual edits, open{' '}
            <Link href="/dashboard/college/offers" className="link-inline" style={{ fontWeight: 600 }}>
              Offers
            </Link>
            .
          </p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <Link href="/dashboard/college/offers" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Send size={16} aria-hidden /> View all offers
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2 className="card-title" style={{ marginBottom: '0.75rem' }}>
          Step 1 — Download template
        </h2>
        <p className="text-sm text-secondary" style={{ marginBottom: '1rem', lineHeight: 1.55 }}>
          Columns: <code>roll_number</code>, <code>company_name</code>, <code>job_title</code>, plus optional salary, location, deadline, status.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <button type="button" className="btn btn-secondary" onClick={downloadCollegeOffersTemplate}>
            Blank template
          </button>
          <button type="button" className="btn btn-secondary" onClick={downloadAssessmentStarter}>
            Offers CSV (all students)
          </button>
        </div>
        <p className="text-xs text-tertiary" style={{ margin: '0.75rem 0 0', lineHeight: 1.5 }}>
          Includes <strong>every</strong> student on your <Link href="/dashboard/college/students">master list</Link> with a roll. <code>company_name</code> is filled from
          the <Link href="/dashboard/college/hiring-assessment">newest assessment upload</Link> when that student appears there; otherwise leave blank and enter manually.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2 className="card-title" style={{ marginBottom: '0.75rem' }}>
          Step 2 — Upload filled CSV
        </h2>
        <p className="text-sm text-secondary" style={{ marginBottom: '1rem', lineHeight: 1.55 }}>
          Each <strong>roll number</strong> must exist on your <Link href="/dashboard/college/students">Students</Link> screen.
        </p>
        <label className="btn btn-primary" style={{ cursor: uploading ? 'wait' : 'pointer', margin: 0 }}>
          {uploading ? 'Importing…' : 'Choose CSV file'}
          <input type="file" accept=".csv,text/csv" hidden disabled={uploading} onChange={onUploadCsv} />
        </label>
      </div>

      <div className="directive-panel" role="region" aria-label="Offer import rules">
        <p className="directive-panel__title">After import</p>
        <p className="text-sm text-secondary" style={{ margin: 0, lineHeight: 1.55 }}>
          Students see pending rows on <strong>My Offers</strong> and can accept or decline. Optional status in CSV: pending, accepted, rejected, expired, revoked
          (defaults to pending).
        </p>
      </div>
    </div>
  );
}
