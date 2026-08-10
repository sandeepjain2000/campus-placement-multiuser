'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import PageHeader from '@/components/ip/PageHeader';
import RatingsReceivedCard from '@/components/ip/RatingsReceivedCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export default function EmployerDashboard() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState(null);
  const [internships, setInternships] = useState([]);

  useEffect(() => {
    fetch('/api/ip/employer/profile').then((r) => r.json()).then((d) => setProfile(d.profile)).catch(() => {});
    fetch('/api/ip/employer/internships').then((r) => r.json()).then((d) => setInternships(d.items || [])).catch(() => {});
  }, []);

  const canPost = session?.user?.profileComplete && profile?.approval_status === 'approved';

  return (
    <div className="space-y-6">
      <PageHeader
        title={profile?.company_name || 'Employer dashboard'}
        description={session?.user?.email}
        actions={
          <Badge variant={profile?.approval_status === 'approved' ? 'default' : 'outline'} className="min-w-fit">
            {profile?.approval_status || 'Pending'}
          </Badge>
        }
      />

      {profile?.approval_status && profile.approval_status !== 'approved' ? (
        <Alert>
          <AlertTitle>Waiting for SuperAdmin approval</AlertTitle>
          <AlertDescription>You can prepare postings as drafts while approval is pending.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Reward points" value={profile?.points ?? '—'} />
        <StatCard label="Free posting credits" value={profile?.free_post_credits ?? '—'} />
        <StatCard label="Active postings" value={internships.filter((i) => i.status === 'published').length} />
        <StatCard label="Total applicants" value={internships.reduce((s, i) => s + Number(i.applicant_count || 0), 0)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick actions</CardTitle>
          <CardDescription>Post, manage, or export employer data.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button render={<Link href="/employer/internships/new" />} disabled={!canPost}>
            Post an internship
          </Button>
          <Button render={<Link href="/employer/internships" />} variant="outline">
            Manage postings
          </Button>
          <Button render={<a href="/api/ip/employer/export" />} variant="outline">
            Export Excel (.csv)
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <DashCard href="/employer/candidates" title="Search candidates" desc="Find and invite searchable profiles." />
        <DashCard href="/employer/messages" title="Messages" desc="Email-style inbox with candidates." />
        <DashCard href="/employer/offers" title="Offers" desc="Create and track offers." />
        <DashCard href="/employer/analytics" title="Analytics" desc="Funnel, stipend & education mix." />
        <DashCard href="/employer/referral" title="Refer & earn" desc="Earn free posting credits." />
        <DashCard href="/employer/viral" title="Viral board" desc="Share portal links; LinkedIn verified ~24h later." />
        <DashCard href="/employer/notifications" title="Notifications" desc="Recent activity." />
      </div>

      <RatingsReceivedCard />
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function DashCard({ href, title, desc }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button render={<Link href={href} />} variant="outline" size="sm">
          Open
        </Button>
      </CardContent>
    </Card>
  );
}
