'use client';

import { formatFilterBadgeLabelParen } from '@/lib/filterBadgeLabel';
import { COLLEGE_DRIVE_STATUS_TABS } from '@/lib/collegeDriveStatusTabs';

/**
 * Status tabs for college Placement Drives (replaces an “All” default dump).
 */
export default function CollegeDriveStatusTabs({ activeTab, onTabChange, counts = {} }) {
  return (
    <div
      role="tablist"
      aria-label="Drive status"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.35rem',
        marginBottom: '1.25rem',
        padding: '0.3rem',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
        borderRadius: '10px',
        width: 'fit-content',
        maxWidth: '100%',
      }}
    >
      {COLLEGE_DRIVE_STATUS_TABS.map((tab) => {
        const active = activeTab === tab.id;
        const count = counts[tab.id] ?? 0;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onTabChange(tab.id)}
            style={{
              padding: '0.45rem 0.9rem',
              border: 'none',
              borderRadius: '7px',
              cursor: 'pointer',
              fontSize: '0.825rem',
              fontWeight: active ? 700 : 500,
              color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: active ? 'var(--bg-elevated)' : 'transparent',
              boxShadow: active ? '0 1px 2px rgba(15, 23, 42, 0.08)' : 'none',
              transition: 'background 0.15s ease-out, color 0.15s ease-out, box-shadow 0.15s ease-out',
            }}
          >
            {formatFilterBadgeLabelParen(tab.label, count)}
          </button>
        );
      })}
    </div>
  );
}
