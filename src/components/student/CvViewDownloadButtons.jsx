'use client';

import { ExternalLink, Download } from 'lucide-react';

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
  const btnClass = `btn btn-${size}`;
  return (
    <div className={className} style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <a
        href={viewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btnClass} btn-secondary`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
      >
        <ExternalLink size={14} aria-hidden />
        {viewLabel}
      </a>
      {downloadUrl ? (
        <a
          href={downloadUrl}
          className={`${btnClass} btn-ghost`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <Download size={14} aria-hidden />
          {downloadLabel}
        </a>
      ) : null}
    </div>
  );
}
