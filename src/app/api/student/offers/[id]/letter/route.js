import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { resolveStudentProfileByUserId } from '@/lib/studentProfileResolve';
import { AND_OFFER_NOT_DELETED } from '@/lib/softDeleteSql';
import {
  resolveStudentOfferLetterPayload,
  STUDENT_OFFER_LETTER_ERRORS,
} from '@/lib/studentOfferLetter';
import { withApiHandlers } from '@/lib/platformErrorRoute';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function jsonError(code, status) {
  const message = STUDENT_OFFER_LETTER_ERRORS[code] || STUDENT_OFFER_LETTER_ERRORS.LOAD_FAILED;
  return NextResponse.json({ error: message, code }, { status });
}

function isMissingRenderedLetterError(e) {
  return e?.code === '42703' && String(e?.message || '').includes('rendered_letter_html');
}

function isMissingReportedColumnError(e) {
  const msg = String(e?.message || '');
  return e?.code === '42703' || msg.includes('reported_company_name');
}

async function loadOfferForStudent(offerId, studentId) {
  const withReported = `
    SELECT o.id,
           COALESCE(ep.company_name, o.reported_company_name, 'Company') AS company,
           o.job_title AS role,
           o.salary, o.location, o.joining_date AS "joiningDate",
           o.status, o.deadline,
           o.offer_letter_url AS "offerLetterUrl",
           o.rendered_letter_html AS "renderedLetterHtml"
    FROM offers o
    LEFT JOIN employer_profiles ep ON o.employer_id = ep.id
    WHERE o.id = $1::uuid AND o.student_id = $2::uuid ${AND_OFFER_NOT_DELETED}
    LIMIT 1`;
  const withoutRendered = `
    SELECT o.id,
           COALESCE(ep.company_name, o.reported_company_name, 'Company') AS company,
           o.job_title AS role,
           o.salary, o.location, o.joining_date AS "joiningDate",
           o.status, o.deadline,
           o.offer_letter_url AS "offerLetterUrl",
           NULL::text AS "renderedLetterHtml"
    FROM offers o
    LEFT JOIN employer_profiles ep ON o.employer_id = ep.id
    WHERE o.id = $1::uuid AND o.student_id = $2::uuid ${AND_OFFER_NOT_DELETED}
    LIMIT 1`;
  const withoutReported = `
    SELECT o.id,
           COALESCE(ep.company_name, 'Company') AS company,
           o.job_title AS role,
           o.salary, o.location, o.joining_date AS "joiningDate",
           o.status, o.deadline,
           o.offer_letter_url AS "offerLetterUrl",
           NULL::text AS "renderedLetterHtml"
    FROM offers o
    LEFT JOIN employer_profiles ep ON o.employer_id = ep.id
    WHERE o.id = $1::uuid AND o.student_id = $2::uuid ${AND_OFFER_NOT_DELETED}
    LIMIT 1`;

  try {
    return await query(withReported, [offerId, studentId]);
  } catch (e) {
    if (isMissingRenderedLetterError(e)) {
      try {
        return await query(withoutRendered, [offerId, studentId]);
      } catch (e2) {
        if (isMissingReportedColumnError(e2)) {
          return await query(withoutReported, [offerId, studentId]);
        }
        throw e2;
      }
    }
    if (isMissingReportedColumnError(e)) {
      return await query(withoutReported, [offerId, studentId]);
    }
    throw e;
  }
}

async function __platform_GET(_request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return jsonError('UNAUTHORIZED', 401);
    }

    const userId = session.user.id || session.user.sub;
    if (!userId) {
      return jsonError('UNAUTHORIZED', 401);
    }

    const profile = await resolveStudentProfileByUserId(userId);
    if (!profile?.id) {
      return jsonError('PROFILE_MISSING', 404);
    }

    const { id } = await params;
    const offerId = String(id || '').trim();
    if (!offerId) {
      return jsonError('INVALID_ID', 400);
    }

    const result = await loadOfferForStudent(offerId, profile.id);
    const row = result.rows[0];
    if (!row) {
      return jsonError('NOT_FOUND', 404);
    }

    return NextResponse.json({ letter: resolveStudentOfferLetterPayload(row) });
  } catch (error) {
    console.error('GET /api/student/offers/[id]/letter', error);
    return jsonError('LOAD_FAILED', 500);
  }
}

const __platformApiHandlers = withApiHandlers(
  { GET: __platform_GET },
  { context: 'api_student_offers_id_letter' },
);
export const GET = __platformApiHandlers.GET;
