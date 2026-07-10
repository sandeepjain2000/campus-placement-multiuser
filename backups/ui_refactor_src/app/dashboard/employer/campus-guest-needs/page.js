'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const KIND_LABEL = {
  guest_faculty: 'Guest faculty',
  guest_lecture: 'Guest lecture / session',
};

export default function EmployerCampusGuestNeedsPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let m = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/employer/engagement-listings');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed');
        if (m) setRows(Array.isArray(json.listings) ? json.listings : []);
      } catch (e) {
        if (m) setError(e.message || 'Failed');
      } finally {
        if (m) setLoading(false);
      }
    })();
    return () => {
      m = false;
    };
  }, []);

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Campus guest needs</h1>
          <p>Colleges publish guest faculty and lecture requirements here for corporate partners to discover.</p>
        </div>
        <Link href="/dashboard/employer/overview" className="btn btn-secondary btn-sm">
          Overview
        </Link>
      </div>

      {error ? (
        <p className="text-secondary">{error}</p>
      ) : loading ? (
        <div className="skeleton" style={{ height: 120 }} />
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {rows.map((item) => (
            <div key={item.id} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div className="text-sm text-secondary">
                    {item.college?.name}
                    {item.college?.city ? ` · ${item.college.city}` : ''}
                    {item.college?.state ? `, ${item.college.state}` : ''}
                  </div>
                  <h2 style={{ fontSize: '1.1rem', margin: '0.35rem 0' }}>{item.title}</h2>
                  <span className="badge badge-indigo">{KIND_LABEL[item.kind] || item.kind}</span>
                </div>
                <div className="text-xs text-secondary">
                  Posted {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                </div>
              </div>
              {item.summary ? <p style={{ marginTop: '0.75rem' }}>{item.summary}</p> : null}
              {item.requirements ? (
                <div style={{ marginTop: '0.75rem' }}>
                  <strong className="text-sm">Requirements</strong>
                  <p className="text-sm" style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
                    {item.requirements}
                  </p>
                </div>
              ) : null}
              {item.timeHint ? (
                <p className="text-sm text-secondary" style={{ marginTop: '0.5rem' }}>
                  <strong>Timing:</strong> {item.timeHint}
                </p>
              ) : null}
            </div>
          ))}
          {rows.length === 0 ? (
            <p className="text-secondary">No published campus needs right now.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
