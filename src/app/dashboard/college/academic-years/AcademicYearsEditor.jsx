'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { Plus, Trash2, CalendarRange } from 'lucide-react';
import { parseAcademicYearLabel } from '@/lib/academicYearTenant';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import { validateAcademicYearsList } from '@/lib/apiInputValidation';
import SemesterRolloverPanel from '@/components/college/SemesterRolloverPanel';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

function emptyYear(sequenceNumber = 1) {
  return {
    id: null,
    label: '',
    sequenceNumber,
    periodStart: '',
    periodEnd: '',
    semesterCount: 2,
    semesters: [
      { sequenceNumber: 1, periodStart: '', periodEnd: '' },
      { sequenceNumber: 2, periodStart: '', periodEnd: '' },
    ],
  };
}

function syncSemesterSlots(year) {
  const count = Number(year.semesterCount) || 2;
  const existing = Array.isArray(year.semesters) ? year.semesters : [];
  const semesters = [];
  for (let i = 1; i <= count; i++) {
    const found = existing.find((s) => Number(s.sequenceNumber) === i);
    semesters.push(
      found || { sequenceNumber: i, periodStart: '', periodEnd: '' },
    );
  }
  return { ...year, semesterCount: count, semesters };
}

export default function AcademicYearsEditor({ compact = false }) {
  const { addToast } = useToast();
  const [years, setYears] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/college/academic-years');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load');
      setYears(Array.isArray(json.years) ? json.years : []);
      setCurrent(json.current || null);
    } catch (e) {
      const msg = e.message || 'Failed to load academic years';
      setLoadError(msg);
      addToast(msg, 'error');
      setYears([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const updateYear = (index, patch) => {
    setYears((prev) => {
      const next = [...prev];
      let row = { ...next[index], ...patch };
      if ('semesterCount' in patch) row = syncSemesterSlots(row);
      next[index] = row;
      return next;
    });
  };

  const updateSemester = (yearIndex, semIndex, patch) => {
    setYears((prev) => {
      const next = [...prev];
      const semesters = [...(next[yearIndex].semesters || [])];
      semesters[semIndex] = { ...semesters[semIndex], ...patch };
      next[yearIndex] = { ...next[yearIndex], semesters };
      return next;
    });
  };

  const addYear = () => {
    setYears((prev) => [...prev, emptyYear(prev.length + 1)]);
  };

  const removeYear = (index) => {
    setYears((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    for (const y of years) {
      const p = parseAcademicYearLabel(y.label);
      if (!p.valid) {
        addToast(p.error || 'Invalid academic year label', 'error');
        return;
      }
    }
    const yearsErr = validateAcademicYearsList(years);
    if (yearsErr) {
      addToast(yearsErr, 'warning');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/college/academic-years', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ years }),
      });
      const json = await res.json();
      if (!res.ok) {
        const detail = json?.details?.[0]?.errors?.join(' ') || json?.error;
        throw new Error(detail || 'Save failed');
      }
      setYears(json.years || []);
      setCurrent(json.current || null);
      addToast('Academic years saved.', 'success');
    } catch (e) {
      addToast(e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={compact ? 'p-4' : 'p-8'}>Loading academic years…</div>;
  }

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-col gap-3">
        <span>{loadError}</span>
        <span>
          If this is a fresh database, run migration <code>051_tenant_academic_years.sql</code>, then retry.
        </span>
        <Button type="button" variant="outline" className="w-fit" onClick={() => load()}>
          Retry
        </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`animate-fadeIn flex flex-col gap-6 ${compact ? 'pb-4' : 'pb-10'}`}>
      {!compact && (
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex max-w-3xl flex-col gap-1">
            <h1 className="m-0 text-2xl font-semibold tracking-tight">
              Academic years & semesters
            </h1>
            <p className="text-muted-foreground m-0 text-sm">
              Map each session to a date range (non-overlapping). Semesters must sit inside the year period.
              Labels: <strong>YYYY</strong> or <strong>YYYY-YY</strong> (e.g. 2025-26). Default: 2 semesters per year.
            </p>
            {current?.label && (
              <p className="text-muted-foreground m-0 text-xs">
                System date falls in: <strong>{current.label}</strong>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={addYear}>
              <Plus data-icon="inline-start" aria-hidden /> Add year
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save all'}
            </Button>
          </div>
        </header>
      )}

      {compact && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addYear}>
            <Plus data-icon="inline-start" /> Add
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      )}

      {years.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <CalendarRange className="text-muted-foreground size-8" />
          <p className="text-muted-foreground m-0">No academic years defined yet.</p>
          <Button type="button" onClick={addYear}>
            Add first academic year
          </Button>
        </CardContent></Card>
      ) : (
        <div className="flex flex-col gap-4">
          {years.map((year, yi) => (
            <Card key={year.id || `new-${yi}`}>
              <CardHeader className="border-b">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>
                  Sequence {year.sequenceNumber}
                  {year.label ? ` · ${year.label}` : ''}
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeYear(yi)}
                  aria-label="Remove academic year"
                >
                  <Trash2 data-icon="inline-start" /> Remove
                </Button>
              </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">

              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`academic-year-label-${yi}`}>Label (YYYY or YYYY-YY)</FieldLabel>
                  <Input id={`academic-year-label-${yi}`}
                    placeholder="2025-26"
                    value={year.label}
                    onChange={(e) => updateYear(yi, { label: e.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel>Sequence</FieldLabel>
                  <ValidatedNumberInput
                    fieldId={FIELD_IDS.COLLEGE_ACAD_YEAR_SEQ}
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={year.sequenceNumber}
                    onChange={(v) => updateYear(yi, { sequenceNumber: v === '' ? '' : Number(v) })}
                  />
                </Field>
                <Field>
                  <FieldLabel>Period start</FieldLabel>
                  <ValidatedDateInput
                    fieldId={FIELD_IDS.COLLEGE_ACAD_PERIOD_START}
                    value={year.periodStart}
                    onChange={(v) => updateYear(yi, { periodStart: v })}
                  />
                </Field>
                <Field>
                  <FieldLabel>Period end</FieldLabel>
                  <ValidatedDateInput
                    fieldId={FIELD_IDS.COLLEGE_ACAD_PERIOD_END}
                    context={{ dateFrom: year.periodStart }}
                    value={year.periodEnd}
                    onChange={(v) => updateYear(yi, { periodEnd: v })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`academic-year-semesters-${yi}`}>Semesters per year</FieldLabel>
                  <AdminFilterSelect
                    id={`academic-year-semesters-${yi}`}
                    className="w-full"
                    value={String(year.semesterCount)}
                    onValueChange={(v) => updateYear(yi, { semesterCount: Number(v) })}
                    emptyMapsToAll={false}
                    items={[
                      { label: '1', value: '1' },
                      { label: '2 (default)', value: '2' },
                      { label: '3', value: '3' },
                    ]}
                  />
                </Field>
              </FieldGroup>

              <Separator />
              <CardDescription className="font-medium uppercase tracking-wide">Semester periods</CardDescription>
              <div className="flex flex-col gap-3">
                {(year.semesters || []).map((sem, si) => (
                  <div
                    key={sem.sequenceNumber}
                    className="bg-muted/40 grid gap-3 rounded-lg p-3 sm:grid-cols-3"
                  >
                    <div style={{ fontWeight: 600, alignSelf: 'center' }}>Semester {sem.sequenceNumber}</div>
                    <Field>
                      <FieldLabel>Start</FieldLabel>
                      <ValidatedDateInput
                        fieldId={FIELD_IDS.PROJECT_START}
                        className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={sem.periodStart}
                        onChange={(v) => updateSemester(yi, si, { periodStart: v })}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>End</FieldLabel>
                      <ValidatedDateInput
                        fieldId={FIELD_IDS.PROJECT_END}
                        context={{ dateFrom: sem.periodStart }}
                        className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={sem.periodEnd}
                        onChange={(v) => updateSemester(yi, si, { periodEnd: v })}
                      />
                    </Field>
                  </div>
                ))}
              </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SemesterRolloverPanel />
    </div>
  );
}
