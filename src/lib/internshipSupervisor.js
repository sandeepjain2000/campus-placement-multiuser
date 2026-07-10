import { INTERNSHIP_FEEDBACK_ELIGIBLE_STATUSES, isEligibleInternshipApplicationStatus } from '@/lib/internshipFeedback';

export {
  INTERNSHIP_FEEDBACK_ELIGIBLE_STATUSES as INTERNSHIP_SUPERVISOR_ELIGIBLE_STATUSES,
  isEligibleInternshipApplicationStatus,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeInternshipSupervisorName(raw) {
  return String(raw || '').trim().replace(/\s+/g, ' ');
}

export function validateInternshipSupervisorPayload(payload, { requireName = true } = {}) {
  const supervisorName = normalizeInternshipSupervisorName(
    payload?.supervisorName ?? payload?.supervisor_name,
  );
  const supervisorEmail = String(payload?.supervisorEmail ?? payload?.supervisor_email ?? '').trim();
  const supervisorPhone = String(payload?.supervisorPhone ?? payload?.supervisor_phone ?? '').trim();
  const supervisorTeam = String(payload?.supervisorTeam ?? payload?.supervisor_team ?? '').trim();
  const supervisorNotes = String(payload?.supervisorNotes ?? payload?.supervisor_notes ?? '').trim();

  if (requireName && supervisorName.length < 2) {
    return { error: 'Supervisor name must be at least 2 characters.' };
  }
  if (supervisorName.length > 120) {
    return { error: 'Supervisor name must be 120 characters or fewer.' };
  }
  if (supervisorEmail && !EMAIL_RE.test(supervisorEmail)) {
    return { error: 'Enter a valid supervisor email address.' };
  }
  if (supervisorEmail.length > 255) {
    return { error: 'Supervisor email must be 255 characters or fewer.' };
  }
  if (supervisorPhone.length > 30) {
    return { error: 'Supervisor phone must be 30 characters or fewer.' };
  }
  if (supervisorTeam.length > 120) {
    return { error: 'Team / role must be 120 characters or fewer.' };
  }
  if (supervisorNotes.length > 2000) {
    return { error: 'Supervisor notes must be 2000 characters or fewer.' };
  }

  return {
    supervisorName,
    supervisorEmail: supervisorEmail || null,
    supervisorPhone: supervisorPhone || null,
    supervisorTeam: supervisorTeam || null,
    supervisorNotes: supervisorNotes || null,
  };
}

/**
 * @param {import('pg').QueryResultRow | null | undefined} row
 */
export function mapInternshipSupervisorRow(row) {
  if (!row?.id) return null;
  return {
    id: String(row.id),
    programApplicationId: String(row.program_application_id),
    supervisorName: row.supervisor_name,
    supervisorEmail: row.supervisor_email || null,
    supervisorPhone: row.supervisor_phone || null,
    supervisorTeam: row.supervisor_team || null,
    supervisorNotes: row.supervisor_notes || null,
    updatedAt: row.updated_at,
  };
}
