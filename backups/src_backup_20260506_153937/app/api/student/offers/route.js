import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

function isMissingReportedColumnError(e) {
  const msg = String(e?.message || '');
  return e?.code === '42703' || msg.includes('reported_company_name');
}

function isMissingIsLatestError(e) {
  return e?.code === '42703' && String(e?.message || '').includes('is_latest');
}

function buildStudentOffersSql(latestOnly, useReportedCompany, selectLatestField) {
  const latestClause = latestOnly && selectLatestField ? 'AND o.is_latest = 1' : '';
  const latestSel = selectLatestField ? ', o.is_latest as "isLatest"' : '';
  const companyExpr = useReportedCompany
    ? `COALESCE(ep.company_name, o.reported_company_name, 'Company')`
    : `COALESCE(ep.company_name, 'Company')`;

  return `
    SELECT o.id,
           ${companyExpr} AS company,
           o.job_title as role,
           o.salary, o.salary_currency as currency, o.location, o.joining_date as "joiningDate",
           o.status, o.deadline, o.created_at as "createdAt", o.accepted_at as "acceptedAt"
           ${latestSel}
    FROM offers o
    LEFT JOIN employer_profiles ep ON o.employer_id = ep.id
    WHERE o.student_id = $1 ${latestClause}
    ORDER BY o.created_at DESC`;
}

async function loadStudentOffersRows(studentId) {
  try {
    return await query(buildStudentOffersSql(true, true, true), [studentId]);
  } catch (e) {
    if (isMissingIsLatestError(e)) {
      try {
        return await query(buildStudentOffersSql(false, true, false), [studentId]);
      } catch (e2) {
        if (isMissingReportedColumnError(e2)) {
          return await query(buildStudentOffersSql(false, false, false), [studentId]);
        }
        throw e2;
      }
    }
    if (isMissingReportedColumnError(e)) {
      try {
        return await query(buildStudentOffersSql(true, false, true), [studentId]);
      } catch (e2) {
        if (isMissingIsLatestError(e2)) {
          return await query(buildStudentOffersSql(false, false, false), [studentId]);
        }
        throw e2;
      }
    }
    throw e;
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const studentQuery = await query(`SELECT id FROM student_profiles WHERE user_id = $1`, [userId]);
    const studentId = studentQuery.rows[0]?.id;

    if (!studentId) return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });

    const offersResult = await loadStudentOffersRows(studentId);

    const now = new Date();
    const updatedOffers = [];

    for (let offer of offersResult.rows) {
      if (offer.status === 'pending' && offer.deadline && new Date(offer.deadline) < now) {
        offer.status = 'expired';
        try {
          await query(`UPDATE offers SET status = 'expired' WHERE id = $1`, [offer.id]);
        } catch (err) {
          console.error('Failed to update expired status:', err);
        }
      }
      updatedOffers.push(offer);
    }

    return NextResponse.json(updatedOffers);
  } catch (error) {
    console.error('Failed to load student offers:', error);
    return NextResponse.json({ error: 'Failed to load student offers' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const studentQuery = await query(`SELECT id FROM student_profiles WHERE user_id = $1`, [userId]);
    const studentId = studentQuery.rows[0]?.id;
    if (!studentId) return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });

    const body = await request.json();
    const id = String(body?.id || '').trim();
    const action = String(body?.action || '').trim();
    if (!id || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'id and valid action are required' }, { status: 400 });
    }

    const nextStatus = action === 'accept' ? 'accepted' : 'rejected';
    const result = await query(
      `UPDATE offers
       SET status = $1,
           accepted_at = CASE WHEN $1 = 'accepted' THEN NOW() ELSE accepted_at END,
           updated_at = NOW()
       WHERE id = $2 AND student_id = $3 AND status = 'pending'
       RETURNING id, status`,
      [nextStatus, id, studentId],
    );

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Offer not found or not pending' }, { status: 404 });
    }

    return NextResponse.json({ offer: result.rows[0] });
  } catch (error) {
    console.error('Failed to update student offer:', error);
    return NextResponse.json({ error: 'Failed to update offer status' }, { status: 500 });
  }
}
