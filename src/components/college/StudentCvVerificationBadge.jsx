'use client';

import { CheckCircle2, CircleAlert, FileText } from 'lucide-react';
import { cvListStatusBadgeClass, cvListStatusLabel } from '@/lib/studentCvListStatus';

export default function StudentCvVerificationBadge({ status, compact = false }) {
  if (status == null) return null;

  const label = cvListStatusLabel(status);
  const badgeClass = cvListStatusBadgeClass(status);
  const Icon = status === 'verified' ? CheckCircle2 : status === 'pending' ? CircleAlert : FileText;

  return (
    <span
      className={`badge ${badgeClass}`}
      style={{
        fontSize: compact ? '0.75rem' : '0.78rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
      }}
    >
      <Icon size={12} aria-hidden />
      {label}
    </span>
  );
}
