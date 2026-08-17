'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const EMPTY = {
  guideName: '',
  guideEmail: '',
  guidePhone: '',
  guideDepartment: '',
  guideNotes: '',
};

export default function InternshipGuideForm({ initialGuide, saving, onSubmit, onClear, readOnly = false }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    guideName: initialGuide?.guideName || '',
    guideEmail: initialGuide?.guideEmail || '',
    guidePhone: initialGuide?.guidePhone || '',
    guideDepartment: initialGuide?.guideDepartment || '',
    guideNotes: initialGuide?.guideNotes || '',
  }));

  if (readOnly) {
    if (!initialGuide?.guideName) {
      return <p className="text-sm text-secondary" style={{ margin: 0 }}>No campus guide assigned yet.</p>;
    }
    return (
      <div className="flex flex-col gap-1 text-sm leading-relaxed">
        <div className="font-medium">{initialGuide.guideName}</div>
        {initialGuide.guideDepartment ? (
          <div className="text-muted-foreground">{initialGuide.guideDepartment}</div>
        ) : null}
        {initialGuide.guideEmail ? (
          <div>
            <a href={`mailto:${initialGuide.guideEmail}`}>{initialGuide.guideEmail}</a>
          </div>
        ) : null}
        {initialGuide.guidePhone ? <div className="text-muted-foreground">{initialGuide.guidePhone}</div> : null}
        {initialGuide.guideNotes ? (
          <p className="text-muted-foreground mt-2 mb-0 whitespace-pre-wrap">
            {initialGuide.guideNotes}
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
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="internship-guide-name">Guide name *</FieldLabel>
          <Input
            id="internship-guide-name"
            value={form.guideName}
            onChange={(e) => setField('guideName', e.target.value)}
            placeholder="Dr. Priya Sharma"
            required
            disabled={saving}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="internship-guide-department">Department</FieldLabel>
          <Input
            id="internship-guide-department"
            value={form.guideDepartment}
            onChange={(e) => setField('guideDepartment', e.target.value)}
            placeholder="CSE — Internship coordinator"
            disabled={saving}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="internship-guide-email">Email</FieldLabel>
          <Input
            id="internship-guide-email"
            type="email"
            value={form.guideEmail}
            onChange={(e) => setField('guideEmail', e.target.value)}
            placeholder="guide@college.edu"
            disabled={saving}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="internship-guide-phone">Phone</FieldLabel>
          <Input
            id="internship-guide-phone"
            value={form.guidePhone}
            onChange={(e) => setField('guidePhone', e.target.value)}
            placeholder="+91 …"
            disabled={saving}
          />
        </Field>
      </FieldGroup>
      <Field>
        <FieldLabel htmlFor="internship-guide-notes">Notes for student</FieldLabel>
        <Textarea
          id="internship-guide-notes"
          rows={3}
          value={form.guideNotes}
          onChange={(e) => setField('guideNotes', e.target.value)}
          placeholder="Check-in fortnightly. Share weekly log with your guide."
          disabled={saving}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Saving…' : initialGuide ? 'Update guide' : 'Assign guide'}
        </Button>
        {initialGuide && onClear ? (
          <Button type="button" variant="outline" size="sm" disabled={saving} onClick={onClear}>
            Remove guide
          </Button>
        ) : null}
      </div>
    </form>
  );
}
