'use client';

import { Briefcase, GraduationCap, Target } from 'lucide-react';
import { formatFilterBadgeLabel } from '@/lib/filterBadgeLabel';

export const OFFER_EVENT_TABS = [
  { id: 'internship', label: 'Internship', icon: GraduationCap },
  { id: 'drive', label: 'Drive', icon: Target },
  { id: 'alumni_jobs', label: 'Alumni Jobs', icon: Briefcase },
];

/**
 * Pill tabs for Internship / Drive / Alumni Jobs (matches hiring-assessment style).
 */
export default function OfferEventTypeTabs({ activeTab, onTabChange, counts = {} }) {
  return (
    <div
      role="tablist"
      aria-label="Event type"
      style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}
    >
      {OFFER_EVENT_TABS.map((t) => {
        const Icon = t.icon;
        const active = activeTab === t.id;
        const n = counts[t.id] ?? 0;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onTabChange(t.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.25rem',
              borderRadius: '999px',
              fontWeight: 700,
              fontSize: '0.9rem',
              transition: 'background 0.2s ease-out, color 0.2s ease-out, box-shadow 0.2s ease-out',
              border: 'none',
              cursor: 'pointer',
              background: active ? 'var(--primary-600)' : 'var(--bg-secondary)',
              color: active ? 'white' : 'var(--text-secondary)',
              boxShadow: active ? '0 4px 10px rgba(79, 70, 229, 0.25)' : 'none',
            }}
          >
            <Icon size={16} strokeWidth={active ? 2.5 : 1.75} aria-hidden />
            {formatFilterBadgeLabel(t.label, n)}
          </button>
        );
      })}
    </div>
  );
}
