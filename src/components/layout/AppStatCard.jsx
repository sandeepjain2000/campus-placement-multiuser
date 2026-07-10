'use client';

/**
 * Metric summary card (LMS dashboard style).
 * @param {{ label: string; value: string | number; hint?: string; icon?: import('react').ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean }>; tone?: 'indigo' | 'green' | 'amber' | 'rose' | 'blue' }} props
 */
export default function AppStatCard({ label, value, hint, icon: Icon, tone = 'indigo' }) {
  return (
    <div className={`app-stat-card app-stat-card--${tone}`}>
      {Icon ? (
        <span className="app-stat-card__icon-wrap" aria-hidden>
          <Icon size={20} strokeWidth={1.75} />
        </span>
      ) : null}
      <div className="app-stat-card__value">{value}</div>
      <div className="app-stat-card__label">{label}</div>
      {hint ? <div className="app-stat-card__hint">{hint}</div> : null}
    </div>
  );
}
