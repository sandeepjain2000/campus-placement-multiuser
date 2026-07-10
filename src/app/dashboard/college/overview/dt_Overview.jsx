'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import Link from 'next/link';
import { Users, CheckCircle, Building2, Target, BarChart2, Activity, Zap, ClipboardList, GraduationCap, FileText, Download, Plus, Pencil, MapPin, TrendingUp } from 'lucide-react';
import { SOCIAL_PLATFORM_ORDER } from '@/components/SocialIcons';
import { useToast } from '@/components/ToastProvider';
import { getCurrentAcademicYear } from '@/lib/academicYear';
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

export default function CollegeOverviewPage() {
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
    <div className="animate-fadeIn">
      <div className="card" style={{ maxWidth: '52rem', margin: '2rem auto' }}>
        <div className="card-header"><h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={18} className="text-warning-600" /> Dashboard data not available yet</h3></div>
        <p className="text-secondary" style={{ marginBottom: '1rem' }}>We could not load live college dashboard metrics right now. Add core records first, then retry.</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" onClick={() => mutate()}>Retry</button>
          <Link href="/dashboard/college/students" className="btn btn-secondary">Open Students</Link>
          <Link href="/dashboard/college/drives" className="btn btn-secondary">Open Drives</Link>
        </div>
        <p className="text-xs text-tertiary" style={{ marginTop: '0.75rem' }}>{error?.message}</p>
      </div>
    </div>
  );

  if (isLoading || !data) {
    return <PageLoading message="Loading college overview…" variant="skeleton-dashboard" />;
  }

  const stats = data?.stats ?? { totalStudents: 0, placedStudents: 0, placementRate: 0, activeEmployers: 0, activeDrives: 0, avgPackage: 0, highestPackage: 0, minJobAmount: 0, minInternshipAmount: 0 };
  const departmentStats = Array.isArray(data?.departmentStats) ? data.departmentStats : [];
  const recentActivity = Array.isArray(data?.recentActivity) ? data.recentActivity : [];
  const pendingActions = data?.pendingActions ?? { drivesCount: 0, studentsCount: 0, documentsCount: 0 };
  const pendingTotal = pendingActions.drivesCount + pendingActions.studentsCount + pendingActions.documentsCount;

  const avgPackageLabel = rupeesToLpaLabel(stats.avgPackage);
  const highestPackageLabel = rupeesToLpaLabel(stats.highestPackage);
  const minJobAmountLabel = rupeesAmountLabel(stats.minJobAmount);
  const minInternshipAmountLabel = rupeesAmountLabel(stats.minInternshipAmount);

  const social = settingsData?.social || {};
  const hasSocialLink = SOCIAL_PLATFORM_ORDER.some(({ id }) => String(social[id] || '').trim());
  const addr = settingsData?.address || {};
  const addrLine = [addr.address, [addr.city, addr.state].filter(Boolean).join(', '), addr.pincode].filter(Boolean).join(' · ');
  const acc = settingsData?.accreditation || {};
  const showcase = settingsData?.institutionShowcase || {};
  const po = settingsData?.placementOfficer || {};
  const poLine = [po.name, po.designation].filter((x) => String(x || '').trim()).join(' · ');
  const collegeName = (settingsData?.institution?.collegeName || '').trim() || session?.user?.tenantName?.trim() || 'Your institution';
  const season = (settingsData?.placementSeasonLabel || '').trim() || academicYear;

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      {/* Glassmorphic Hero */}
      <div style={{
        position: 'relative', background: 'var(--banner-gradient)',
        borderRadius: 'var(--radius-xl)', padding: '2.5rem', color: 'white', overflow: 'hidden',
        marginBottom: '2rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem'
      }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-50px', left: '10%', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%)', borderRadius: '50%' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ffffff' }}>
            <Building2 size={28} /> {collegeName}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)', margin: 0 }}>Placement Season {season}</p>
            <Link href="/dashboard/college/settings" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600, textDecoration: 'none', background: 'rgba(255,255,255,0.15)', padding: '0.25rem 0.75rem', borderRadius: '999px', backdropFilter: 'blur(4px)' }}>
              <Pencil size={13} /> Edit Settings
            </Link>
          </div>
          {hasSocialLink && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              {SOCIAL_PLATFORM_ORDER.map(({ id, label, Icon }) => {
                const url = String(social[id] || '').trim();
                if (!url) return null;
                const href = url.startsWith('http') ? url : `https://${url}`;
                return <a key={id} href={href} target="_blank" rel="noopener noreferrer" title={label} style={{ padding: '0.4rem', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}><Icon size={16} /></a>;
              })}
            </div>
          )}
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={exportOverview} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}>
            <Download size={16} /> Export
          </button>
          <Link href="/dashboard/college/drives" className="btn banner-cta-solid">
            <Plus size={16} /> Schedule Drive
          </Link>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
        {[
          { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'var(--primary-600)', bg: 'var(--primary-50)' },
          { label: 'Students Placed', value: stats.placedStudents, icon: CheckCircle, color: 'var(--success-600)', bg: 'rgba(5,150,105,0.08)', badge: stats.placementRate > 0 ? `${stats.placementRate}% rate` : null },
          { label: 'Active Employers', value: stats.activeEmployers, icon: Building2, color: 'var(--warning-600)', bg: 'rgba(217,119,6,0.08)' },
          { label: 'Active Drives', value: stats.activeDrives, icon: Target, color: 'var(--info-600)', bg: 'rgba(2,132,199,0.08)' },
        ].map(({ label, value, icon: Icon, color, bg, badge }) => (
          <div key={label} className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: bg, color }}><Icon size={22} strokeWidth={2} /></div>
              {badge && <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success-600)', background: 'rgba(5,150,105,0.1)', padding: '0.2rem 0.5rem', borderRadius: '999px' }}>{badge}</span>}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Package & Rate Cards */}
      <div className="grid grid-3" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Placement Rate</div>
          <div style={{ fontSize: '3rem', fontWeight: 900, background: 'linear-gradient(135deg, var(--success-500), var(--primary-500))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{stats.placementRate}%</div>
          <div style={{ height: 8, background: 'var(--gray-200)', borderRadius: 999, overflow: 'hidden', marginTop: '1rem' }}>
            <div style={{ height: '100%', width: `${stats.placementRate}%`, background: 'linear-gradient(90deg, var(--success-500), var(--primary-500))', borderRadius: 999, transition: 'width 0.8s ease' }} />
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Average Package</div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--primary-600)' }}>{avgPackageLabel ?? '—'}</div>
          <div className="text-xs text-secondary" style={{ marginTop: '0.5rem' }}>Min job: {minJobAmountLabel ?? '—'}</div>
          <div className="text-xs text-tertiary" style={{ marginTop: '0.5rem', lineHeight: 1.4 }}>{avgPackageLabel ? 'Mean CTC from accepted offers (INR → LPA).' : 'No accepted offers with salary yet.'}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Highest Package</div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--success-600)' }}>{highestPackageLabel ?? '—'}</div>
          <div className="text-xs text-secondary" style={{ marginTop: '0.5rem' }}>Min internship: {minInternshipAmountLabel ?? '—'}</div>
          <div className="text-xs text-tertiary" style={{ marginTop: '0.5rem', lineHeight: 1.4 }}>{highestPackageLabel ? 'Top accepted-offer CTC for your campus.' : 'No accepted offers with salary yet.'}</div>
        </div>
      </div>

      {/* About + Placement Team */}
      <div className="grid grid-2" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div className="card-header" style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18} className="text-secondary" /> About the Institution</h3>
          </div>
          <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', margin: 0, fontSize: '0.875rem' }}>
            {[
              { dt: 'NAAC Grade', dd: String(acc.naacGrade || '').trim() || '—' },
              { dt: 'NIRF Rank', dd: acc.nirfRank != null && acc.nirfRank !== '' ? acc.nirfRank : '—' },
              { dt: 'Accreditation', dd: String(acc.body || '').trim() || '—' },
              { dt: 'Patents', dd: showcase.patentCount != null && showcase.patentCount !== '' ? showcase.patentCount : '—' },
              { dt: 'Startups', dd: showcase.startupCount != null && showcase.startupCount !== '' ? showcase.startupCount : '—' },
            ].map(({ dt, dd }) => (
              <div key={dt}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{dt}</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{dd}</div>
              </div>
            ))}
            {addrLine && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={11} /> Address</div>
                <div style={{ fontWeight: 500, lineHeight: 1.5 }}>{addrLine}</div>
              </div>
            )}
          </dl>
          <p className="text-xs text-tertiary" style={{ marginTop: '1rem', marginBottom: 0 }}>
            Update in <Link href="/dashboard/college/settings" style={{ fontWeight: 600, color: 'var(--text-link)' }}>Settings</Link>.
          </p>
        </div>

        <div className="card">
          <div className="card-header" style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={18} className="text-secondary" /> Placement Team</h3>
          </div>
          <div style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{poLine || '—'}</div>
            {String(po.email || '').trim() ? (
              <a href={`mailto:${encodeURIComponent(po.email.trim())}`} style={{ color: 'var(--text-link)', fontWeight: 600 }}>{po.email.trim()}</a>
            ) : (
              <span className="text-tertiary">No placement officer email on file.</span>
            )}
          </div>
          <p className="text-xs text-tertiary" style={{ marginTop: '1rem', marginBottom: 0 }}>Shown to your team; employers see your public profile when you publish it.</p>
          {!hasSocialLink && (
            <div style={{ marginTop: '1.25rem', padding: '0.875rem', background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-200)' }}>
              <Link href="/dashboard/college/settings" style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary-700)', textDecoration: 'none' }}>
                + Add social links in Settings →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Dept Stats + Recent Activity */}
      <div className="grid grid-2" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div className="card-header" style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BarChart2 size={18} className="text-secondary" /> Department-wise Placement</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {departmentStats.map((d) => (
              <div key={d.dept}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{d.dept}</span>
                  <span style={{ fontSize: '0.85rem', color: d.pct >= 80 ? 'var(--success-600)' : d.pct >= 50 ? 'var(--warning-600)' : 'var(--danger-600)', fontWeight: 700 }}>{d.placed}/{d.total} ({d.pct}%)</span>
                </div>
                <div style={{ height: 8, background: 'var(--gray-200)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${d.pct}%`, background: d.pct >= 80 ? 'var(--success-500)' : d.pct >= 50 ? 'var(--warning-500)' : 'var(--danger-500)', borderRadius: 999, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
            {departmentStats.length === 0 && <p className="text-secondary text-sm" style={{ margin: 0 }}>No department data yet. Add student records to populate this section.</p>}
          </div>
        </div>

        <div className="card">
          <div className="card-header" style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={18} className="text-secondary" /> Recent Activity</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentActivity.map((activity, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: `var(--${activity.color || 'primary'}-50)`, color: `var(--${activity.color || 'primary'}-600)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <TrendingUp size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4 }}>{activity.text}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>{activity.time}</div>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && <p className="text-secondary text-sm" style={{ margin: 0 }}>No recent activity to display.</p>}
          </div>
        </div>
      </div>

      {/* Pending Actions */}
      {pendingTotal > 0 && (
        <div className="card" style={{ background: 'linear-gradient(135deg, white, var(--warning-50))', border: '1px solid var(--warning-200)' }}>
          <div className="card-header" style={{ borderBottom: '1px solid var(--warning-200)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Zap size={18} style={{ color: 'var(--warning-600)' }} /> Pending Actions</h3>
            <span className="badge badge-amber">{pendingTotal} items need attention</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {pendingActions.drivesCount > 0 && (
              <div className="card" style={{ flex: '1 1 280px', padding: '1.25rem', border: '1px solid var(--warning-200)' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontWeight: 700, marginBottom: '0.5rem' }}><ClipboardList size={16} style={{ color: 'var(--warning-600)' }} /> Drive Requests</div>
                <div className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>{pendingActions.drivesCount} drive requests awaiting approval</div>
                <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => showNotReady('Review drives')}>Review Drives</button>
              </div>
            )}
            {pendingActions.studentsCount > 0 && (
              <div className="card" style={{ flex: '1 1 280px', padding: '1.25rem', border: '1px solid var(--warning-200)' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontWeight: 700, marginBottom: '0.5rem' }}><GraduationCap size={16} style={{ color: 'var(--warning-600)' }} /> Student Verification</div>
                <div className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>{pendingActions.studentsCount} students awaiting profile verification</div>
                <Link href="/dashboard/college/students" className="btn btn-secondary btn-sm" style={{ width: '100%', textAlign: 'center' }}>Review Students</Link>
              </div>
            )}
            {pendingActions.documentsCount > 0 && (
              <div className="card" style={{ flex: '1 1 280px', padding: '1.25rem', border: '1px solid var(--warning-200)' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontWeight: 700, marginBottom: '0.5rem' }}><FileText size={16} style={{ color: 'var(--warning-600)' }} /> Document Verification</div>
                <div className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>{pendingActions.documentsCount} student documents need verification</div>
                <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => showNotReady('Review documents')}>Review Documents</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
