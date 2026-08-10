'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useToast } from '@/components/ToastProvider';
import { CvLabelInput } from '@/components/student/StudentCvApply';
import { CV_LABEL_MAX_LENGTH } from '@/lib/studentCvShared';
import { patchStudentCv, postStudentCvUpload, studentCvDownloadUrl, studentCvViewUrl } from '@/lib/studentCvApiPaths';
import CvViewDownloadButtons from '@/components/student/CvViewDownloadButtons';
import {
  STUDENT_CV_LOAD,
  STUDENT_CV_LOAD_MESSAGES,
  fetchStudentCvListClassified,
  studentCvRowMissingFile,
} from '@/lib/studentCvLoadClient';
import { Archive, CheckCircle2, CircleAlert, FileText, Star, Upload } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';

const fetcher = async () => fetchStudentCvListClassified('?includeArchived=1');

function CvLoadBanner({ result }) {
  if (!result || result.status === STUDENT_CV_LOAD.OK) return null;

  if (result.status === STUDENT_CV_LOAD.EMPTY) {
    return null; // empty state is shown in the Active CVs section
  }

  const isRequest = result.status === STUDENT_CV_LOAD.REQUEST_FAILED;
  const isUnavailable = result.status === STUDENT_CV_LOAD.UNAVAILABLE;
  if (!isRequest && !isUnavailable) return null;

  return (
    <Alert role="status">
      <CircleAlert aria-hidden="true" />
      <AlertTitle>{isUnavailable ? 'CV Service Unavailable' : 'Could Not Refresh CVs'}</AlertTitle>
      <AlertDescription>
          {result.message
            || (isUnavailable
              ? STUDENT_CV_LOAD_MESSAGES.UNAVAILABLE
              : STUDENT_CV_LOAD_MESSAGES.REQUEST_FAILED)}
      </AlertDescription>
      {result.errorCode || result.reference ? (
        <p className="text-muted-foreground col-start-2 m-0 text-xs">
          {result.errorCode ? `Code: ${result.errorCode}` : null}
          {result.errorCode && result.reference ? ' · ' : null}
          {result.reference ? `Ref: ${result.reference}` : null}
        </p>
      ) : null}
    </Alert>
  );
}

export default function StudentMyCvsPage() {
  const { addToast } = useToast();
  const { data, isLoading, mutate } = useSWR('student-cv-list-archived', fetcher, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
  });
  const items = Array.isArray(data?.items) ? data.items : [];
  const loadFailed =
    data?.status === STUDENT_CV_LOAD.REQUEST_FAILED
    || data?.status === STUDENT_CV_LOAD.UNAVAILABLE;

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
    <div className="animate-fadeIn flex flex-col gap-4 pb-12">
      <div className="min-w-0">
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <FileText className="text-muted-foreground size-7 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            My CVs
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 text-sm">
            Label each CV (max {CV_LABEL_MAX_LENGTH} characters). Choose which CV to send with each application.
            CVs shared with employers cannot be deleted — archive instead.
          </p>
      </div>

      {data ? <CvLoadBanner result={data} /> : null}

      {cvVerification.required && !cvVerification.hasVerifiedCv && !loadFailed ? (
        <Alert>
          <CircleAlert aria-hidden="true" />
          <AlertTitle>CV Verification Required</AlertTitle>
          <AlertDescription>
              Your college requires CV verification before you can apply to drives and internships.
              Ask your placement office to verify an uploaded CV below.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Upload a New CV</CardTitle>
          <CardDescription>Add a clear label so you can select the right CV for each application.</CardDescription>
        </CardHeader>
        <CardContent>
        <FieldGroup className="max-w-md">
          <Field><CvLabelInput label={label} onChange={setLabel} disabled={uploading} /></Field>
          <Field>
          <Button render={<label htmlFor="new-cv-file" />} nativeButton={false} className="w-fit">
            <Upload data-icon="inline-start" aria-hidden="true" />
            {uploading ? 'Uploading…' : 'Choose file'}
            <input id="new-cv-file" type="file" accept=".pdf,.doc,.docx" hidden disabled={uploading} onChange={onUpload} />
          </Button>
          <FieldDescription>PDF or Word document.</FieldDescription>
          </Field>
        </FieldGroup>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground m-0">Loading…</p>
      ) : (
        <>
          <h2 className="text-foreground m-0 text-lg font-semibold">Active CVs ({active.length})</h2>
          {active.length === 0 ? (
            <Card size="sm">
              <CardContent className="text-muted-foreground py-8 text-center">
                {loadFailed
                  ? 'CV list could not be refreshed. Upload is still available — try again in a moment.'
                  : STUDENT_CV_LOAD_MESSAGES.EMPTY}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {active.map((cv) => (
                <Card key={cv.id} size="sm">
                  <CardHeader>
                    <div className="min-w-0">
                      {editingId === cv.id ? (
                        <Input
                          aria-label="CV label"
                          value={editLabel}
                          maxLength={CV_LABEL_MAX_LENGTH}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="max-w-60"
                        />
                      ) : (
                        <CardTitle className="truncate" title={cv.label}>{cv.label}</CardTitle>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2">
                      {cv.isDefault && <StatusBadge tone="green" showDot>Default</StatusBadge>}
                      {cvVerification.required ? (
                        cv.isVerified ? (
                          <StatusBadge tone="green"><CheckCircle2 aria-hidden="true" /> Verified</StatusBadge>
                        ) : (
                          <StatusBadge tone="amber" showDot>Pending Verification</StatusBadge>
                        )
                      ) : null}
                      </div>
                      {(cv.usedOnApplications || 0) > 0 && (
                        <CardDescription className="mt-2">
                          Used on {cv.usedOnApplications} application{cv.usedOnApplications === 1 ? '' : 's'}
                        </CardDescription>
                      )}
                      {studentCvRowMissingFile(cv) ? (
                        <StatusBadge tone="amber" className="mt-2">{STUDENT_CV_LOAD_MESSAGES.MISSING_FILE}</StatusBadge>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardFooter className="flex-wrap gap-2">
                      {editingId === cv.id ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
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
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingId(cv.id);
                              setEditLabel(cv.label);
                            }}
                          >
                            Edit label
                          </Button>
                          {!cv.isDefault && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await patchCv(cv.id, { action: 'set_default' });
                                  addToast('Default CV updated', 'success');
                                } catch (e) {
                                  addToast(e.message, 'error');
                                }
                              }}
                            >
                              <Star data-icon="inline-start" aria-hidden="true" />
                              Set default
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
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
                            <Archive data-icon="inline-start" aria-hidden="true" />
                            Archive
                          </Button>
                          <CvViewDownloadButtons
                            viewUrl={studentCvRowMissingFile(cv) ? null : studentCvViewUrl(cv.id)}
                            downloadUrl={studentCvRowMissingFile(cv) ? null : studentCvDownloadUrl(cv.id)}
                            viewLabel="View"
                          />
                          {studentCvRowMissingFile(cv) ? (
                            <span className="text-muted-foreground text-xs">File unavailable</span>
                          ) : null}
                        </>
                      )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          {archived.length > 0 && (
            <>
              <h2 className="text-foreground mt-2 mb-0 text-lg font-semibold">Archived ({archived.length})</h2>
              <p className="text-muted-foreground m-0 text-sm">
                Archived CVs are hidden from new applications but remain available to employers for applications that
                already used them.
              </p>
              <div className="grid gap-2">
                {archived.map((cv) => (
                  <Card key={cv.id} size="sm" className="opacity-85">
                    <CardHeader>
                      <CardTitle>{cv.label}</CardTitle>
                      <CardAction><StatusBadge tone="gray">Archived</StatusBadge></CardAction>
                    </CardHeader>
                    <CardFooter>
                      {cv.hasFile === false ? (
                        <span className="text-muted-foreground text-xs">File no longer available</span>
                      ) : (
                        <CvViewDownloadButtons
                          viewUrl={studentCvViewUrl(cv.id)}
                          downloadUrl={studentCvDownloadUrl(cv.id)}
                        />
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <div className="flex gap-2">
        <Button variant="link" render={<Link href="/dashboard/student/documents" />} nativeButton={false}>Other Documents</Button>
        <Button variant="link" render={<Link href="/dashboard/student/profile" />} nativeButton={false}>My Profile</Button>
      </div>
    </div>
  );
}
