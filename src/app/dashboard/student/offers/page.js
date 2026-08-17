'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { formatDate, formatCurrency } from '@/lib/utils';
import { isOfferDeadlinePassed, parseOfferDeadline } from '@/lib/offerDeadline';
import { canStudentRespondToOffer, normalizeOfferStatus } from '@/lib/offerStatusNormalize';
import CompanyNameLink from '@/components/CompanyNameLink';
import PageLoading from '@/components/PageLoading';
import StudentOfferRespondActions from '@/components/student/StudentOfferRespondActions';
import { BriefcaseBusiness, Clock3, FileText, MapPin, PartyPopper } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  STUDENT_OFFER_LETTER_ERRORS,
} from '@/lib/studentOfferLetter';

const STUDENT_OFFERS_LIST_ERRORS = Object.freeze({
  LOAD_FAILED: 'We could not load your offers right now. Please try again in a moment.',
  NETWORK: STUDENT_OFFER_LETTER_ERRORS.NETWORK,
  UNAUTHORIZED: STUDENT_OFFER_LETTER_ERRORS.UNAUTHORIZED,
});

const fetcher = async (url) => {
  let res;
  try {
    res = await fetch(url);
  } catch {
    const err = new Error(STUDENT_OFFERS_LIST_ERRORS.NETWORK);
    err.status = 0;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      res.status === 401
        ? STUDENT_OFFERS_LIST_ERRORS.UNAUTHORIZED
        : STUDENT_OFFERS_LIST_ERRORS.LOAD_FAILED;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
};

function formatTimeLeft(deadline, now) {
  const end = parseOfferDeadline(deadline);
  if (!end) return null;
  const diff = end.getTime() - now;
  if (diff <= 0) return 'Expired';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / 1000 / 60) % 60);
  
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

export default function StudentOffersPage() {
  const { data: offers, error, isLoading, mutate } = useSWR('/api/student/offers', fetcher, {
    shouldRetryOnError: false,
  });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000); // update every minute
    return () => clearInterval(timer);
  }, []);

  if (isLoading) return <PageLoading message="Loading your offers…" variant="skeleton-card" />;

  if (error) {
    const known = Object.values(STUDENT_OFFERS_LIST_ERRORS);
    const message = known.includes(error?.message)
      ? error.message
      : STUDENT_OFFERS_LIST_ERRORS.LOAD_FAILED;
    return (
      <div className="animate-fadeIn flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">My Offers</h1>
        <Alert variant="destructive">
          <AlertTitle>Could not load offers</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => mutate()}>
            Try again
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn flex flex-col gap-4">
      <div className="min-w-0">
          <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <BriefcaseBusiness className="text-muted-foreground size-7" strokeWidth={1.5} />
            My Offers
          </h1>
          <p className="text-muted-foreground mt-1 mb-0 max-w-3xl text-sm leading-relaxed">
            Formal offers live here — drafted offer letters, compensation terms, and your accept or decline response.
            Being <strong>selected</strong> on My Applications is an earlier step; you will get a separate email when a
            formal offer is published.
          </p>
      </div>

      {offers?.length > 0 && !offers.some((o) => normalizeOfferStatus(o.status) === 'pending' && !isOfferDeadlinePassed(o.deadline, new Date(now))) ? (
        <Alert>
          <AlertTitle>No response needed</AlertTitle>
          <AlertDescription>
            You have offer records on file, but none are waiting for your response. New offers must be created with status{' '}
            <strong>pending</strong> (employer bulk generate, Create offer, or college manual add). If you expected Accept / Decline buttons, ask your placement office to re-open the offer as pending.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-4">
        {offers && offers.length > 0 ? offers.map(offer => {
          const status = normalizeOfferStatus(offer.status);
          const isExpired = status === 'expired' || (status === 'pending' && isOfferDeadlinePassed(offer.deadline, new Date(now)));
          const timeLeft = formatTimeLeft(offer.deadline, now);
          const effectiveStatus = isExpired && status === 'pending' ? 'expired' : status;
          const canRespond = canStudentRespondToOffer(offer, new Date(now));
          const offerId = String(offer.id);

          return (
            <Card key={offerId} className={effectiveStatus === 'pending' ? 'gap-0 overflow-hidden border-amber-500/35 py-0' : 'gap-0 overflow-hidden py-0'}>
              {effectiveStatus === 'pending' && (
                <div className="bg-amber-500/10 px-4 py-2 text-center text-xs font-semibold text-amber-700 dark:text-amber-400" role="status">
                  Action required — {timeLeft === 'Expired' ? 'Offer expired' : `Respond before ${formatDate(offer.deadline)} (${timeLeft})`}
                </div>
              )}
              
              <CardHeader className="flex-row items-start justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <CardTitle className="truncate text-lg">
                    <CompanyNameLink name={offer.company} website={offer.website} />
                  </CardTitle>
                  <CardDescription className="mt-1">{offer.role}</CardDescription>
                </div>
                <StatusBadge status={effectiveStatus || 'pending'} showDot className="min-w-fit">
                  {effectiveStatus === 'rejected' ? 'Declined' : effectiveStatus.charAt(0).toUpperCase() + effectiveStatus.slice(1)}
                </StatusBadge>
              </CardHeader>

              <CardContent className="flex flex-col gap-4 border-t px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-muted/50 rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs font-medium uppercase">Annual CTC</div>
                  <div className="mt-1 text-lg font-semibold">
                    {formatCurrency(offer.salary)}
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs font-medium uppercase">Location</div>
                  <div className="mt-1 flex items-center gap-1.5 text-sm"><MapPin className="size-4" />{offer.location || '—'}</div>
                </div>
                <div className="bg-muted/50 rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs font-medium uppercase">Joining Date</div>
                  <div className="mt-1 text-sm">{formatDate(offer.joiningDate)}</div>
                </div>
                <div className="bg-muted/50 rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs font-medium uppercase">Offer Date</div>
                  <div className="mt-1 text-sm">{formatDate(offer.createdAt)}</div>
                </div>
              </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  render={<Link href={`/dashboard/student/offers/${encodeURIComponent(offerId)}/letter`} />}
                  nativeButton={false}
                >
                  <FileText data-icon="inline-start" />
                  Open Offer Letter
                </Button>

              {canRespond ? (
                <StudentOfferRespondActions offer={offer} onUpdated={() => mutate()} />
              ) : null}

              {effectiveStatus === 'expired' && (
                <Alert><Clock3 /><AlertDescription>This offer expired on {formatDate(offer.deadline)}. Your response time lapsed.</AlertDescription></Alert>
              )}

              {effectiveStatus === 'accepted' && (
                <Alert className="border-green-600/25 bg-green-600/5"><PartyPopper /><AlertDescription>You accepted this offer on {formatDate(offer.acceptedAt)}. Congratulations.</AlertDescription></Alert>
              )}

              {effectiveStatus === 'rejected' && (
                <Alert><AlertDescription>
                  You declined this offer{offer.rejectedAt ? ` on ${formatDate(offer.rejectedAt)}` : ''}.
                </AlertDescription></Alert>
              )}

              {effectiveStatus === 'revoked' && (
                <Alert variant="destructive"><AlertDescription>This offer was revoked by the employer.</AlertDescription></Alert>
              )}
              </CardContent>
            </Card>
          );
        }) : (
          <Card className="gap-0 py-10"><CardContent className="text-muted-foreground text-center">No offers yet.</CardContent></Card>
        )}
      </div>

    </div>
  );
}
