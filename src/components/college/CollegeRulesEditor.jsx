'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { CalendarDays, GraduationCap, Save, Settings2, Sparkles, Workflow } from 'lucide-react';
import MobileHeader from '@/components/mobile/MobileHeader';
import { useToast } from '@/components/ToastProvider';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { FIELD_IDS } from '@/lib/inputConstraints';
import { validateCollegeRulesPayload } from '@/lib/apiInputValidation';

const DEFAULT_RULES = {
  maxOffers: 1,
  maxInternshipsPerStudent: 1,
  acceptanceWindow: 7,
  minCGPA: 6,
  allowBacklogs: false,
  maxBacklogs: 0,
  requirePPT: false,
  autoVerify: false,
  fcfsEnabled: false,
  bufferDays: 0,
  seasonStart: '',
  seasonEnd: '',
};

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok || json?.error) throw new Error(json?.error || 'Failed to load rules');
  return json;
};

function ToggleField({ checked, onCheckedChange, title, description, disabled = false }) {
  return (
    <Field orientation="horizontal" data-disabled={disabled}>
      <FieldLabel>
        <Checkbox checked={Boolean(checked)} onCheckedChange={onCheckedChange} disabled={disabled} />
        <span>
          <span className="block font-medium">{title}</span>
          {description ? <span className="text-muted-foreground text-sm font-normal">{description}</span> : null}
        </span>
      </FieldLabel>
    </Field>
  );
}

function RuleCard({ icon: Icon, title, description, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Icon aria-hidden />{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent><FieldGroup>{children}</FieldGroup></CardContent>
    </Card>
  );
}

export default function CollegeRulesEditor({ mobile = false }) {
  const { data, error, isLoading } = useSWR('/api/college/rules', fetcher);
  const [rules, setRules] = useState(null);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (data) setRules(data);
  }, [data]);

  const handleSave = async () => {
    const rulesErr = validateCollegeRulesPayload(rules);
    if (rulesErr) {
      addToast(rulesErr, 'warning');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/college/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rules),
      });
      const json = await res.json().catch(() => ({}));
      addToast(res.ok ? 'Rules saved successfully.' : json?.error || 'Failed to save rules.', res.ok ? 'success' : 'error');
    } catch {
      addToast('Network error while saving rules.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveButton = (
    <Button size={mobile ? 'sm' : 'default'} onClick={handleSave} disabled={saving || !rules}>
      <Save data-icon="inline-start" /> {saving ? 'Saving…' : 'Save changes'}
    </Button>
  );

  const content = error && !rules ? (
    <Alert variant="destructive">
      <AlertTitle>Rules could not be loaded</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
      <Button className="mt-3" variant="outline" onClick={() => setRules(DEFAULT_RULES)}>Use defaults and edit</Button>
    </Alert>
  ) : isLoading || !rules ? (
    <div className="grid gap-4 md:grid-cols-2">
      {[1, 2, 3, 4].map((key) => <div key={key} className="bg-muted h-56 animate-pulse rounded-xl" />)}
    </div>
  ) : (
    <div className="grid gap-5 md:grid-cols-2">
      <RuleCard icon={Workflow} title="Offer rules" description="Control offer limits and response windows.">
        <Field>
          <FieldLabel>Max offers per student</FieldLabel>
          <ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_RULE_MAX_OFFERS} value={rules.maxOffers} onChange={(value) => setRules({ ...rules, maxOffers: value })} />
          <FieldDescription>Maximum offers a student can hold simultaneously.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel>Offer acceptance window (days)</FieldLabel>
          <ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_RULE_ACCEPT_WINDOW} value={rules.acceptanceWindow} onChange={(value) => setRules({ ...rules, acceptanceWindow: value })} />
        </Field>
        <ToggleField checked={rules.fcfsEnabled} onCheckedChange={(v) => setRules({ ...rules, fcfsEnabled: !!v })} title="Enable first come, first served" description="Students who apply first receive priority in drives." />
      </RuleCard>

      <RuleCard icon={GraduationCap} title="Internship rules">
        <Field data-disabled>
          <FieldLabel>Max internships per student</FieldLabel>
          <Input type="number" value={rules.maxInternshipsPerStudent ?? 1} readOnly disabled aria-readonly="true" />
          <FieldDescription>Fixed at 1. FCFS selection locks the student from other internships.</FieldDescription>
        </Field>
      </RuleCard>

      <RuleCard icon={GraduationCap} title="Eligibility rules">
        <Field>
          <FieldLabel>Minimum CGPA threshold</FieldLabel>
          <ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_RULE_MIN_CGPA} step="0.1" value={rules.minCGPA} onChange={(value) => setRules({ ...rules, minCGPA: value })} />
        </Field>
        <ToggleField checked={rules.allowBacklogs} onCheckedChange={(v) => setRules({ ...rules, allowBacklogs: !!v })} title="Allow students with backlogs" />
        {rules.allowBacklogs ? (
          <Field>
            <FieldLabel>Max backlogs allowed</FieldLabel>
            <ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_RULE_MAX_BACKLOGS} value={rules.maxBacklogs} onChange={(value) => setRules({ ...rules, maxBacklogs: value })} />
          </Field>
        ) : null}
        <ToggleField checked={rules.requirePPT} onCheckedChange={(v) => setRules({ ...rules, requirePPT: !!v })} title="Require pre-placement talk before applying" />
      </RuleCard>

      <RuleCard icon={Sparkles} title="Dream company" description="Allow placed students to pursue a higher-tier offer.">
        <ToggleField checked={rules.enableDreamCompany} onCheckedChange={(v) => setRules({ ...rules, enableDreamCompany: !!v })} title="Enable dream company override" />
        {rules.enableDreamCompany ? (
          <Field>
            <FieldLabel>Dream company CTC multiplier</FieldLabel>
            <ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_RULE_DREAM_MULT} step="0.1" value={rules.dreamCompanyMultiplier} onChange={(value) => setRules({ ...rules, dreamCompanyMultiplier: value })} />
            <FieldDescription>For example, 2.0 requires the new offer to be at least twice the current offer.</FieldDescription>
          </Field>
        ) : null}
      </RuleCard>

      <RuleCard icon={CalendarDays} title="Season settings">
        <Field>
          <FieldLabel>Placement season start</FieldLabel>
          <ValidatedDateInput fieldId={FIELD_IDS.COLLEGE_RULE_SEASON_START} value={rules.seasonStart || ''} onChange={(value) => setRules({ ...rules, seasonStart: value })} />
        </Field>
        <Field>
          <FieldLabel>Placement season end</FieldLabel>
          <ValidatedDateInput fieldId={FIELD_IDS.COLLEGE_RULE_SEASON_END} context={{ dateFrom: rules.seasonStart }} value={rules.seasonEnd || ''} onChange={(value) => setRules({ ...rules, seasonEnd: value })} />
        </Field>
        <Field>
          <FieldLabel>Buffer days between drives</FieldLabel>
          <ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_RULE_BUFFER_DAYS} value={rules.bufferDays} onChange={(value) => setRules({ ...rules, bufferDays: value })} />
        </Field>
      </RuleCard>

      <RuleCard icon={Settings2} title="Automation">
        <ToggleField checked={rules.autoVerify} onCheckedChange={(v) => setRules({ ...rules, autoVerify: !!v })} title="Auto-verify student profiles" description="Automatically verifies students when they register. Use with care." />
      </RuleCard>
      {mobile ? <div className="md:hidden">{saveButton}</div> : null}
    </div>
  );

  if (mobile) {
    return (
      <>
        <MobileHeader title="Placement Rules" action={saveButton} />
        <main className="flex flex-col gap-5 px-4 pb-20 pt-4">{content}</main>
      </>
    );
  }

  return (
    <main className="flex flex-col gap-6 pb-12">
      <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium">College administration</p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Placement rules</h1>
          <p className="text-muted-foreground mt-1">Configure eligibility, offer, internship, and season policies.</p>
        </div>
        {saveButton}
      </header>
      {content}
    </main>
  );
}
