/**
 * Generate tour playbooks from use-case-runners.json + use-cases.json.
 * Run: npm run test:guided:build-uc-playbooks
 */
import fs from 'fs';
import path from 'path';
import { PLAYBOOKS_DIR, configPath } from './paths.mjs';

const MANIFEST_PATH = configPath('use-case-runners.json');
const UC_PATH = configPath('use-cases.json');
const TOURS_PATH = configPath('use-case-tours.json');

const ACTOR_PHASE = {
  employer: 'EMPLOYER',
  college_admin: 'COLLEGE',
  student: 'STUDENT',
  super_admin: 'SUPER_ADMIN',
};

const MANUAL_PAUSE_MS = 14_000;

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function setupStep() {
  return {
    phase: 'SETUP',
    label: 'Landing page ready',
    observe: 'Home page is open. Auto voice tour begins — no blue-tag clicks needed.',
    action: { type: 'wait', ms: 400 },
  };
}

function ucStepsToPlaybookSteps(ucSteps) {
  const steps = [];
  for (const s of ucSteps) {
    const phase = ACTOR_PHASE[s.actor] || 'STEP';
    const autos = Array.isArray(s.auto) ? s.auto : [];
    if (autos.length) {
      autos.forEach((action, idx) => {
        steps.push({
          phase,
          label: idx === 0 ? s.instruction : `${s.instruction} (continued)`,
          observe: s.observe,
          action,
        });
      });
    } else if (!s.manual) {
      steps.push({
        phase,
        label: s.instruction,
        observe: s.observe,
        action: { type: 'wait', ms: 1000 },
      });
    }
    if (s.manual) {
      steps.push({
        phase,
        label: `${s.instruction} — manual step`,
        observe: `${s.observe} Complete this on screen during the recording pause.`,
        action: { type: 'wait', ms: MANUAL_PAUSE_MS },
      });
    }
  }
  return steps;
}

function flowToPlaybook(id, title, ucSteps, extraSteps = []) {
  return {
    id,
    title,
    oneLiner: `Voice-guided tour for use case: ${title}`,
    useStoredMarker: false,
    steps: [setupStep(), ...ucStepsToPlaybookSteps(ucSteps), ...extraSteps],
  };
}

function tourStepsToPlaybook(id, title, tourSteps) {
  return {
    id,
    title,
    oneLiner: `Voice-guided tour for use case: ${title}`,
    useStoredMarker: false,
    steps: [setupStep(), ...tourSteps],
  };
}

function writePlaybook(pb) {
  const out = path.join(PLAYBOOKS_DIR, `${pb.id}.json`);
  fs.writeFileSync(out, `${JSON.stringify(pb, null, 2)}\n`, 'utf8');
  console.log(`  wrote ${path.basename(out)} (${pb.steps.length} steps)`);
}

const PARTNERSHIP_POSTING_TAIL = [
  {
    phase: 'EMPLOYER',
    label: 'Open Internship Programs to create a campus posting',
    observe: 'Employer can publish internship visible after college approval.',
    action: { type: 'login', account: 'employer' },
  },
  {
    phase: 'EMPLOYER',
    label: 'Navigate to Internship Programs',
    observe: 'Post Internship form and published list.',
    action: { type: 'goto', path: '/dashboard/employer/internships' },
  },
  {
    phase: 'COLLEGE',
    label: 'College opens Internships and Programs — manual approve',
    observe: 'Switch to List view; Approve for campus on pending GT- or new posting.',
    action: { type: 'login', account: 'college_admin' },
  },
  {
    phase: 'COLLEGE',
    label: 'Open college Internships list',
    observe: 'Pending review row visible for employer posting.',
    action: { type: 'goto', path: '/dashboard/college/internships' },
  },
  {
    phase: 'COLLEGE',
    label: 'Approve for campus — manual',
    observe: 'Campus column shows Approved; students can browse after this.',
    action: { type: 'wait', ms: MANUAL_PAUSE_MS },
  },
  {
    phase: 'STUDENT',
    label: 'Student browses internships',
    observe: 'Approved posting visible when eligibility matches.',
    action: { type: 'login', account: 'student' },
  },
  {
    phase: 'STUDENT',
    label: 'Open Browse Internships',
    observe: 'Same posting title appears for eligible student.',
    action: { type: 'goto', path: '/dashboard/student/internships' },
  },
];

function main() {
  const manifest = loadJson(MANIFEST_PATH);
  const ucConfig = loadJson(UC_PATH);
  const tours = loadJson(TOURS_PATH);
  const existingFullE2e = new Set([
    'drives-full-cycle',
    'internships-full-cycle',
    'internships-employer-publish',
  ]);

  console.log('Building use-case tour playbooks…\n');

  for (const entry of manifest.cases) {
    const playbookId = entry.playbook || entry.slug;
    if (existingFullE2e.has(playbookId) && playbookId !== entry.slug) {
      console.log(`  skip ${entry.slug} → uses existing ${playbookId}`);
      continue;
    }

    let pb = null;

    if (entry.tourKey && tours[entry.tourKey]) {
      pb = tourStepsToPlaybook(entry.slug, entry.title, tours[entry.tourKey]);
    } else if (entry.ucId) {
      const flow = ucConfig.flows[entry.ucId];
      if (!flow) {
        console.warn(`  WARN: missing UC flow ${entry.ucId} for ${entry.slug}`);
        continue;
      }
      let steps = [...flow];
      if (entry.appendUcIds) {
        for (const extraId of entry.appendUcIds) {
          const extra = ucConfig.flows[extraId];
          if (extra) steps = steps.concat(extra);
        }
      }
      let extraSteps = [];
      if (entry.appendSteps === 'partnership-posting-tail') {
        extraSteps = PARTNERSHIP_POSTING_TAIL;
      }
      pb = flowToPlaybook(entry.slug, entry.title, steps, extraSteps);
    }

    if (pb) {
      pb.id = entry.slug;
      writePlaybook(pb);
    }
  }

  console.log('\nDone. Run: npm run test:guided:voice -- <slug>');
}

main();
