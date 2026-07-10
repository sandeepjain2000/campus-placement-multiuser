'use client';

import { useState } from 'react';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import { Building2, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

const FACILITY_TYPES = [
  { value: 'auditorium', label: 'Auditorium' },
  { value: 'seminar_hall', label: 'Seminar hall' },
  { value: 'lab', label: 'Lab' },
  { value: 'conference_room', label: 'Conference room' },
  { value: 'other', label: 'Other' },
];

/**
 * @param {{ assets: Array<{ id: string, name: string, capacity?: number, type?: string }>, onAssetsChange: (next: any[]) => void, compact?: boolean }} props
 */
export default function InfrastructureResourceManager({ assets, onAssetsChange, compact = false }) {
  const { addToast } = useToast();
  const [showAdd, setShowAdd] = useState(() => assets.length === 0);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [facilityType, setFacilityType] = useState('seminar_hall');
  const [capacity, setCapacity] = useState('');

  const addResource = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      addToast('Enter a name for the room, lab, or auditorium.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/college/facilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed,
          facilityType,
          capacity: capacity === '' ? null : Number(capacity),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to add resource');
      const f = json.facility;
      onAssetsChange([
        ...assets,
        { id: f.id, name: f.name, capacity: f.capacity, type: f.type },
      ].sort((a, b) => a.name.localeCompare(b.name)));
      addToast('Resource added. You can book it now.', 'success');
      setName('');
      setCapacity('');
      setShowAdd(false);
    } catch (err) {
      addToast(err.message || 'Failed to add resource', 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeResource = async (id) => {
    try {
      const res = await fetch('/api/college/facilities', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to delete');
      onAssetsChange(assets.filter((a) => a.id !== id));
      addToast('Resource removed', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to delete resource', 'error');
    }
  };

  return (
    <div className="card" style={{ marginBottom: compact ? '1rem' : '1.5rem', padding: compact ? '1rem' : '1.25rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '0.75rem',
          flexWrap: 'wrap',
          marginBottom: '0.75rem',
        }}
      >
        <div>
          <h3 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={18} className="text-primary" aria-hidden />
            Campus resources
          </h3>
          <p className="text-sm text-secondary" style={{ margin: '0.35rem 0 0', maxWidth: 560 }}>
            Add rooms, labs, and auditoriums before booking. Each resource is scoped to your college only.
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAdd((v) => !v)}>
          <Plus size={14} style={{ marginRight: 4 }} />
          {showAdd ? 'Close' : 'Add resource'}
        </button>
      </div>

      {assets.length === 0 ? (
        <p className="text-sm text-secondary" style={{ margin: '0 0 0.75rem' }}>
          No resources yet — add at least one room or lab to enable bookings.
        </p>
      ) : (
        <div className="table-container" style={{ marginBottom: showAdd ? '1rem' : 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Capacity</th>
                <th style={{ width: 1 }} />
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id}>
                  <td className="font-medium">{a.name}</td>
                  <td className="text-sm text-secondary">
                    {FACILITY_TYPES.find((t) => t.value === a.type)?.label || a.type || '—'}
                  </td>
                  <td>{a.capacity != null ? a.capacity : '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--danger-600)' }}
                      onClick={() => void removeResource(a.id)}
                      aria-label={`Remove ${a.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd ? (
        <form
          onSubmit={addResource}
          className={compact ? undefined : 'grid grid-2'}
          style={compact ? { display: 'flex', flexDirection: 'column', gap: '0.75rem' } : { gap: '1rem' }}
        >
          <div className="form-group" style={compact ? undefined : { margin: 0 }}>
            <label className="form-label">Name</label>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Auditorium"
            />
          </div>
          <div className="form-group" style={compact ? undefined : { margin: 0 }}>
            <label className="form-label">Type</label>
            <select className="form-select" value={facilityType} onChange={(e) => setFacilityType(e.target.value)}>
              {FACILITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={compact ? undefined : { margin: 0 }}>
            <label className="form-label">Capacity (optional)</label>
            <ValidatedNumberInput
              fieldId={FIELD_IDS.COLLEGE_FACILITY_CAPACITY}
              value={capacity}
              onChange={setCapacity}
              placeholder="e.g. 200"
            />
          </div>
          <div style={compact ? undefined : { gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving} style={compact ? { width: '100%' } : undefined}>
              {saving ? 'Saving…' : 'Save resource'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
