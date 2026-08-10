'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { cn } from '@/lib/utils';

function subjectLine(t) {
  const raw = (t.last_message || t.subject || t.internship_title || 'No messages yet').trim();
  return raw.length > 90 ? `${raw.slice(0, 87)}…` : raw;
}

function hoverDetails(t, role) {
  const withName = role === 'candidate'
    ? (t.company_name || t.employer_name || 'Employer')
    : (t.candidate_name || 'Candidate');
  return [
    `With: ${withName}`,
    t.internship_title ? `Position: ${t.internship_title}` : null,
    t.last_sender_name ? `Last from: ${t.last_sender_name}` : null,
    `Messages: ${t.message_count || 0}`,
    Number(t.unread_count) > 0 ? `Unread: ${t.unread_count}` : 'All read',
    t.last_message_at ? `Last activity: ${new Date(t.last_message_at).toLocaleString()}` : null,
    t.last_message ? `Full preview:\n${t.last_message}` : null,
  ].filter(Boolean).join('\n\n');
}

function formatWhen(value) {
  if (!value) return '—';
  const d = new Date(value);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Email-style tabular inbox. Hover preview; click opens dedicated chat route.
 */
export default function MessagesInbox({ role }) {
  const router = useRouter();
  const base = role === 'candidate' ? '/candidate/messages' : '/employer/messages';
  const [threads, setThreads] = useState([]);
  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [position, setPosition] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [hoveredId, setHoveredId] = useState('');

  useEffect(() => {
    fetch('/api/ip/messages/threads')
      .then((r) => r.json())
      .then((d) => setThreads(d.items || []))
      .catch(() => setThreads([]));
  }, []);

  const positions = useMemo(() => {
    const set = new Set();
    threads.forEach((t) => {
      if (t.internship_title) set.add(t.internship_title);
    });
    return [...set].sort();
  }, [threads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTs = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;

    return threads.filter((t) => {
      if (unreadOnly && !(Number(t.unread_count) > 0)) return false;
      if (position && (t.internship_title || '') !== position) return false;
      const when = t.last_message_at || t.updated_at;
      if (when) {
        const ts = new Date(when).getTime();
        if (fromTs != null && ts < fromTs) return false;
        if (toTs != null && ts > toTs) return false;
      } else if (fromTs != null || toTs != null) {
        return false;
      }
      if (!q) return true;
      const counterpart = role === 'candidate'
        ? `${t.company_name || ''} ${t.employer_name || ''}`
        : `${t.candidate_name || ''}`;
      const hay = `${counterpart} ${t.internship_title || ''} ${t.subject || ''} ${t.last_message || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [threads, search, unreadOnly, position, dateFrom, dateTo, role]);

  const counterpartLabel = role === 'candidate' ? 'Employer' : 'Candidate';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Inbox (email-style)</CardTitle>
          <CardDescription>
            Tabular mail, not Internshala chat. Last message = subject. Hover for more; click opens the conversation page.
          </CardDescription>
          <div className="flex flex-wrap items-end gap-2 pt-2">
            <Field className="gap-1">
              <FieldLabel className="text-xs">Search</FieldLabel>
              <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-40" />
            </Field>
            <Field className="gap-1">
              <FieldLabel className="text-xs">Position</FieldLabel>
              <Select value={position || 'all'} onValueChange={(v) => setPosition(v === 'all' ? '' : v)}>
                <SelectTrigger className="min-w-[180px]" aria-label="Filter by position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All positions</SelectItem>
                  {positions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field className="gap-1">
              <FieldLabel className="text-xs">From</FieldLabel>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-[140px]" />
            </Field>
            <Field className="gap-1">
              <FieldLabel className="text-xs">To</FieldLabel>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-[140px]" />
            </Field>
            <label className="mb-1 flex items-center gap-2 whitespace-nowrap text-xs">
              <Checkbox checked={unreadOnly} onCheckedChange={(v) => setUnreadOnly(Boolean(v))} />
              Unread only
            </label>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[24%]">{counterpartLabel}</TableHead>
                <TableHead>Subject (last message)</TableHead>
                <TableHead className="w-[18%] hidden md:table-cell">Position</TableHead>
                <TableHead className="w-[12%] text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => {
                const from = role === 'candidate'
                  ? (t.company_name || t.employer_name || 'Employer')
                  : (t.candidate_name || 'Candidate');
                const unread = Number(t.unread_count) > 0;
                return (
                  <TableRow
                    key={t.id}
                    onMouseEnter={() => setHoveredId(t.id)}
                    onMouseLeave={() => setHoveredId((id) => (id === t.id ? '' : id))}
                    onClick={() => router.push(`${base}/${t.id}`)}
                    className={cn(
                      'cursor-pointer',
                      unread && 'bg-amber-50/50',
                    )}
                  >
                    <TableCell className={cn('align-top', unread && 'font-semibold')}>
                      <div className="flex items-center gap-2">
                        {unread ? <Badge className="h-5 px-1.5">{t.unread_count}</Badge> : null}
                        <span className="truncate">{from}</span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <p className={cn('truncate text-sm', unread ? 'font-semibold' : 'text-muted-foreground')}>
                        {subjectLine(t)}
                      </p>
                      {hoveredId === t.id ? (
                        <div className="relative z-10 mt-2 max-w-xl whitespace-pre-wrap rounded-md border bg-card p-2 text-xs text-muted-foreground shadow-md">
                          {hoverDetails(t, role)}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="align-top hidden md:table-cell text-xs text-muted-foreground">
                      {t.internship_title || 'General'}
                    </TableCell>
                    <TableCell className="align-top text-right text-xs text-muted-foreground whitespace-nowrap">
                      {formatWhen(t.last_message_at || t.updated_at)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!filtered.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    No conversations match these filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="px-1 text-sm text-muted-foreground">Click a row to open the conversation on its own page.</p>
    </div>
  );
}
