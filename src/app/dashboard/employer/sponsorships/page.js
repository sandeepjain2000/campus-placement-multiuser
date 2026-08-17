'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Trophy, School, CreditCard, Building2, Landmark, X, Eye, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import PageLoading from '@/components/PageLoading';
import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminFilterSelect from '@/components/AdminFilterSelect';

/** Demo-only checkout — values are illustrative (Stripes-123 is not a real processor). */
const DEMO_CHECKOUT = {
  cardNumber: '4242 4242 4242 4242',
  expiry: '12 / 34',
  cvc: '123',
  nameOnCard: 'Anita Desai',
  line1: '42 Tech Park Road',
  line2: '4th Floor, Block B',
  city: 'Bengaluru',
  state: 'Karnataka',
  postal: '560001',
  country: 'India',
};

const PAY_TABS = [
  { id: 'online', label: 'Pay online', icon: CreditCard },
  { id: 'cheque', label: 'Cheque', icon: Building2 },
  { id: 'bank', label: 'Bank transfer', icon: Landmark },
];

function flattenOpportunities(colleges) {
  const rows = [];
  for (const college of colleges) {
    for (const level of college.sponsorshipLevels || []) {
      for (const tier of level.tiers || []) {
        rows.push({
          opportunityId: tier.id,
          collegeId: college.id,
          collegeName: college.name,
          collegeLocation: college.location,
          category: level.category,
          categoryDescription: level.description,
          tierName: tier.name,
          price: tier.price,
          priceInr: tier.priceInr,
          benefits: tier.benefits,
          label: tier.label,
          canPayAnother: tier.canPayAnother,
        });
      }
    }
  }
  return rows;
}

export default function EmployerSponsorshipsPage() {
  const { addToast } = useToast();
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sponsorModal, setSponsorModal] = useState(null);
  const [detailsRow, setDetailsRow] = useState(null);
  const [payTab, setPayTab] = useState('online');
  const [submitting, setSubmitting] = useState(false);
  const [proofDataUrl, setProofDataUrl] = useState('');
  /** Legal / tax lines for receipts (saved on payment + employer profile) */
  const [sponsorBilling, setSponsorBilling] = useState({ legalName: '', pan: '', gst: '' });
  /** 'form' | 'processing' | 'success' — demo Stripes-123 checkout only */
  const [stripeDemoStep, setStripeDemoStep] = useState('form');
  const stripeDemoTimerRef = useRef(null);

  const [search, setSearch] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadColleges = useCallback(async ({ showLoading = false } = {}) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch('/api/employer/sponsorships');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load sponsorship data');
      const list = Array.isArray(json.colleges) ? json.colleges : [];
      setColleges(list);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadColleges({ showLoading: true });
      } catch {
        if (!mounted) return;
        setColleges([]);
        setLoading(false);
        addToast('Failed to load sponsorship data', 'error');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadColleges, addToast]);

  const allRows = useMemo(() => flattenOpportunities(colleges), [colleges]);

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
      if (statusFilter === 'available' && !r.canPayAnother) return false;
      if (statusFilter === 'complete' && r.canPayAnother) return false;
      if (q) {
        const hay = `${r.collegeName} ${r.collegeLocation} ${r.category} ${r.tierName} ${r.label || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allRows, search, collegeFilter, categoryFilter, statusFilter]);

  const remittanceForModal = useMemo(() => {
    if (!sponsorModal?.collegeId) return {};
    const c = colleges.find((x) => x.id === sponsorModal.collegeId);
    return c?.remittance || {};
  }, [sponsorModal?.collegeId, colleges]);

  const closeModal = () => {
    if (stripeDemoTimerRef.current) {
      clearTimeout(stripeDemoTimerRef.current);
      stripeDemoTimerRef.current = null;
    }
    setSponsorModal(null);
    setPayTab('online');
    setProofDataUrl('');
    setSubmitting(false);
    setStripeDemoStep('form');
    setSponsorBilling({ legalName: '', pan: '', gst: '' });
  };

  const submitPayment = async (method) => {
    if (!sponsorModal?.opportunityId) return;
    if (sponsorModal.canPayAnother === false) {
      addToast('Your company already has a recorded payment for this tier.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/employer/sponsorships/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: sponsorModal.opportunityId,
          method,
          proofDataUrl: method === 'bank_transfer' ? proofDataUrl || undefined : undefined,
          billingLegalName: sponsorBilling.legalName,
          billingPan: sponsorBilling.pan,
          billingGstNumber: sponsorBilling.gst,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast(json.error || 'Could not record payment', 'warning');
        return;
      }
      const se = json.sponsorshipEmails;
      if (se && se.receipt !== 'sent' && se.receipt !== 'already_sent') {
        addToast(
          se.receipt === 'skipped_smtp'
            ? 'Payment recorded. Emails need SMTP to be configured — receipt may not have been sent.'
            : 'Payment recorded. The thank-you email may have been sent, but the receipt email did not complete. Check spam or ask the college to resend from their dashboard.',
          'warning',
        );
      }
      addToast(
        method === 'online'
          ? 'Payment successful via Stripes-123 (demo). You should receive two emails: thank-you and receipt.'
          : method === 'cheque'
            ? 'Recorded. You should receive two emails: thank-you and receipt.'
            : 'Recorded. You should receive two emails: thank-you and receipt.',
        'success',
      );
      await loadColleges();
      closeModal();
    } catch {
      addToast('Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const onProofFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) {
      setProofDataUrl('');
      return;
    }
    if (f.size > 350 * 1024) {
      addToast('Use a smaller image (under ~350KB) for the demo upload.', 'warning');
      e.target.value = '';
      return;
    }
    const r = new FileReader();
    r.onload = () => setProofDataUrl(String(r.result || ''));
    r.readAsDataURL(f);
  };

  const runDemoStripeAuthorize = () => {
    if (stripeDemoTimerRef.current) clearTimeout(stripeDemoTimerRef.current);
    setStripeDemoStep('processing');
    stripeDemoTimerRef.current = setTimeout(() => {
      stripeDemoTimerRef.current = null;
      setStripeDemoStep('success');
    }, 1400);
  };

  useEffect(() => {
    if (payTab !== 'online') {
      setStripeDemoStep('form');
      if (stripeDemoTimerRef.current) {
        clearTimeout(stripeDemoTimerRef.current);
        stripeDemoTimerRef.current = null;
      }
    }
  }, [payTab]);

  useEffect(() => {
    return () => {
      if (stripeDemoTimerRef.current) clearTimeout(stripeDemoTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!sponsorModal?.opportunityId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/employer/profile');
        const json = await res.json().catch(() => ({}));
        if (cancelled || !json.profile) return;
        const pr = json.profile;
        setSponsorBilling({
          legalName:
            String(pr.billing_legal_name || '').trim() || String(pr.company_name || '').trim(),
          pan: String(pr.billing_pan || '').trim(),
          gst: String(pr.billing_gst_number || '').trim(),
        });
      } catch {
        if (!cancelled) setSponsorBilling({ legalName: '', pan: '', gst: '' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sponsorModal?.opportunityId]);

  const openPay = (row) => {
    setStripeDemoStep('form');
    setPayTab('online');
    setProofDataUrl('');
    setSponsorModal({
      collegeId: row.collegeId,
      collegeName: row.collegeName,
      opportunityId: row.opportunityId,
      category: row.category,
      tierName: row.tierName,
      price: row.price,
      priceInr: row.priceInr,
      canPayAnother: row.canPayAnother,
    });
  };

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '2rem' }}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trophy size={24} className="text-primary" aria-hidden />
            Sponsorships
          </h1>
          <p>
            Browse tiers across campuses. Each tier is a single sponsorship amount for your company — pay online (demo),
            by cheque, or bank transfer.
          </p>
        </div>
        <Button variant="outline" size="sm" render={<Link href="/dashboard/employer/overview" />}>
          Overview
        </Button>
      </div>

      <Card className="mb-4"><CardContent className="py-4">
        <FieldGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.4fr_auto] xl:items-end">
          <Field>
            <FieldLabel htmlFor="sponsorship-college-filter"><School aria-hidden /> College</FieldLabel>
            <AdminFilterSelect
              id="sponsorship-college-filter"
              className="h-9 w-full"
              value={collegeFilter}
              onValueChange={setCollegeFilter}
              items={[
                { label: 'All colleges', value: 'all' },
                ...collegeOptions.map(([id, name]) => ({ label: name, value: String(id) })),
              ]}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="sponsorship-category-filter">Category</FieldLabel>
            <AdminFilterSelect
              id="sponsorship-category-filter"
              className="h-9 w-full"
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              items={[
                { label: 'All categories', value: 'all' },
                ...categoryOptions.map((cat) => ({ label: cat, value: cat })),
              ]}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="sponsorship-payment-filter">Payment</FieldLabel>
            <AdminFilterSelect
              id="sponsorship-payment-filter"
              className="h-9 w-full"
              value={statusFilter}
              onValueChange={setStatusFilter}
              items={[
                { label: 'All tiers', value: 'all' },
                { label: 'Not paid yet', value: 'available' },
                { label: 'Already paid', value: 'complete' },
              ]}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="sponsorship-search">Search</FieldLabel>
            <Input
              id="sponsorship-search"
              type="search"
              placeholder="College, tier, category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Field>
          <span className="text-muted-foreground pb-2 text-xs xl:text-right">
            {loading ? 'Loading…' : `Showing ${filteredRows.length} of ${allRows.length}`}
          </span>
        </FieldGroup>
      </CardContent></Card>

      {loading ? (
        <PageLoading message="Loading sponsorship opportunities…" inline>
          <Card className="gap-0 overflow-hidden py-0" aria-hidden="true">
            <CardContent className="p-0">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>College</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-px">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4].map((i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <div className="skeleton h-11 rounded-md" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </CardContent>
          </Card>
        </PageLoading>
      ) : (
      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>College</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-px">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((row) => (
              <TableRow key={row.opportunityId}>
                <TableCell>
                  <div className="font-semibold">{row.collegeName}</div>
                  <div className="text-muted-foreground text-xs">{row.collegeLocation}</div>
                </TableCell>
                <TableCell>{row.category}</TableCell>
                <TableCell>
                  <div className="font-medium">{row.tierName}</div>
                  {row.label ? (
                    <div className="mt-1">
                      <Badge variant="secondary">{row.label}</Badge>
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="font-semibold">{row.price}</TableCell>
                <TableCell>
                  {row.canPayAnother ? (
                    <StatusBadge tone="amber" showDot>Available</StatusBadge>
                  ) : (
                    <StatusBadge tone="green" showDot>Paid</StatusBadge>
                  )}
                </TableCell>
                <TableCell>
                  <StandardTableIconAction
                    action="view"
                    variant="ghost"
                    onClick={() => setDetailsRow(row)}
                    tooltip={`View benefits for ${row.tierName}`}
                  />
                  <StandardTableIconAction
                    action="sponsor"
                    variant="primary"
                    style={{ marginLeft: '0.25rem' }}
                    disabled={!row.canPayAnother}
                    onClick={() => openPay(row)}
                    tooltip={row.canPayAnother ? 'Record sponsorship payment' : 'Already paid for this tier'}
                  />
                </TableCell>
              </TableRow>
            ))}
            {allRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  No active sponsorship opportunities right now.
                </TableCell>
              </TableRow>
            ) : null}
            {allRows.length > 0 && filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  No tiers match your filters. Try clearing search or filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        </CardContent>
      </Card>
      )}

      <Dialog open={Boolean(detailsRow)} onOpenChange={(open) => !open && setDetailsRow(null)}>
        <DialogContent className="sm:max-w-lg">
          {detailsRow ? <>
            <DialogHeader><DialogTitle>{detailsRow.tierName}</DialogTitle><DialogDescription>{detailsRow.collegeName}</DialogDescription></DialogHeader>
            <p className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>
              {detailsRow.category} · {detailsRow.price}
            </p>
            {detailsRow.categoryDescription ? (
              <p className="text-sm" style={{ marginBottom: '0.75rem' }}>
                {detailsRow.categoryDescription}
              </p>
            ) : null}
            <strong className="text-sm">Benefits</strong>
            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {(detailsRow.benefits || []).map((b, bi) => (
                <li key={bi} style={{ marginBottom: '0.35rem' }}>
                  {b}
                </li>
              ))}
            </ul>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setDetailsRow(null)}>
                Close
              </Button>
              {detailsRow.canPayAnother ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setDetailsRow(null);
                    openPay(detailsRow);
                  }}
                >
                  Sponsor
                </Button>
              ) : null}
            </DialogFooter>
          </> : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(sponsorModal)} onOpenChange={(open) => !open && !submitting && closeModal()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl" showCloseButton={false}>
          {sponsorModal ? <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={closeModal}
              disabled={submitting}
              aria-label="Close"
              style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}
            >
              <X size={20} aria-hidden="true" />
            </Button>
            <DialogHeader><Badge variant="secondary" className="w-fit">Checkout</Badge><DialogTitle>Complete sponsorship</DialogTitle><DialogDescription>
              {sponsorModal.tierName} · {sponsorModal.category} · {sponsorModal.collegeName} ·{' '}
              <strong>{sponsorModal.price}</strong> (full tier amount)
            </DialogDescription></DialogHeader>

            <FieldGroup className="mb-4 gap-4 rounded-lg border bg-muted/30 p-4">
              <div>
                <h3 className="text-sm font-semibold">Legal &amp; tax details</h3>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  Used on college receipts. PAN format AAAAA9999A; GSTIN 15 characters. All fields are optional.
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="sponsorship-legal-name">Legal name</FieldLabel>
                <Input
                  id="sponsorship-legal-name"
                  value={sponsorBilling.legalName}
                  onChange={(e) => setSponsorBilling((b) => ({ ...b, legalName: e.target.value }))}
                  placeholder="Registered name as on invoice / bank"
                  disabled={submitting}
                  autoComplete="organization"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="sponsorship-pan">PAN</FieldLabel>
                  <Input
                    id="sponsorship-pan"
                    value={sponsorBilling.pan}
                    onChange={(e) => setSponsorBilling((b) => ({ ...b, pan: e.target.value.toUpperCase() }))}
                    placeholder="e.g. ABCDE1234F"
                    maxLength={10}
                    disabled={submitting}
                    autoComplete="off"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="sponsorship-gstin">GSTIN</FieldLabel>
                  <Input
                    id="sponsorship-gstin"
                    value={sponsorBilling.gst}
                    onChange={(e) => setSponsorBilling((b) => ({ ...b, gst: e.target.value.toUpperCase() }))}
                    placeholder="15-character GSTIN"
                    maxLength={15}
                    disabled={submitting}
                    autoComplete="off"
                  />
                </Field>
              </div>
            </FieldGroup>

            <Tabs value={payTab} onValueChange={setPayTab} className="mb-4"><TabsList aria-label="Payment method">
              {PAY_TABS.map(({ id, label, icon: Icon }) => (
                <TabsTrigger
                  key={id}
                  type="button"
                  value={id}
                  disabled={submitting}
                >
                  <Icon size={16} aria-hidden="true" /> {label}
                </TabsTrigger>
              ))}
            </TabsList></Tabs>

            {payTab === 'online' && (
              <div
                style={{
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-primary)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1rem',
                    background: 'linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                  }}
                >
                  <CreditCard size={18} aria-hidden />
                  Stripes-123 — secure demo checkout
                  <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, opacity: 0.9, fontWeight: 500 }}>
                    <Lock size={14} aria-hidden /> Test mode
                  </span>
                </div>

                <div style={{ padding: '1rem' }}>
                  {stripeDemoStep === 'form' && (
                    <>
                      <p className="text-xs text-secondary" style={{ margin: '0 0 1rem' }}>
                        Card and billing below are <strong>prefilled dummies</strong>. This screen is for demos only — no
                        real card is charged.
                      </p>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '0.65rem',
                          marginBottom: '0.65rem',
                        }}
                      >
                        <Field className="col-span-full">
                          <FieldLabel>Card number</FieldLabel>
                          <Input readOnly value={DEMO_CHECKOUT.cardNumber} />
                        </Field>
                        <Field>
                          <FieldLabel>Expires</FieldLabel>
                          <Input readOnly value={DEMO_CHECKOUT.expiry} />
                        </Field>
                        <Field>
                          <FieldLabel>CVC</FieldLabel>
                          <Input readOnly value={DEMO_CHECKOUT.cvc} />
                        </Field>
                        <Field className="col-span-full">
                          <FieldLabel>Name on card</FieldLabel>
                          <Input readOnly value={DEMO_CHECKOUT.nameOnCard} />
                        </Field>
                      </div>
                      <p className="text-xs font-medium text-secondary" style={{ margin: '0.75rem 0 0.35rem' }}>
                        Billing address
                      </p>
                      <div style={{ display: 'grid', gap: '0.65rem' }}>
                        <Field>
                          <FieldLabel>Address line 1</FieldLabel>
                          <Input readOnly value={DEMO_CHECKOUT.line1} />
                        </Field>
                        <Field>
                          <FieldLabel>Address line 2</FieldLabel>
                          <Input readOnly value={DEMO_CHECKOUT.line2} />
                        </Field>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                          <Field>
                            <FieldLabel>City</FieldLabel>
                            <Input readOnly value={DEMO_CHECKOUT.city} />
                          </Field>
                          <Field>
                            <FieldLabel>State</FieldLabel>
                            <Input readOnly value={DEMO_CHECKOUT.state} />
                          </Field>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                          <Field>
                            <FieldLabel>Postal code</FieldLabel>
                            <Input readOnly value={DEMO_CHECKOUT.postal} />
                          </Field>
                          <Field>
                            <FieldLabel>Country</FieldLabel>
                            <Input readOnly value={DEMO_CHECKOUT.country} />
                          </Field>
                        </div>
                      </div>
                      <Button
                        type="button"
                        className="mt-4 w-full"
                        style={{ width: '100%', marginTop: '1rem' }}
                        disabled={submitting}
                        onClick={() => runDemoStripeAuthorize()}
                      >
                        Sponsor — ₹{new Intl.NumberFormat('en-IN').format(sponsorModal.priceInr || 0)} (authorize on Stripes-123)
                      </Button>
                    </>
                  )}

                  {stripeDemoStep === 'processing' && (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
                      <span className="animate-spin-slow" style={{ color: 'var(--primary-600)' }} aria-hidden>
                        <Loader2 size={36} />
                      </span>
                      <p style={{ margin: '1rem 0 0', fontWeight: 600 }}>Contacting Stripes-123…</p>
                      <p className="text-sm text-secondary" style={{ margin: '0.35rem 0 0' }}>
                        Validating test card •••• 4242 and billing address (simulated).
                      </p>
                    </div>
                  )}

                  {stripeDemoStep === 'success' && (
                    <div style={{ textAlign: 'center', padding: '0.5rem 0 1rem' }}>
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: '50%',
                          background: 'var(--success-50, #ecfdf5)',
                          color: 'var(--success-600, #059669)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto',
                        }}
                      >
                        <CheckCircle2 size={28} aria-hidden />
                      </div>
                      <p style={{ margin: '1rem 0 0', fontWeight: 700, fontSize: '1.05rem' }}>Payment approved</p>
                      <p className="text-sm text-secondary" style={{ margin: '0.5rem 0 0', lineHeight: 1.55 }}>
                        Stripes-123 reports <strong>success</strong>. Your test card ending in <strong>4242</strong> was
                        authorized for{' '}
                        <strong>₹{new Intl.NumberFormat('en-IN').format(sponsorModal.priceInr || 0)}</strong>.
                      </p>
                      <p
                        className="text-xs"
                        style={{
                          margin: '0.75rem 0 0',
                          fontFamily: 'ui-monospace, monospace',
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        Reference: STRP-DEMO-{String(sponsorModal.opportunityId || '').slice(0, 8) || 'XXXXXXXX'} ·
                        Auth OK (sandbox)
                      </p>
                      <Button
                        type="button"
                        className="mt-5 w-full"
                        disabled={submitting}
                        onClick={() => void submitPayment('online')}
                      >
                        {submitting ? 'Recording on campus ledger…' : 'Record payment & notify college'}
                      </Button>
                      <p className="text-xs text-tertiary" style={{ margin: '0.65rem 0 0' }}>
                        This final step saves the sponsorship payment to your account (same as before).
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {payTab === 'cheque' && (
              <Alert>
                <AlertTitle>Mail a cheque</AlertTitle>
                <AlertDescription className="flex flex-col gap-4">
                <p>
                  Make cheque payable to{' '}
                  <strong>{remittanceForModal.chequePayableTo || sponsorModal.collegeName}</strong>. Mention{' '}
                  <strong>{sponsorModal.tierName}</strong> on the memo / reverse.
                </p>
                <address
                  className="bg-background rounded-md border p-4 text-sm not-italic leading-relaxed"
                >
                  Sponsorship Cell — Finance &amp; Accounts
                  <br />
                  {sponsorModal.collegeName}
                  <br />
                  {remittanceForModal.branch ? `Ref: ${remittanceForModal.branch}` : 'See college contact for mailing address'}
                </address>
                <div>
                  <Button type="button" disabled={submitting} onClick={() => submitPayment('cheque')}>
                    {submitting ? 'Saving…' : 'Confirm cheque has been mailed'}
                  </Button>
                  <p className="text-muted-foreground mt-2 text-xs">
                    The college team will see this confirmation on their sponsorship dashboard.
                  </p>
                </div>
                </AlertDescription>
              </Alert>
            )}

            {payTab === 'bank' && (
              <Alert>
                <AlertTitle>Bank transfer (NEFT / RTGS / IMPS)</AlertTitle>
                <AlertDescription className="flex flex-col gap-4">
                <p>
                  Use the details below. Reference: your company name + {sponsorModal.tierName}.
                </p>
                <dl
                  className="bg-background grid gap-2 rounded-md border p-4 text-sm"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <dt className="text-secondary">Account name</dt>
                    <dd style={{ margin: 0, fontWeight: 600 }}>{remittanceForModal.accountName || 'Not configured'}</dd>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <dt className="text-secondary">Bank</dt>
                    <dd style={{ margin: 0, fontWeight: 600 }}>{remittanceForModal.bankName || 'Not configured'}</dd>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <dt className="text-secondary">Account no.</dt>
                    <dd style={{ margin: 0, fontFamily: 'ui-monospace, monospace' }}>
                      {remittanceForModal.accountNumber || 'Not configured'}
                    </dd>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <dt className="text-secondary">IFSC</dt>
                    <dd style={{ margin: 0, fontFamily: 'ui-monospace, monospace' }}>{remittanceForModal.ifsc || 'Not configured'}</dd>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <dt className="text-secondary">Branch</dt>
                    <dd style={{ margin: 0 }}>{remittanceForModal.branch || 'Not configured'}</dd>
                  </div>
                </dl>
                <Field className="mt-4">
                  <FieldLabel>Transfer receipt screenshot (optional)</FieldLabel>
                  <FieldDescription>Upload an image under 350 KB.</FieldDescription>
                  <Input type="file" accept="image/*" onChange={onProofFile} disabled={submitting} />
                </Field>
                <div>
                  <Button
                    type="button"
                    disabled={submitting || !remittanceForModal.accountNumber}
                    onClick={() => submitPayment('bank_transfer')}
                  >
                    {submitting ? 'Saving…' : 'I have completed the bank transfer'}
                  </Button>
                  {!remittanceForModal.accountNumber && (
                    <p className="text-muted-foreground mt-2 text-xs">
                      College has not published bank details yet.
                    </p>
                  )}
                </div>
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal} disabled={submitting}>
                Close
              </Button>
            </DialogFooter>
          </> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
