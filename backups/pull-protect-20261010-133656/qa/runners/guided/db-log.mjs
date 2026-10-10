#!/usr/bin/env node
/**
 * Print guided testing SQLite session + recent step log (laptop only).
 * Usage: node qa/runners/guided/db-log.mjs [limit]
 */

import {
  GUIDED_TESTING_DB_PATH,
  getGuidedState,
  getRecentGuidedLogs,
} from '../../../src/lib/guidedRunnerDb.js';

const limit = Math.max(1, parseInt(process.argv[2] || '40', 10) || 40);
const { session, step } = getGuidedState();
const rows = getRecentGuidedLogs(limit).reverse();

console.log(`\nGuided testing SQLite\n  ${GUIDED_TESTING_DB_PATH}\n`);
console.log(`Session active: ${session?.active ? 'yes' : 'no'}`);
console.log(`Playbook:       ${session?.playbook_id || '—'}`);
console.log(`Marker:         ${session?.marker || '—'}`);
if (step?.stepIndex != null) {
  console.log(`Current step:   ${step.stepIndex}/${step.stepTotal} armed=${step.armed} running=${step.running}`);
}
console.log(`\nRecent events (${rows.length}):\n`);
if (!rows.length) {
  console.log('  (empty — run npm run test:guided:playbook first)\n');
  process.exit(0);
}
for (const row of rows) {
  const si = row.step_index != null ? `${row.step_index}/${row.step_total}` : '—';
  const detail = row.detail ? ` — ${row.detail}` : '';
  console.log(`  ${row.created_at}  [${row.event.padEnd(8)}]  step ${si}${detail}`);
}
console.log('');
