'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useToast } from '@/components/ToastProvider';
import MobileHeader from '@/components/mobile/MobileHeader';
import { Save } from 'lucide-react';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import ValidatedDateInput from '@/components/form/ValidatedDateInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import { validateCollegeRulesPayload } from '@/lib/apiInputValidation';

const fetcher = url => fetch(url).then(res => res.json());

export default function mb_Rules() {
  const { data, isLoading } = useSWR('/api/college/rules', fetcher);
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

  if (isLoading || !rules) {
    return (
      <>
        <MobileHeader title="Placement Rules" />
        <div style={{ padding: '1rem 1rem 5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: '12px' }} />)}
        </div>
      </>
    );
  }

  return (
    <>
      <MobileHeader 
        title="Placement Rules" 
        action={
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            <Save size={16} style={{ marginRight: '0.25rem' }} /> {saving ? 'Saving...' : 'Save'}
          </button>
        } 
      />
      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>📋 Offer Rules</h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="text-xs text-secondary mb-1 block">Max Offers Per Student</label>
              <ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_RULE_MAX_OFFERS} className="form-input" value={rules.maxOffers} onChange={(v) => setRules({ ...rules, maxOffers: v })} />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="text-xs text-secondary mb-1 block">Offer Acceptance Window (days)</label>
              <ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_RULE_ACCEPT_WINDOW} className="form-input" value={rules.acceptanceWindow} onChange={(v) => setRules({ ...rules, acceptanceWindow: v })} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={rules.fcfsEnabled} onChange={(e) => setRules({...rules, fcfsEnabled: e.target.checked})} style={{ width: '16px', height: '16px' }} />
              Enable FCFS (First Come First Served)
            </label>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>🎓 Internship Rules</h3>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="text-xs text-secondary mb-1 block">Max Internships Per Student</label>
              <input
                className="form-input"
                type="number"
                value={rules.maxInternshipsPerStudent ?? 1}
                readOnly
                disabled
                aria-readonly="true"
              />
              <p className="text-xs text-tertiary" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                Fixed at 1 (not editable). FCFS selection locks the student from other internships.
              </p>
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>🎓 Eligibility Rules</h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="text-xs text-secondary mb-1 block">Minimum CGPA Threshold</label>
              <ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_RULE_MIN_CGPA} step="0.1" className="form-input" value={rules.minCGPA} onChange={(v) => setRules({ ...rules, minCGPA: v })} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: rules.allowBacklogs ? '1rem' : '0' }}>
              <input type="checkbox" checked={rules.allowBacklogs} onChange={(e) => setRules({...rules, allowBacklogs: e.target.checked})} style={{ width: '16px', height: '16px' }} />
              Allow Students with Backlogs
            </label>
            {rules.allowBacklogs && (
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="text-xs text-secondary mb-1 block">Max Backlogs Allowed</label>
                <ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_RULE_MAX_BACKLOGS} className="form-input" value={rules.maxBacklogs} onChange={(v) => setRules({ ...rules, maxBacklogs: v })} />
              </div>
            )}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={rules.requirePPT} onChange={(e) => setRules({...rules, requirePPT: e.target.checked})} style={{ width: '16px', height: '16px', marginTop: '2px' }} />
              <span>Require Pre-Placement Talk Before Apply</span>
            </label>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>🌟 Dream Company</h3>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: rules.enableDreamCompany ? '1rem' : '0' }}>
              <input type="checkbox" checked={rules.enableDreamCompany} onChange={(e) => setRules({...rules, enableDreamCompany: e.target.checked})} style={{ width: '16px', height: '16px', marginTop: '2px' }} />
              <span>Enable Dream Company Rule Override (Allows placed students to apply for higher-tier)</span>
            </label>
            {rules.enableDreamCompany && (
              <div className="form-group">
                <label className="text-xs text-secondary mb-1 block">Dream Company CTC Multiplier</label>
                <ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_RULE_DREAM_MULT} step="0.1" className="form-input" value={rules.dreamCompanyMultiplier} onChange={(v) => setRules({ ...rules, dreamCompanyMultiplier: v })} />
                <div className="text-xs text-tertiary" style={{ marginTop: '0.25rem' }}>E.g., 2.0 means new offer must be 2x current</div>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>📅 Season Settings</h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="text-xs text-secondary mb-1 block">Placement Season Start</label>
              <ValidatedDateInput fieldId={FIELD_IDS.COLLEGE_RULE_SEASON_START} className="form-input" value={rules.seasonStart || ''} onChange={(v) => setRules({ ...rules, seasonStart: v })} />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="text-xs text-secondary mb-1 block">Placement Season End</label>
              <ValidatedDateInput fieldId={FIELD_IDS.COLLEGE_RULE_SEASON_END} context={{ dateFrom: rules.seasonStart }} className="form-input" value={rules.seasonEnd || ''} onChange={(v) => setRules({ ...rules, seasonEnd: v })} />
            </div>
            <div className="form-group">
              <label className="text-xs text-secondary mb-1 block">Buffer Days Between Drives</label>
              <ValidatedNumberInput fieldId={FIELD_IDS.COLLEGE_RULE_BUFFER_DAYS} className="form-input" value={rules.bufferDays} onChange={(v) => setRules({ ...rules, bufferDays: v })} />
            </div>
          </div>
          
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>🔧 Automation</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={rules.autoVerify} onChange={(e) => setRules({...rules, autoVerify: e.target.checked})} style={{ width: '16px', height: '16px' }} />
              Auto-Verify Student Profiles
            </label>
          </div>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={handleSave} 
          disabled={saving} 
          style={{ width: '100%', marginTop: '1.5rem', padding: '0.8rem', borderRadius: '12px' }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </>
  );
}
