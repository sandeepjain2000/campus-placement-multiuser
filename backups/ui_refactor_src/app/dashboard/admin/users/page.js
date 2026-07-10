'use client';
import { useEffect, useState } from 'react';
import { getRoleDisplayName } from '@/lib/utils';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/admin/users');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load users');
        if (!mounted) return;
        setUsers(Array.isArray(json.users) ? json.users : []);
      } catch (e) {
        if (!mounted) return;
        setError(e.message || 'Failed to load users');
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
      <div className="page-header"><div className="page-header-left"><h1>👥 Manage Users</h1><p>All users across the platform</p></div></div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{users.map(u => (
            <tr key={u.id}>
              <td><div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}><div className="avatar avatar-sm">{u.name.split(' ').map(n=>n[0]).join('')}</div><span className="font-semibold">{u.name}</span></div></td>
              <td className="text-sm">{u.email}</td>
              <td><span className={`badge badge-${u.role === 'super_admin' ? 'red' : u.role === 'college_admin' ? 'indigo' : u.role === 'employer' ? 'green' : 'blue'}`}>{getRoleDisplayName(u.role)}</span></td>
              <td><span className={`badge ${u.active ? 'badge-green' : 'badge-gray'} badge-dot`}>{u.active ? 'Active' : 'Inactive'}</span></td>
              <td><button className="btn btn-ghost btn-sm" disabled title="Coming soon">Edit</button></td>
            </tr>
          ))}
          {!isLoading && users.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center text-secondary">{error || 'No users found.'}</td>
            </tr>
          ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
