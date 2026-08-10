'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const EMPTY = {
  supervisorName: '',
  supervisorEmail: '',
  supervisorPhone: '',
  supervisorTeam: '',
  supervisorNotes: '',
};

export default function InternshipSupervisorForm({
  initialSupervisor,
  saving,
  onSubmit,
  onClear,
  readOnly = false,
}) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    setForm({
      supervisorName: initialSupervisor?.supervisorName || '',
      supervisorEmail: initialSupervisor?.supervisorEmail || '',
      supervisorPhone: initialSupervisor?.supervisorPhone || '',
      supervisorTeam: initialSupervisor?.supervisorTeam || '',
      supervisorNotes: initialSupervisor?.supervisorNotes || '',
    });
  }, [initialSupervisor]);

  if (readOnly) {
    if (!initialSupervisor?.supervisorName) {
      return <p className="text-sm text-secondary" style={{ margin: 0 }}>No company supervisor assigned yet.</p>;
    }
    return (
      <div className="flex flex-col gap-1 text-sm leading-relaxed">
        <div className="font-semibold">{initialSupervisor.supervisorName}</div>
        {initialSupervisor.supervisorTeam ? (
          <div className="text-secondary">{initialSupervisor.supervisorTeam}</div>
        ) : null}
        {initialSupervisor.supervisorEmail ? (
          <div>
            <a href={`mailto:${initialSupervisor.supervisorEmail}`}>{initialSupervisor.supervisorEmail}</a>
          </div>
        ) : null}
        {initialSupervisor.supervisorPhone ? (
          <div className="text-secondary">{initialSupervisor.supervisorPhone}</div>
        ) : null}
        {initialSupervisor.supervisorNotes ? (
          <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
            {initialSupervisor.supervisorNotes}
          </p>
        ) : null}
      </div>
    );
  }

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="flex flex-col gap-5"
    >
      <FieldGroup className="grid gap-5 md:grid-cols-2">
        <Field>
          <FieldLabel>Supervisor name *</FieldLabel>
          <Input
            value={form.supervisorName}
            onChange={(e) => setField('supervisorName', e.target.value)}
            placeholder="Anita Mehta"
            required
            disabled={saving}
          />
        </Field>
        <Field>
          <FieldLabel>Team / role</FieldLabel>
          <Input
            value={form.supervisorTeam}
            onChange={(e) => setField('supervisorTeam', e.target.value)}
            placeholder="Platform engineering — Tech lead"
            disabled={saving}
          />
        </Field>
        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input
            type="email"
            value={form.supervisorEmail}
            onChange={(e) => setField('supervisorEmail', e.target.value)}
            placeholder="supervisor@company.com"
            disabled={saving}
          />
        </Field>
        <Field>
          <FieldLabel>Phone</FieldLabel>
          <Input
            value={form.supervisorPhone}
            onChange={(e) => setField('supervisorPhone', e.target.value)}
            placeholder="+91 …"
            disabled={saving}
          />
        </Field>
      </FieldGroup>
      <Field>
        <FieldLabel>Notes for intern</FieldLabel>
        <Textarea
          rows={3}
          value={form.supervisorNotes}
          onChange={(e) => setField('supervisorNotes', e.target.value)}
          placeholder="Report to me on Day 1. Weekly sync every Friday."
          disabled={saving}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Saving…' : initialSupervisor ? 'Update supervisor' : 'Assign supervisor'}
        </Button>
        {initialSupervisor && onClear ? (
          <Button type="button" variant="destructive" size="sm" disabled={saving} onClick={onClear}>
            Remove supervisor
          </Button>
        ) : null}
      </div>
    </form>
  );
}
