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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

function InstitutionClassificationSection({ title, icon: Icon, fields, values }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="text-muted-foreground size-5" aria-hidden="true" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => (
          <div key={field.key} className="bg-muted/50 rounded-lg border px-3.5 py-3">
            <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{field.label}</div>
            <div className="mt-1 text-sm font-semibold">
              {values?.[field.key] ? 'Yes' : 'No'}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
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
    return <Card><CardContent className="text-muted-foreground py-20 text-center">Loading campus details…</CardContent></Card>;
  }

  if (error || !college) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-6">
        <p className="text-destructive m-0">
          {error?.message || 'Campus not found.'}
        </p>
        <Button variant="secondary" render={<Link href="/dashboard/employer/select-campus" />}>
          Back to campuses
        </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={() => router.push('/dashboard/employer/select-campus')}>
          <ArrowLeft data-icon="inline-start" />
          Back to campuses
        </Button>
        {status === 'approved' && (
          <Button
            type="button"
            disabled
            title={EMPLOYER_USE_CAMPUS_DISABLED_TITLE}
          >
            Open campus workspace
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center gap-3">
          <EntityLogo name={college.name} website={college.website} size="md" shape="rounded" />
          <div className="min-w-0">
            <CardTitle className="text-xl">{college.name}</CardTitle>
            <CardDescription className="mt-1">
              {[college.city, college.state].filter(Boolean).join(', ') || 'Location not set'}
            </CardDescription>
            {website ? (
              <a
                href={website.href}
                target="_blank"
                rel="noreferrer"
                className="text-primary mt-1 inline-flex items-center gap-1.5 text-sm underline-offset-2 hover:underline"
              >
                <Globe className="size-4" aria-hidden="true" />
                {website.label}
              </a>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['Partnership status', <StatusBadge key="status" status={status || 'not_requested'} showDot>{formatStatus(status || 'not requested') || '—'}</StatusBadge>],
            ['Students on campus', college.total_students || 0],
            ['Students placed', college.placed_students || 0],
            ['Placement rate', placementPct != null ? `${placementPct}%` : '—'],
            ['Average CGPA', college.avg_cgpa != null ? Number(college.avg_cgpa).toFixed(2) : '—'],
            ['Your active drives here', college.active_drives || 0],
          ].map(([label, value]) => (
            <div key={label} className="bg-muted/50 rounded-lg border px-3.5 py-3">
              <p className="text-muted-foreground m-0 text-xs font-medium tracking-wide uppercase">{label}</p>
              <div className="mt-1.5 text-sm font-semibold">{value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <section className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Contact</h3>
            <p className="mt-3 flex items-center gap-2 text-sm">
              <Mail aria-hidden="true" />
              {college.email ? (
                <a href={`mailto:${college.email}`} className="text-primary hover:underline">
                  {college.email}
                </a>
              ) : '—'}
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm">
              <Phone aria-hidden="true" />
              {college.phone ? (
                <a href={`tel:${String(college.phone).replace(/\s+/g, '')}`} className="text-primary hover:underline">
                  {college.phone}
                </a>
              ) : '—'}
            </p>
          </section>
          <section className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Accreditation</h3>
            <p className="mt-3 flex items-center gap-2 text-sm">
              <GraduationCap aria-hidden="true" />
              {accreditationLine || 'Not set'}
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm">
              <TrendingUp aria-hidden="true" />
              {college.nirf_rank ? `NIRF rank #${college.nirf_rank}` : 'NIRF rank not set'}
            </p>
          </section>
          <section className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Partnership Timeline</h3>
            <p className="mt-3 flex items-center gap-2 text-sm">
              <Users aria-hidden="true" />
              Requested: {college.requested_at ? formatDate(college.requested_at) : '—'}
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm">
              <Briefcase aria-hidden="true" />
              Approved: {college.approved_at ? formatDate(college.approved_at) : '—'}
            </p>
          </section>
        </div>

        <p className="text-muted-foreground text-sm leading-6">
          This profile shows campus and partnership data available to employers. Fields such as full postal address or
          internal college settings are managed by the college and are not shared here.
        </p>
        </CardContent>
      </Card>

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

      <p className="text-muted-foreground text-xs leading-5">
        Institution type classifications above are maintained by the platform administrator and are not editable by the college.
      </p>
    </div>
  );
}
