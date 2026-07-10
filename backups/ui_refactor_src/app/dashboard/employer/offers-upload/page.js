'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FileUp, Send } from 'lucide-react';
import { downloadEmployerOffersTemplate } from '@/lib/employerOffersCsvTemplate';
import { EMPLOYER_OFFERS_ALL_STUDENTS_CSV_FILENAME } from '@/lib/offersAssessmentStarterCsv';
import { downloadCsvFromApi } from '@/lib/downloadCsvFromApi';
import { useToast } from '@/components/ToastProvider';

export default function EmployerOffersUploadPage() {
  const { addToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [campusesLoading, setCampusesLoading] = useState(true);
  const [approvedCampuses, setApprovedCampuses] = useState([]);
  const [assessmentCampusId, setAssessmentCampusId] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setCampusesLoading(true);
      try {
        const res = await fetch('/api/employer/campuses');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load campuses');
        const list = Array.isArray(json.colleges) ? json.colleges : [];
        const approved = list.filter((c) => String(c.approval_status || '').toLowerCase() === 'approved');
        if (!mounted) return;
        setApprovedCampuses(approved);
      } catch (e) {
        if (!mounted) return;
        setApprovedCampuses([]);
        addToast(e.message || 'Could not load campuses', 'error');
      } finally {
        if (mounted) setCampusesLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadAssessmentStarter = async () => {
    try {
      const q = assessmentCampusId ? `?tenantId=${encodeURIComponent(assessmentCampusId)}` : '';
      await downloadCsvFromApi(`/api/employer/offers/assessment-starter${q}`, EMPLOYER_OFFERS_ALL_STUDENTS_CSV_FILENAME);
      addToast('Every master-list student on the selected campus(es) is listed with tenant_id; drive_id filled when the latest assessment batch had a drive.', 'success');
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
      const res = await fetch('/api/employer/offers/upload', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Upload failed');
      const { accepted, errors } = json;
      addToast(
        `Imported ${accepted} row(s).${errors?.length ? ` ${errors.length} issue(s).` : ''}`,
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
            Import offers by campus roll number. Each student must already have <strong>applied</strong> to one of your placement drives. Open{' '}
            <Link href="/dashboard/employer/offers" className="link-inline" style={{ fontWeight: 600 }}>
              Offers
            </Link>{' '}
            for the list and single-row create.
          </p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <Link href="/dashboard/employer/offers" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Send size={16} aria-hidden /> View all offers
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2 className="card-title" style={{ marginBottom: '0.75rem' }}>
          Step 1 — Download template
        </h2>
        <p className="text-sm text-secondary" style={{ marginBottom: '1rem', lineHeight: 1.55 }}>
          Columns: <code>roll_number</code>, <code>tenant_id</code> (campus UUID — omit only if you have exactly one approved campus), <code>job_title</code>, plus optional
          salary, location, <code>joining_date</code>, <code>deadline</code>, <code>drive_id</code>, <code>status</code>. Rows are matched to each campus{' '}
          <strong>master student list</strong> (roll + tenant), not applications. <strong>Default status is accepted</strong> (hires already confirmed outside the app). Set{' '}
          <code>status=pending</code> when the student should accept on <strong>My Offers</strong>.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <button type="button" className="btn btn-secondary" onClick={downloadEmployerOffersTemplate}>
            Blank template
          </button>
        </div>
        <div className="form-group" style={{ marginTop: '1rem', marginBottom: 0 }}>
          <label className="form-label">Offers CSV — all master-list students (optional campus filter)</label>
          <select
            className="form-select"
            value={assessmentCampusId}
            disabled={campusesLoading}
            onChange={(e) => setAssessmentCampusId(e.target.value)}
          >
            <option value="">All approved campuses</option>
            {approvedCampuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.city ? ` (${c.city})` : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-tertiary" style={{ margin: '0.5rem 0 0', lineHeight: 1.5 }}>
            Lists <strong>every</strong> student on the campus master roster (same as the college&apos;s Students list). <code>tenant_id</code> is always set;{' '}
            <code>drive_id</code> comes from the <strong>newest</strong> assessment upload row for that student when present.
          </p>
          <button type="button" className="btn btn-secondary" style={{ marginTop: '0.75rem' }} onClick={downloadAssessmentStarter}>
            Download offers CSV (all students)
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2 className="card-title" style={{ marginBottom: '0.75rem' }}>
          Step 2 — Upload filled CSV
        </h2>
        <label className="btn btn-primary" style={{ cursor: uploading ? 'wait' : 'pointer', margin: 0 }}>
          {uploading ? 'Importing…' : 'Choose CSV file'}
          <input type="file" accept=".csv,text/csv" hidden disabled={uploading} onChange={onUploadCsv} />
        </label>
      </div>

      <div className="directive-panel" role="region" aria-label="Employer offer CSV rules">
        <p className="directive-panel__title">Validation</p>
        <p className="text-sm text-secondary" style={{ margin: 0, lineHeight: 1.55 }}>
          Each row must match a student on that campus <strong>master list</strong> (<code>roll_number</code> + <code>tenant_id</code>). If import fails, check the roll on
          the college&apos;s Students screen and that <code>tenant_id</code> is an approved campus UUID (or use a single-campus partnership so it can be omitted). Imported
          rows are stored as <strong>accepted</strong> unless you set another <code>status</code> in the file (use <code>pending</code> for in-app acceptance).
        </p>
      </div>
    </div>
  );
}
