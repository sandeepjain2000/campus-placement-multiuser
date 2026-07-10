import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { refreshOfferLatestFlagsForStudent } from '@/lib/offersLatestFlag';
import { isOfferDeadlinePassed } from '@/lib/offerDeadline';
import { isPendingOfferStatus, normalizeOfferStatus, OFFER_PENDING_STATUS_SQL } from '@/lib/offerStatusNormalize';
import { resolveStudentProfileByUserId } from '@/lib/studentProfileResolve';
import { markStudentPlacedAfterOfferAccept } from '@/lib/studentApplyEligibility';
import { assertStudentMayAcceptOffer } from '@/lib/offerPlacementRules';
import { AND_OFFER_NOT_DELETED } from '@/lib/softDeleteSql';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




function isMissingReportedColumnError(e) {
  const msg = String(e?.message || '');
  return e?.code === '42703' || msg.includes('reported_company_name');
}

function isMissingIsLatestError(e) {
  return e?.code === '42703' && String(e?.message || '').includes('is_latest');
}

function isMissingUpdatedAtError(e) {
  return e?.code === '42703' && String(e?.message || '').includes('updated_at');
}

function isMissingRenderedLetterError(e) {
  return e?.code === '42703' && String(e?.message || '').includes('rendered_letter_html');
}

function buildStudentOffersSql(latestOnly, useReportedCompany, selectLatestField, includeRenderedLetter) {
  const latestClause =
    latestOnly && selectLatestField ? `AND (o.is_latest = 1 OR ${OFFER_PENDING_STATUS_SQL})` : '';
  const latestSel = selectLatestField ? ', o.is_latest as "isLatest"' : '';
  const renderedSel = includeRenderedLetter ? ', o.rendered_letter_html AS "renderedLetterHtml"' : '';
  const companyExpr = useReportedCompany
    ? `COALESCE(ep.company_name, o.reported_company_name, 'Company')`
    : `COALESCE(ep.company_name, 'Company')`;

  return `
    SELECT o.id,
           ${companyExpr} AS company,
           ep.website AS website,
           o.job_title as role,
           o.salary, o.salary_currency as currency, o.location, o.joining_date as "joiningDate",
           o.status, o.deadline, o.drive_id as "driveId",
           COALESCE(o.application_id, o.program_application_id) as "applicationId",
           o.created_at as "createdAt", o.accepted_at as "acceptedAt", o.rejected_at as "rejectedAt",
           o.offer_letter_url AS "offerLetterUrl"
           ${renderedSel}
           ${latestSel}
    FROM offers o
    LEFT JOIN employer_profiles ep ON o.employer_id = ep.id
    WHERE o.student_id = $1 ${latestClause} ${AND_OFFER_NOT_DELETED}
    ORDER BY o.created_at DESC`;
}

async function loadStudentOffersRows(studentId) {
  try {
    return await query(buildStudentOffersSql(true, true, true, true), [studentId]);
  } catch (e) {
    if (isMissingRenderedLetterError(e)) {
      try {
        return await query(buildStudentOffersSql(true, true, true, false), [studentId]);
      } catch (e0) {
        e = e0;
      }
    }
    if (isMissingIsLatestError(e)) {
      try {
        return await query(buildStudentOffersSql(false, true, false, true), [studentId]);
      } catch (e2) {
        if (isMissingRenderedLetterError(e2)) {
          try {
            return await query(buildStudentOffersSql(false, true, false, false), [studentId]);
          } catch (e3) {
            if (isMissingReportedColumnError(e3)) {
              return await query(buildStudentOffersSql(false, false, false, false), [studentId]);
            }
            throw e3;
          }
        }
        if (isMissingReportedColumnError(e2)) {
          return await query(buildStudentOffersSql(false, false, false, false), [studentId]);
        }
        throw e2;
      }
    }
    if (isMissingReportedColumnError(e)) {
      try {
        return await query(buildStudentOffersSql(true, false, true, true), [studentId]);
      } catch (e2) {
        if (isMissingIsLatestError(e2)) {
          return await query(buildStudentOffersSql(false, false, false, false), [studentId]);
        }
        throw e2;
      }
    }
    throw e;
  }
}

function mapOfferRow(offer) {
  return {
    ...offer,
    id: String(offer.id),
    status: normalizeOfferStatus(offer.status),
  };
}

async function expireOfferIfNeeded(offer, now) {
  const status = normalizeOfferStatus(offer.status);
  if (!isPendingOfferStatus(status)) {
    return { ...offer, status };
  }
  if (!isOfferDeadlinePassed(offer.deadline, now)) {
    return { ...offer, status };
  }
  try {
    await query(`UPDATE offers SET status = 'expired' WHERE id = $1::uuid AND ${PENDING_STATUS_SQL}`, [offer.id]);
  } catch (err) {
    console.error('Failed to update expired status:', err);
  }
  return { ...offer, status: 'expired' };
}

const PENDING_STATUS_SQL = `LOWER(TRIM(status)) IN ('pending', 'offered', 'sent', 'awaiting_response', 'awaiting')`;

async function updatePendingOfferDecision(id, studentId, action) {
  const acceptSql = `UPDATE offers
       SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
       WHERE id = $1::uuid AND student_id = $2::uuid AND ${PENDING_STATUS_SQL}
       RETURNING id, status, accepted_at, rejected_at`;
  const acceptSqlNoUpdated = `UPDATE offers
       SET status = 'accepted', accepted_at = NOW()
       WHERE id = $1::uuid AND student_id = $2::uuid AND ${PENDING_STATUS_SQL}
       RETURNING id, status, accepted_at, rejected_at`;
  const rejectSql = `UPDATE offers
       SET status = 'rejected', rejected_at = NOW(), updated_at = NOW()
       WHERE id = $1::uuid AND student_id = $2::uuid AND ${PENDING_STATUS_SQL}
       RETURNING id, status, accepted_at, rejected_at`;
  const rejectSqlNoUpdated = `UPDATE offers
       SET status = 'rejected', rejected_at = NOW()
       WHERE id = $1::uuid AND student_id = $2::uuid AND ${PENDING_STATUS_SQL}
       RETURNING id, status, accepted_at, rejected_at`;

  const primary = action === 'accept' ? acceptSql : rejectSql;
  const fallback = action === 'accept' ? acceptSqlNoUpdated : rejectSqlNoUpdated;

  try {
    return await query(primary, [id, studentId]);
  } catch (e) {
    if (isMissingUpdatedAtError(e)) {
      return await query(fallback, [id, studentId]);
    }
    throw e;
  }
}

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    if (!userId) {
      return NextResponse.json({ error: 'Session user id missing' }, { status: 401 });
    }

    const profile = await resolveStudentProfileByUserId(userId);
    if (!profile?.id) return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });

    const offersResult = await loadStudentOffersRows(profile.id);
    const now = new Date();
    const updatedOffers = [];

    for (const row of offersResult.rows) {
      const mapped = mapOfferRow(row);
      const withExpiry = await expireOfferIfNeeded(mapped, now);
      updatedOffers.push(withExpiry);
    }

    return NextResponse.json(updatedOffers);
  } catch (error) {
    console.error('Failed to load student offers:', error);
    return NextResponse.json({ error: 'Failed to load student offers' }, { status: 500 });
  }
}

async function __platform_PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    if (!userId) {
      return NextResponse.json({ error: 'Session user id missing' }, { status: 401 });
    }

    const profile = await resolveStudentProfileByUserId(userId);
    if (!profile?.id) return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });

    const studentId = profile.id;
    const tenantId = profile.tenant_id;

    const body = await request.json();
    const id = String(body?.id || '').trim();
    let action = String(body?.action || '').trim().toLowerCase();
    if (action === 'reject') action = 'decline';
    if (!id || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'id and valid action (accept or decline) are required' }, { status: 400 });
    }

    const existing = await query(
      `SELECT id, status, deadline FROM offers o WHERE o.id = $1::uuid AND o.student_id = $2::uuid ${AND_OFFER_NOT_DELETED}`,
      [id, studentId],
    );
    const offer = existing.rows[0];
    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    const status = normalizeOfferStatus(offer.status);
    if (!isPendingOfferStatus(status)) {
      return NextResponse.json(
        {
          error:
            status === 'accepted'
              ? 'This offer was already accepted.'
              : status === 'rejected'
                ? 'This offer was already declined.'
                : status === 'expired'
                  ? 'This offer has expired.'
                  : status === 'revoked'
                    ? 'This offer was revoked by the employer.'
                    : 'Only pending offers can be accepted or declined.',
        },
        { status: 409 },
      );
    }

    if (isOfferDeadlinePassed(offer.deadline)) {
      try {
        await query(`UPDATE offers SET status = 'expired' WHERE id = $1::uuid AND ${PENDING_STATUS_SQL}`, [id]);
      } catch {
        /* ignore */
      }
      return NextResponse.json(
        { error: 'This offer has expired and can no longer be accepted or declined.' },
        { status: 410 },
      );
    }

    if (action === 'accept') {
      const ruleCheck = await assertStudentMayAcceptOffer(studentId, tenantId);
      if (!ruleCheck.ok) {
        return NextResponse.json({ error: ruleCheck.error }, { status: 403 });
      }
    }

    const result = await updatePendingOfferDecision(id, studentId, action);

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Offer not found or not pending' }, { status: 404 });
    }

    try {
      await refreshOfferLatestFlagsForStudent(studentId);
    } catch (refreshErr) {
      console.warn('refreshOfferLatestFlagsForStudent after student decision:', refreshErr?.message || refreshErr);
    }

    if (action === 'accept') {
      try {
        await markStudentPlacedAfterOfferAccept(studentId);
      } catch (placedErr) {
        console.warn('markStudentPlacedAfterOfferAccept:', placedErr?.message || placedErr);
      }
    }

    const row = result.rows[0];
    return NextResponse.json({
      offer: {
        id: String(row.id),
        status: normalizeOfferStatus(row.status),
        acceptedAt: row.accepted_at,
        rejectedAt: row.rejected_at,
      },
    });
  } catch (error) {
    console.error('Failed to update student offer:', error);
    const msg = String(error?.message || '');
    if (error?.code === '42703') {
      return NextResponse.json(
        { error: 'Database schema is out of date for offers. Ask your administrator to run migration 059_offers_decision_columns.sql.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: msg || 'Failed to update offer status' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  PATCH: __platform_PATCH,
}, { context: 'api_student_offers' });
export const GET = __platformApiHandlers.GET;
export const PATCH = __platformApiHandlers.PATCH;
