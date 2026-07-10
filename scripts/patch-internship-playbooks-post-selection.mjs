/**
 * Append post-selection voice steps (guides, supervisors, feedback) to internship playbooks.
 * Run: node scripts/patch-internship-playbooks-post-selection.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const stepsPath = path.join(repoRoot, 'qa/guided/config/internship-post-selection-steps.json');
const postSteps = JSON.parse(fs.readFileSync(stepsPath, 'utf8'));

const MARKER = '__POST_SELECTION_STEPS__';

function appendUniqueSteps(playbookPath) {
  const pb = JSON.parse(fs.readFileSync(playbookPath, 'utf8'));
  if (pb.steps.some((s) => s.phase === 'COLLEGE' && s.label === 'College assigns campus guide for the intern')) {
    console.log(`  skip (already patched): ${path.basename(playbookPath)}`);
    return;
  }
  const closureIdx = pb.steps.findIndex((s) => s.phase === 'CLOSURE');
  const insertAt = closureIdx >= 0 ? closureIdx : pb.steps.length;
  pb.steps.splice(insertAt, 0, ...postSteps);
  if (closureIdx >= 0) {
    const last = pb.steps[pb.steps.length - 1];
    if (last?.phase === 'CLOSURE') {
      last.observe =
        'Student sees Selected on My Applications, and guide/supervisor/feedback flows are complete.';
    }
  }
  fs.writeFileSync(playbookPath, `${JSON.stringify(pb, null, 2)}\n`, 'utf8');
  console.log(`  patched ${path.basename(playbookPath)} → ${pb.steps.length} steps`);
}

const playbooks = [
  'qa/guided/playbooks/internships-full-cycle.json',
  'qa/guided/playbooks/internships-apply-select.json',
];

console.log('Patching internship playbooks with post-selection steps…\n');
for (const rel of playbooks) {
  appendUniqueSteps(path.join(repoRoot, rel));
}
console.log('\nDone.');
