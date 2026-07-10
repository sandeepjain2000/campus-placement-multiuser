import { query, transaction } from '@/lib/db';
import {
  ASSESSMENT_ROUND_KINDS,
  defaultRoundLabelsForKind,
  isAssessmentRoundKind,
  mergeStoredRoundLabels,
  normalizeRoundLabelInput,
} from '@/lib/assessmentRoundMap';

async function loadStoredLabels(employerId, kind) {
  const res = await query(
    `SELECT round_no, round_label
     FROM employer_assessment_round_defaults
     WHERE employer_id = $1::uuid AND opportunity_kind = $2
     ORDER BY round_no ASC`,
    [employerId, kind],
  );
  return res.rows;
}

export async function getEmployerRoundMapForKind(employerId, kind) {
  if (!employerId || !isAssessmentRoundKind(kind)) {
    return defaultRoundLabelsForKind(kind || 'jobs');
  }
  try {
    const stored = await loadStoredLabels(employerId, kind);
    return mergeStoredRoundLabels(kind, stored);
  } catch (e) {
    if (e.code === '42P01') return defaultRoundLabelsForKind(kind);
    throw e;
  }
}

export async function getAllEmployerRoundMaps(employerId) {
  const out = {};
  for (const kind of ASSESSMENT_ROUND_KINDS) {
    out[kind.id] = await getEmployerRoundMapForKind(employerId, kind.id);
  }
  return out;
}

export async function saveEmployerRoundMap(employerId, kind, inputRounds) {
  const normalized = [1, 2, 3, 4, 5].map((roundNo) => {
    const hit = inputRounds.find((r) => Number(r.roundNo ?? r.round_no) === roundNo);
    const raw = hit?.label ?? hit?.round_label;
    return {
      roundNo,
      label: normalizeRoundLabelInput(raw, roundNo, kind),
    };
  });

  await transaction(async (client) => {
    for (const row of normalized) {
      await client.query(
        `INSERT INTO employer_assessment_round_defaults (employer_id, opportunity_kind, round_no, round_label, updated_at)
         VALUES ($1::uuid, $2, $3, $4, NOW())
         ON CONFLICT (employer_id, opportunity_kind, round_no)
         DO UPDATE SET round_label = EXCLUDED.round_label, updated_at = NOW()`,
        [employerId, kind, row.roundNo, row.label],
      );
    }
  });

  return normalized.map((r) => ({
    roundNo: r.roundNo,
    column: `round_${r.roundNo}`,
    label: r.label,
  }));
}

/** Labels only — for CSV upload pre-fill. */
export async function getEmployerRoundLabelsForKind(employerId, kind) {
  const rows = await getEmployerRoundMapForKind(employerId, kind);
  return rows.map((r) => r.label);
}
