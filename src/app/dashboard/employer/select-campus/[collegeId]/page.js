'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Mail, Phone, GraduationCap, Users, Briefcase, ArrowLeft, Globe, TrendingUp, Building2, School } from 'lucide-react';
import { formatDate, formatStatus } from '@/lib/utils';
import EntityLogo from '@/components/EntityLogo';
import {
  COLLEGE_TYPE_CLASSIFICATIONS,
  UNIVERSITY_TYPE_CLASSIFICATIONS,
} from '@/lib/tenantInstitutionClassifications';
import { EMPLOYER_USE_CAMPUS_DISABLED_TITLE } from '@/lib/employerActiveCampus';

function InstitutionClassificationSection({ title, icon: Icon, fields, values }) {
  return (
    <div className="card card-hover" style={{ margin: 0 }}>
      <div className="card-header" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem' }}>
          <Icon size={18} className="text-primary-600" aria-hidden="true" />
          {title}
        </h3>
      </div>
      <div className="drive-info-grid" style={{ gap: '1rem' }}>
        {fields.map((field) => (
          <div key={field.key} className="drive-info-item">
            <div
              className="drive-info-label"
              style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              {field.label}
            </div>
            <div
              className="drive-info-value"
              style={{
                fontWeight: 600,
                color: values?.[field.key] ? 'var(--success-700, var(--primary-600))' : 'var(--text-secondary)',
              }}
            >
              {values?.[field.key] ? 'Yes' : 'No'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const fetcher = async (url) => {
  const res = await fetch(url, { credentials: 'include' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Failed to load campus details');
  return json;
};

function normalizeApprovalStatus(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim().toLowerCase();
  return ['approved', 'pending', 'rejected', 'blacklisted'].includes(s) ? s : null;
}

function formatWebsite(url) {
  if (!url) return null;
  const href = url.startsWith('http') ? url : `https://${url}`;
  const label = String(url).replace(/^https?:\/\//, '');
  return { href, label };
}

export default function EmployerCampusDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const collegeId = String(params?.collegeId || '');
  const { data, error, isLoading } = useSWR('/api/employer/campuses', fetcher);

  const college = (data?.colleges || []).find((c) => c.id === collegeId) || null;
  const status = normalizeApprovalStatus(college?.approval_status);
  const placementPct = college?.total_students > 0
    ? Math.round((Number(college.placed_students || 0) / Number(college.total_students)) * 100)
    : null;
  const website = formatWebsite(college?.website);
  const accreditationLine = [
    college?.accreditation ? String(college.accreditation) : null,
    college?.naac_grade ? `NAAC ${college.naac_grade}` : null,
  ].filter(Boolean).join(' · ');

  if (isLoading) {
    return <div className="skeleton" style={{ height: 260, borderRadius: 'var(--radius-lg)' }} />;
  }

  if (error || !college) {
    return (
      <div className="card">
        <p style={{ color: 'var(--danger-600)', marginBottom: '0.75rem' }}>
          {error?.message || 'Campus not found.'}
        </p>
        <Link href="/dashboard/employer/select-campus" className="btn btn-secondary">
          Back to campuses
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn" style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-ghost" onClick={() => router.push('/dashboard/employer/select-campus')}>
          <ArrowLeft size={15} style={{ marginRight: '0.35rem' }} />
          Back to campuses
        </button>
        {status === 'approved' && (
          <button
            type="button"
            className="btn btn-primary"
            disabled
            title={EMPLOYER_USE_CAMPUS_DISABLED_TITLE}
          >
            Open campus workspace
          </button>
        )}
      </div>

      <div className="card" style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <EntityLogo name={college.name} website={college.website} size="md" shape="rounded" />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem' }}>{college.name}</h1>
            <p className="text-secondary" style={{ margin: '0.15rem 0 0' }}>
              {[college.city, college.state].filter(Boolean).join(', ') || 'Location not set'}
            </p>
            {website ? (
              <a
                href={website.href}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.85rem', color: 'var(--text-link)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.35rem' }}
              >
                <Globe size={14} aria-hidden="true" />
                {website.label}
              </a>
            ) : null}
          </div>
        </div>

        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div className="card" style={{ margin: 0 }}>
            <p className="text-tertiary text-xs">Partnership status</p>
            <p style={{ margin: '0.25rem 0 0', fontWeight: 700 }}>{formatStatus(status || 'not requested')}</p>
          </div>
          <div className="card" style={{ margin: 0 }}>
            <p className="text-tertiary text-xs">Students on campus</p>
            <p style={{ margin: '0.25rem 0 0', fontWeight: 700 }}>{college.total_students || 0}</p>
          </div>
          <div className="card" style={{ margin: 0 }}>
            <p className="text-tertiary text-xs">Students placed</p>
            <p style={{ margin: '0.25rem 0 0', fontWeight: 700 }}>{college.placed_students || 0}</p>
          </div>
          <div className="card" style={{ margin: 0 }}>
            <p className="text-tertiary text-xs">Placement rate</p>
            <p style={{ margin: '0.25rem 0 0', fontWeight: 700 }}>{placementPct != null ? `${placementPct}%` : '—'}</p>
          </div>
          <div className="card" style={{ margin: 0 }}>
            <p className="text-tertiary text-xs">Average CGPA</p>
            <p style={{ margin: '0.25rem 0 0', fontWeight: 700 }}>{college.avg_cgpa != null ? Number(college.avg_cgpa).toFixed(2) : '—'}</p>
          </div>
          <div className="card" style={{ margin: 0 }}>
            <p className="text-tertiary text-xs">Your active drives here</p>
            <p style={{ margin: '0.25rem 0 0', fontWeight: 700 }}>{college.active_drives || 0}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <div className="card" style={{ margin: 0 }}>
            <p className="text-tertiary text-xs">Contact</p>
            <p style={{ margin: '0.4rem 0 0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Mail size={14} aria-hidden="true" />
              {college.email ? (
                <a href={`mailto:${college.email}`} style={{ color: 'var(--text-link)', textDecoration: 'none' }}>
                  {college.email}
                </a>
              ) : '—'}
            </p>
            <p style={{ margin: '0.35rem 0 0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Phone size={14} aria-hidden="true" />
              {college.phone ? (
                <a href={`tel:${String(college.phone).replace(/\s+/g, '')}`} style={{ color: 'var(--text-link)', textDecoration: 'none' }}>
                  {college.phone}
                </a>
              ) : '—'}
            </p>
          </div>
          <div className="card" style={{ margin: 0 }}>
            <p className="text-tertiary text-xs">Accreditation</p>
            <p style={{ margin: '0.4rem 0 0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <GraduationCap size={14} aria-hidden="true" />
              {accreditationLine || 'Not set'}
            </p>
            <p style={{ margin: '0.35rem 0 0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <TrendingUp size={14} aria-hidden="true" />
              {college.nirf_rank ? `NIRF rank #${college.nirf_rank}` : 'NIRF rank not set'}
            </p>
          </div>
          <div className="card" style={{ margin: 0 }}>
            <p className="text-tertiary text-xs">Partnership timeline</p>
            <p style={{ margin: '0.4rem 0 0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Users size={14} aria-hidden="true" />
              Requested: {college.requested_at ? formatDate(college.requested_at) : '—'}
            </p>
            <p style={{ margin: '0.35rem 0 0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Briefcase size={14} aria-hidden="true" />
              Approved: {college.approved_at ? formatDate(college.approved_at) : '—'}
            </p>
          </div>
        </div>

        <p className="text-sm text-secondary" style={{ margin: 0, lineHeight: 1.5 }}>
          This profile shows campus and partnership data available to employers. Fields such as full postal address or
          internal college settings are managed by the college and are not shared here.
        </p>
      </div>

      <InstitutionClassificationSection
        title="University types (degree granting)"
        icon={Building2}
        fields={UNIVERSITY_TYPE_CLASSIFICATIONS}
        values={college.institutionClassifications}
      />

      <InstitutionClassificationSection
        title="College types (teaching institutes)"
        icon={School}
        fields={COLLEGE_TYPE_CLASSIFICATIONS}
        values={college.institutionClassifications}
      />

      <p className="text-xs text-tertiary" style={{ margin: 0, lineHeight: 1.45 }}>
        Institution type classifications above are maintained by the platform administrator and are not editable by the college.
      </p>
    </div>
  );
}
