import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import {
  OFFER_STATUSES,
  parseCsvLine,
  normalizeHeader,
  pickCell,
  parseSalary,
  parseDeadline,
  parseJoiningDateOnly,
  normalizeOptionalUuidCell,
} from '@/lib/csvImportUtils';
import { refreshOfferLatestFlagsForStudent } from '@/lib/offersLatestFlag';
import { isMissingReportedCompanyColumnError } from '@/lib/offerReportedColumn';

async function getEmployerId(session) {
  const userId = session?.user?.id;
  if (!userId) return null;
  const employerResult = await query(`SELECT id FROM employer_profiles WHERE user_id = $1 LIMIT 1`, [userId]);
  return employerResult.rows[0]?.id || null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const employerId = await getEmployerId(session);
    if (!employerId) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const employerCompanyRes = await query(`SELECT company_name FROM employer_profiles WHERE id = $1::uuid LIMIT 1`, [
      employerId,
    ]);
    const employerCompanyName = employerCompanyRes.rows[0]?.company_name || null;

    const approvedTenantsRes = await query(
      `SELECT tenant_id FROM employer_approvals WHERE employer_id = $1::uuid AND status = 'approved'`,
      [employerId],
    );
    const approvedSet = new Set(approvedTenantsRes.rows.map((r) => String(r.tenant_id)));
    const singleTenantFallback =
      approvedTenantsRes.rows.length === 1 ? String(approvedTenantsRes.rows[0].tenant_id) : null;

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file.text !== 'function') {
      return NextResponse.json({ error: 'CSV file is required' }, { status: 400 });
    }
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must include a header row and at least one data row' }, { status: 400 });
    }

    const headerCells = parseCsvLine(lines[0]).map(normalizeHeader);
    const headerHasTenantId = headerCells.includes('tenant_id') || headerCells.includes('campus_id') || headerCells.includes('college_tenant_id');
    const errors = [];
    let accepted = 0;

    for (let li = 1; li < lines.length; li += 1) {
      const lineNo = li + 1;
      const cells = parseCsvLine(lines[li]);
      if (cells.every((c) => !c)) continue;

      const row = {};
      headerCells.forEach((h, i) => {
        if (h) row[h] = cells[i] ?? '';
      });

      const roll = pickCell(row, ['roll_number', 'roll', 'student_roll', 'roll_no']);
      const jobTitle = pickCell(row, ['job_title', 'role', 'title', 'position']);
      if (!roll || !jobTitle) {
        errors.push({ line: lineNo, message: 'Missing roll_number or job_title' });
        continue;
      }

      let resolvedTenantId = null;
      if (headerHasTenantId) {
        const tenantCell = pickCell(row, ['tenant_id', 'campus_id', 'college_tenant_id']);
        resolvedTenantId = tenantCell && UUID_RE.test(tenantCell) ? tenantCell : null;
        if (!resolvedTenantId) {
          if (!singleTenantFallback) {
            errors.push({
              line: lineNo,
              message:
                'Add tenant_id (campus UUID), or partner with exactly one approved campus so the campus can be inferred.',
            });
            continue;
          }
          resolvedTenantId = singleTenantFallback;
        } else if (!approvedSet.has(resolvedTenantId)) {
          errors.push({ line: lineNo, message: 'tenant_id is not an approved campus for your company' });
          continue;
        }
      } else if (singleTenantFallback) {
        resolvedTenantId = singleTenantFallback;
      } else {
        errors.push({
          line: lineNo,
          message:
            'This file has no tenant_id column. Add a tenant_id column (campus UUID) per row, or use a single approved campus partnership.',
        });
        continue;
      }

      const sr = await query(
        `SELECT sp.id
         FROM student_profiles sp
         WHERE sp.tenant_id = $1::uuid AND TRIM(sp.roll_number) = $2
         LIMIT 1`,
        [resolvedTenantId, roll],
      );
      const studentId = sr.rows[0]?.id;
      if (!studentId) {
        errors.push({
          line: lineNo,
          message: `Roll ${roll} is not on that campus master student list`,
        });
        continue;
      }

      const driveRaw = pickCell(row, ['drive_id', 'placement_drive_id']);
      let driveId = normalizeOptionalUuidCell(driveRaw);
      if (driveId) {
        const dr = await query(
          `SELECT id FROM placement_drives WHERE id = $1::uuid AND employer_id = $2::uuid LIMIT 1`,
          [driveId, employerId],
        );
        if (!dr.rows[0]) {
          errors.push({ line: lineNo, message: 'drive_id is not one of your drives (clear the cell or use a drive UUID from your Drives list)' });
          continue;
        }
      } else {
        driveId = null;
      }

      const salary = parseSalary(pickCell(row, ['salary', 'ctc', 'annual_ctc', 'package']));
      const location = pickCell(row, ['location', 'city', 'base']) || null;
      const joiningDate = parseJoiningDateOnly(pickCell(row, ['joining_date', 'join_date', 'doj']));
      const deadlineAt = parseDeadline(pickCell(row, ['deadline', 'last_date', 'respond_by', 'deadline_at']));
      // Default accepted: this import is for offers already accepted off-platform / outside My Offers.
      // Use status column (e.g. pending) when the student must accept inside the app.
      let status = pickCell(row, ['status', 'offer_status']).toLowerCase() || 'accepted';
      if (status === 'declined') status = 'rejected';
      if (!OFFER_STATUSES.has(status)) status = 'accepted';

      const acceptedAt = status === 'accepted' ? new Date().toISOString() : null;

      const insertBase = [
        studentId,
        driveId,
        employerId,
        jobTitle,
        salary,
        location,
        status,
        joiningDate,
        deadlineAt,
      ];
      try {
        try {
          await query(
            `INSERT INTO offers (
             student_id, drive_id, employer_id, job_title, salary, location, status,
             joining_date, deadline, salary_currency, reported_company_name, accepted_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'INR', $10, $11)`,
            [...insertBase, employerCompanyName, acceptedAt],
          );
        } catch (e) {
          if (!isMissingReportedCompanyColumnError(e)) throw e;
          await query(
            `INSERT INTO offers (
             student_id, drive_id, employer_id, job_title, salary, location, status,
             joining_date, deadline, salary_currency, accepted_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'INR', $10)`,
            [...insertBase, acceptedAt],
          );
        }
        accepted += 1;
        await refreshOfferLatestFlagsForStudent(studentId);
      } catch (e) {
        console.error('employer offers csv row', lineNo, e);
        errors.push({ line: lineNo, message: e.message || 'Insert failed' });
      }
    }

    return NextResponse.json({ accepted, errors });
  } catch (error) {
    console.error('POST /api/employer/offers/upload', error);
    return NextResponse.json({ error: 'Failed to import CSV' }, { status: 500 });
  }
}
