'use client';

import { StandardTableIconAction } from '@/components/ui/StandardTableIconAction';

/**
 * Icon-only row actions for employer application tables (S-46).
 * View uses Eye + overlay doc count; CV is a separate scroll/resume action.
 */
export default function EmployerApplicationRowActions({ app, onViewProfile, onOpenResume, onUpdateStatus, busy = false }) {
  return (
    <div className="table-actions">
      <StandardTableIconAction
        action="view"
        variant="secondary"
        onClick={onViewProfile}
        disabled={busy}
        tooltip="View profile, CV, and documents"
        badge={app.documentCount}
      />
      {app.hasResume ? (
        <StandardTableIconAction
          action="cv"
          variant="ghost"
          onClick={onOpenResume}
          disabled={busy}
          tooltip={app.cvLabel ? `Open CV: ${app.cvLabel}` : 'Open CV in new tab'}
        />
      ) : null}
      {app.status !== 'withdrawn' && (app.status === 'applied' || app.status === 'on_hold') ? (
        <>
          <StandardTableIconAction
            action="shortlist"
            variant="ghost"
            disabled={busy}
            loading={busy}
            onClick={() => onUpdateStatus(app, 'shortlisted')}
          />
          <StandardTableIconAction
            action="select"
            variant="secondary"
            disabled={busy}
            loading={busy}
            onClick={() => onUpdateStatus(app, 'selected')}
          />
        </>
      ) : null}
      {app.status !== 'withdrawn' && app.status === 'shortlisted' ? (
        <>
          <StandardTableIconAction
            action="select"
            variant="secondary"
            disabled={busy}
            loading={busy}
            onClick={() => onUpdateStatus(app, 'selected')}
          />
          <StandardTableIconAction
            action="reject"
            variant="ghost"
            disabled={busy}
            onClick={() => onUpdateStatus(app, 'rejected')}
          />
        </>
      ) : null}
      {app.status !== 'withdrawn' && app.status === 'in_progress' ? (
        <StandardTableIconAction
          action="select"
          variant="secondary"
          disabled={busy}
          loading={busy}
          onClick={() => onUpdateStatus(app, 'selected')}
        />
      ) : null}
    </div>
  );
}
