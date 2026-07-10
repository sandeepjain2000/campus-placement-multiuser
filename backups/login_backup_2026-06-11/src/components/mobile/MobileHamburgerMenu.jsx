'use client';

import { X, Home, Users, Briefcase, Calendar, Settings, LogOut, CheckSquare } from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { getRoleDisplayName } from '@/lib/utils';
import { DEFAULT_ENTITY_LOGO_URL } from '@/lib/clientAssetUrl';
import EntityLogo from '@/components/EntityLogo';
import { useResolvedBrandLogoUrl } from '@/hooks/useResolvedBrandLogoUrl';
import { ALUMNI_BROWSE_JOBS_PATH, ALUMNI_MY_JOBS_PATH } from '@/lib/alumniRoutes';
import { EMPLOYER_ALUMNI_JOBS_PATH } from '@/lib/employerAlumniRoutes';

export default function MobileHamburgerMenu({ isOpen, onClose, session }) {
  const brandLogoUrl = useResolvedBrandLogoUrl();
  if (!isOpen) return null;

  const role = session?.user?.role;
  const isAlumni = Boolean(session?.user?.isAlumni);
  const name = session?.user?.name || 'User';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} onClick={onClose} />
      
      <div style={{ 
        position: 'relative', width: '85%', maxWidth: '340px', background: 'var(--bg-primary)', 
        height: '100%', display: 'flex', flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0,0,0,0.1)', animation: 'slideRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="sidebar-logo-icon" style={{ width: 32, height: 32, fontSize: '1.1rem' }}>P</div>
            <span style={{ fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>PlacementHub</span>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon" style={{ marginRight: '-0.5rem' }}>
            <X size={24} strokeWidth={2.5} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 0' }}>
          <div style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', paddingLeft: '0.75rem' }}>Menu</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <Link href="/dashboard" onClick={onClose} className="mobile-nav-link"><Home size={20} strokeWidth={2} /> Home</Link>
              
              {role === 'college_admin' && (
                <>
                  <Link href="/dashboard/college/students" onClick={onClose} className="mobile-nav-link"><Users size={20} strokeWidth={2} /> Students</Link>
                  <Link href="/dashboard/college/employers" onClick={onClose} className="mobile-nav-link"><Briefcase size={20} strokeWidth={2} /> Employers</Link>
                  <Link href="/dashboard/college/drives" onClick={onClose} className="mobile-nav-link"><Calendar size={20} strokeWidth={2} /> Placement Drives</Link>
                  <Link href="/dashboard/college/settings" onClick={onClose} className="mobile-nav-link"><Settings size={20} strokeWidth={2} /> Settings</Link>
                </>
              )}

              {role === 'employer' && (
                <>
                  <Link href={EMPLOYER_ALUMNI_JOBS_PATH} onClick={onClose} className="mobile-nav-link"><Briefcase size={20} strokeWidth={2} /> Alumni Jobs</Link>
                  <Link href="/dashboard/employer/drives" onClick={onClose} className="mobile-nav-link"><Calendar size={20} strokeWidth={2} /> Placement Drives</Link>
                  <Link href="/dashboard/employer/applications" onClick={onClose} className="mobile-nav-link"><CheckSquare size={20} strokeWidth={2} /> Applications</Link>
                </>
              )}

              {role === 'student' && (
                <>
                  {isAlumni ? (
                    <>
                      <Link href={ALUMNI_BROWSE_JOBS_PATH} onClick={onClose} className="mobile-nav-link"><Briefcase size={20} strokeWidth={2} /> Browse Alumni Jobs</Link>
                      <Link href={ALUMNI_MY_JOBS_PATH} onClick={onClose} className="mobile-nav-link"><Briefcase size={20} strokeWidth={2} /> My Alumni Jobs</Link>
                    </>
                  ) : (
                    <>
                      <Link href="/dashboard/student/drives" onClick={onClose} className="mobile-nav-link"><Calendar size={20} strokeWidth={2} /> Browse Drives</Link>
                      <Link href="/dashboard/student/applications/drives" onClick={onClose} className="mobile-nav-link"><Briefcase size={20} strokeWidth={2} /> My Applications</Link>
                    </>
                  )}
                  <Link href="/dashboard/student/profile" onClick={onClose} className="mobile-nav-link"><Users size={20} strokeWidth={2} /> My Profile</Link>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 44, height: 44, flexShrink: 0 }}>
              <EntityLogo
                name={session?.user?.tenantName || name}
                logoUrl={brandLogoUrl}
                placeholderUrl={
                  role === 'employer' || role === 'college_admin' ? DEFAULT_ENTITY_LOGO_URL : null
                }
                size="md"
                shape="rounded"
              />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getRoleDisplayName(role)}</div>
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/login?force=1' })} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', gap: '0.75rem', padding: '0.75rem 1rem' }}>
            <LogOut size={18} strokeWidth={2} /> Sign out
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes slideRight {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .mobile-nav-link {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.875rem 1rem;
          color: var(--text-secondary);
          text-decoration: none;
          font-weight: 500;
          font-size: 1.05rem;
          border-radius: var(--radius-md);
          transition: all 0.2s ease;
        }
        .mobile-nav-link:active {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
        .mobile-nav-link svg {
          color: var(--text-tertiary);
        }
      `}</style>
    </div>
  );
}
