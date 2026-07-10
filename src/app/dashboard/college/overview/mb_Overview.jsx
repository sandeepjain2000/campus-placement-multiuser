'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import Link from 'next/link';
import { Users, CheckCircle, Building2, Target, Activity, Zap, ClipboardList, GraduationCap, FileText, Download, Plus, Pencil, MapPin, TrendingUp } from 'lucide-react';
import { SOCIAL_PLATFORM_ORDER } from '@/components/SocialIcons';
import { useToast } from '@/components/ToastProvider';
import { getCurrentAcademicYear } from '@/lib/academicYear';
import MobileHeader from '@/components/mobile/MobileHeader';
import PageLoading from '@/components/PageLoading';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load college dashboard');
  return json;
};

function rupeesToLpaLabel(rupees) {
  const n = Number(rupees);
  if (!Number.isFinite(n) || n <= 0) return null;
  const lpa = n / 100_000;
  const digits = lpa >= 100 ? 0 : lpa >= 10 ? 1 : 2;
  return `₹${lpa.toFixed(digits)} LPA`;
}

function rupeesAmountLabel(rupees) {
  const n = Number(rupees);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function mb_Overview() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR('/api/college/dashboard', fetcher);
  const { data: settingsData } = useSWR('/api/college/settings', fetcher);
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear());
  const showNotReady = (label) => addToast(`${label} is not available yet in this build.`, 'info');

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const syncYear = () => { const saved = window.sessionStorage.getItem('activeAcademicYear'); if (saved) setAcademicYear(saved); };
    syncYear();
    window.addEventListener('placementhub-academic-year', syncYear);
    return () => window.removeEventListener('placementhub-academic-year', syncYear);
  }, []);

  const exportOverview = () => {
    const payload = { stats, departmentStats, recentActivity, pendingActions, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'college_overview_export.json';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    addToast('Overview exported.', 'success');
  };

  if (error) return (
    <>
      <MobileHeader title="Dashboard" />
      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 600 }}>
            <Activity size={18} className="text-warning-600" /> Data not available
          </div>
          <p className="text-secondary" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>We could not load live dashboard metrics right now. Add core records first, then retry.</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
            <button type="button" className="btn btn-primary" onClick={() => mutate()}>Retry</button>
            <Link href="/dashboard/college/students" className="btn btn-secondary">Open Students</Link>
          </div>
        </div>
      </div>
    </>
  );

  if (isLoading || !data) {
    return (
      <>
        <MobileHeader title="Dashboard" />
        <div style={{ padding: '1rem 1rem 5rem 1rem' }}>
          <PageLoading message="Loading college overview…" variant="skeleton-card" inline />
        </div>
      </>
    );
  }

  const stats = data?.stats ?? { totalStudents: 0, placedStudents: 0, placementRate: 0, activeEmployers: 0, activeDrives: 0, avgPackage: 0, highestPackage: 0, minJobAmount: 0, minInternshipAmount: 0 };
  const departmentStats = Array.isArray(data?.departmentStats) ? data.departmentStats : [];
  const recentActivity = Array.isArray(data?.recentActivity) ? data.recentActivity : [];
  const pendingActions = data?.pendingActions ?? { drivesCount: 0, studentsCount: 0, documentsCount: 0 };
  const pendingTotal = pendingActions.drivesCount + pendingActions.studentsCount + pendingActions.documentsCount;

  const avgPackageLabel = rupeesToLpaLabel(stats.avgPackage);
  const highestPackageLabel = rupeesToLpaLabel(stats.highestPackage);

  const collegeName = (settingsData?.institution?.collegeName || '').trim() || session?.user?.tenantName?.trim() || 'Your institution';
  const season = (settingsData?.placementSeasonLabel || '').trim() || academicYear;

  return (
    <>
      <MobileHeader title="Dashboard" action={<button className="btn btn-ghost btn-sm" onClick={exportOverview}><Download size={16} /></button>} />
      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>
        
        {/* Mobile Hero */}
        <div style={{
          background: 'var(--banner-gradient)',
          borderRadius: '12px', padding: '1.25rem', color: 'white',
          marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'
        }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff' }}>
            <Building2 size={20} /> {collegeName}
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)', margin: 0 }}>Season {season}</p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Link href="/dashboard/college/settings" className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '8px' }}>
              <Pencil size={12} /> Edit
            </Link>
            <Link href="/dashboard/college/drives" className="btn btn-sm banner-cta-solid" style={{ padding: '0.35rem 0.75rem', borderRadius: '8px' }}>
              <Plus size={12} /> Drive
            </Link>
          </div>
        </div>

        {/* Pending Actions Alert */}
        {pendingTotal > 0 && (
          <div style={{ background: 'var(--warning-50)', border: '1px solid var(--warning-200)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--warning-700)', marginBottom: '0.5rem' }}>
              <Zap size={16} /> Pending Actions ({pendingTotal})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {pendingActions.drivesCount > 0 && (
                <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'flex-start', background: 'white' }} onClick={() => showNotReady('Review drives')}>
                  <ClipboardList size={14} style={{ marginRight: '0.25rem' }} /> {pendingActions.drivesCount} Drives to Review
                </button>
              )}
              {pendingActions.studentsCount > 0 && (
                <Link href="/dashboard/college/students" className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'flex-start', background: 'white' }}>
                  <GraduationCap size={14} style={{ marginRight: '0.25rem' }} /> {pendingActions.studentsCount} Students to Verify
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Primary Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
          <div className="card" style={{ padding: '1rem' }}>
            <Users size={18} style={{ color: 'var(--primary-600)', marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.totalStudents}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Students</div>
          </div>
          <div className="card" style={{ padding: '1rem' }}>
            <CheckCircle size={18} style={{ color: 'var(--success-600)', marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.placedStudents}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Placed</div>
          </div>
          <div className="card" style={{ padding: '1rem' }}>
            <Building2 size={18} style={{ color: 'var(--warning-600)', marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.activeEmployers}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Employers</div>
          </div>
          <div className="card" style={{ padding: '1rem' }}>
            <Target size={18} style={{ color: 'var(--info-600)', marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.activeDrives}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Drives</div>
          </div>
        </div>

        {/* Package & Rate Cards */}
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Avg Package</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-600)' }}>{avgPackageLabel ?? '—'}</div>
            </div>
            <div style={{ width: '1px', height: '40px', background: 'var(--border-default)' }} />
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Highest</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success-600)' }}>{highestPackageLabel ?? '—'}</div>
            </div>
            <div style={{ width: '1px', height: '40px', background: 'var(--border-default)' }} />
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Placed</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.placementRate}%</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <h3 className="card-title" style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentActivity.slice(0, 3).map((activity, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: `var(--${activity.color || 'primary'}-50)`, color: `var(--${activity.color || 'primary'}-600)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <TrendingUp size={12} />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>{activity.text}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{activity.time}</div>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && <p className="text-secondary text-sm" style={{ margin: 0 }}>No recent activity.</p>}
          </div>
        </div>

      </div>
    </>
  );
}
