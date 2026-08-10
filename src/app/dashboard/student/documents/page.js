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
import { FileText, Grid2X2, List, Upload } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminFilterSelect from '@/components/AdminFilterSelect';

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
    <div className="animate-fadeIn flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <FileText className="text-muted-foreground size-7 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            My Documents
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">
            CVs are managed separately with mandatory labels.{' '}
            <Link href="/dashboard/student/my-cvs" className="text-foreground font-medium hover:underline">
              My CVs
            </Link>{' '}
            — use this page for ID proof, academic records, certificates, and other files.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={view} onValueChange={setView}>
            <TabsList aria-label="Document view">
              <TabsTrigger value="cards"><Grid2X2 data-icon="inline-start" aria-hidden="true" /> Cards</TabsTrigger>
              <TabsTrigger value="table"><List data-icon="inline-start" aria-hidden="true" /> Table</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" render={<Link href="/dashboard/student/my-cvs" />} nativeButton={false}>My CVs</Button>
          <Button type="button" onClick={() => setShowUpload(!showUpload)}>
            <Upload data-icon="inline-start" aria-hidden="true" /> Other Document
          </Button>
        </div>
      </div>

      <Alert>
        <FileText aria-hidden="true" />
        <AlertTitle>CVs / Résumés</AlertTitle>
        <AlertDescription>
            Upload labelled CVs, choose which one to send with each application, and archive old versions. Employers see your
            label only — not the original file name.
          <div className="mt-3"><Button size="sm" render={<Link href="/dashboard/student/my-cvs" />} nativeButton={false}>Go to My CVs</Button></div>
        </AlertDescription>
      </Alert>

      {showUpload && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Another Document</CardTitle>
            <CardDescription>
              ID proof, academic records, certificates, and other files. For CVs, use{' '}
              <Link href="/dashboard/student/my-cvs">My CVs</Link>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="max-w-md">
            <Field>
              <FieldLabel htmlFor="student-document-type">Document Type</FieldLabel>
              <AdminFilterSelect
                id="student-document-type"
                className="w-full"
                value={docType}
                disabled={uploading}
                emptyMapsToAll={false}
                onValueChange={setDocType}
                items={[
                  { label: 'ID proof', value: 'id_proof' },
                  { label: 'Academic', value: 'academic' },
                  { label: 'Certificate', value: 'certificate' },
                  { label: 'Other', value: 'other' },
                ]}
              />
              <FieldDescription>PDF, Word documents, or supported images.</FieldDescription>
            </Field>
            <Field>
              <Button render={<label htmlFor="student-document-file" />} nativeButton={false} className="w-fit">
                {uploading ? 'Uploading…' : 'Choose file'}
                <input
                  id="student-document-file"
                  type="file"
                  hidden
                  accept={STUDENT_DOCUMENT_ACCEPT_ATTR}
                  disabled={uploading}
                  onChange={onFileSelected}
                />
              </Button>
            </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      )}

      {isLoading && <PageLoading message="Loading documents…" inline />}

      {!isLoading && view === 'cards' && (
        <section className="flex flex-col gap-3" aria-labelledby="other-documents-heading">
          <h2 id="other-documents-heading" className="text-foreground m-0 text-lg font-semibold">Other Documents</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {otherDocuments.map((doc) => {
              const dtype = docTypes[doc.document_type] || docTypes.other;
              return (
                <Card key={doc.id} size="sm">
                  <CardHeader>
                    <CardTitle className="break-words">{doc.document_name}</CardTitle>
                    <CardDescription>
                    {dtype.label} • {formatSize(doc.file_size)} • {formatDate(doc.uploaded_at)}
                    </CardDescription>
                    <CardAction><StatusBadge tone={doc.is_verified ? 'green' : 'amber'} showDot>{doc.is_verified ? 'Verified' : 'Pending'}</StatusBadge></CardAction>
                  </CardHeader>
                  <CardFooter className="gap-2">
                    <Button variant="outline" size="sm" render={<a href={`/api/student/documents/view?id=${encodeURIComponent(doc.id)}`} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>Open</Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => setRemoveTarget({ id: doc.id, name: doc.document_name })}>Remove</Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
          {otherDocuments.length === 0 && (
            <Card size="sm"><CardContent className="text-muted-foreground py-8 text-center">
              No other documents yet. Use the upload buttons above.
            </CardContent></Card>
          )}
        </section>
      )}

      {!isLoading && view === 'table' && (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-border border-b py-4">
            <CardTitle>Other Documents</CardTitle>
            <CardDescription>Showing {filteredCount} of {totalCount}</CardDescription>
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
            />
          ) : null}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Role</TableHead>
                  <TableHead>Size</TableHead><TableHead>Uploaded</TableHead><TableHead>Verified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayDocuments.length === 0 && totalCount > 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                      No documents match your search.
                    </TableCell>
                  </TableRow>
                ) : null}
                {displayDocuments.map((doc) => {
                  const dtype = docTypes[doc.document_type] || docTypes.other;
                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="max-w-64 truncate font-medium" title={doc.document_name}>{doc.document_name}</TableCell>
                      <TableCell>{dtype.label}</TableCell><TableCell>—</TableCell>
                      <TableCell className="tabular-nums">{formatSize(doc.file_size)}</TableCell>
                      <TableCell>{formatDate(doc.uploaded_at)}</TableCell>
                      <TableCell><StatusBadge tone={doc.is_verified ? 'green' : 'amber'} showDot>{doc.is_verified ? 'Verified' : 'Pending'}</StatusBadge></TableCell>
                      <TableCell className="text-right"><div className="inline-flex gap-1.5">
                        <Button variant="ghost" size="sm" render={<a href={`/api/student/documents/view?id=${encodeURIComponent(doc.id)}`} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>Open</Button>
                        <Button type="button" variant="destructive" size="sm" onClick={() => setRemoveTarget({ id: doc.id, name: doc.document_name })}>Remove</Button>
                      </div></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          {totalCount === 0 && (
            <p className="text-muted-foreground m-0 p-6 text-center text-sm">
              No documents yet. Upload your primary CV on Profile, or use the buttons above.
            </p>
          )}
          </CardContent>
        </Card>
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
