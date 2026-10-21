/**
 * QA sign-in addresses. Never the 20 PlacementHub core accounts.
 * Set QA_STUDENT_EMAIL, QA_STUDENT_2_EMAIL, QA_STUDENT_3_EMAIL, QA_ALUMNI_EMAIL,
 * QA_EMPLOYER_EMAIL, QA_EMPLOYER_2_EMAIL, QA_EMPLOYER_3_EMAIL, QA_EMPLOYER_4_EMAIL,
 * QA_EMPLOYER_5_EMAIL, QA_COLLEGE_ADMIN_EMAIL, QA_COLLEGE_ADMIN_2_EMAIL,
 * QA_COLLEGE_ADMIN_3_EMAIL, QA_COMMITTEE_EMAIL through QA_COMMITTEE_7_EMAIL,
 * and QA_SUPER_ADMIN_EMAIL to genuine mailboxes before a run.
 */

const CORE_ACCOUNT_EMAILS = [
  'arjun.verma@iitm.edu',
  'sneha.rao@nitt.edu',
  'rohan.mehta@bits.edu',
  'priya.sharma.alumni@iitm.edu',
  'hr@techcorp.com',
  'hr@globalsoft.com',
  'hr@infosys.com',
  'talent@innoventlabs.ai',
  'careers@finedge.io',
  'admin@iitm.edu',
  'admin@nitt.edu',
  'admin@bits.edu',
  'committee@iitm.edu',
  'committee@nitt.edu',
  'committee@bits.edu',
  'committee.jadavpur@campus-placement.work',
  'committee.vit@campus-placement.work',
  'committee.dtu@campus-placement.work',
  'committee.iiith@campus-placement.work',
  'admin@placementhub.com',
];

const ENV_BY_ROLE = {
  student: 'QA_STUDENT_EMAIL',
  student2: 'QA_STUDENT_2_EMAIL',
  student3: 'QA_STUDENT_3_EMAIL',
  alumni: 'QA_ALUMNI_EMAIL',
  employer: 'QA_EMPLOYER_EMAIL',
  employer2: 'QA_EMPLOYER_2_EMAIL',
  employer3: 'QA_EMPLOYER_3_EMAIL',
  employer4: 'QA_EMPLOYER_4_EMAIL',
  employer5: 'QA_EMPLOYER_5_EMAIL',
  college_admin: 'QA_COLLEGE_ADMIN_EMAIL',
  college_admin2: 'QA_COLLEGE_ADMIN_2_EMAIL',
  college_admin3: 'QA_COLLEGE_ADMIN_3_EMAIL',
  committee: 'QA_COMMITTEE_EMAIL',
  committee2: 'QA_COMMITTEE_2_EMAIL',
  committee3: 'QA_COMMITTEE_3_EMAIL',
  committee4: 'QA_COMMITTEE_4_EMAIL',
  committee5: 'QA_COMMITTEE_5_EMAIL',
  committee6: 'QA_COMMITTEE_6_EMAIL',
  committee7: 'QA_COMMITTEE_7_EMAIL',
  super_admin: 'QA_SUPER_ADMIN_EMAIL',
};

const CORE = new Set(CORE_ACCOUNT_EMAILS);

function assertNotCoreAccount(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (CORE.has(normalized)) {
    throw new Error(
      'Refusing to use a PlacementHub core account in a test. Leave those accounts alone.',
    );
  }
  return normalized;
}

function genuineAccount(role) {
  const key = ENV_BY_ROLE[role];
  if (!key) {
    throw new Error(`Unknown genuine account role: ${role}`);
  }
  const email = String(process.env[key] || '').trim().toLowerCase();
  if (!email) {
    throw new Error(
      `${key} is not set. Testing uses a genuine account. Do not use a PlacementHub core account.`,
    );
  }
  if (CORE.has(email)) {
    throw new Error(`${key} is a PlacementHub core account. Leave those accounts alone.`);
  }
  return email;
}

module.exports = {
  CORE_ACCOUNT_EMAILS,
  assertNotCoreAccount,
  genuineAccount,
};
