'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/clientErrorReport';

/**
 * Catches uncaught window errors and unhandled promise rejections;
 * surfaces them in Session Diagnostics instead of failing silently.
 */
export default function ClientErrorGuard() {
  useEffect(() => {
    const onError = (event) => {
      const msg = event?.error?.message || event?.message || 'Unexpected error';
      reportClientError(msg, {
        source: 'window.error',
        filename: event?.filename,
        lineno: event?.lineno,
        colno: event?.colno,
      });
      event.preventDefault?.();
    };

    const onRejection = (event) => {
      const reason = event?.reason;
      const msg =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : 'Unhandled promise rejection';
      reportClientError(msg, { source: 'unhandledrejection' });
      event.preventDefault?.();
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
