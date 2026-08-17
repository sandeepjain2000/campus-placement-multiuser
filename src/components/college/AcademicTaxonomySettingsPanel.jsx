'use client';

import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Save } from 'lucide-react';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { StatusBadge } from '@/components/ui/status-badge';

const PROFILE_OPTIONS = [
  {
    value: 'engineering',
    label: 'Engineering college (recommended default)',
    hint: 'Pre-selects B.Tech programs and core engineering eligibility groups to reduce data entry.',
  },
  {
    value: 'general',
    label: 'General / multi-faculty',
    hint: 'Shows the full platform taxonomy without engineering-only filtering.',
  },
];

export default function AcademicTaxonomySettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [tree, setTree] = useState(null);
  const [settings, setSettings] = useState({
    institutionProfile: 'engineering',
    usePlatformDefaults: true,
    defaultDegreeCode: 'btech',
    defaultProgramCode: 'btech_cse',
    defaultEligibilityGroupCodes: [],
    restrictProgramsToDefaults: true,
    enabledProgramCodes: null,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/college/settings/academic-taxonomy');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load taxonomy');
        if (!mounted) return;
        setTree(json);
        setSettings((prev) => ({ ...prev, ...json.settings }));
      } catch (e) {
        if (mounted) setMessage(e.message || 'Failed to load taxonomy');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const programOptions = useMemo(
    () =>
      (tree?.academicPrograms || []).map((p) => ({
        code: p.code,
        label: p.display_name,
        group: p.eligibility_group_name,
      })),
    [tree],
  );

  const groupOptions = useMemo(
    () => (tree?.eligibilityGroups || []).map((g) => ({ code: g.code, label: g.name })),
    [tree],
  );

  const onSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/college/settings/academic-taxonomy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Save failed');
      setMessage(json.message || 'Saved.');
    } catch (e) {
      setMessage(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleGroup = (code) => {
    setSettings((prev) => {
      const set = new Set(prev.defaultEligibilityGroupCodes || []);
      if (set.has(code)) set.delete(code);
      else set.add(code);
      return { ...prev, defaultEligibilityGroupCodes: [...set] };
    });
  };

  if (loading) {
    return <Card><CardContent className="text-muted-foreground">Loading academic taxonomy…</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <GraduationCap aria-hidden />
            Academic taxonomy defaults
          </CardTitle>
          <CardDescription>
            Four platform masters — degrees, disciplines, specializations, and placement eligibility groups — power
            consistent student programs and recruiter filters. Engineering colleges can use platform defaults to avoid
            re-entering branch lists.
          </CardDescription>
        <Button className="col-start-2 row-span-2 row-start-1" type="button" size="sm" disabled={saving} onClick={onSave}>
          <Save data-icon="inline-start" aria-hidden />
          {saving ? 'Saving…' : 'Save taxonomy defaults'}
        </Button>
      </CardHeader>

      <CardContent>
      <FieldGroup>
      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <FieldLabel>Institution profile</FieldLabel>
          <AdminFilterSelect
            className="w-full"
            value={settings.institutionProfile}
            onValueChange={(institutionProfile) => {
              setSettings((prev) => ({
                ...prev,
                institutionProfile,
                usePlatformDefaults: institutionProfile === 'engineering',
                restrictProgramsToDefaults: institutionProfile === 'engineering',
                defaultDegreeCode: institutionProfile === 'engineering' ? 'btech' : prev.defaultDegreeCode,
                defaultProgramCode: institutionProfile === 'engineering' ? 'btech_cse' : prev.defaultProgramCode,
              }));
            }}
            emptyMapsToAll={false}
            items={PROFILE_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
          />
          <FieldDescription>
            {PROFILE_OPTIONS.find((o) => o.value === settings.institutionProfile)?.hint}
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel>Default academic program (add student)</FieldLabel>
          <AdminFilterSelect
            className="w-full"
            value={settings.defaultProgramCode || ''}
            onValueChange={(v) => setSettings((prev) => ({ ...prev, defaultProgramCode: v || null }))}
            items={[
              { label: 'None', value: 'all' },
              ...programOptions.map((p) => ({ label: p.label, value: p.code })),
            ]}
          />
        </Field>
      </div>

      <Field orientation="horizontal"><FieldLabel className="flex items-center gap-2">
        <Checkbox
          checked={Boolean(settings.usePlatformDefaults)}
          onCheckedChange={(v) => setSettings((prev) => ({ ...prev, usePlatformDefaults: !!v }))}
        />
        Use engineering platform defaults for program pickers
      </FieldLabel></Field>

      <Field orientation="horizontal"><FieldLabel className="flex items-center gap-2">
        <Checkbox
          checked={Boolean(settings.restrictProgramsToDefaults)}
          onCheckedChange={(v) => setSettings((prev) => ({ ...prev, restrictProgramsToDefaults: !!v }))}
        />
        Limit student program dropdown to engineering-default programs only
      </FieldLabel></Field>

      <Field>
        <FieldLabel>Default placement eligibility groups</FieldLabel>
        <FieldDescription>
          Recruiters can target umbrella groups (e.g. Computer Science) instead of dozens of branch variants like CSE, CSE (AI), IT.
        </FieldDescription>
        <div className="flex flex-wrap gap-2">
          {groupOptions.map((g) => {
            const active = (settings.defaultEligibilityGroupCodes || []).includes(g.code);
            return (
              <Button
                key={g.code}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
                onClick={() => toggleGroup(g.code)}
              >
                {g.label}
              </Button>
            );
          })}
        </div>
      </Field>

      {tree ? (
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="gray">{tree.degrees?.length || 0} degrees</StatusBadge>
          <StatusBadge tone="gray">{tree.disciplines?.length || 0} disciplines</StatusBadge>
          <StatusBadge tone="gray">{tree.academicPrograms?.length || 0} programs</StatusBadge>
          <StatusBadge tone="gray">{tree.eligibilityGroups?.length || 0} eligibility groups</StatusBadge>
        </div>
      ) : null}

      {message ? (
        <Alert variant={message.includes('fail') || message.includes('Failed') ? 'destructive' : 'default'}><AlertDescription>{message}</AlertDescription></Alert>
      ) : null}
      </FieldGroup>
      </CardContent>
    </Card>
  );
}
