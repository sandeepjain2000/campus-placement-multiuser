'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import MobileHeader from '@/components/mobile/MobileHeader';
import { useToast } from '@/components/ToastProvider';
import { formatStatus } from '@/lib/utils';
import { Mic, Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import AdminFilterSelect from '@/components/AdminFilterSelect';

const KIND_LABEL = {
  guest_faculty: 'Guest faculty',
  guest_lecture: 'Guest lecture',
};

export default function mb_GuestEngagements() {
  const { addToast } = useToast();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/college/engagement-listings');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      setListings(Array.isArray(json.listings) ? json.listings : []);
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/college/engagement-listings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      addToast(`Status updated to ${status}`, 'success');
      await load();
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
    }
  };

  const filteredListings = useMemo(
    () =>
      listings.filter((L) => {
        if (kindFilter && L.kind !== kindFilter) return false;
        if (statusFilter && L.status !== statusFilter) return false;
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          String(L.title || '').toLowerCase().includes(q) ||
          String(L.summary || '').toLowerCase().includes(q) ||
          String(L.requirements || '').toLowerCase().includes(q)
        );
      }),
    [listings, kindFilter, statusFilter, search],
  );

  return (
    <>
      <MobileHeader 
        title="Guest Engagements" 
        action={
          <Button size="sm" render={<Link href="/dashboard/college/guest-engagements/add" />}><Plus data-icon="inline-start" />Add</Button>
        }
      />
      
      <div className="animate-fadeIn flex flex-col gap-3 px-4 pt-4 pb-20">
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              className="pl-9"
              placeholder="Search engagements..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <Button
            type="button" 
            variant={showFilters ? 'secondary' : 'outline'}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Toggle filters"
          >
            <Filter />
          </Button>
        </div>

        {showFilters && (
          <Card className="animate-fadeIn py-4">
            <CardContent>
            <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="mobile-engagement-type">Type</FieldLabel>
              <AdminFilterSelect
                id="mobile-engagement-type"
                className="w-full"
                value={kindFilter}
                onValueChange={setKindFilter}
                items={[
                  { label: 'All types', value: 'all' },
                  { label: KIND_LABEL.guest_lecture, value: 'guest_lecture' },
                  { label: KIND_LABEL.guest_faculty, value: 'guest_faculty' },
                ]}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="mobile-engagement-status">Status</FieldLabel>
              <AdminFilterSelect
                id="mobile-engagement-status"
                className="w-full"
                value={statusFilter}
                onValueChange={setStatusFilter}
                items={[
                  { label: 'All statuses', value: 'all' },
                  { label: 'Draft', value: 'draft' },
                  { label: 'Published', value: 'published' },
                  { label: 'Closed', value: 'closed' },
                ]}
              />
            </Field>
            </FieldGroup>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-3">
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)
          ) : filteredListings.length === 0 ? (
            <Card className="border-dashed py-10">
              <CardContent className="flex flex-col items-center text-center">
              <Mic className="text-muted-foreground mb-3 size-8" />
              <CardTitle className="text-base">No engagements found</CardTitle>
              <CardDescription className="mt-1">
                {listings.length === 0 ? 'Create your first guest engagement listing.' : 'Try adjusting your filters.'}
              </CardDescription>
              </CardContent>
            </Card>
          ) : (
            filteredListings.map((L) => (
              <Card key={L.id} className="gap-3 py-4">
                <CardHeader className="flex-row items-start justify-between gap-2 px-4">
                  <CardTitle className="text-base">{L.title}</CardTitle>
                  <StatusBadge tone={L.status === 'published' ? 'success' : L.status === 'draft' ? 'warning' : 'neutral'} showDot>
                    {formatStatus(L.status) || 'Draft'}
                  </StatusBadge>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 px-4">
                <div className="text-muted-foreground flex items-center gap-2 text-xs"><Mic className="size-3.5" />{KIND_LABEL[L.kind] || L.kind}</div>
                {L.summary && (
                  <p className="text-muted-foreground line-clamp-2 text-sm">{L.summary}</p>
                )}
                <div className="flex items-center justify-between gap-2 border-t pt-3">
                  <div className="text-muted-foreground text-xs">
                    Updated: {L.updated_at ? new Date(L.updated_at).toLocaleDateString() : '—'}
                  </div>
                  <div className="flex gap-2">
                    {L.status !== 'published' && (
                      <Button type="button" size="sm" onClick={() => setStatus(L.id, 'published')}>Publish</Button>
                    )}
                    {L.status === 'published' && (
                      <Button type="button" variant="outline" size="sm" onClick={() => setStatus(L.id, 'closed')}>Close</Button>
                    )}
                  </div>
                </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

      </div>
    </>
  );
}
