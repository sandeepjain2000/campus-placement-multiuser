import { AlertTriangle } from 'lucide-react';
import { getDriveVenueWarning } from '@/lib/driveVenueWarning';

export default function DriveVenueUnconfirmedWarning({ venue, driveDate, style }) {
  const message = getDriveVenueWarning({ venue, driveDate });
  if (!message) return null;

  return (
    <p
      className="text-sm"
      role="note"
      style={{
        margin: '0.5rem 0 0',
        padding: '0.5rem 0.65rem',
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        color: 'var(--text-primary)',
        lineHeight: 1.5,
        display: 'flex',
        gap: '0.4rem',
        alignItems: 'flex-start',
        ...style,
      }}
    >
      <AlertTriangle
        size={16}
        aria-hidden
        style={{ flexShrink: 0, marginTop: '0.15rem', color: 'var(--warning-600, #d97706)' }}
      />
      <span>{message}</span>
    </p>
  );
}
