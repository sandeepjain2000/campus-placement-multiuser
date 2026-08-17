'use client';

import { ExternalLink, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * View (inline preview in new tab) + Download (attachment) actions for CV files.
 */
export default function CvViewDownloadButtons({
  viewUrl,
  downloadUrl,
  size = 'sm',
  viewLabel = 'View',
  downloadLabel = 'Download',
  className = '',
}) {
  if (!viewUrl) return null;
  const buttonSize = size === 'lg' ? 'lg' : size === 'xs' ? 'xs' : 'sm';
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <Button
        size={buttonSize}
        variant="secondary"
        render={<a href={viewUrl} target="_blank" rel="noopener noreferrer" />}
        nativeButton={false}
      >
        <ExternalLink data-icon="inline-start" aria-hidden />
        {viewLabel}
      </Button>
      {downloadUrl ? (
        <Button
          size={buttonSize}
          variant="outline"
          render={<a href={downloadUrl} />}
          nativeButton={false}
        >
          <Download data-icon="inline-start" aria-hidden />
          {downloadLabel}
        </Button>
      ) : null}
    </div>
  );
}
