'use client';

import Link from 'next/link';
import { useState } from 'react';
import { mutate } from 'swr';
import { FileUp, Send, Download, FileText } from 'lucide-react';
import MobileHeader from '@/components/mobile/MobileHeader';
import { useToast } from '@/components/ToastProvider';
import {
  CollegeOffersUploadMeta,
  useCollegeOffersUploadActions,
} from '@/components/college/CollegeOffersUploadPanel';

export default function MbCollegeOffersUpload() {
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
    <>
      <MobileHeader
        title="Upload Offers"
        action={
          <Link href="/dashboard/college/offers" className="btn btn-ghost btn-sm" style={{ padding: '0.4rem', color: 'var(--primary-600)' }}>
            <Send size={18} />
          </Link>
        }
      />

      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>
        <CollegeOffersUploadMeta compact />

        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem', border: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--text-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>1</span>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Download template</h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Required: roll_number, company_name, job_title
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button type="button" className="btn btn-outline" onClick={downloadBlankTemplate} style={{ width: '100%', justifyContent: 'center' }}>
              <FileText size={16} style={{ marginRight: '0.5rem' }} />
              Blank template
            </button>
            <button type="button" className="btn btn-secondary" onClick={downloadAssessmentStarter} style={{ width: '100%', justifyContent: 'center' }}>
              <Download size={16} style={{ marginRight: '0.5rem' }} />
              All students (assessment prefill)
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--text-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>2</span>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Upload CSV</h3>
          </div>
          <label className="btn btn-primary" style={{ display: 'flex', width: '100%', justifyContent: 'center', cursor: uploading ? 'wait' : 'pointer' }}>
            <FileUp size={16} style={{ marginRight: '0.5rem' }} />
            {uploading ? 'Importing…' : 'Select CSV file'}
            <input type="file" accept=".csv,text/csv" hidden disabled={uploading} onChange={handleUpload} />
          </label>
        </div>
      </div>
    </>
  );
}
