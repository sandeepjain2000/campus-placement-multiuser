'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import Link from 'next/link';

export default function AdminCollegesPage() {
  const { addToast } = useToast();
  const [colleges, setColleges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/admin/colleges');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load colleges');
        if (!mounted) return;
        setColleges(Array.isArray(json.colleges) ? json.colleges : []);
      } catch (e) {
        if (!mounted) return;
        setError(e.message || 'Failed to load colleges');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const showNotReady = (label) => {
    addToast(`${label} is not available yet in this build.`, 'info');
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header"><div className="page-header-left"><h1>🏫 Manage Colleges</h1><p>All registered colleges on the platform</p></div><Link className="btn btn-primary" href="/data-entry/users">+ Add College</Link></div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>College</th><th>City</th><th>NAAC</th><th>Students</th><th>Placed</th><th>Rate</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {colleges.map(c => (
              <tr key={c.id}>
                <td className="font-semibold">{c.name}</td><td>{c.city}</td><td><span className="badge badge-indigo">{c.naac}</span></td>
                <td>{c.students}</td><td>{c.placed}</td><td className="font-bold">{c.students > 0 ? Math.round(c.placed / c.students * 100) : 0}%</td>
                <td><span className="badge badge-green badge-dot">{c.active ? 'Active' : 'Inactive'}</span></td>
                <td><button className="btn btn-ghost btn-sm" onClick={() => showNotReady('View college details')}>View</button><button className="btn btn-ghost btn-sm" onClick={() => showNotReady('Edit college')}>Edit</button></td>
              </tr>
            ))}
            {!isLoading && colleges.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-secondary">{error || 'No colleges found.'}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
