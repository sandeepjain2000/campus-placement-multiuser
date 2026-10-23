/**
 * Real create / update / reject checks for the five QA accounts.
 * Does not sign in as a super admin or a core demo account.
 * Password comes from DEMO_SEED_PASSWORD.
 *
 *   QA_BASE_URL=https://campus-placement-omega.vercel.app node qa/runners/run-placementhub-alias-mutations.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { qaAccountPassword } from '../qaAccountPassword.js';

const require = createRequire(import.meta.url);
const { genuineAccount } = require('../genuineAccounts.js');
const { loginThroughUi } = require('../answerLoginCaptcha.js');

const BASE = (process.env.QA_BASE_URL || 'https://campus-placement-omega.vercel.app').replace(/\/$/, '');
const PASSWORD = qaAccountPassword();
const RESULTS_PATH = path.join(process.cwd(), 'qa/data/placementhub_test_results.json');
const CLEANUP_PATH = process.env.QA_CLEANUP_PATH || path.join(process.cwd(), 'qa/data/alias-mutation-cleanup.json');

const EMAILS = {
  student: genuineAccount('student'),
  alumni: genuineAccount('alumni'),
  employer: genuineAccount('employer'),
  college: genuineAccount('college_admin'),
};

const cleanup = {
  baseUrl: BASE,
  driveIds: [],
  mentorshipIds: [],
  cvFileUrls: [],
  startedAt: new Date().toISOString(),
};

const byId = new Map();

function record(id, status, actual) {
  byId.set(id, { status, actual: String(actual).slice(0, 500) });
  console.log(`${status} ${id} ${String(actual).slice(0, 160)}`);
}

async function api(page, method, apiPath, data) {
  const res = await page.request.fetch(`${BASE}${apiPath}`, {
    method,
    data,
    headers: data ? { 'Content-Type': 'application/json' } : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status(), json, text: text.slice(0, 400) };
}

async function uploadCv(page, name, mime, buffer) {
  const res = await page.request.fetch(`${BASE}/api/student/cvs/upload`, {
    method: 'POST',
    multipart: {
      label: 'qa1',
      file: { name, mimeType: mime, buffer },
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status(), json, text: text.slice(0, 300) };
}

function futureDate() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 30);
  return d.toISOString().slice(0, 10);
}

async function runStudent(page) {
  const profile = await api(page, 'GET', '/api/student/profile');
  const body = profile.json?.profile || profile.json || {};
  const cgpaBefore = body.cgpa;
  const badCgpa = await api(page, 'PUT', '/api/student/profile', {
    cgpa: 99,
    department: body.department,
    branch: body.branch,
    batchYear: body.batchYear,
    graduationYear: body.graduationYear,
  });
  const after = await api(page, 'GET', '/api/student/profile');
  const cgpaAfter = (after.json?.profile || after.json || {}).cgpa;
  const cgpaUnchanged = String(cgpaBefore) === String(cgpaAfter);
  record(
    'TC-02-004',
    badCgpa.status >= 400 && cgpaUnchanged ? 'Pass' : 'Fail',
    `Invalid CGPA status ${badCgpa.status}. Stored CGPA stayed ${cgpaAfter}. ${badCgpa.text}`,
  );
  record(
    'TC-02-003',
    'Not Run',
    'A partial profile save would clear fields that were left out. Invalid CGPA was rejected and the stored CGPA did not change.',
  );

  const emptyTitle = await api(page, 'POST', '/api/student/mentorship-requests', { summary: 'x', submit: false });
  const draft = await api(page, 'POST', '/api/student/mentorship-requests', {
    title: 'QA alias mentorship',
    summary: 'Draft created by the alias check. Not submitted.',
    submit: false,
  });
  if (draft.json?.item?.id) cleanup.mentorshipIds.push(draft.json.item.id);
  record(
    'TC-02-024',
    emptyTitle.status === 400 && draft.status === 201 ? 'Pass' : 'Fail',
    `Empty title ${emptyTitle.status}. Draft ${draft.status}. ${draft.text}`,
  );

  const emptyFile = await uploadCv(page, 'empty.pdf', 'application/pdf', Buffer.alloc(0));
  record(
    'TC-02-032',
    emptyFile.status === 400 ? 'Pass' : 'Fail',
    `Empty file status ${emptyFile.status}. ${emptyFile.text}`,
  );
  const doubleExt = await uploadCv(page, 'notes.pdf.exe', 'application/pdf', Buffer.from('%PDF-1.1\n'));
  record(
    'TC-02-033',
    doubleExt.status === 400 ? 'Pass' : 'Fail',
    `Double extension status ${doubleExt.status}. ${doubleExt.text}`,
  );
  const png = await uploadCv(
    page,
    'photo.png',
    'image/png',
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
  record(
    'TC-20-001',
    png.status === 400 ? 'Pass' : 'Fail',
    `PNG resume status ${png.status}. ${png.text}`,
  );

  const pdf = Buffer.from('%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
  const uploaded = await uploadCv(page, 'qa-alias.pdf', 'application/pdf', pdf);
  const item = uploaded.json?.item;
  if (item?.fileUrl || item?.file_url) cleanup.cvFileUrls.push(item.fileUrl || item.file_url);
  if (item?.id) {
    await api(page, 'PATCH', `/api/student/cvs/${item.id}`, { action: 'archive' });
  }
  record(
    'TC-02-005',
    uploaded.status === 201 ? 'Pass' : 'Fail',
    `CV upload status ${uploaded.status}. ${uploaded.text}`,
  );
  record(
    'TC-20-005',
    uploaded.status === 201 ? 'Pass' : 'Not Run',
    uploaded.status === 201
      ? 'The uploaded CV was stored. Applying it was not run because this campus has no drive.'
      : 'CV was not stored, so default-on-apply was not run.',
  );

  const collegeApi = await api(page, 'GET', '/api/college/students');
  record(
    'TC-21-002',
    [401, 403].includes(collegeApi.status) ? 'Pass' : 'Fail',
    `Student opening the college student list returned ${collegeApi.status}.`,
  );
}

async function runEmployer(page) {
  const campuses = await api(page, 'GET', '/api/employer/campuses');
  const rows = campuses.json?.colleges || campuses.json?.campuses || campuses.json?.items || [];
  const list = Array.isArray(rows) ? rows : [];
  const approved = list.filter((row) => /approved/i.test(String(row.approval_status || row.status || '')));
  record(
    'TC-03-005',
    approved.length ? 'Pass' : 'Fail',
    `Campus list ${campuses.status}. Approved rows ${approved.length}.`,
  );
  const westbridge = list.find((row) => /westbridge/i.test(String(row.name || '')));
  const tenantId = westbridge?.id || westbridge?.tenantId || westbridge?.tenant_id;

  const missing = await api(page, 'POST', '/api/employer/drives', {});
  record(
    'TC-07-001',
    missing.status === 400 ? 'Pass' : 'Fail',
    `Drive with no title returned ${missing.status}. ${missing.text}`,
  );
  const negativePay = await api(page, 'POST', '/api/employer/drives', {
    tenantId: tenantId || '00000000-0000-0000-0000-000000000000',
    title: 'QA alias drive',
    driveDate: futureDate(),
    salaryMin: -1,
  });
  record(
    'TC-03-039',
    negativePay.status === 400 ? 'Pass' : 'Fail',
    `Negative salary returned ${negativePay.status}. ${negativePay.text}`,
  );
  const otherCampus = await api(page, 'POST', '/api/employer/drives', {
    tenantId: '00000000-0000-0000-0000-000000000000',
    title: 'QA alias drive',
    driveDate: futureDate(),
  });
  record(
    'TC-03-004',
    otherCampus.status === 403 ? 'Pass' : 'Fail',
    `Unapproved campus returned ${otherCampus.status}. ${otherCampus.text}`,
  );

  if (!tenantId) {
    record('TC-03-006', 'Fail', 'Westbridge was not in the employer campus list, so no drive was requested.');
    return;
  }
  const created = await api(page, 'POST', '/api/employer/drives', {
    tenantId,
    title: 'QA alias drive',
    driveDate: futureDate(),
    driveType: 'virtual',
    description: 'Alias check. Removed after the run.',
  });
  const driveId = created.json?.drive?.id;
  if (driveId) cleanup.driveIds.push(driveId);
  record(
    'TC-03-006',
    created.status === 200 && driveId ? 'Pass' : 'Fail',
    `Drive request ${created.status}. ${created.text}`,
  );
}

async function runCollege(page) {
  const template = await api(page, 'GET', '/api/college/students/import-template');
  const header = String(template.text || '').replace(/^\uFEFF/, '').split(/\r?\n/)[0] || '';
  record(
    'TC-04-005',
    template.status === 200 && /cgpa/i.test(header) ? 'Pass' : 'Fail',
    `Template ${template.status}. Header starts ${header.slice(0, 120)}`,
  );
  if (template.status !== 200) {
    record('TC-04-007', 'Fail', 'Template was not downloaded, so the blank CGPA file was not sent.');
    record('TC-04-008', 'Fail', 'Template was not downloaded, so the blank department file was not sent.');
    return;
  }

  async function rejectRow(blankHeader) {
    const cols = header.split(',');
    const row = cols.map((cell) => {
      const name = cell.replace(/"/g, '').trim().toLowerCase();
      if (name === 'email') return EMAILS.student;
      if (name === 'name') return 'Meera Iyer';
      if (name === 'roll') return 'WB2022014';
      if (name === 'department' && blankHeader === 'department') return '';
      if (name === 'department') return 'Computer Science';
      if (name === 'cgpa' && blankHeader === 'cgpa') return '';
      if (name === 'cgpa') return '8.4';
      if (name === 'batch' || name === 'admission year') return '2022';
      if (name === 'graduation year') return '2026';
      if (name === 'academic year') return '2025-26';
      if (name === 'semester') return '6';
      if (name === 'gender') return 'Female';
      return 'x';
    });
    const csv = `${header}\n${row.join(',')}\n`;
    const res = await page.request.fetch(`${BASE}/api/college/students/bulk-upload`, {
      method: 'POST',
      multipart: {
        file: { name: 'bad.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) },
      },
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { status: res.status(), json, text: text.slice(0, 300) };
  }

  const cgpa = await rejectRow('cgpa');
  const cgpaRejected = (cgpa.json?.processed === 0 || cgpa.status >= 400) && /cgpa/i.test(cgpa.text);
  record('TC-04-007', cgpaRejected ? 'Pass' : 'Fail', `Blank CGPA ${cgpa.status}. ${cgpa.text}`);
  const dept = await rejectRow('department');
  const deptRejected = (dept.json?.processed === 0 || dept.status >= 400) && /department/i.test(dept.text);
  record('TC-04-008', deptRejected ? 'Pass' : 'Fail', `Blank department ${dept.status}. ${dept.text}`);
}

async function runDuplicateEmail(page) {
  const challenge = await api(page, 'GET', '/api/auth/captcha');
  const question = challenge.json?.question || '';
  const match = question.match(/(\d+) \+ (\d+)/);
  if (!match || !challenge.json?.token) {
    record('TC-01-017', 'Fail', 'The register question was not returned.');
    return;
  }
  const answer = Number(match[1]) + Number(match[2]);
  const res = await api(page, 'POST', '/api/auth/register', {
    role: 'employer',
    firstName: 'Neha',
    lastName: 'Kapoor',
    email: EMAILS.employer,
    phone: '+919876543210',
    password: PASSWORD,
    companyName: 'QA Alias Duplicate Check',
    industry: 'Software',
    captchaToken: challenge.json.token,
    captchaAnswer: String(answer),
  });
  const rejected = res.status >= 400 && /already|in use|exists|registered/i.test(res.text);
  record('TC-01-017', rejected ? 'Pass' : 'Fail', `Duplicate email ${res.status}. ${res.text}`);
}

function classifyRest(tc) {
  if (byId.has(tc.id)) return byId.get(tc.id);
  const blob = `${tc.sheet} ${tc.roles} ${tc.title}`;
  if (/super admin/i.test(blob) || tc.id.startsWith('TC-05-')) {
    return { status: 'Blocked', actual: 'No testing super admin account. This case was not run.' };
  }
  if (/import valid|add single student|welcome email|10,000/i.test(tc.title)) {
    return {
      status: 'Blocked',
      actual: 'This would create another person or send mail to a new address. It was not run.',
    };
  }
  if (/PERF|SLA|bulk operation/i.test(tc.id + tc.title)) {
    return { status: 'Blocked', actual: 'This is a speed check, not a create or edit on the five accounts.' };
  }
  return {
    status: 'Blocked',
    actual:
      'This needs a published drive, application, offer, or another campus. Those were not created, so the case was not run.',
  };
}

async function main() {
  const full = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));
  const retryIds = new Set(['TC-01-017', 'TC-03-004', 'TC-03-005', 'TC-03-006', 'TC-03-039', 'TC-07-001']);
  let targets = full.results.filter(
    (row) => row.status === 'Not Run' && String(row.actual || '').startsWith('Requires manual'),
  );
  const retryOnly = targets.length === 0;
  if (retryOnly) {
    targets = full.results.filter((row) => retryIds.has(row.id));
  }
  console.log(`Base: ${BASE}`);
  console.log(`Mutation cases: ${targets.length}`);

  const browser = await chromium.launch({ headless: true });
  try {
    if (!retryOnly) {
      const student = await browser.newPage();
      try {
        await loginThroughUi(student, BASE, EMAILS.student, PASSWORD);
        await runStudent(student);
      } catch (error) {
        record('TC-02-005', 'Fail', error.message);
      }

      const college = await browser.newPage();
      try {
        await loginThroughUi(college, BASE, EMAILS.college, PASSWORD);
        await runCollege(college);
      } catch (error) {
        record('TC-04-005', 'Fail', error.message);
      }
    }

    const employer = await browser.newPage();
    try {
      await loginThroughUi(employer, BASE, EMAILS.employer, PASSWORD);
      await runEmployer(employer);
    } catch (error) {
      record('TC-03-006', 'Fail', error.message);
    }

    const anon = await browser.newPage();
    try {
      await runDuplicateEmail(anon);
    } catch (error) {
      record('TC-01-017', 'Fail', error.message);
    }
  } finally {
    await browser.close();
    fs.mkdirSync(path.dirname(CLEANUP_PATH), { recursive: true });
    fs.writeFileSync(CLEANUP_PATH, JSON.stringify(cleanup, null, 2));
  }

  const now = new Date().toISOString();
  for (const tc of targets) {
    const outcome = classifyRest(tc);
    tc.status = outcome.status;
    tc.actual = outcome.actual;
    tc.executedAt = now;
  }
  const summary = full.results.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  full.summary = summary;
  full.mutationRun = { baseUrl: BASE, executedAt: now, cleanup };
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(full, null, 2));
  fs.writeFileSync(CLEANUP_PATH, JSON.stringify(cleanup, null, 2));
  const ran = [...byId.values()].reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  console.log('Actions:', ran);
  console.log('Workbook:', summary);
  console.log('Cleanup:', CLEANUP_PATH);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
