import { encode } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { SEED_DEMO_STUDENT_USER_IDS } from '@/lib/seedDemoStudentIds';
import { JWT_SESSION_MAX_AGE_SECONDS } from '@/lib/sessionPolicy';
import { isUuid } from '@/lib/tenantContext';
import { getDashboardPath } from '@/lib/utils';

/** Roles Super Admin may proxy into. */
const ALLOWED_TARGET_ROLES = new Set(['college_admin', 'employer']);

/**
 * @param {import('next-auth').Session | Record<string, unknown> | null | undefined} sessionOrToken
 */
export function isImpersonating(sessionOrToken) {
  if (!sessionOrToken || typeof sessionOrToken !== 'object') return false;
  const fromUser = sessionOrToken.user && typeof sessionOrToken.user === 'object'
    ? sessionOrToken.user.impersonatorId
    : null;
  const id = fromUser ?? sessionOrToken.impersonatorId;
  return Boolean(id && String(id).trim());
}

/**
 * @param {import('next-auth').Session | null | undefined} session
 * @returns {string | null}
 */
export function getImpersonatorId(session) {
  const id = session?.user?.impersonatorId;
  return id != null && String(id).trim() !== '' ? String(id) : null;
}

export function impersonationForbiddenResponse(
  message = 'This action is not allowed while logged in as another account.',
) {
  return NextResponse.json({ error: message }, { status: 403 });
}

function authSecret() {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('Server auth secret is not configured.');
  }
  return secret || 'placementhub-dev-captcha';
}

/**
 * Map a DB user row (with tenant/employer joins) into session-shaped claims.
 * @param {Record<string, unknown>} user
 */
export function sessionClaimsFromUserRow(user) {
  let fallbackTenantName = user.tenant_name;
  if (!fallbackTenantName) {
    if (user.role === 'employer') {
      fallbackTenantName = 'Corporate Partner';
    } else if (user.role === 'college_admin' || user.role === 'placement_committee') {
      fallbackTenantName = user.role === 'placement_committee' ? 'Placement Committee' : 'College Admin';
    }
  }

  const brandLogoUrl =
    user.role === 'employer' ? user.employer_logo_url || null : user.tenant_logo_url || null;

  return {
    id: user.id,
    email: user.email,
    communication_email: user.communication_email || user.email,
    name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
    role: user.role,
    tenantId: user.tenant_id,
    tenantName: fallbackTenantName,
    tenantSlug: user.tenant_slug,
    avatar: user.avatar_url,
    brandLogoUrl,
    studentPlacementVerified:
      user.role === 'student'
        ? Boolean(user.student_placement_verified) || SEED_DEMO_STUDENT_USER_IDS.has(user.id)
        : undefined,
    isAlumni: user.role === 'student' ? Boolean(user.student_is_alumni) : undefined,
  };
}

/**
 * @param {string} userId
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function loadUserRowForSession(userId) {
  if (!isUuid(userId)) return null;
  const result = await query(
    `SELECT u.*, t.name as tenant_name, t.slug as tenant_slug, t.logo_url as tenant_logo_url,
            ep.logo_url AS employer_logo_url,
            sp.is_verified AS student_placement_verified,
            COALESCE(sp.is_alumni, false) AS student_is_alumni
     FROM users u
     LEFT JOIN tenants t ON u.tenant_id = t.id
     LEFT JOIN employer_profiles ep ON ep.user_id = u.id
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE u.id = $1::uuid
     LIMIT 1`,
    [userId],
  );
  return result.rows[0] || null;
}

/**
 * Oldest active college_admin for a college tenant.
 * @param {string} collegeTenantId
 */
export async function resolveCollegeAdminTarget(collegeTenantId) {
  if (!isUuid(collegeTenantId)) {
    return { ok: false, error: 'Invalid college id', status: 400 };
  }

  const tenantRes = await query(
    `SELECT id, name, type, is_active FROM tenants WHERE id = $1::uuid LIMIT 1`,
    [collegeTenantId],
  );
  const tenant = tenantRes.rows[0];
  if (!tenant || tenant.type !== 'college') {
    return { ok: false, error: 'College not found', status: 404 };
  }

  const adminRes = await query(
    `SELECT id
     FROM users
     WHERE tenant_id = $1::uuid
       AND role = 'college_admin'
       AND is_active = true
       AND email_verified_at IS NOT NULL
     ORDER BY created_at ASC
     LIMIT 1`,
    [collegeTenantId],
  );
  const adminId = adminRes.rows[0]?.id;
  if (!adminId) {
    return {
      ok: false,
      error: 'This college has no active college admin to log in as.',
      status: 404,
    };
  }

  const user = await loadUserRowForSession(adminId);
  if (!user || !ALLOWED_TARGET_ROLES.has(user.role)) {
    return { ok: false, error: 'Target account is not eligible for proxy login.', status: 403 };
  }

  return {
    ok: true,
    user,
    claims: sessionClaimsFromUserRow(user),
    entityType: 'college',
    entityId: collegeTenantId,
    entityName: tenant.name,
  };
}

/**
 * Linked employer user for an employer_profiles row.
 * @param {string} employerProfileId
 */
export async function resolveEmployerTarget(employerProfileId) {
  if (!isUuid(employerProfileId)) {
    return { ok: false, error: 'Invalid employer id', status: 400 };
  }

  const result = await query(
    `SELECT ep.id AS profile_id, ep.company_name, ep.user_id
     FROM employer_profiles ep
     WHERE ep.id = $1::uuid
     LIMIT 1`,
    [employerProfileId],
  );
  const row = result.rows[0];
  if (!row?.user_id) {
    return { ok: false, error: 'Employer not found', status: 404 };
  }

  const user = await loadUserRowForSession(row.user_id);
  if (!user) {
    return { ok: false, error: 'Employer account not found', status: 404 };
  }
  if (!user.is_active) {
    return { ok: false, error: 'This employer account is inactive.', status: 403 };
  }
  if (!user.email_verified_at) {
    return { ok: false, error: 'This employer account is not email-verified.', status: 403 };
  }
  if (user.role !== 'employer' || !ALLOWED_TARGET_ROLES.has(user.role)) {
    return { ok: false, error: 'Target account is not eligible for proxy login.', status: 403 };
  }

  return {
    ok: true,
    user,
    claims: sessionClaimsFromUserRow(user),
    entityType: 'employer',
    entityId: row.profile_id,
    entityName: row.company_name,
  };
}

/**
 * @param {{ type: string, id: string }} input
 */
export async function resolveImpersonationTarget(input) {
  const type = String(input?.type || '').trim().toLowerCase();
  const id = String(input?.id || '').trim();
  if (type === 'college') return resolveCollegeAdminTarget(id);
  if (type === 'employer') return resolveEmployerTarget(id);
  return { ok: false, error: 'type must be college or employer', status: 400 };
}

/**
 * Encode a NextAuth-compatible JWT for the given session claims.
 * @param {ReturnType<typeof sessionClaimsFromUserRow>} claims
 * @param {{ impersonatorId?: string | null, impersonatorEmail?: string | null, impersonationStartedAt?: string | null }} [proxy]
 */
export async function encodeSessionToken(claims, proxy = {}) {
  const impersonatorId = proxy.impersonatorId ? String(proxy.impersonatorId) : null;
  const token = {
    sub: claims.id,
    id: claims.id,
    email: claims.email,
    communication_email: claims.communication_email || claims.email,
    name: claims.name,
    role: claims.role,
    tenantId: claims.tenantId,
    tenantName: claims.tenantName,
    tenantSlug: claims.tenantSlug,
    avatar: claims.avatar,
    logoUrl: claims.avatar,
    brandLogoUrl: claims.brandLogoUrl ?? null,
    studentPlacementVerified: claims.studentPlacementVerified,
    isAlumni: claims.isAlumni,
    impersonatorId: impersonatorId || undefined,
    impersonatorEmail: impersonatorId ? (proxy.impersonatorEmail || null) : undefined,
    impersonationStartedAt: impersonatorId
      ? (proxy.impersonationStartedAt || new Date().toISOString())
      : undefined,
  };

  return encode({
    token,
    secret: authSecret(),
    maxAge: JWT_SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * @param {ReturnType<typeof sessionClaimsFromUserRow>} claims
 * @param {{ impersonatorId?: string | null, impersonatorEmail?: string | null, impersonationStartedAt?: string | null }} [proxy]
 */
export function buildImpersonationResponsePayload(claims, proxy = {}) {
  return {
    ok: true,
    redirectTo: getDashboardPath(claims.role),
    role: claims.role,
    email: claims.email,
    tenantName: claims.tenantName || null,
    impersonating: Boolean(proxy.impersonatorId),
  };
}
