'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ip/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup,
} from '@/components/ui/select';

const STATUSES = ['Pending approval', 'Under review', 'Planned', 'Shipped', 'Declined'];

export default function FeatureIdeasTriagePage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  async function load() {
    const res = await fetch('/api/ip/ideas');
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => { load(); }, []);

  async function setStatus(id, status) {
    setBusyId(id);
    setError('');
    try {
      const res = await fetch(`/api/ip/superadmin/feature-ideas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Status update failed');
        return;
      }
      await load();
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHeader
        title="Feature ideas triage"
        description="Suggestions & Ideas submitted by candidates and employers."
        actions={(
          <Button render={<Link href="/ideas" />} variant="outline" size="sm">
            View public ideas board
          </Button>
        )}
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle>Ideas queue</CardTitle>
          <CardDescription>{items.length} idea(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Idea</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Votes</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((idea) => (
                <TableRow key={idea.id}>
                  <TableCell>
                    <div className="font-medium">{idea.title}</div>
                    <div className="text-muted-foreground mt-1 max-w-md text-sm">{idea.description}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {idea.author_name || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{idea.vote_count} votes</Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={idea.status}
                      disabled={busyId === idea.id}
                      onValueChange={(v) => setStatus(idea.id, v)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {!items.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                    No feature ideas yet.
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
