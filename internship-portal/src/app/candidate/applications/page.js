'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import PageHeader from '@/components/ip/PageHeader';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatStatus } from '@/lib/utils';

export default function MyApplicationsPage() {
  const [items, setItems] = useState([]);

  async function load() {
    const res = await fetch('/api/ip/candidate/applications');
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function withdraw(id) {
    await fetch(`/api/ip/candidate/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'withdrawn' }),
    });
    await load();
  }

  return (
    <div className="space-y-4">
      <PageHeader title="My applications" description={`${items.length} application(s)`} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Applications</CardTitle>
          <CardDescription>Latest first</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Internship</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Match</TableHead>
                <TableHead className="min-w-[6.5rem]">Status</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    <Link href={`/candidate/internships/${a.internship_id}`} className="hover:underline">
                      {a.title || 'Internship'}
                    </Link>
                  </TableCell>
                  <TableCell>{a.company_name || '—'}</TableCell>
                  <TableCell>{a.match_score != null ? `${a.match_score}%` : '—'}</TableCell>
                  <TableCell className="min-w-[6.5rem]" data-label="Status">
                    <StatusBadge status={a.status}>{formatStatus(a.status) || 'Applied'}</StatusBadge>
                  </TableCell>
                  <TableCell>{a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>
                    {a.status === 'applied' ? (
                      <Button size="sm" variant="outline" onClick={() => withdraw(a.id)}>
                        Withdraw
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {!items.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No applications yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
