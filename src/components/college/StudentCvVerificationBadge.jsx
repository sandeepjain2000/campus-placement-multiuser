'use client';

import { CheckCircle2, CircleAlert, FileText } from 'lucide-react';
import { cvListStatusLabel } from '@/lib/studentCvListStatus';
import { StatusBadge } from '@/components/ui/status-badge';

export default function StudentCvVerificationBadge({ status, compact = false }) {
  if (status == null) return null;

  const label = cvListStatusLabel(status);
  const Icon = status === 'verified' ? CheckCircle2 : status === 'pending' ? CircleAlert : FileText;
  const tone = status === 'verified' ? 'green' : status === 'pending' ? 'amber' : 'gray';

  return (
    <StatusBadge tone={tone} className={compact ? 'text-xs' : undefined}>
      <Icon aria-hidden />
      {label}
    </StatusBadge>
  );
}
