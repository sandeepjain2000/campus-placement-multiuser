import {
  findUserByEmail,
  formatEmailDifferentTenantMessage,
  formatEmailInUseMessage,
  normalizeUserEmail,
} from '@/lib/userEmail';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';

/**
 * Load active student profile row for a tenant + roll number.
 * @param {import('pg').PoolClient | { query: Function }} client
 */
export async function findStudentProfileByRoll(client, tenantId, rollNumber) {
  const roll = String(rollNumber || '').trim();
  if (!roll || !tenantId) return null;

  const baseSql = `
    SELECT
      sp.id AS profile_id,
      sp.user_id,
      sp.roll_number,
      sp.batch_year,
      sp.graduation_year,
      u.email,
      u.role,
      u.is_active,
      u.is_verified,
      u.email_verified_at
    FROM student_profiles sp
    JOIN users u ON u.id = sp.user_id
    WHERE sp.tenant_id = $1::uuid
      AND LOWER(TRIM(sp.roll_number)) = LOWER(TRIM($2))`;

  try {
    const res = await client.query(
      `${baseSql} AND ${SP_ACTIVE_CLAUSE} LIMIT 1`,
      [tenantId, roll],
    );
    return res.rows[0] || null;
  } catch (e) {
    if (e?.code === '42703' && String(e?.message || '').includes('archived_at')) {
      const res = await client.query(`${baseSql} LIMIT 1`, [tenantId, roll]);
      return res.rows[0] || null;
    }
    throw e;
  }
}

export function formatRollInUseMessage(row, { rollNumber, email } = {}) {
  const roll = rollNumber || row?.roll_number || 'this roll number';
  const linked = row?.email ? ` (${row.email})` : '';
  return `Roll number "${roll}" is already registered${linked}. Use the existing account or contact your placement office.`;
}

export function formatAccountAlreadyRegisteredMessage({ email, rollNumber } = {}) {
  const addr = email || 'This email';
  const roll = rollNumber ? ` and roll number "${rollNumber}"` : '';
  return `${addr}${roll} already has an active PlacementHub account (including demo or seeded users). Sign in instead of registering again.`;
}

/**
 * Validates student self-registration against global users + tenant roll records.
 * @returns {{ profileId: string, userId: string, batchYear: number, graduationYear: number }}
 */
export async function assertStudentSelfRegistrationAllowed(client, {
  email,
  rollNumber,
  tenantId,
  batchYear,
}) {
  const normalizedEmail = normalizeUserEmail(email);
  const roll = String(rollNumber || '').trim();
  const batchY = parseInt(String(batchYear ?? ''), 10);

  if (!normalizedEmail) {
    const err = new Error('INVALID_EMAIL');
    throw err;
  }
  if (!roll) {
    const err = new Error('MISSING_ROLL');
    throw err;
  }
  if (!Number.isFinite(batchY)) {
    const err = new Error('INVALID_BATCH_YEAR');
    throw err;
  }

  const profileRow = await findStudentProfileByRoll(client, tenantId, roll);
  if (!profileRow) {
    const err = new Error('ROLL_NOT_FOUND');
    throw err;
  }

  const emailOwner = await findUserByEmail(client, normalizedEmail);
  if (emailOwner && String(emailOwner.id) !== String(profileRow.user_id)) {
    const err = new Error('EMAIL_EXISTS');
    err.existing = emailOwner;
    throw err;
  }

  const profileEmail = normalizeUserEmail(profileRow.email);
  if (profileEmail !== normalizedEmail) {
    const err = new Error('EMAIL_MISMATCH');
    err.linkedEmail = profileRow.email;
    throw err;
  }

  const alreadyLive =
    profileRow.role === 'student' &&
    profileRow.is_active &&
    (profileRow.email_verified_at != null || profileRow.is_verified === true);

  if (alreadyLive) {
    const err = new Error('ACCOUNT_ALREADY_REGISTERED');
    err.roll_number = profileRow.roll_number;
    throw err;
  }

  if (profileRow.batch_year != null && Number(profileRow.batch_year) !== batchY) {
    const err = new Error('BATCH_YEAR_MISMATCH');
    err.existingBatchYear = profileRow.batch_year;
    throw err;
  }

  const graduationYear = batchY + 4;

  return {
    profileId: profileRow.profile_id,
    userId: profileRow.user_id,
    batchYear: batchY,
    graduationYear,
  };
}

export function mapStudentRegistrationError(error, { email, rollNumber } = {}) {
  if (error.message === 'EMAIL_EXISTS') {
    return formatEmailInUseMessage(error.existing, { email });
  }
  if (error.message === 'EMAIL_DIFFERENT_TENANT') {
    return formatEmailDifferentTenantMessage(email);
  }
  if (error.message === 'EMAIL_MISMATCH') {
    const linked = error.linkedEmail ? ` (${error.linkedEmail})` : '';
    return `This roll number is already linked to a different email address${linked}. Use the email on file with your college or contact the placement office.`;
  }
  if (error.message === 'ROLL_NOT_FOUND') {
    return 'Roll number not found in college records. Please verify with your college administrator.';
  }
  if (error.message === 'ACCOUNT_ALREADY_REGISTERED') {
    return formatAccountAlreadyRegisteredMessage({ email, rollNumber: error.roll_number || rollNumber });
  }
  if (error.message === 'BATCH_YEAR_MISMATCH') {
    return `Batch year does not match college records for this roll number (expected ${error.existingBatchYear}).`;
  }
  if (error.message === 'INVALID_CAMPUS_KEY') {
    return 'Campus enrollment key was not recognized. Check with your institution.';
  }
  if (error.message === 'MISSING_ROLL') {
    return 'Roll number is required.';
  }
  return null;
}
