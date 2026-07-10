'use client';

import { toCompanyWebsiteUrl } from '@/lib/companyWebsite';

/**
 * Renders a company name as plain text, or as a link to the company website when available.
 */
export default function CompanyNameLink({
  name,
  website,
  className = '',
  style,
  title,
}) {
  const display = name != null && String(name).trim() !== '' ? String(name).trim() : '—';
  const href = toCompanyWebsiteUrl(website);

  if (!href) {
    return (
      <span className={className} style={style}>
        {display}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`company-name-link ${className}`.trim()}
      style={style}
      title={title || `Open ${display} website`}
      onClick={(e) => e.stopPropagation()}
    >
      {display}
    </a>
  );
}
