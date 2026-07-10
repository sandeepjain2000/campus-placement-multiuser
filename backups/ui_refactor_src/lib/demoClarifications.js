/**
 * Shared clarifications client for DB-backed APIs.
 */

export async function loadClarifications() {
  const res = await fetch('/api/clarifications');
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load clarifications');
  return json?.batches ? json : { batches: [] };
}

export async function publishClarificationBatch({ company, postedBy, questionTexts }) {
  const res = await fetch('/api/clarifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company, postedBy, questionTexts }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to publish clarification batch');
  return json;
}

export async function saveAnswer(batchId, questionId, answer, answeredBy) {
  const res = await fetch('/api/clarifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batchId, questionId, answer, answeredBy }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to save answer');
  return json;
}

export const CLARIFICATION_RULES = {
  maxQuestions: 5,
};
