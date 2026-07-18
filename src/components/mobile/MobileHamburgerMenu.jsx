'use client';

import { X, Home, LogOut } from 'lucide-react';
import Link from 'next/link';
import { signOut } from '@/lib/clientSignOut';
import { getRoleDisplayName } from '@/lib/utils';
import {
  getDashboardMenu,
  getRoleProfilePath,
  getRoleProfileLabel,
  ROLE_HOME_PATHS,
} from '@/config/dashboardMenu';
import { DEFAULT_ENTITY_LOGO_URL } from '@/lib/clientAssetUrl';
import EntityLogo from '@/components/EntityLogo';
import { useResolvedBrandLogoUrl } from '@/hooks/useResolvedBrandLogoUrl';

export default function MobileHamburgerMenu({ isOpen, onClose, session }) {
  const brandLogoUrl = useResolvedBrandLogoUrl();
  if (!isOpen) return null;

  const role = session?.user?.role;
  const isAlumni = Boolean(session?.user?.isAlumni);
  const name = session?.user?.name || 'User';
  const homePath = ROLE_HOME_PATHS[role] || ROLE_HOME_PATHS.student;
  const menu = getDashboardMenu(role, session?.user);
  const sections = Array.isArray(menu?.sections) ? menu.sections : [];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }}>
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      <div
        style={{
          position: 'relative',
          width: '85%',
          maxWidth: '340px',
          background: 'var(--bg-primary)',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '4px 0 24px rgba(0,0,0,0.1)',
          animation: 'slideRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          style={{
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="sidebar-logo-icon" style={{ width: 32, height: 32, fontSize: '1.1rem' }}>
              P
            </div>
            <span style={{ fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>PlacementHub</span>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon" style={{ marginRight: '-0.5rem' }} aria-label="Close menu">
            <X size={24} strokeWidth={2.5} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 0' }}>
          <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
            <Link href={homePath} onClick={onClose} className="mobile-nav-link">
              <Home size={20} strokeWidth={2} /> Home
            </Link>
          </div>

          {sections.map((section) => (
            <div key={section.id || section.title} style={{ padding: '0 1rem', marginBottom: '1.25rem' }}>
              <p
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.5rem',
                  paddingLeft: '0.75rem',
                }}
              >
                {section.title}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                {(section.items || []).map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href || item.label}
                      href={item.href}
                      onClick={onClose}
                      className="mobile-nav-link"
                    >
                      {Icon ? <Icon size={20} strokeWidth={2} /> : null}
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderTop: '1px solid var(--border-default)',
            background: 'var(--bg-secondary)',
          }}
        >
          <Link
            href={getRoleProfilePath(role)}
            className="dashboard-identity-link"
            onClick={onClose}
            aria-label={`${getRoleProfileLabel(role)} — ${name}`}
            title={getRoleProfileLabel(role)}
            style={{ marginBottom: '1rem', display: 'block' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: '1rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {name}
                </div>
                <div
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-tertiary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {getRoleDisplayName(role, { isAlumni })}
                </div>
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login?force=1' })}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'flex-start', gap: '0.75rem', padding: '0.75rem 1rem' }}
          >
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
          padding: 0.75rem 1rem;
          color: var(--text-secondary);
          text-decoration: none;
          font-weight: 500;
          font-size: 1rem;
          border-radius: var(--radius-md);
          transition: background 0.15s ease-out, color 0.15s ease-out;
        }
        .mobile-nav-link:active {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
        .mobile-nav-link svg {
          color: var(--text-tertiary);
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
