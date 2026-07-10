/**
 * Shared clarifications client for DB-backed APIs.
 */

import { throwIfApiError } from '@/lib/apiFetchError';

export async function loadClarifications() {
  const res = await fetch('/api/clarifications');
  const json = await throwIfApiError(res, 'Failed to load clarifications');
  return json?.batches ? json : { batches: [] };
}

export async function publishClarificationBatch({ company, postedBy, questionTexts }) {
  const res = await fetch('/api/clarifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company, postedBy, questionTexts }),
  });
  return throwIfApiError(res, 'Failed to publish clarification batch');
}

export async function saveAnswer(batchId, questionId, answer, answeredBy) {
  const res = await fetch('/api/clarifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batchId, questionId, answer, answeredBy }),
  });
  return throwIfApiError(res, 'Failed to save answer');
}

export const CLARIFICATION_RULES = {
  maxQuestions: 5,
};
