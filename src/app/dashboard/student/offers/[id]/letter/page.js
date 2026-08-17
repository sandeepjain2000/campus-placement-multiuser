'use client';

import { use } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowLeft, ExternalLink, FileText } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageLoading from '@/components/PageLoading';
import {
  STUDENT_OFFER_LETTER_ERRORS,
  resolveStudentOfferLetterErrorMessage,
} from '@/lib/studentOfferLetter';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

class OfferLetterLoadError extends Error {
  constructor(status, code) {
    super(resolveStudentOfferLetterErrorMessage(status, code));
    this.name = 'OfferLetterLoadError';
    this.status = status;
    this.code = code;
  }
}

const fetcher = async (url) => {
  let res;
  try {
    res = await fetch(url);
  } catch {
    throw new OfferLetterLoadError(0, 'NETWORK');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new OfferLetterLoadError(res.status, data?.code);
  }
  if (!data?.letter) {
    throw new OfferLetterLoadError(404, 'NOT_FOUND');
  }
  return data;
};

function OfferLetterErrorState({ message }) {
  return (
    <div className="animate-fadeIn mx-auto flex max-w-3xl flex-col gap-4 py-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        render={<Link href="/dashboard/student/offers" />}
        nativeButton={false}
      >
        <ArrowLeft data-icon="inline-start" /> Back to My Offers
      </Button>
      <Alert variant="destructive">
        <AlertTitle>Offer letter unavailable</AlertTitle>
        <AlertDescription>{message || STUDENT_OFFER_LETTER_ERRORS.LOAD_FAILED}</AlertDescription>
      </Alert>
    </div>
  );
}

export default function StudentOfferLetterPage({ params }) {
  const { id } = use(params);
  const offerId = String(id || '').trim();
  const { data, error, isLoading } = useSWR(
    offerId ? `/api/student/offers/${encodeURIComponent(offerId)}/letter` : null,
    fetcher,
    {
      shouldRetryOnError: false,
      onErrorRetry: () => {},
    },
  );

  if (!offerId) {
    return <OfferLetterErrorState message={STUDENT_OFFER_LETTER_ERRORS.INVALID_ID} />;
  }

  if (isLoading) return <PageLoading message="Loading offer letter…" variant="skeleton-card" />;

  if (error || !data?.letter) {
    const message =
      error instanceof OfferLetterLoadError
        ? error.message
        : resolveStudentOfferLetterErrorMessage(error?.status, error?.code);
    return <OfferLetterErrorState message={message} />;
  }

  const letter = data.letter;

  return (
    <div className="animate-fadeIn mx-auto flex max-w-3xl flex-col gap-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/dashboard/student/offers" />}
          nativeButton={false}
        >
          <ArrowLeft data-icon="inline-start" /> Back to My Offers
        </Button>
        {letter.fileUrl ? (
          <Button
            variant="outline"
            size="sm"
            render={<a href={letter.fileUrl} target="_blank" rel="noopener noreferrer" />}
            nativeButton={false}
          >
            <ExternalLink data-icon="inline-start" /> Open attached file
          </Button>
        ) : null}
      </div>

      {letter.fileUnavailable ? (
        <Alert><AlertTitle>Attachment unavailable</AlertTitle><AlertDescription>{STUDENT_OFFER_LETTER_ERRORS.FILE_UNAVAILABLE}</AlertDescription></Alert>
      ) : null}

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="flex-row items-start gap-3 border-b px-6 py-5">
          <FileText className="text-primary mt-0.5 size-6 shrink-0" />
          <div>
            <CardTitle className="text-xl">Offer letter</CardTitle>
            <CardDescription className="mt-1">
              {letter.company} · {letter.role}
              {letter.salary != null && Number(letter.salary) > 0 ? ` · ${formatCurrency(letter.salary)}` : ''}
            </CardDescription>
            {letter.joiningDate ? (
              <p className="text-muted-foreground mt-1 mb-0 text-xs">
                Joining {formatDate(letter.joiningDate)}
              </p>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="px-6 py-5">
        <div className="bg-muted/50 whitespace-pre-wrap rounded-lg border p-5 text-[0.95rem] leading-7">
          {letter.letterText}
        </div>

        {letter.letterSource === 'fallback' ? (
          <p className="text-muted-foreground mt-4 mb-0 text-xs leading-relaxed">
            {STUDENT_OFFER_LETTER_ERRORS.FALLBACK_NOTICE}
          </p>
        ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
