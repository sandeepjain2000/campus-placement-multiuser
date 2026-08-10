'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Building2, Settings2 } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import EmployerCampusTargetPicker from '@/components/employer/EmployerCampusTargetPicker';
import { getConstraintAllowlist } from '@/lib/employerPostingCampusConstraints';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const fetcher = async (url) => {
  const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
};

function buildSelectionFromAllowlist(allowlist, approvedCampuses) {
  const allowed = new Set((allowlist || []).map(String));
  const sel = {};
  for (const c of approvedCampuses) {
    sel[c.id] = allowed.has(String(c.id));
  }
  return sel;
}

export default function EmployerSettingsPage() {
  const { addToast } = useToast();
  const { data: campusData, isLoading: campusesLoading } = useSWR('/api/employer/campuses', fetcher, {
    revalidateOnFocus: true,
  });
  const {
    data: constraintsData,
    error: constraintsError,
    isLoading: constraintsLoading,
    mutate: mutateConstraints,
  } = useSWR('/api/employer/posting-campus-constraints', fetcher, { revalidateOnFocus: true });

  const approvedCampuses = useMemo(
    () =>
      (campusData?.colleges || []).filter(
        (c) => String(c.approval_status || '').toLowerCase() === 'approved',
      ),
    [campusData],
  );

  const categories = constraintsData?.categories || [];
  const savedConstraints = constraintsData?.constraints || {};

  const [draftRestricted, setDraftRestricted] = useState({});
  const [draftSelection, setDraftSelection] = useState({});
  const [savingCategory, setSavingCategory] = useState(null);

  useEffect(() => {
    if (!categories.length) return;
    const restricted = {};
    const selection = {};
    for (const cat of categories) {
      const allowlist = getConstraintAllowlist(savedConstraints, cat.id);
      restricted[cat.id] = Boolean(allowlist?.length);
      selection[cat.id] = buildSelectionFromAllowlist(allowlist, approvedCampuses);
    }
    setDraftRestricted(restricted);
    setDraftSelection(selection);
  }, [categories, savedConstraints, approvedCampuses]);

  const saveCategory = useCallback(
    async (categoryId) => {
      setSavingCategory(categoryId);
      try {
        const restricted = draftRestricted[categoryId] === true;
        const tenantIds = Object.entries(draftSelection[categoryId] || {})
          .filter(([, on]) => on)
          .map(([id]) => id);

        const res = await fetch('/api/employer/posting-campus-constraints', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            category: categoryId,
            restricted,
            tenantIds,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Save failed');

        await mutateConstraints();
        addToast(
          restricted
            ? 'Campus limit saved for this posting type.'
            : 'All approved colleges are now eligible for this posting type.',
          'success',
        );
      } catch (e) {
        addToast(e.message || 'Could not save campus limits', 'error');
      } finally {
        setSavingCategory(null);
      }
    },
    [addToast, draftRestricted, draftSelection, mutateConstraints],
  );

  const loading = campusesLoading || constraintsLoading;

  return (
    <div className="animate-fadeIn flex flex-col gap-4 pb-8">
      <div>
        <h1 className="text-foreground m-0 flex items-center gap-3 text-2xl font-semibold tracking-tight">
          <Settings2 className="text-muted-foreground size-7 shrink-0" strokeWidth={1.5} />
          Employer settings
        </h1>
        <p className="text-muted-foreground mt-1 mb-0 max-w-3xl text-sm">
          Limit which approved colleges can receive each type of posting. Unrestricted categories remain available to
          every approved tie-up.
        </p>
      </div>

      {constraintsError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load campus posting limits</AlertTitle>
          <AlertDescription>{constraintsError.message}</AlertDescription>
        </Alert>
      ) : null}

      {!loading && approvedCampuses.length === 0 ? (
        <Alert>
          <Building2 />
          <AlertTitle>No approved college partnerships yet</AlertTitle>
          <AlertDescription>
            Request campus access first, then return here to narrow posting targets per category.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="text-muted-foreground py-8 text-sm">Loading settings…</CardContent>
          </Card>
        ) : (
          categories.map((cat) => {
            const restricted = draftRestricted[cat.id] === true;
            const selection = draftSelection[cat.id] || {};
            return (
              <Card key={cat.id}>
                <CardHeader className="flex-row items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle>{cat.label}</CardTitle>
                    <CardDescription className="mt-1">{cat.description}</CardDescription>
                  </div>
                  <Badge variant={restricted ? 'default' : 'secondary'} className="shrink-0">
                    {restricted ? 'Limited' : 'All approved'}
                  </Badge>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                    <Checkbox
                      checked={restricted}
                      disabled={!approvedCampuses.length || savingCategory === cat.id}
                      onCheckedChange={(v) => {
                        const next = !!v;
                        setDraftRestricted((p) => ({ ...p, [cat.id]: next }));
                        if (next && !Object.values(selection).some(Boolean)) {
                          setDraftSelection((p) => ({
                            ...p,
                            [cat.id]: buildSelectionFromAllowlist(
                              getConstraintAllowlist(savedConstraints, cat.id) ||
                                approvedCampuses.slice(0, 1).map((c) => c.id),
                              approvedCampuses,
                            ),
                          }));
                        }
                      }}
                    />
                    Limit to selected colleges only
                  </label>

                  {restricted ? (
                    <EmployerCampusTargetPicker
                      campuses={approvedCampuses}
                      selection={selection}
                      onSelectionChange={(next) =>
                        setDraftSelection((p) => ({
                          ...p,
                          [cat.id]: next,
                        }))
                      }
                      label={
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="size-4" aria-hidden />
                          Eligible colleges
                        </span>
                      }
                      required
                      hint="Only these approved campuses will appear when publishing this posting type."
                      emptyMessage="No approved campuses available."
                    />
                  ) : (
                    <p className="text-muted-foreground m-0 text-sm">
                      All {approvedCampuses.length} approved college
                      {approvedCampuses.length === 1 ? '' : 's'} can receive {cat.label.toLowerCase()}.
                    </p>
                  )}

                  <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!approvedCampuses.length || savingCategory === cat.id}
                    onClick={() => void saveCategory(cat.id)}
                  >
                    {savingCategory === cat.id ? 'Saving…' : 'Save'}
                  </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
