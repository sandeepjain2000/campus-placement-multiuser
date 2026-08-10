'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LayoutGrid, List } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import PageHeader from '@/components/ip/PageHeader';
import { cn } from '@/lib/utils';

const WORK_MODES = [
  { value: 'all', label: 'All work modes' },
  { value: 'Remote', label: 'Remote' },
  { value: 'Hybrid', label: 'Hybrid' },
  { value: 'Onsite', label: 'Onsite' },
  { value: 'On-site', label: 'On-site' },
];

export default function BrowseInternshipsPage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [minStipend, setMinStipend] = useState('');
  const [workMode, setWorkMode] = useState('all');
  const [minMatch, setMinMatch] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // list default

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (minStipend) params.set('minStipend', minStipend);
    if (workMode && workMode !== 'all') params.set('workMode', workMode);
    if (minMatch) params.set('minMatch', minMatch);
    if (savedOnly) params.set('savedOnly', '1');
    const res = await fetch(`/api/ip/candidate/internships?${params.toString()}`);
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleSave(internshipId, saved) {
    await fetch('/api/ip/candidate/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ internshipId, saved: !saved }),
    });
    await load();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Browse internships"
        description="Filter by stipend, work mode, and match score. Eligibility never blocks applying."
        actions={
          <div className="flex gap-1 rounded-md border p-0.5">
            <Button
              type="button"
              size="sm"
              variant={view === 'list' ? 'default' : 'ghost'}
              onClick={() => setView('list')}
              aria-pressed={view === 'list'}
            >
              <List data-icon="inline-start" className="size-4" />
              List
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === 'cards' ? 'default' : 'ghost'}
              onClick={() => setView('cards')}
              aria-pressed={view === 'cards'}
            >
              <LayoutGrid data-icon="inline-start" className="size-4" />
              Cards
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-2 pt-4">
          <Input
            placeholder="Search title or company"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
          <Input
            placeholder="Min stipend (INR)"
            type="number"
            value={minStipend}
            onChange={(e) => setMinStipend(e.target.value)}
            className="max-w-[160px]"
          />
          <Select value={workMode} onValueChange={setWorkMode}>
            <SelectTrigger className="min-w-[160px]" aria-label="Work mode">
              <SelectValue placeholder="Work mode" />
            </SelectTrigger>
            <SelectContent>
              {WORK_MODES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Min match %"
            type="number"
            value={minMatch}
            onChange={(e) => setMinMatch(e.target.value)}
            className="max-w-[120px]"
          />
          <label className="flex items-center gap-2 px-2 text-sm">
            <Checkbox checked={savedOnly} onCheckedChange={(v) => setSavedOnly(Boolean(v))} />
            Saved only
          </label>
          <Button onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Search'}
          </Button>
        </CardContent>
      </Card>

      {view === 'list' ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Results</CardTitle>
            <CardDescription>{items.length} internship(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Stipend</TableHead>
                  <TableHead className="min-w-[6.5rem]">Match</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.title}</TableCell>
                    <TableCell>{i.company_name}</TableCell>
                    <TableCell>{i.work_mode || i.location || '—'}</TableCell>
                    <TableCell>
                      {i.stipend_inr
                        ? `₹${i.stipend_inr}/mo`
                        : i.stipend_type === 'incentive'
                          ? 'Incentive'
                          : 'Unpaid'}
                    </TableCell>
                    <TableCell className="min-w-[6.5rem]">
                      <Badge variant="outline" className="min-w-fit overflow-visible">
                        {i.match_score != null ? `${i.match_score}%` : '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-1 whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => toggleSave(i.id, i.saved)}>
                        {i.saved ? 'Unsave' : 'Save'}
                      </Button>
                      <Button render={<Link href={`/candidate/internships/${i.id}`} />} size="sm">
                        View &amp; apply
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!items.length && !loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No internships match your filters.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((i) => (
            <Card key={i.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{i.title}</CardTitle>
                  <Badge variant="outline" className="min-w-fit overflow-visible">
                    {i.match_score}% match
                  </Badge>
                </div>
                <CardDescription>
                  {i.company_name} · {i.location || i.work_mode}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {i.stipend_inr
                    ? `₹${i.stipend_inr}/mo`
                    : i.stipend_type === 'incentive'
                      ? 'Incentive'
                      : 'Unpaid'}
                </span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => toggleSave(i.id, i.saved)}>
                    {i.saved ? 'Unsave' : 'Save'}
                  </Button>
                  <Button render={<Link href={`/candidate/internships/${i.id}`} />} size="sm">
                    View &amp; apply
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!items.length && !loading ? (
            <p className={cn('text-sm text-muted-foreground')}>No internships match your filters.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
