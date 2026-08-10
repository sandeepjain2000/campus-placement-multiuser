'use client';

import Link from 'next/link';
import { useState } from 'react';
import { mutate } from 'swr';
import { Download, FileText, FileUp, Send } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="animate-fadeIn flex flex-col gap-5 pb-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <FileUp className="text-muted-foreground size-7" strokeWidth={1.5} aria-hidden />
            Upload offers (CSV)
          </h1>
          <p className="text-muted-foreground m-0 max-w-2xl text-sm">
            Bulk-import offers for students on your master list. View and edit the full table on{' '}
            <Link href="/dashboard/college/offers" className="text-primary font-medium">
              Offers
            </Link>
            .
          </p>
        </div>
          <Button render={<Link href="/dashboard/college/offers" />} variant="outline">
            <Send data-icon="inline-start" aria-hidden />
            View all offers
          </Button>
      </div>

      <CollegeOffersUploadMeta />

      <Card>
        <CardHeader>
          <CardTitle>1. Download a template</CardTitle>
          <CardDescription>
          Columns: <code>roll_number</code>, <code>company_name</code>, <code>job_title</code>, plus optional salary, location, deadline, status.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={downloadBlankTemplate}>
            <FileText data-icon="inline-start" />
            Blank template
          </Button>
          <Button type="button" variant="secondary" onClick={downloadAssessmentStarter}>
            <Download data-icon="inline-start" />
            All students (assessment prefill)
          </Button>
        <p className="text-muted-foreground m-0 basis-full pt-2 text-xs leading-5">
          The all-students file includes every roll on your{' '}
          <Link href="/dashboard/college/students">master list</Link>. <code>company_name</code> is filled from the{' '}
          <Link href="/dashboard/college/hiring-assessment">newest assessment upload</Link> when available.
        </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Upload the completed CSV</CardTitle>
          <CardDescription>Each roll number must exist on your Students screen.</CardDescription>
        </CardHeader>
        <CardContent>
        <Button render={<label />} aria-disabled={uploading}>
          <FileUp data-icon="inline-start" />
          {uploading ? 'Importing…' : 'Choose CSV file'}
          <input type="file" accept=".csv,text/csv" hidden disabled={uploading} onChange={handleUpload} />
        </Button>
        </CardContent>
      </Card>

      <Alert>
        <AlertTitle>After import</AlertTitle>
        <AlertDescription>
          Students see pending rows on <strong>My Offers</strong> and can accept or decline. Optional status in CSV: pending, accepted, rejected, expired, revoked (defaults to pending).
        </AlertDescription>
      </Alert>
    </div>
  );
}

