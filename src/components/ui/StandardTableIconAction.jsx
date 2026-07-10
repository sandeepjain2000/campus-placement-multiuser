'use client';

import {
  Eye,
  Pencil,
  Trash2,
  Archive,
  Plus,
  CheckCircle,
  XCircle,
  Download,
  Mail,
  Users,
  FileText,
  Settings,
  ScrollText,
  ListPlus,
  BadgeCheck,
  Undo2,
  Send,
  GitBranch,
  Handshake,
  Loader2,
  X,
  RefreshCw,
  ClipboardCheck,
  CreditCard,
  RotateCcw,
} from 'lucide-react';
import { shouldShowFilterCount } from '@/lib/filterBadgeLabel';

const META = {
  view: { label: 'View', Icon: Eye },
  edit: { label: 'Edit', Icon: Pencil },
  delete: { label: 'Delete', Icon: Trash2 },
  archive: { label: 'Archive', Icon: Archive },
  add: { label: 'Add', Icon: Plus },
  approve: { label: 'Approve', Icon: CheckCircle },
  reject: { label: 'Reject', Icon: XCircle },
  download: { label: 'Download', Icon: Download },
  email: { label: 'Email', Icon: Mail },
  sync: { label: 'Sync', Icon: Users },
  details: { label: 'Details', Icon: FileText },
  manage: { label: 'Manage', Icon: Settings },
  cv: { label: 'Open CV', Icon: ScrollText },
  shortlist: { label: 'Shortlist', Icon: ListPlus },
  select: { label: 'Select', Icon: BadgeCheck },
  withdraw: { label: 'Withdraw', Icon: Undo2 },
  apply: { label: 'Apply', Icon: Send },
  pipeline: { label: 'View pipeline', Icon: GitBranch },
  request: { label: 'Request tie-up', Icon: Handshake },
  resend: { label: 'Resend verification', Icon: RefreshCw },
  close: { label: 'Close', Icon: X },
  review: { label: 'Review', Icon: ClipboardCheck },
  sponsor: { label: 'Record sponsorship payment', Icon: CreditCard },
  confirm: { label: 'Send confirmation email', Icon: Send },
  restore: { label: 'Restore tie-up', Icon: RotateCcw },
  pocs: { label: 'Manage points of contact', Icon: Users },
};

/**
 * @param {object} props
 * @param {keyof typeof META} props.action
 * @param {() => void} [props.onClick]
 * @param {boolean} [props.disabled]
 * @param {'secondary'|'danger'|'primary'|'ghost'|'success'} [props.variant]
 * @param {boolean} [props.showLabel] — when false, icon-only (title + aria-label still the canonical verb).
 * @param {string} [props.className]
 * @param {import('react').CSSProperties} [props.style]
 * @param {string} [props.tooltip] — overrides title and aria-label (e.g. "Coming soon" on disabled actions).
 * @param {number|string} [props.badge] — optional count badge (hidden when 0).
 * @param {boolean} [props.loading] — show spinner instead of icon.
 */
export function StandardTableIconAction({
  action,
  onClick,
  disabled,
  variant = 'secondary',
  showLabel = false,
  className = '',
  style,
  tooltip,
  badge,
  loading = false,
}) {
  const def = META[action];
  if (!def) return null;
  const { label, Icon } = def;
  const tip = tooltip ?? label;
  const aria = tooltip ? `${label} — ${tooltip}` : label;
  const variantClass =
    variant === 'danger'
      ? 'btn-danger'
      : variant === 'primary'
        ? 'btn-primary'
        : variant === 'success'
          ? 'btn-success'
          : variant === 'ghost'
            ? 'btn-ghost'
            : 'btn-secondary';
  const layout = showLabel ? 'btn-sm' : 'btn-icon btn-sm';
  const showBadge = shouldShowFilterCount(badge);
  const iconOnly = !showLabel;

  return (
    <button
      type="button"
      className={`btn ${variantClass} ${layout} ${showBadge && iconOnly ? 'table-icon-action--badged' : ''} ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: showLabel ? '0.35rem' : undefined,
        position: 'relative',
        flexShrink: 0,
        ...style,
      }}
      onClick={onClick ?? (() => {})}
      disabled={disabled || loading}
      title={tip}
      aria-label={showBadge && iconOnly ? `${aria} (${Math.trunc(Number(badge))} documents)` : aria}
    >
      {loading ? (
        <Loader2 size={16} strokeWidth={2} className="animate-spin" aria-hidden />
      ) : (
        <Icon size={16} strokeWidth={2.25} aria-hidden />
      )}
      {showLabel ? <span>{label}</span> : null}
      {showBadge && iconOnly ? (
        <span className="table-icon-action__badge" aria-hidden>
          {Math.trunc(Number(badge))}
        </span>
      ) : null}
      {showBadge && !iconOnly ? (
        <span
          className="badge badge-gray"
          style={{
            fontSize: '0.65rem',
            padding: '0.05rem 0.3rem',
            marginLeft: '0.1rem',
            lineHeight: 1.2,
          }}
        >
          {Math.trunc(Number(badge))}
        </span>
      ) : null}
    </button>
  );
}
