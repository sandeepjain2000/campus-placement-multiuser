'use client';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useToast } from '@/components/ToastProvider';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import { validateCollegeRulesPayload } from '@/lib/apiInputValidation';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load rules');
  if (json?.error) throw new Error(json.error);
  return json;
};

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

export default function CollegeRulesPage() {
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
      if (res.ok) {
        addToast('Rules saved successfully.', 'success');
      } else {
        addToast(json?.error || 'Failed to save rules.', 'error');
      }
    } catch {
      addToast('Network error while saving rules.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (error && !rules) {
    return (
      <div style={{ padding: '2rem' }}>
        <p style={{ color: 'var(--danger-600)', marginBottom: '0.75rem' }}>{error.message}</p>
        <button type="button" className="btn btn-secondary" onClick={() => setRules(DEFAULT_RULES)}>
          Use defaults and edit
        </button>
      </div>
    );
  }

  if (isLoading || !rules) {
    return <div style={{ padding: '2rem' }}>Loading rules…</div>;
  }

  return (
    <div className="animate-fadeIn" style={{ paddingBottom: '3rem' }}>
      {/* Glassmorphic Hero */}
      <div style={{
        position: 'relative', background: 'var(--banner-gradient)',
        borderRadius: 'var(--radius-xl)', padding: '2.5rem', color: 'white', overflow: 'hidden',
        marginBottom: '2rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem'
      }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%)', borderRadius: '50%' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ color: '#ffffff', fontSize: '2.25rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>⚙️ Placement Rules</h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)', margin: 0 }}>Configure placement policies, eligibility criteria and season settings.</p>
        </div>
        <button className="btn banner-cta-solid" onClick={handleSave} disabled={saving} style={{ position: 'relative', zIndex: 1 }}>
          {saving ? 'Saving…' : '💾 Save Changes'}
        </button>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header"><h3 className="card-title">📋 Offer Rules</h3></div>
          <div className="form-group">
            <label className="form-label">Max Offers Per Student</label>
            <ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_RULE_MAX_OFFERS} value={rules.maxOffers} onChange={(v) => setRules({ ...rules, maxOffers: v })} />
            <span className="form-hint">Maximum number of offers a student can hold simultaneously</span>
          </div>
          <div className="form-group">
            <label className="form-label">Offer Acceptance Window (days)</label>
            <ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_RULE_ACCEPT_WINDOW} value={rules.acceptanceWindow} onChange={(v) => setRules({ ...rules, acceptanceWindow: v })} />
            <span className="form-hint">Days students have to accept/reject an offer</span>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={rules.fcfsEnabled} onChange={(e) => setRules({...rules, fcfsEnabled: e.target.checked})} />
              Enable FCFS (First Come First Served)
            </label>
            <span className="form-hint">Students who apply first get priority in drives</span>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">🎓 Internship Rules</h3></div>
          <div className="form-group">
            <label className="form-label">Max Internships Per Student</label>
            <input
              className="form-input"
              type="number"
              value={rules.maxInternshipsPerStudent ?? 1}
              readOnly
              disabled
              aria-readonly="true"
            />
            <span className="form-hint">
              Fixed at 1 for all campuses (not editable). When a student is selected by one company (FCFS), other
              internships are hidden and they cannot apply elsewhere.
            </span>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">🎓 Eligibility Rules</h3></div>
          <div className="form-group">
            <label className="form-label">Minimum CGPA Threshold</label>
            <ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_RULE_MIN_CGPA} step="0.1" value={rules.minCGPA} onChange={(v) => setRules({ ...rules, minCGPA: v })} />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={rules.allowBacklogs} onChange={(e) => setRules({...rules, allowBacklogs: e.target.checked})} />
              Allow Students with Backlogs
            </label>
          </div>
          {rules.allowBacklogs && (
            <div className="form-group">
              <label className="form-label">Max Backlogs Allowed</label>
              <ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_RULE_MAX_BACKLOGS} value={rules.maxBacklogs} onChange={(v) => setRules({ ...rules, maxBacklogs: v })} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={rules.requirePPT} onChange={(e) => setRules({...rules, requirePPT: e.target.checked})} />
              Require Pre-Placement Talk Before Apply
            </label>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">🌟 Dream Company Category</h3></div>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={rules.enableDreamCompany} onChange={(e) => setRules({...rules, enableDreamCompany: e.target.checked})} />
              Enable Dream Company Rule Override
            </label>
            <span className="form-hint">Allows placed students to apply for a higher-tier company offer</span>
          </div>
          {rules.enableDreamCompany && (
            <div className="form-group">
              <label className="form-label">Dream Company CTC Multiplier</label>
              <ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_RULE_DREAM_MULT} step="0.1" value={rules.dreamCompanyMultiplier} onChange={(v) => setRules({ ...rules, dreamCompanyMultiplier: v })} />
              <span className="form-hint">E.g., 2.0 means the new offer must be at least 2x their current offer to apply</span>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">📅 Season Settings</h3></div>
          <div className="form-group">
            <label className="form-label">Placement Season Start</label>
            <ValidatedDateInput fieldId={FIELD_IDS.COLLEGE_RULE_SEASON_START} value={rules.seasonStart || ''} onChange={(v) => setRules({ ...rules, seasonStart: v })} />
          </div>
          <div className="form-group">
            <label className="form-label">Placement Season End</label>
            <ValidatedDateInput
              fieldId={FIELD_IDS.COLLEGE_RULE_SEASON_END}
              context={{ dateFrom: rules.seasonStart }}
              value={rules.seasonEnd || ''}
              onChange={(v) => setRules({ ...rules, seasonEnd: v })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Buffer Days Between Drives</label>
            <ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_RULE_BUFFER_DAYS} value={rules.bufferDays} onChange={(v) => setRules({ ...rules, bufferDays: v })} />
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">🔧 Automation</h3></div>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={rules.autoVerify} onChange={(e) => setRules({...rules, autoVerify: e.target.checked})} />
              Auto-Verify Student Profiles
            </label>
            <span className="form-hint">Automatically verify students upon registration (not recommended)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
