'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ip/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

const LINKS = [
  {
    href: '/superadmin/approvals',
    title: 'Employer approvals',
    description: 'Review and approve/reject employer accounts.',
    badgeKey: 'pendingEmployers',
  },
  {
    href: '/superadmin/requests',
    title: 'Manual requests',
    description: 'Create employer accounts from domain-mismatch requests.',
    badgeKey: 'pendingRequests',
  },
  {
    href: '/superadmin/feature-ideas',
    title: 'Feature ideas',
    description: 'Triage Suggestions & Ideas submissions.',
    badgeKey: 'pendingIdeas',
  },
  {
    href: '/superadmin/login-report',
    title: 'Login report',
    description: 'Authentication activity across all roles.',
  },
  {
    href: '/superadmin/messages',
    title: 'Messages',
    description: 'Candidate/employer ↔ SuperAdmin threads.',
  },
  {
    href: '/superadmin/documents',
    title: 'Verification documents',
    description: 'Review employer uploads (Shop Act / LLP / PAN).',
  },
  {
    href: '/superadmin/postings',
    title: 'Posting moderation',
    description: 'Pause or take down internship listings.',
  },
  {
    href: '/superadmin/promotions',
    title: 'LinkedIn promotions',
    description: 'Verify promotion tokens / fast-track URLs.',
  },
  {
    href: '/superadmin/viral',
    title: 'Viral shares',
    description: 'LinkedIn site shares / 24h Google verify queue.',
  },
  {
    href: '/superadmin/approvals',
    title: 'Offers & hiring',
    description: 'Review approvals related to offers and hiring.',
    offersKey: true,
  },
];

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('/api/ip/superadmin/stats').then((r) => r.json()).then(setStats).catch(() => {});
  }, []);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="SuperAdmin dashboard"
        description="Trust, approvals, moderation and operational reporting."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Candidates" value={stats?.candidates} />
        <StatCard label="Employers" value={stats?.employers} sub={stats ? `${stats.pendingEmployers} pending` : ''} />
        <StatCard label="Internships" value={stats?.internships?.total} sub={stats ? `${stats.internships.live} live` : ''} />
        <StatCard label="Applications" value={stats?.applications} />
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle>Operations</CardTitle>
          <CardDescription>
            {stats?.offers
              ? `${stats.offers.accepted}/${stats.offers.total} offers accepted · open a queue below`
              : 'Open moderation and reporting queues'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Area</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead>Queue</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LINKS.map((link) => {
                const count = link.badgeKey ? stats?.[link.badgeKey] : null;
                const offersLabel = link.offersKey && stats?.offers
                  ? `${stats.offers.accepted}/${stats.offers.total} accepted`
                  : null;
                return (
                  <TableRow key={`${link.href}-${link.title}`}>
                    <TableCell className="font-medium">{link.title}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {link.description}
                    </TableCell>
                    <TableCell>
                      {count ? <Badge variant="destructive">{count}</Badge> : null}
                      {offersLabel ? <Badge variant="outline">{offersLabel}</Badge> : null}
                      {!count && !offersLabel ? <span className="text-muted-foreground">—</span> : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button render={<Link href={link.href} />} size="sm" variant="outline">
                        {link.offersKey ? 'Open approvals' : 'Open'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value ?? '—'}</CardTitle>
      </CardHeader>
      {sub ? <CardContent className="pt-0 text-xs text-muted-foreground">{sub}</CardContent> : null}
    </Card>
  );
}
