'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';

function StarPicker({ value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <Button
          key={n}
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          aria-pressed={(value || 0) >= n}
          onClick={() => onChange(n)}
          className={(value || 0) >= n ? 'text-amber-500' : 'text-muted-foreground'}
        >
          ★
        </Button>
      ))}
      {value ? <span className="text-muted-foreground text-sm">{value}/5</span> : null}
    </div>
  );
}

export default function InternshipFeedbackForm({ initialRating, initialText, saving, onSubmit }) {
  const [rating, setRating] = useState(initialRating || null);
  const [text, setText] = useState(initialText || '');

  useEffect(() => {
    setRating(initialRating || null);
    setText(initialText || '');
  }, [initialRating, initialText]);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ rating, feedbackText: text });
      }}
    >
      <FieldGroup>
      <Field>
        <FieldLabel>Overall rating (optional)</FieldLabel>
        <StarPicker value={rating} onChange={setRating} disabled={saving} />
      </Field>
      <Field>
        <FieldLabel htmlFor="internship-progress-review">Your progress review</FieldLabel>
        <Textarea
          id="internship-progress-review"
          name="feedbackText"
          autoComplete="off"
          rows={4}
          maxLength={4000}
          value={text}
          disabled={saving}
          placeholder="Describe the internship experience, mentorship, work quality, and suggestions…"
          onChange={(e) => setText(e.target.value)}
        />
      </Field>
      </FieldGroup>
      <Button type="submit" size="sm" className="w-fit" disabled={saving}>
        {saving ? 'Saving…' : initialText ? 'Update progress review' : 'Submit progress review'}
      </Button>
    </form>
  );
}
