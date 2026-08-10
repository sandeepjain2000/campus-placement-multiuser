import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/** Hide raw Postgres / SQL plumbing from end users; keep support Ref if present. */
export function friendlyPageErrorMessage(raw, fallback) {
  const text = String(raw || '').trim();
  const defaultMsg =
    fallback || 'There was an unexpected issue retrieving this information. Please try again.';
  if (!text) return defaultMsg;

  const refMatch = text.match(/\[Ref:\s*[A-Z0-9]+\]/i);
  const ref = refMatch ? ` ${refMatch[0]}` : '';

  if (
    /column .+ does not exist/i.test(text)
    || /relation .+ does not exist/i.test(text)
    || /database column is missing/i.test(text)
    || /run pending migrations/i.test(text)
    || /schema\/query mismatch/i.test(text)
    || /\b42703\b/.test(text)
    || /\b42P01\b/.test(text)
  ) {
    return `Unable to load this page right now. Please try again shortly.${ref}`;
  }

  return text;
}

export default function PageError({
  error,
  reset,
  title = 'Failed to load data',
  fallbackMessage,
}) {
  const detail = friendlyPageErrorMessage(
    error?.message,
    fallbackMessage || 'Unable to load dashboard statistics at this time. Please try again.',
  );

  return (
    <div className="animate-fadeIn flex min-h-[60vh] items-center justify-center p-4">
      <Alert variant="destructive" className="max-w-lg">
        <AlertTriangle aria-hidden="true" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{detail}</AlertDescription>
        {reset ? (
          <div className="col-start-2 mt-3">
            <Button type="button" variant="outline" onClick={reset}>
              Try again
            </Button>
          </div>
        ) : null}
      </Alert>
    </div>
  );
}
