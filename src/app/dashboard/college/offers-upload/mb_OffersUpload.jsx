'use client';

import Link from 'next/link';
import { useState } from 'react';
import { mutate } from 'swr';
import { FileUp, Send, Download, FileText } from 'lucide-react';
import MobileHeader from '@/components/mobile/MobileHeader';
import { useToast } from '@/components/ToastProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
          <Button render={<Link href="/dashboard/college/offers" />} variant="ghost" size="icon-sm" aria-label="View all offers"><Send /></Button>
        }
      />

      <div className="animate-fadeIn flex flex-col gap-4 px-4 pt-4 pb-20">
        <CollegeOffersUploadMeta compact />

        <Card>
          <CardHeader>
            <CardTitle>1. Download template</CardTitle>
            <CardDescription>Required: roll_number, company_name, job_title</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button type="button" variant="outline" onClick={downloadBlankTemplate}>
              <FileText data-icon="inline-start" />
              Blank template
            </Button>
            <Button type="button" variant="secondary" onClick={downloadAssessmentStarter}>
              <Download data-icon="inline-start" />
              All students (assessment prefill)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>2. Upload CSV</CardTitle></CardHeader>
          <CardContent>
          <Button render={<label />} className="w-full" aria-disabled={uploading}>
            <FileUp data-icon="inline-start" />
            {uploading ? 'Importing…' : 'Select CSV file'}
            <input type="file" accept=".csv,text/csv" hidden disabled={uploading} onChange={handleUpload} />
          </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
