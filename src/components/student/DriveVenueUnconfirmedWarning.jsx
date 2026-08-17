import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { getDriveVenueWarning } from '@/lib/driveVenueWarning';

export default function DriveVenueUnconfirmedWarning({ venue, driveDate, className, style }) {
  const message = getDriveVenueWarning({ venue, driveDate });
  if (!message) return null;

  return (
    <Alert
      role="note"
      className={cn(
        'border-amber-600/20 bg-amber-600/10 py-2.5 text-amber-800 dark:text-amber-400',
        className
      )}
      style={style}
    >
      <AlertTriangle aria-hidden />
      <AlertDescription className="text-amber-800 dark:text-amber-400">{message}</AlertDescription>
    </Alert>
  );
}
