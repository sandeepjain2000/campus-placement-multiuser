/**
 * Guided manual testing — SQLite on your laptop only.
 * DB: db/sqlite/guided_testing.sqlite (gitignored)
 *
 * Playwright + Next.js dev server share this file — WAL + busy_timeout + retries.
 */

import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

const SCHEMA_PATH = path.join(process.cwd(), 'db', 'sqlite', 'guided_testing.schema.sql');

export const GUIDED_TESTING_DB_PATH =
  process.env.GUIDED_TESTING_SQLITE_PATH || path.join(process.cwd(), 'db', 'sqlite', 'guided_testing.sqlite');

const MAX_BUSY_RETRIES = 12;
const BUSY_BASE_DELAY_MS = 30;

/** @type {DatabaseSync | null} */
let db = null;

function sleepMs(ms) {
  const sab = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(sab), 0, 0, ms);
}

function isDbLockedError(err) {
  if (!err) return false;
  if (err.errcode === 5) return true;
  return /database is locked/i.test(String(err.message || ''));
}

function configureDb(database) {
  database.exec('PRAGMA journal_mode=WAL');
  database.exec('PRAGMA synchronous=NORMAL');
  database.exec('PRAGMA busy_timeout=8000');
}

function getDb() {
  if (db) return db;
  fs.mkdirSync(path.dirname(GUIDED_TESTING_DB_PATH), { recursive: true });
  db = new DatabaseSync(GUIDED_TESTING_DB_PATH);
  configureDb(db);
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);
  configureDb(db);
  return db;
}

function runWithRetry(label, fn) {
  let lastErr;
  for (let attempt = 0; attempt < MAX_BUSY_RETRIES; attempt += 1) {
    try {
      return fn();
    } catch (err) {
      if (!isDbLockedError(err)) throw err;
      lastErr = err;
      sleepMs(BUSY_BASE_DELAY_MS * (attempt + 1));
    }
  }
  const wrapped = new Error(`${label}: database is locked after ${MAX_BUSY_RETRIES} retries`);
  wrapped.cause = lastErr;
  throw wrapped;
}

function withWriteTransaction(fn) {
  return runWithRetry('guided sqlite write', () => {
    const database = getDb();
    database.exec('BEGIN IMMEDIATE');
    try {
      const result = fn(database);
      database.exec('COMMIT');
      return result;
    } catch (err) {
      try {
        database.exec('ROLLBACK');
      } catch {
        /* ignore rollback errors */
      }
      throw err;
    }
  });
}

function rowToStepState(row) {
  if (!row) return null;
  return {
    stepIndex: row.step_index,
    stepTotal: row.step_total,
    stepLabel: row.step_label,
    phase: row.phase,
    observe: row.observe,
    waitGen: row.wait_gen,
    armed: !!row.armed,
    running: !!row.running,
    clickAck: row.click_ack,
    updatedAt: row.updated_at,
  };
}

function rowToSession(row) {
  if (!row) return null;
  return {
    active: !!row.active,
    playbookId: row.playbook_id,
    marker: row.marker,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
  };
}

function appendGuidedLogTx(database, { event, detail = null, stepIndex = null, stepTotal = null, playbookId = null, marker = null }) {
  const session = database.prepare('SELECT playbook_id, marker FROM guided_session WHERE id = 1').get();
  database
    .prepare(
      `INSERT INTO guided_step_log (marker, playbook_id, step_index, step_total, event, detail)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      marker ?? session?.marker ?? null,
      playbookId ?? session?.playbook_id ?? null,
      stepIndex,
      stepTotal,
      event,
      detail,
    );
}

export function appendGuidedLog(payload) {
  return withWriteTransaction((database) => appendGuidedLogTx(database, payload));
}

export function startGuidedSession({ playbookId, marker }) {
  return withWriteTransaction((database) => {
    const now = new Date().toISOString();
    database
      .prepare(
        `UPDATE guided_session SET
           active = 1,
           playbook_id = ?,
           marker = ?,
           started_at = ?,
           updated_at = ?
         WHERE id = 1`,
      )
      .run(playbookId || null, marker || null, now, now);
    appendGuidedLogTx(database, { event: 'session_start', detail: playbookId || 'playbook', marker, playbookId });
  });
}

export function endGuidedSession() {
  return withWriteTransaction((database) => {
    appendGuidedLogTx(database, { event: 'session_end' });
    database.prepare(`UPDATE guided_session SET active = 0, updated_at = datetime('now') WHERE id = 1`).run();
    database
      .prepare(
        `UPDATE guided_step_state SET
           step_index = NULL, step_total = NULL, step_label = NULL, phase = NULL, observe = NULL,
           wait_gen = 0, armed = 0, running = 0, click_ack = NULL,
           updated_at = datetime('now')
         WHERE id = 1`,
      )
      .run();
  });
}

export function getGuidedMarker() {
  return runWithRetry('guided sqlite read', () => {
    const row = getDb().prepare('SELECT marker FROM guided_session WHERE id = 1').get();
    return row?.marker || null;
  });
}

export function setGuidedMarker(marker) {
  return withWriteTransaction((database) => {
    database
      .prepare(`UPDATE guided_session SET marker = ?, updated_at = datetime('now') WHERE id = 1`)
      .run(marker);
  });
}

export function getGuidedState() {
  return runWithRetry('guided sqlite read', () => {
    const database = getDb();
    const session = rowToSession(database.prepare('SELECT * FROM guided_session WHERE id = 1').get());
    const step = rowToStepState(database.prepare('SELECT * FROM guided_step_state WHERE id = 1').get());
    return { session, step, dbPath: GUIDED_TESTING_DB_PATH };
  });
}

function setGuidedStepStateTx(database, patch) {
  const current = database.prepare('SELECT * FROM guided_step_state WHERE id = 1').get();
  const next = {
    step_index: patch.stepIndex !== undefined ? patch.stepIndex : current?.step_index,
    step_total: patch.stepTotal !== undefined ? patch.stepTotal : current?.step_total,
    step_label: patch.stepLabel !== undefined ? patch.stepLabel : current?.step_label,
    phase: patch.phase !== undefined ? patch.phase : current?.phase,
    observe: patch.observe !== undefined ? patch.observe : current?.observe,
    wait_gen: patch.waitGen !== undefined ? patch.waitGen : current?.wait_gen ?? 0,
    armed: patch.armed !== undefined ? (patch.armed ? 1 : 0) : current?.armed ?? 0,
    running: patch.running !== undefined ? (patch.running ? 1 : 0) : current?.running ?? 0,
    click_ack: patch.clickAck !== undefined ? patch.clickAck : current?.click_ack,
  };
  database
    .prepare(
      `UPDATE guided_step_state SET
         step_index = ?, step_total = ?, step_label = ?, phase = ?, observe = ?,
         wait_gen = ?, armed = ?, running = ?, click_ack = ?,
         updated_at = datetime('now')
       WHERE id = 1`,
    )
    .run(
      next.step_index,
      next.step_total,
      next.step_label,
      next.phase,
      next.observe,
      next.wait_gen,
      next.armed,
      next.running,
      next.click_ack,
    );
  return rowToStepState(database.prepare('SELECT * FROM guided_step_state WHERE id = 1').get());
}

export function setGuidedStepState(patch) {
  return withWriteTransaction((database) => setGuidedStepStateTx(database, patch));
}

export function clearGuidedStepState() {
  return setGuidedStepState({
    stepIndex: null,
    stepTotal: null,
    stepLabel: null,
    phase: null,
    observe: null,
    waitGen: 0,
    armed: false,
    running: false,
    clickAck: null,
  });
}

export function armGuidedStep({ stepIndex, stepTotal, stepLabel, phase, observe, waitGen }) {
  return withWriteTransaction((database) => {
    setGuidedStepStateTx(database, {
      stepIndex,
      stepTotal,
      stepLabel,
      phase,
      observe,
      waitGen,
      armed: true,
      running: false,
      clickAck: null,
    });
    appendGuidedLogTx(database, {
      event: 'armed',
      detail: stepLabel || null,
      stepIndex,
      stepTotal,
    });
  });
}

export function setGuidedRunning(patch) {
  return withWriteTransaction((database) => {
    setGuidedStepStateTx(database, { ...patch, armed: false, running: true, clickAck: null });
    appendGuidedLogTx(database, {
      event: 'running',
      detail: patch.stepLabel || null,
      stepIndex: patch.stepIndex,
      stepTotal: patch.stepTotal,
    });
  });
}

export function setGuidedIdle(patch) {
  return withWriteTransaction((database) => {
    setGuidedStepStateTx(database, { ...patch, armed: false, running: false });
    appendGuidedLogTx(database, {
      event: 'idle',
      stepIndex: patch.stepIndex,
      stepTotal: patch.stepTotal,
    });
  });
}

/** User clicked screen tag — returns false if not armed. Idempotent if already acked this gen. */
export function acknowledgeGuidedClickInDb() {
  return withWriteTransaction((database) => {
    const row = database.prepare('SELECT * FROM guided_step_state WHERE id = 1').get();
    if (row?.wait_gen && row.click_ack === row.wait_gen) {
      return { ok: true, waitGen: row.wait_gen, alreadyAcked: true };
    }
    if (!row?.armed || row.running || !row.wait_gen) {
      return {
        ok: false,
        waitGen: row?.wait_gen ?? 0,
        reason: row?.running ? 'running' : !row?.armed ? 'not_armed' : 'no_wait_gen',
      };
    }
    setGuidedStepStateTx(database, {
      clickAck: row.wait_gen,
      armed: false,
    });
    appendGuidedLogTx(database, {
      event: 'clicked',
      detail: row.step_label,
      stepIndex: row.step_index,
      stepTotal: row.step_total,
    });
    return { ok: true, waitGen: row.wait_gen };
  });
}

export function pollGuidedClickAck(expectedGen) {
  return runWithRetry('guided sqlite read', () => {
    const row = getDb().prepare('SELECT click_ack FROM guided_step_state WHERE id = 1').get();
    return row?.click_ack === expectedGen;
  });
}

export function getRecentGuidedLogs(limit = 30) {
  return runWithRetry('guided sqlite read', () =>
    getDb()
      .prepare(
        `SELECT id, marker, playbook_id, step_index, step_total, event, detail, created_at
         FROM guided_step_log ORDER BY id DESC LIMIT ?`,
      )
      .all(limit),
  );
}
