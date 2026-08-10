'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft, Search, Building2, CheckCircle2, Clock, Info } from 'lucide-react';
import EntityLogo from '@/components/EntityLogo';
import { formatFilterBadgeLabelParen } from '@/lib/filterBadgeLabel';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ToastProvider';
import AdminFilterSelect from '@/components/AdminFilterSelect';

const fetcher = async (url) => {
  const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Failed to load (${res.status})`);
  if (!data.colleges || !Array.isArray(data.colleges)) {
    throw new Error(data.error || 'Invalid response from server');
  }
  return data;
};

function normalizeApprovalStatus(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim().toLowerCase();
  if (['approved', 'pending', 'rejected', 'blacklisted'].includes(s)) return s;
  return null;
}

function canRequestTieUp(status) {
  const s = normalizeApprovalStatus(status);
  return s === null || s === 'rejected' || s === 'blacklisted';
}

export default function CreateTieupPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { data, error, isLoading } = useSWR('/api/employer/campuses', fetcher);

  const [selectedCollegeId, setSelectedCollegeId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('available');
  const [requesting, setRequesting] = useState(false);

  const showToast = (msg, type = 'success') => {
    addToast(msg, type === 'error' ? 'error' : 'success');
  };

  const colleges = data?.colleges ?? [];
  const campusOptions = useMemo(
    () => [...colleges].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [colleges],
  );
  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return campusOptions.filter((c) => {
      const status = normalizeApprovalStatus(c.approval_status);
      const matchesSearch = !q || (c.name || '').toLowerCase().includes(q) || (c.city || '').toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'available' && canRequestTieUp(c.approval_status)) ||
        (statusFilter === 'approved' && status === 'approved') ||
        (statusFilter === 'pending' && status === 'pending') ||
        (statusFilter === 'rejected' && (status === 'rejected' || status === 'blacklisted'));
      return matchesSearch && matchesStatus;
    });
  }, [campusOptions, search, statusFilter]);

  const selectedCollege = useMemo(
    () => (selectedCollegeId ? colleges.find((c) => c.id === selectedCollegeId) : null),
    [colleges, selectedCollegeId],
  );

  const approvedCount = colleges.filter(c => normalizeApprovalStatus(c.approval_status) === 'approved').length;
  const pendingCount = colleges.filter(c => normalizeApprovalStatus(c.approval_status) === 'pending').length;
  const availableCount = colleges.filter(c => canRequestTieUp(c.approval_status)).length;

  const handleRequestAccess = async () => {
    if (!selectedCollege) return;
    setRequesting(true);
    try {
      const res = await fetch('/api/employer/campuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collegeId: selectedCollege.id }),
      });
      const json = await res.json();
      if (res.ok) {
        if (json.alreadyPending) {
          showToast(json.message || 'Already pending', 'error');
        } else {
          showToast(json.message || `Tie-up requested for ${selectedCollege.name}`);
          setTimeout(() => router.push('/dashboard/employer/select-campus'), 1500);
        }
      } else {
        showToast(json.error || 'Request failed', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="animate-fadeIn flex flex-col gap-5 pb-8">
      {/* Navigation Breadcrumb */}
      <div>
        <Button variant="ghost" onClick={() => router.push('/dashboard/employer/select-campus')}>
          <ArrowLeft data-icon="inline-start" aria-hidden /> Back to Directory
        </Button>
        <h1 className="mt-3 flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Building2 aria-hidden /> Create Tie-up Request
        </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Choose a college and send a partnership request. The college admin will review your request.
          </p>
      </div>

      {!isLoading && !error && (
        <Card>
          <CardHeader><CardTitle>Partnership Snapshot</CardTitle><CardDescription>Current campus tie-up availability.</CardDescription></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {[
              [CheckCircle2, 'Approved tie-ups', approvedCount],
              [Clock, 'Pending requests', pendingCount],
              [Building2, 'Available colleges', availableCount],
            ].map(([Icon, label, count]) => (
              <div key={label} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-md"><Icon aria-hidden /></div>
                <div><p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{count}</p></div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Main Content: 2-column layout */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">

        {/* Left: Form */}
        <Card>
          <CardHeader>
          <CardTitle>Select a College</CardTitle>
          <CardDescription>
            Filter colleges by status and search by name/city. Select an available college from the list to request access.
          </CardDescription>
          </CardHeader>
          <CardContent>

          {isLoading && (
            <div>
              <div className="skeleton" style={{ height: 48, borderRadius: 'var(--radius-lg)', marginBottom: '1rem' }} />
              <div className="skeleton skeleton-card" style={{ height: 300 }} />
            </div>
          )}
          
          {error && (
            <Alert variant="destructive"><AlertDescription>{error.message || 'Failed to load colleges. Please refresh and try again.'}</AlertDescription></Alert>
          )}

          {!isLoading && !error && (
            <>
              <div className="mb-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                <Field>
                  <FieldLabel htmlFor="tieup-search">Search colleges</FieldLabel>
                  <Input
                    id="tieup-search"
                    name="tieup-search"
                    type="search"
                    placeholder="Search college name or city…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </Field>
                <Field>
                <FieldLabel htmlFor="tieup-status">Status</FieldLabel>
                <AdminFilterSelect
                  id="tieup-status"
                  className="w-full"
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  emptyMapsToAll={false}
                  items={[
                    { label: formatFilterBadgeLabelParen('Available', availableCount), value: 'available' },
                    { label: formatFilterBadgeLabelParen('Approved', approvedCount), value: 'approved' },
                    { label: formatFilterBadgeLabelParen('Pending', pendingCount), value: 'pending' },
                    { label: 'Rejected/Blacklisted', value: 'rejected' },
                    { label: `All Colleges (${colleges.length})`, value: 'all' },
                  ]}
                />
                </Field>
              </div>

              <RadioGroup
                value={selectedCollegeId || ''}
                onValueChange={setSelectedCollegeId}
                className="mb-5 block w-full overflow-x-auto rounded-lg border"
              >
                <Table>
                  <TableHeader><TableRow>
                      <TableHead className="w-16 text-center">Select</TableHead>
                      <TableHead>College</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredOptions.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-muted-foreground h-32 text-center"><Building2 className="mx-auto mb-2 opacity-40" aria-hidden /><p className="text-foreground font-semibold">No colleges match your filter</p></TableCell></TableRow>
                    ) : (
                      filteredOptions.map((c) => {
                        const status = normalizeApprovalStatus(c.approval_status);
                        const selectable = canRequestTieUp(c.approval_status);
                        return (
                          <TableRow
                            key={c.id}
                            onClick={() => selectable && setSelectedCollegeId(c.id)}
                            className={selectable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}
                          >
                            <TableCell className="text-center">
                              <RadioGroupItem
                                value={c.id}
                                disabled={!selectable}
                                aria-label={`Select ${c.name}`}
                                className="mx-auto"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <EntityLogo name={c.name} website={c.website} size="sm" shape="rounded" />
                                <div className="font-semibold">{c.name}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{c.city || '—'}</TableCell>
                            <TableCell><StatusBadge status={status || 'not_requested'} showDot>{status ? (status === 'blacklisted' ? 'Blacklisted' : status[0].toUpperCase() + status.slice(1)) : 'Available'}</StatusBadge></TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </RadioGroup>

              {selectedCollege && (
                <Alert className="mb-5">
                  <Building2 aria-hidden />
                  <AlertTitle>{selectedCollege.name}</AlertTitle>
                  <AlertDescription>
                    {selectedCollege.city || 'Location not provided'}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-3 border-t pt-5">
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/employer/select-campus')}
                >
                  Cancel
                </Button>
                <Button
                  disabled={!selectedCollege || !canRequestTieUp(selectedCollege.approval_status) || requesting}
                  onClick={handleRequestAccess}
                >
                  {requesting ? 'Sending Request…' : 'Send Tie-up Request'}
                </Button>
              </div>
            </>
          )}
          </CardContent>
        </Card>

        {/* Right: Help Panel */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Info aria-hidden /> How It Works</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {[
                { step: '1', text: 'Search and select an available college.' },
                { step: '2', text: 'Click "Send Tie-up Request".' },
                { step: '3', text: 'The college admin reviews your request.' },
                { step: '4', text: 'Once approved, you can schedule placement drives.' },
              ].map(item => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold">
                    {item.step}
                  </div>
                  <div className="text-muted-foreground text-sm leading-6">
                    {item.text}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Alert>
            <AlertTitle>Important Note</AlertTitle>
            <AlertDescription>
              Colleges marked as <strong>Approved</strong> or <strong>Pending</strong> cannot be re-requested. Only colleges showing <strong>Available</strong> can receive a new tie-up request.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
