'use client';

import { useState } from 'react';
import ValidatedNumberInput from '@/components/form/ValidatedNumberInput';
import { FIELD_IDS } from '@/lib/inputConstraints';
import { Building2, Plus, Trash2 } from 'lucide-react';
import AdminFilterSelect from '@/components/AdminFilterSelect';
import { useToast } from '@/components/ToastProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
    <Card className={compact ? 'gap-4 py-4' : undefined}>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="text-muted-foreground" aria-hidden />
            Campus resources
          </CardTitle>
          <CardDescription className="mt-1 max-w-xl">
            Add rooms, labs, and auditoriums before booking. Each resource is scoped to your college only.
          </CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowAdd((v) => !v)}>
          <Plus data-icon="inline-start" />
          {showAdd ? 'Close' : 'Add resource'}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
      {assets.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No resources yet — add at least one room or lab to enable bookings.
        </p>
      ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {FACILITY_TYPES.find((t) => t.value === a.type)?.label || a.type || '—'}
                  </TableCell>
                  <TableCell>{a.capacity != null ? a.capacity : '—'}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => void removeResource(a.id)}
                      aria-label={`Remove ${a.name}`}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      )}

      {showAdd ? (
        <form onSubmit={addResource}>
          <FieldGroup className={compact ? 'gap-4' : 'grid gap-4 md:grid-cols-3'}>
          <Field>
            <FieldLabel htmlFor="resource-name">Name</FieldLabel>
            <Input
              id="resource-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Auditorium"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="resource-type">Type</FieldLabel>
            <AdminFilterSelect
              id="resource-type"
              className="w-full"
              value={facilityType}
              onValueChange={setFacilityType}
              emptyMapsToAll={false}
              items={FACILITY_TYPES.map((t) => ({ label: t.label, value: t.value }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="resource-capacity">Capacity (optional)</FieldLabel>
            <ValidatedNumberInput
              id="resource-capacity"
              fieldId={FIELD_IDS.COLLEGE_FACILITY_CAPACITY}
              value={capacity}
              onChange={setCapacity}
              placeholder="e.g. 200"
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]"
            />
          </Field>
          <div className={compact ? '' : 'flex justify-end md:col-span-3'}>
            <Button type="submit" size="sm" disabled={saving} className={compact ? 'w-full' : undefined}>
              {saving ? 'Saving…' : 'Save resource'}
            </Button>
          </div>
          </FieldGroup>
        </form>
      ) : null}
      </CardContent>
    </Card>
  );
}
