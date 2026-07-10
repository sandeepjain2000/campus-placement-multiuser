'use client';

/**
 * Full-page skeleton for /dashboard/alerts — avoids blank flash on reload.
 */
export default function AlertsInboxSkeleton() {
  return (
    <div className="animate-fadeIn alerts-inbox-root" aria-busy="true" aria-label="Loading alerts">
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <div className="skeleton" style={{ width: 220, height: 28, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 'min(520px, 100%)', height: 16 }} />
      </div>
      <div className="card alerts-inbox-card" style={{ minHeight: 420 }}>
        <div style={{ display: 'flex', minHeight: 380 }}>
          <div
            className="alerts-inbox-nav"
            style={{ width: 200, flexShrink: 0, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 36, borderRadius: 8 }} />
            ))}
          </div>
          <div className="alerts-inbox-list" style={{ flex: 1, padding: '0.75rem' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton" style={{ height: 72, marginBottom: 10, borderRadius: 8 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
