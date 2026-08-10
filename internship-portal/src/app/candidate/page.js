'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import RatingsReceivedCard from '@/components/ip/RatingsReceivedCard';
import PageHeader from '@/components/ip/PageHeader';
import { POINTS_PER_APPLICATION } from '@/lib/pointsEconomy';

export default function CandidateDashboard() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState(null);
  const [apps, setApps] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [saved, setSaved] = useState([]);

  useEffect(() => {
    fetch('/api/ip/candidate/profile').then((r) => r.json()).then((d) => setProfile(d.profile)).catch(() => {});
    fetch('/api/ip/candidate/applications').then((r) => r.json()).then((d) => setApps(d.items || [])).catch(() => {});
    fetch('/api/ip/candidate/internships?recommended=1').then((r) => r.json()).then((d) => setRecommended((d.items || []).slice(0, 4))).catch(() => {});
    fetch('/api/ip/candidate/saved').then((r) => r.json()).then((d) => setSaved((d.items || []).slice(0, 4))).catch(() => {});
  }, []);

  const used = apps.length;
  const completed = apps.filter((a) => a.status === 'completed');

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${session?.user?.name || 'candidate'}`}
        description={session?.user?.email}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Reward points" value={profile?.points ?? '—'} />
        <StatCard label="Cost per apply" value={`${POINTS_PER_APPLICATION} pts`} />
        <StatCard label="Applications sent" value={used} />
        <StatCard label="Completed" value={completed.length} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recommended for you</CardTitle>
            <CardDescription>Ranked by eligibility match score</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recommended.map((i) => (
              <div key={i.id} className="flex justify-between items-center text-sm border-b py-1">
                <div>
                  <p className="font-medium">{i.title}</p>
                  <p className="text-muted-foreground">{i.company_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{i.match_score}%</Badge>
                  <Button size="sm" variant="outline" render={<Link href={`/candidate/internships/${i.id}`} />}>Open</Button>
                </div>
              </div>
            ))}
            {!recommended.length ? <p className="text-sm text-muted-foreground">No recommendations yet — complete skills on your profile.</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saved internships</CardTitle>
            <CardDescription>Shortcuts to roles you bookmarked</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {saved.map((i) => (
              <div key={i.id} className="flex justify-between items-center text-sm border-b py-1">
                <span className="font-medium">{i.title}</span>
                <Button size="sm" variant="outline" render={<Link href={`/candidate/internships/${i.id}`} />}>Open</Button>
              </div>
            ))}
            {!saved.length ? <p className="text-sm text-muted-foreground">No saved roles yet.</p> : null}
            <Button size="sm" variant="ghost" render={<Link href="/candidate/internships?saved=1" />}>Browse all</Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <DashCard href="/candidate/internships" title="Browse internships" desc="Filter by stipend, eligibility, and work mode." />
        <DashCard href="/candidate/applications" title="My applications" desc="Track status of every application." />
        <DashCard href="/candidate/messages" title="Messages" desc="Chat with employers." />
        <DashCard href="/candidate/offers" title="Offers" desc="Review and respond to offers." />
        <DashCard href="/candidate/referral" title="Refer & earn" desc="Share your link and convert points." />
        <DashCard href="/candidate/profile" title="Profile & export" desc="Tabbed settings + Excel export." />
      </div>

      <RatingsReceivedCard />
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardDescription>{label}</CardDescription><CardTitle className="text-2xl">{value}</CardTitle></CardHeader>
    </Card>
  );
}

function DashCard({ href, title, desc }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle><CardDescription>{desc}</CardDescription></CardHeader>
      <CardContent><Button render={<Link href={href} />} variant="outline" size="sm">Open</Button></CardContent>
    </Card>
  );
}
