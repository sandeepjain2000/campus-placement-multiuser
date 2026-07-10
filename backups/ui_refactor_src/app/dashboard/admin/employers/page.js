'use client';

import { useEffect, useState } from 'react';

export default function AdminEmployersPage() {
  const [employers, setEmployers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/admin/employers');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load employers');
        if (!mounted) return;
        setEmployers(Array.isArray(json.employers) ? json.employers : []);
      } catch (e) {
        if (!mounted) return;
        setError(e.message || 'Failed to load employers');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="animate-fadeIn">
      <div className="page-header"><div className="page-header-left"><h1>🏢 Manage Employers</h1></div></div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Company</th><th>Industry</th><th>Total Hires</th><th>Verified</th><th>Actions</th></tr></thead>
          <tbody>{employers.map((e,i) => (
            <tr key={i}><td className="font-semibold">{e.name}</td><td>{e.industry}</td><td>{e.hires}</td>
            <td>{e.verified ? <span className="badge badge-green">✅ Verified</span> : <span className="badge badge-amber">Pending</span>}</td>
            <td><button className="btn btn-ghost btn-sm" disabled title="Coming soon">View</button></td></tr>
          ))}
          {!isLoading && employers.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center text-secondary">{error || 'No employers found.'}</td>
            </tr>
          ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
