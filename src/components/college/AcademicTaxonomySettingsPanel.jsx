'use client';

import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Save } from 'lucide-react';

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
    return <div className="card" style={{ padding: '1.5rem' }}>Loading academic taxonomy…</div>;
  }

  return (
    <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem' }}>
            <GraduationCap size={20} aria-hidden />
            Academic taxonomy defaults
          </h2>
          <p className="text-sm text-secondary" style={{ margin: '0.35rem 0 0', lineHeight: 1.55, maxWidth: '42rem' }}>
            Four platform masters — degrees, disciplines, specializations, and placement eligibility groups — power
            consistent student programs and recruiter filters. Engineering colleges can use platform defaults to avoid
            re-entering branch lists.
          </p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={onSave}>
          <Save size={15} aria-hidden />
          {saving ? 'Saving…' : 'Save taxonomy defaults'}
        </button>
      </div>

      <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Institution profile</label>
          <select
            className="form-select"
            value={settings.institutionProfile}
            onChange={(e) => {
              const institutionProfile = e.target.value;
              setSettings((prev) => ({
                ...prev,
                institutionProfile,
                usePlatformDefaults: institutionProfile === 'engineering',
                restrictProgramsToDefaults: institutionProfile === 'engineering',
                defaultDegreeCode: institutionProfile === 'engineering' ? 'btech' : prev.defaultDegreeCode,
                defaultProgramCode: institutionProfile === 'engineering' ? 'btech_cse' : prev.defaultProgramCode,
              }));
            }}
          >
            {PROFILE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <p className="text-xs text-tertiary" style={{ margin: '0.35rem 0 0' }}>
            {PROFILE_OPTIONS.find((o) => o.value === settings.institutionProfile)?.hint}
          </p>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Default academic program (add student)</label>
          <select
            className="form-select"
            value={settings.defaultProgramCode || ''}
            onChange={(e) => setSettings((prev) => ({ ...prev, defaultProgramCode: e.target.value || null }))}
          >
            <option value="">None</option>
            {programOptions.map((p) => (
              <option key={p.code} value={p.code}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <input
          type="checkbox"
          checked={Boolean(settings.usePlatformDefaults)}
          onChange={(e) => setSettings((prev) => ({ ...prev, usePlatformDefaults: e.target.checked }))}
        />
        Use engineering platform defaults for program pickers
      </label>

      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="checkbox"
          checked={Boolean(settings.restrictProgramsToDefaults)}
          onChange={(e) => setSettings((prev) => ({ ...prev, restrictProgramsToDefaults: e.target.checked }))}
        />
        Limit student program dropdown to engineering-default programs only
      </label>

      <div style={{ marginBottom: '1rem' }}>
        <div className="form-label" style={{ marginBottom: '0.5rem' }}>Default placement eligibility groups</div>
        <p className="text-xs text-secondary" style={{ margin: '0 0 0.5rem' }}>
          Recruiters can target umbrella groups (e.g. Computer Science) instead of dozens of branch variants like CSE, CSE (AI), IT.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {groupOptions.map((g) => {
            const active = (settings.defaultEligibilityGroupCodes || []).includes(g.code);
            return (
              <button
                key={g.code}
                type="button"
                className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => toggleGroup(g.code)}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      {tree ? (
        <p className="text-xs text-tertiary" style={{ margin: 0 }}>
          Loaded {tree.degrees?.length || 0} degrees · {tree.disciplines?.length || 0} disciplines ·{' '}
          {tree.academicPrograms?.length || 0} academic programs · {tree.eligibilityGroups?.length || 0} eligibility groups
        </p>
      ) : null}

      {message ? (
        <p className="text-sm" style={{ margin: '0.75rem 0 0', color: message.includes('fail') || message.includes('Failed') ? 'var(--danger-600)' : 'var(--success-700)' }}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
