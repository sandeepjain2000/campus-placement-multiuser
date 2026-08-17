'use client';

import Link from 'next/link';
import StudentOfferRespondActions from '@/components/student/StudentOfferRespondActions';
import {
  resolveStudentSelectionOfferState,
  studentApplicationsHrefForType,
} from '@/lib/studentSelectionOffer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Explains selection vs formal offer on student application views.
 */
export default function StudentSelectionOfferPanel({
  application,
  offers,
  type = 'drives',
  compact = false,
  onOfferUpdated,
}) {
  const { kind, offer } = resolveStudentSelectionOfferState(application, offers, { type });
  if (kind === 'not_selected') return null;

  const appsHref = studentApplicationsHrefForType(type);

  if (kind === 'awaiting_formal_offer') {
    return (
      <Alert className={compact ? '' : 'mb-5'}>
        <AlertTitle>Selected — awaiting formal offer</AlertTitle>
        <AlertDescription>
          You cleared the employer&apos;s selection rounds. A <strong>formal offer</strong> is a separate step: your college or
          employer will publish a drafted offer letter, send you an email, and then you accept or decline on{' '}
          <Link href="/dashboard/student/offers" className="text-primary font-semibold hover:underline">
            My Offers
          </Link>
          . No action is required here until that arrives.
        </AlertDescription>
      </Alert>
    );
  }

  if (kind === 'formal_offer_pending' && offer) {
    return (
      <Card className={compact ? 'gap-0 border-green-600/25 bg-green-600/5 py-4' : 'mb-5 gap-0 border-green-600/25 bg-green-600/5 py-4'}>
        <CardContent className="flex flex-col gap-3 px-4">
        <div>
          <p className="m-0 text-sm font-semibold text-green-700 dark:text-green-400">Formal offer issued — action required</p>
          <p className="text-muted-foreground mt-1 mb-0 text-sm leading-relaxed">
          Your formal offer letter has been published. Download the letter below, then accept or decline before the deadline.
          </p>
        </div>
          <Button
            variant="outline"
            size="sm"
            className="w-fit"
            render={<Link href={`/dashboard/student/offers/${encodeURIComponent(String(offer.id))}/letter`} />}
            nativeButton={false}
          >
            Open offer letter
          </Button>
        <StudentOfferRespondActions offer={offer} compact onUpdated={onOfferUpdated} />
        </CardContent>
      </Card>
    );
  }

  if (kind === 'formal_offer_accepted' && offer) {
    return (
      <Alert className={compact ? 'border-green-600/25 bg-green-600/5' : 'mb-5 border-green-600/25 bg-green-600/5'}>
        <AlertDescription>
        You accepted the formal offer for this role. View details on{' '}
        <Link href="/dashboard/student/offers" className="text-primary font-semibold hover:underline">
          My Offers
        </Link>
        .
        </AlertDescription>
      </Alert>
    );
  }

  if (kind === 'formal_offer_declined') {
    return (
      <Alert className={compact ? '' : 'mb-5'}>
        <AlertDescription>
        You declined the formal offer for this role. Your application remains marked selected on{' '}
        <Link href={appsHref} className="text-primary font-semibold hover:underline">
          My Applications
        </Link>
        .
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
