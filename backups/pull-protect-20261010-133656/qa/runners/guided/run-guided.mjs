/**
 * Guided manual test runner
 *
 * Playbook mode (recommended): automates each tester action, pauses for you to observe.
 *   node qa/runners/guided/run-guided.mjs --playbook internships-employer-publish
 *
 * Legacy: --focus / --section / --uc (navigation-only steps from Focus Areas.xlsx)
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { executeAction, resolveTemplate } from './action-runner.mjs';
import {
  waitForNextClick,
  waitForAutoAdvance,
  removeNextButton,
  installNextButton,
  setupNextClickBridge,
  clearRunnerUi,
  showRunnerRunning,
  finishRunning,
  attachRunnerResync,
  startGuidedSession,
  endGuidedSession,
  GUIDED_TESTING_DB_PATH,
} from './next-button.mjs';
import { announceStep, loadVoiceConfig, pauseBetweenRoles } from './voice-annotate.mjs';
import { getGuidedMarker, setGuidedMarker } from '../../../src/lib/guidedRunnerDb.js';
import {
  PLAYBOOKS_DIR,
  configPath,
} from './paths.mjs';

const CONFIG_PATH = configPath('use-cases.json');
const FOCUS_PATH = configPath('focus-areas.json');

function parseArgs(argv) {
  const args = {
    list: false,
    uc: null,
    focus: null,
    section: null,
    playbook: null,
    playbookList: false,
    baseUrl: null,
    auto: false,
    voice: false,
    noVoice: false,
    headless: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--list' || a === '-l') args.list = true;
    else if (a === '--auto') args.auto = true;
    else if (a === '--voice') args.voice = true;
    else if (a === '--no-voice') args.noVoice = true;
    else if (a === '--headless') args.headless = true;
    else if (a === '--playbook-list') args.playbookList = true;
    else if (a === '--uc' || a === '-u') {
      args.uc = argv[i + 1];
      i += 1;
    } else if (a === '--focus' || a === '-f') {
      args.focus = argv[i + 1];
      i += 1;
    } else if (a === '--section' || a === '-s') {
      args.section = argv[i + 1];
      i += 1;
    } else if (a === '--playbook' || a === '-p') {
      args.playbook = argv[i + 1];
      i += 1;
    } else if (a === '--base-url' || a === '-b') {
      args.baseUrl = argv[i + 1];
      i += 1;
    } else if (a === '--help' || a === '-h') args.help = true;
    else if (!a.startsWith('-') && !args.playbook && !args.focus && !args.uc && !args.section) {
      args.playbook = a;
    }
  }
  if (args.auto && !args.noVoice) args.voice = true;
  return args;
}

function printHelp() {
  console.log(`
Guided Runner — partial automated testing (YOU click Next on the app)

QUICK REFERENCE (full doc):
  In app:  http://localhost:3000/developer  (Landing → Developer notes)
  Repo:    qa/docs/guided-runner-quickstart.md  (runners: qa/runners/guided/)
  Or:      npm run test:guided:help

THREE-STEP RECIPE
  Terminal 1:  npm run dev
  Terminal 2:  npm run test:guided:playbook-list    # see options
               npm run test:guided:playbook-e2e    # internship full cycle
               npm run test:guided:playbook          # internship publish + college approve
               npm run test:guided:playbook-apply    # internship apply + employer select
               npm run test:guided:playbook-drives-e2e   # placement drive full cycle
               npm run test:guided:playbook-drives         # employer request drive + college approve
               npm run test:guided:playbook-drives-apply   # student apply + employer select

COLLEGE APPROVAL
  Internships: /dashboard/college/internships — Pending review → Approve (GT-* marker)
  Placement drives: /dashboard/college/drives — Awaiting Approval → Approve (GT-* marker)

FORM FIELDS (2026-06)
  Internships: Start date 1 Jul 2026, End date 31 Dec 2026; batch year 2026; eligible branches All
  College approve: Internships list → Approve for campus (icon button, not plain Approve)
  Drives: full request form includes role/eligibility/compensation; batch year 2026; drive date via segmented fields

BEFORE INTERNSHIP TESTS (if no approved campuses)
  npm run qa:ensure-partnership              # IIT Madras × all employers
  npm run qa:ensure-techcorp-partnerships    # TechCorp × all active colleges
  Or: /data-entry → Campus tie-ups → Ensure IIT Madras tie-up

ON SCREEN
  Manual: one blue screen-tag click per step (S-xx top-right). Alt+Enter works.
  Auto + voice (screen recordings): npm run test:guided:playbook-e2e-auto-voice
    pip install -r qa/data/requirements/requirements-voice.txt   # once
    No clicks — Edge TTS narration + transcripts in qa/data/voice/

RECORDING (SQLite on your laptop)
  All step state + logs: db/sqlite/guided_testing.sqlite
  View log: npm run qa:guided:db-log
  Marker + session stored in guided_session table (not sessionStorage)

MARKER (links publish + apply playbooks)
  Saved in SQLite guided_session.marker after publish

LOGINS (password Admin@123)
  employer hr@techcorp.com | college admin@iitm.edu | student arjun.verma@iitm.edu
  Demo mail inbox: placementhub@yopmail.com (yopmail.com) · Data Tester users @placementhub.test

RUNNER ALERTS — 2026-05-29
  Assessment uploads (CSV): tabbed export/upload; no mapping dialog; labels from Assessment map
  Assessment Update Online: new inline edit screen (below CSV uploads in menu)
  Hiring Results Dashboard: read-only employer view (renamed)
  Upload offers (CSV): off sidebar — use Offers page → /offers-upload
  Purge: /data-entry only · npm run qa:sync-routes after menu changes

PURGE TEST DATA
  /data-entry → Purge → Internships & programs → refresh → purge GT-* rows

LEGACY (navigation only, no auto typing)
  npm run test:guided:internships
  node qa/runners/guided/run-guided.mjs --focus EI-03
`);
}

function loadJson(p) {
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}

function listPlaybooks() {
  if (!fs.existsSync(PLAYBOOKS_DIR)) return [];
  return fs
    .readdirSync(PLAYBOOKS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const data = loadJson(path.join(PLAYBOOKS_DIR, f));
      return {
        file: f.replace(/\.json$/, ''),
        id: data?.id,
        title: data?.title,
        steps: data?.steps?.length ?? 0,
        sourceCases: data?.sourceCases?.join(', ') ?? '',
      };
    });
}

function loadPlaybook(id) {
  const direct = path.join(PLAYBOOKS_DIR, `${id}.json`);
  if (fs.existsSync(direct)) return loadJson(direct);
  const match = listPlaybooks().find((p) => p.id === id || p.file === id);
  if (match) return loadJson(path.join(PLAYBOOKS_DIR, `${match.file}.json`));
  return null;
}

function logStep({ stepIndex, stepTotal, phase, label, observe, auto }) {
  console.log(`\n── Step ${stepIndex}/${stepTotal} ──`);
  if (phase) console.log(`  Focus: ${phase}`);
  console.log(`  Do:      ${label}`);
  console.log(`  Observe: ${observe}`);
  if (auto) {
    console.log('  → Auto mode: narration + timed pause, then action runs.');
  } else {
    console.log('  → One click on the blue screen tag runs this step (Alt+Enter). Read Observe, then click when ready.');
  }
}

async function checkEmployerPartnershipReady(page) {
  return page.evaluate(async () => {
    try {
      const res = await fetch('/api/employer/campuses', { credentials: 'include' });
      const json = await res.json();
      const colleges = Array.isArray(json?.colleges) ? json.colleges : [];
      return colleges.some(
        (c) =>
          /indian institute/i.test(String(c?.name || '')) &&
          String(c?.approval_status || '').toLowerCase() === 'approved',
      );
    } catch {
      return false;
    }
  });
}

async function initPlaybookContext(page, playbook) {
  const envMarker = String(process.env.PH_GUIDED_MARKER || '').trim();
  const useStored = playbook.useStoredMarker !== false;
  let marker = envMarker || (useStored ? getGuidedMarker() : null) || null;

  if (!marker) {
    marker = `GT-${new Date().toISOString().slice(0, 16).replace(/[T:]/g, '')}`;
  }

  setGuidedMarker(marker);
  await page
    .evaluate((m) => {
      try {
        localStorage.setItem('ph-guided-marker', m);
      } catch {
        /* ignore */
      }
    }, marker)
    .catch(() => {});

  return { marker };
}

async function runPlaybook(page, baseUrl, accounts, playbook, runnerOptions = {}) {
  const { auto = false, voice = false } = runnerOptions;
  const voiceConfig = voice ? loadVoiceConfig() : null;
  const phaseIntros = voiceConfig?.phase_intros || {};
  const pauseBeforeActionMs = Math.max(
    0,
    Number(voiceConfig?.auto_run?.pause_before_action_sec ?? 1.5) * 1000,
  );
  let lastPhase = '';
  let actionErrors = 0;

  const ctx = await initPlaybookContext(page, playbook);
  const steps = playbook.steps || [];
  startGuidedSession({ playbookId: playbook.id || playbook.title, marker: ctx.marker });
  console.log(`\n▶ Playbook: ${playbook.title}`);
  console.log(`  Session marker: ${ctx.marker}`);
  console.log(`  SQLite log: ${GUIDED_TESTING_DB_PATH}`);
  if (auto && voice) {
    console.log(`  Mode: AUTO + VOICE (${steps.length} steps)`);
    console.log('  Transcripts: qa/data/voice/transcripts/');
  } else if (auto) {
    console.log(`  Mode: AUTO (${steps.length} steps, no voice)`);
  } else {
    console.log(`  ${steps.length} steps — one screen-tag click per step; read terminal, click when ready\n`);
  }

  for (let i = 0; i < steps.length; i += 1) {
    const partnershipStartIdx = steps.findIndex(
      (s) => s.action?.type === 'goto' && String(s.action?.path || '').includes('select-campus'),
    );
    const workflowIdx = steps.findIndex((s) => {
      if (s.action?.type !== 'goto') return false;
      const path = String(s.action?.path || '');
      return path.includes('/employer/internships') || path.includes('/employer/drives');
    });

    if (
      i === partnershipStartIdx &&
      partnershipStartIdx >= 0 &&
      workflowIdx > partnershipStartIdx &&
      playbook.skipPartnershipSetupWhenApproved !== false
    ) {
      const ready = await checkEmployerPartnershipReady(page);
      if (ready) {
        console.log(
          `\n  ⏭ Steps ${partnershipStartIdx + 1}–${workflowIdx} skipped — TechCorp ↔ IIT Madras is already approved.`,
        );
        console.log('  Campus note: employer dashboard auto-picks an approved campus. No manual switch needed.\n');
        i = workflowIdx - 1;
      }
    }

    const step = steps[i];
    const label = resolveTemplate(step.label, ctx);
    const observe = resolveTemplate(step.observe, ctx);
    const phase = step.phase || '';
    const buttonPayload = {
      stepIndex: i + 1,
      stepTotal: steps.length,
      label: 'N',
      phase,
      observe,
    };

    logStep({
      stepIndex: i + 1,
      stepTotal: steps.length,
      phase,
      label,
      observe,
      auto,
    });

    if (voice && phase && phase !== lastPhase) {
      if (lastPhase) await pauseBetweenRoles(auto);
      const intro = phaseIntros[phase];
      if (intro) {
        announceStep({
          stageKey: `phase-${phase.toLowerCase()}`,
          role: phase,
          text: intro,
          auto,
        });
      }
      lastPhase = phase;
    }

    if (voice) {
      announceStep({
        stageKey: `step-${String(i + 1).padStart(2, '0')}`,
        role: phase || 'STEP',
        text: `${label}. ${observe}`,
        auto,
      });
    }

    if (auto) {
      await waitForAutoAdvance(page, buttonPayload, { pauseMs: pauseBeforeActionMs });
    } else {
      await waitForNextClick(page, buttonPayload);
    }
    console.log('  ▶ Running automated action…');
    await showRunnerRunning(page, buttonPayload);

    try {
      await executeAction(page, baseUrl, accounts, step.action, ctx);
    } catch (err) {
      actionErrors += 1;
      console.warn(`    (action error: ${err.message})`);
    }

    await finishRunning(page, buttonPayload);
  }

  await removeNextButton(page);
  endGuidedSession();
  if (actionErrors > 0) {
    console.log(`\n✗ Playbook finished with ${actionErrors} action error(s).`);
  } else {
    console.log('\n✓ Playbook finished.');
  }
  console.log(`  Step log: npm run qa:guided:db-log\n`);
  return actionErrors;
}

// ─── Legacy focus / UC runners (navigation-only) ─────────────────────────────

async function runAutoActions(page, baseUrl, accounts, actions) {
  for (const action of actions || []) {
    try {
      await executeAction(page, baseUrl, accounts, action, {});
    } catch (err) {
      console.warn(`  (skipped: ${err.message})`);
    }
  }
}

async function runLegacySteps(page, baseUrl, accounts, meta, steps) {
  await clearRunnerUi(page);
  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    const buttonPayload = {
      stepIndex: i + 1,
      stepTotal: steps.length,
      label: 'N',
    };
    logStep({
      stepIndex: i + 1,
      stepTotal: steps.length,
      phase: meta.title,
      label: step.instruction,
      observe: step.observe,
    });
    await waitForNextClick(page, buttonPayload);
    console.log('  ▶ Running automated navigation…');
    await runAutoActions(page, baseUrl, accounts, step.auto);
  }
  await removeNextButton(page);
}

function findFocusCase(focus, caseId) {
  for (const mod of focus.modules) {
    for (const grp of mod.groups) {
      const found = grp.cases.find((c) => c.id === caseId);
      if (found) return { mod, grp, case: found };
    }
  }
  return null;
}

function resolveFocusSection(focus, sectionId) {
  const parts = sectionId.split('.');
  const mod = focus.modules.find((m) => m.id === parts[0]);
  if (!mod) return null;
  const groups = parts.length === 1 ? mod.groups : mod.groups.filter((g) => g.role === parts[1]);
  return {
    title: mod.title,
    steps: groups.flatMap((grp) =>
      grp.cases.map((c) => ({
        instruction: `[${c.id}] ${c.instruction}`,
        observe: c.observe,
        auto: c.auto,
      })),
    ),
  };
}

async function launchBrowser(runFn, { auto = false, voice = false, headless = false } = {}) {
  console.log('');
  if (auto) {
    console.log('  AUTO mode — steps advance on a timer (no blue-tag clicks).');
    if (voice) console.log('  VOICE on — Edge TTS + transcripts in qa/data/voice/');
  } else {
    console.log('  Click the blue screen tag (S-xx) top-right when armed. Alt+Enter works.');
  }
  if (headless) console.log('  HEADLESS — browser closes when the playbook ends.');
  console.log(`  Steps recorded in SQLite: ${GUIDED_TESTING_DB_PATH}`);
  console.log('');
  const browser = await chromium.launch({
    headless,
    slowMo: headless ? 0 : 100,
    // Match a normal maximized browser — fixed 1400px viewport left empty space on the
    // right when the window was resized wider than the locked page width.
    args: ['--start-maximized'],
  });
  const context = await browser.newContext({
    viewport: null,
  });
  await installNextButton(context);
  const page = await context.newPage();
  await setupNextClickBridge(page);
  attachRunnerResync(page);
  try {
    await runFn(page);
    if (!headless) {
      await page.bringToFront().catch(() => {});
      console.log('\nClose the browser window when finished.');
      await page.waitForEvent('close', { timeout: 0 }).catch(() => {});
    }
  } finally {
    endGuidedSession();
    await browser.close().catch(() => {});
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const config = loadJson(CONFIG_PATH);
  const focus = loadJson(FOCUS_PATH);
  const baseUrl = (
    args.baseUrl ||
    process.env.QA_BASE_URL ||
    config?.defaultBaseUrl ||
    focus?.defaultBaseUrl ||
    'http://127.0.0.1:3000'
  ).replace(/\/$/, '');

  const accounts = focus?.accounts || config?.accounts || {
    student: 'arjun.verma@iitm.edu',
    employer: 'hr@techcorp.com',
    college_admin: 'admin@iitm.edu',
  };

  if (args.playbookList) {
    console.log('\nPlaybooks (automated tester actions):\n');
    for (const p of listPlaybooks()) {
      console.log(`  ${p.file.padEnd(32)} ${p.title} (${p.steps} actions)`);
      if (p.sourceCases) console.log(`  ${''.padEnd(32)} Maps to: ${p.sourceCases}\n`);
    }
    printHelp();
    return;
  }

  if (args.list) {
    console.log('\n=== Playbooks (use --playbook) ===\n');
    listPlaybooks().forEach((p) => console.log(`  ${p.file} — ${p.title}`));
    if (focus) {
      console.log('\n=== Focus sections (navigation only — use --section) ===\n');
      focus.modules.forEach((m) => console.log(`  ${m.id}`));
    }
    printHelp();
    return;
  }

  if (args.playbook) {
    const pb = loadPlaybook(args.playbook);
    if (!pb) {
      console.error(`Unknown playbook: ${args.playbook}. Try --playbook-list`);
      process.exit(1);
    }
    console.log(`Base URL: ${baseUrl}`);
    let exitCode = 0;
    await launchBrowser(
      async (page) => {
        await page.goto(baseUrl, { waitUntil: 'load' }).catch(() => {});
        await page.waitForSelector('body', { timeout: 15000 }).catch(() => {});
        await clearRunnerUi(page);
        await page.bringToFront().catch(() => {});
        const errors = await runPlaybook(page, baseUrl, accounts, pb, {
          auto: args.auto,
          voice: args.voice,
        });
        if (errors > 0) exitCode = 1;
      },
      { auto: args.auto, voice: args.voice, headless: args.headless },
    );
    process.exit(exitCode);
    return;
  }

  // Legacy modes
  if (args.focus && focus) {
    const hit = findFocusCase(focus, args.focus);
    if (!hit) {
      console.error(`Unknown focus case: ${args.focus}`);
      process.exit(1);
    }
    await launchBrowser(async (page) => {
      await page.goto(baseUrl).catch(() => {});
      await runLegacySteps(page, baseUrl, accounts, { title: hit.case.id }, [
        { instruction: hit.case.instruction, observe: hit.case.observe, auto: hit.case.auto },
      ]);
    });
    return;
  }

  if (args.section && focus) {
    const resolved = resolveFocusSection(focus, args.section);
    if (!resolved?.steps?.length) {
      console.error(`Unknown section: ${args.section}`);
      process.exit(1);
    }
    await launchBrowser(async (page) => {
      await page.goto(baseUrl).catch(() => {});
      await runLegacySteps(page, baseUrl, accounts, { title: resolved.title }, resolved.steps);
    });
    return;
  }

  if (args.uc && config?.flows?.[args.uc]) {
    const meta = config.useCases.find((u) => u.id === args.uc);
    await launchBrowser(async (page) => {
      await page.goto(baseUrl).catch(() => {});
      await runLegacySteps(page, baseUrl, accounts, meta, config.flows[args.uc]);
    });
    return;
  }

  console.error('Use --playbook internships-full-cycle (recommended E2E)\n');
  printHelp();
  process.exit(1);
}

main();
