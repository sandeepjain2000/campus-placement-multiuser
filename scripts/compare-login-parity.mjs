import fs from 'fs';
import path from 'path';

const root = process.cwd();
const origPath = path.resolve(root, '../migration-compare/original/src/app/login/page.js');
const curPath = path.resolve(root, 'src/app/login/page.js');
const orig = fs.readFileSync(origPath, 'utf8');
const cur = fs.readFileSync(curPath, 'utf8');

function collect(re, s) {
  return [...new Set([...(s.match(re) || [])])].sort();
}

function miss(a, b) {
  return a.filter((x) => !b.includes(x));
}

const O = {
  ids: collect(/id=["'][^"']+["']/g, orig),
  htmlFor: collect(/htmlFor=["'][^"']+["']/g, orig),
  names: collect(/\bname=["'][^"']+["']/g, orig),
  apis: collect(/\/api\/[A-Za-z0-9_/-]+/g, orig),
  hrefs: collect(/href=["'][^"']+["']/g, orig),
};
const C = {
  ids: collect(/id=["'][^"']+["']/g, cur),
  htmlFor: collect(/htmlFor=["'][^"']+["']/g, cur),
  names: collect(/\bname=["'][^"']+["']/g, cur),
  apis: collect(/\/api\/[A-Za-z0-9_/-]+/g, cur),
  hrefs: collect(/href=["'][^"']+["']/g, cur),
};

const report = [];
report.push('## Login parity: origin/main vs working tree\n');
report.push(`orig bytes=${orig.length} lines≈${orig.split(/\n/).length}`);
report.push(`cur  bytes=${cur.length} lines≈${cur.split(/\n/).length}\n`);

for (const key of Object.keys(O)) {
  const missing = miss(O[key], C[key]);
  const added = miss(C[key], O[key]);
  report.push(`### ${key}`);
  report.push(`missing in current: ${missing.length ? missing.join(', ') : '(none)'}`);
  report.push(`added in current: ${added.length ? added.join(', ') : '(none)'}\n`);
}

const keys = [
  'login-email',
  'login-password',
  'login-submit',
  'login-form',
  'view-credentials-btn',
  'login-debug-toggle',
  'LoginCaptchaField',
  'LoginSupportContact',
  'DocumentationHelpWidget',
  'DevScreenTag',
  'signIn',
  'signOut',
  'guidedAutoLogin',
  'forceLogin',
  'DEMO_SEED_PASSWORD',
  'readLoginFormValues',
  'writeLoginFormValues',
  'markBrowserSessionActive',
  'consumeLoginPrefillEmail',
  'fillCredential',
  'submitCredentials',
  'forgot-password',
  'demo-accounts',
  '/register',
  '/help',
  'registeredBanner',
  'debugMode',
  'captchaToken',
  'showPassword',
  'showCredentials',
  'emailReadOnly',
  'passwordReadOnly',
  'SEED_ED_EMPLOYER',
  'SEEDED_EMPLOYER_CREDENTIALS',
  'getDashboardPath',
  'isDemoLoginsEnabled',
  'DEMO_LOGINS',
  '/api/guided-runner/sign-in',
  'auth/continue',
  'SESSION_BROWSER_MARKER_KEY',
  'loggingInRef',
  'userChoseCredentials',
  'urlPrefillApplied',
  'placementhub_login_source',
];

report.push('### Feature / string presence');
for (const k of keys) {
  const o = orig.includes(k);
  const c = cur.includes(k);
  if (o !== c) report.push(`DIFF ${k}: orig=${o} cur=${c}`);
}
const same = keys.filter((k) => orig.includes(k) === cur.includes(k));
report.push(`unchanged markers: ${same.length}/${keys.length}\n`);

// Logic blocks roughly by searching distinctive comments / phrases
const phrases = [
  'Guided playbook',
  'Verification is still loading',
  'Credentials auto-filled',
  'Enable login debug',
  'View all system accounts',
  'Help documentation',
  'Request an account',
  'Students are added by their college',
  'Back to landing page',
  'Welcome back',
  'Demo accounts',
  'FAQ search',
  'Signing in…',
  'Loading verification…',
  'Sign In',
];
report.push('### User-visible phrases');
for (const p of phrases) {
  const o = orig.includes(p);
  const c = cur.includes(p);
  if (o !== c) report.push(`DIFF phrase "${p}": orig=${o} cur=${c}`);
}

fs.writeFileSync(
  path.resolve(root, '../migration-compare/diff-notes/login-parity.txt'),
  report.join('\n')
);
console.log(report.join('\n'));
