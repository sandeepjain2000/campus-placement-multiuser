'use client';

import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';

/**
 * Edit / delete / email controls for an interview schedule slot card.
 */
export default function InterviewSlotActions({ onEdit, onDelete, onEmail, disabled, emailDisabled }) {
  return (
    <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
      {onEmail ? (
        <StandardTableIconAction
          action="email"
          showLabel={false}
          onClick={onEmail}
          disabled={disabled || emailDisabled}
          tooltip={emailDisabled ? 'Link slot to an opening first' : 'Email applicants'}
        />
      ) : null}
      <StandardTableIconAction action="edit" showLabel={false} onClick={onEdit} disabled={disabled} />
      <StandardTableIconAction
        action="delete"
        variant="danger"
        showLabel={false}
        onClick={onDelete}
        disabled={disabled}
      />
    </div>
  );
}
