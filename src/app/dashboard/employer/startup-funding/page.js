'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Rocket, Eye, Mail, Info } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import PageLoading from '@/components/PageLoading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminFilterSelect from '@/components/AdminFilterSelect';

function flattenPrograms(colleges) {
  const rows = [];
  for (const college of colleges) {
    for (const level of college.fundingLevels || []) {
      for (const tier of level.tiers || []) {
        rows.push({
          opportunityId: tier.id,
          collegeId: college.id,
          collegeName: college.name,
          collegeLocation: college.location,
          contactEmail: college.contactEmail,
          category: level.category,
          categoryDescription: level.description,
          tierName: tier.name,
          price: tier.price,
          benefits: tier.benefits,
          label: tier.label,
        });
      }
    }
  }
  return rows;
}

export default function EmployerStartupFundingPage() {
  const { addToast } = useToast();
  const [colleges, setColleges] = useState([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailsRow, setDetailsRow] = useState(null);
  const [search, setSearch] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const loadPrograms = useCallback(async ({ showLoading = false } = {}) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch('/api/employer/startup-funding');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load startup funding programs');
      setColleges(Array.isArray(json.colleges) ? json.colleges : []);
      setDisclaimer(String(json.disclaimer || ''));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadPrograms({ showLoading: true });
      } catch {
        if (!mounted) return;
        setColleges([]);
        setLoading(false);
        addToast('Failed to load startup funding programs', 'error');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadPrograms, addToast]);

  const allRows = useMemo(() => flattenPrograms(colleges), [colleges]);

  const collegeOptions = useMemo(() => {
    const m = new Map();
    for (const c of colleges) m.set(c.id, c.name);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [colleges]);

  const categoryOptions = useMemo(() => {
    const s = new Set();
    for (const r of allRows) s.add(r.category);
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [allRows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((r) => {
      if (collegeFilter && r.collegeId !== collegeFilter) return false;
      if (categoryFilter && r.category !== categoryFilter) return false;
      if (q) {
        const hay = `${r.collegeName} ${r.collegeLocation} ${r.category} ${r.tierName} ${r.label || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allRows, search, collegeFilter, categoryFilter]);

  const discussProgram = (row) => {
    const email = String(row.contactEmail || '').trim();
    const subject = `Seed funding inquiry: ${row.tierName} — ${row.collegeName}`;
    const body = [
      'Hello,',
      '',
      `We are interested in learning more about the "${row.tierName}" program (${row.category}) listed on PlacementHub.`,
      '',
      'Please share how your innovation / incubation office handles diligence, term sheets, and allocation for campus startups.',
      '',
      'Regards,',
    ].join('\n');
    if (!email) {
      addToast('This college has not published a contact email yet. Try Campus Partnerships or their profile.', 'warning');
      return;
    }
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '2rem' }}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Rocket size={24} className="text-primary" aria-hidden />
            Startup seed funding
          </h1>
          <p>
            Browse indicative seed funding programs at partner colleges. Amounts and benefits are for orientation only —
            actual investments are negotiated offline with the institution&apos;s innovation office.
          </p>
        </div>
        <Button variant="outline" size="sm" render={<Link href="/dashboard/employer/select-campus" />}>
          Campus partnerships
        </Button>
      </div>

      <Alert className="mb-4">
          <Info size={20} className="text-primary" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
            <AlertTitle>Informational module — no transactions on PlacementHub</AlertTitle>
            <AlertDescription>
              {disclaimer ||
                'Seed investments involve legal review, shareholder agreements, valuation, and compliance steps that are outside the scope of this platform. Use the programs below to understand what each college offers, then contact them directly to begin a formal process.'}
            </AlertDescription>
      </Alert>

      <Card className="mb-4"><CardContent className="flex flex-wrap items-end gap-3">
          <Field className="min-w-48 flex-1">
            <FieldLabel>College</FieldLabel>
            <AdminFilterSelect
              className="h-9 w-full"
              value={collegeFilter}
              onValueChange={setCollegeFilter}
              items={[
                { label: 'All colleges', value: 'all' },
                ...collegeOptions.map(([id, name]) => ({ label: name, value: String(id) })),
              ]}
            />
          </Field>
          <Field className="min-w-44 flex-1">
            <FieldLabel>Category</FieldLabel>
            <AdminFilterSelect
              className="h-9 w-full"
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              items={[
                { label: 'All categories', value: 'all' },
                ...categoryOptions.map((cat) => ({ label: cat, value: cat })),
              ]}
            />
          </Field>
          <Field className="min-w-52 flex-[2]">
            <FieldLabel>Search</FieldLabel>
            <Input
              placeholder="College, tier, category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Field>
          <span className="text-xs text-secondary" style={{ marginLeft: 'auto' }}>
            {loading ? 'Loading…' : `Showing ${filteredRows.length} of ${allRows.length}`}
          </span>
      </CardContent></Card>

      {loading ? (
        <PageLoading message="Loading startup funding programs…" inline />
      ) : (
        <Card><CardContent><Table>
            <TableHeader><TableRow>
                <TableHead>College</TableHead><TableHead>Category</TableHead><TableHead>Program tier</TableHead><TableHead>Indicative amount</TableHead><TableHead className="w-px">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={row.opportunityId}>
                  <TableCell>
                    <div className="font-semibold">{row.collegeName}</div>
                    <div className="text-xs text-secondary">{row.collegeLocation}</div>
                  </TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>
                    <div className="font-medium">{row.tierName}</div>
                    {row.label ? (
                      <div style={{ marginTop: 4 }}>
                        <Badge variant="secondary">{row.label}</Badge>
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">{row.price}</div>
                    <div className="text-xs text-tertiary">Indicative — not a checkout price</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="View program details"
                      aria-label={`View details for ${row.tierName}`}
                      onClick={() => setDetailsRow(row)}
                    >
                      <Eye size={16} />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="ml-1.5"
                      title="Email the college innovation office"
                      onClick={() => discussProgram(row)}
                    >
                      <Mail size={14} style={{ marginRight: 4 }} />
                      Inquire
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {allRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No startup funding programs are published yet.
                  </TableCell>
                </TableRow>
              ) : null}
              {allRows.length > 0 && filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No programs match your filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table></CardContent></Card>
      )}

      <Dialog open={Boolean(detailsRow)} onOpenChange={(open) => !open && setDetailsRow(null)}>
        <DialogContent className="sm:max-w-lg">
          {detailsRow ? <>
            <DialogHeader><DialogTitle>{detailsRow.tierName}</DialogTitle><DialogDescription>{detailsRow.collegeName}</DialogDescription></DialogHeader>
            <p className="text-sm text-muted-foreground">
              {detailsRow.category} · {detailsRow.price}{' '}
              <span className="text-tertiary">(indicative)</span>
            </p>
            {detailsRow.categoryDescription ? (
              <p className="text-sm" style={{ marginBottom: '0.75rem' }}>
                {detailsRow.categoryDescription}
              </p>
            ) : null}
            <strong className="text-sm">Typical benefits (overview)</strong>
            <ul
              style={{
                margin: '0.5rem 0 1rem',
                paddingLeft: '1.1rem',
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
              }}
            >
              {(detailsRow.benefits || []).map((b, bi) => (
                <li key={bi} style={{ marginBottom: '0.35rem' }}>
                  {b}
                </li>
              ))}
            </ul>
            <p className="text-xs text-secondary" style={{ margin: '0 0 1rem', lineHeight: 1.5 }}>
              Final investment structure, equity or grant terms, and startup selection are agreed outside PlacementHub
              with the college innovation / incubation team and legal counsel.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDetailsRow(null)}>
                Close
              </Button>
              <Button type="button" onClick={() => discussProgram(detailsRow)}>
                <Mail size={14} style={{ marginRight: 4 }} />
                Contact college
              </Button>
            </DialogFooter>
          </> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
