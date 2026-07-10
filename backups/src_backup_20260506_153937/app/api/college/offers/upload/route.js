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
} from '@/lib/csvImportUtils';
import { refreshOfferLatestFlagsForStudent } from '@/lib/offersLatestFlag';

function getTenantId(session) {
  return session.user.tenantId || session.user.tenant_id;
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = getTenantId(session);
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

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
      const company = pickCell(row, ['company_name', 'company', 'employer', 'employer_name']);
      const jobTitle = pickCell(row, ['job_title', 'role', 'title', 'position']);
      if (!roll || !company || !jobTitle) {
        errors.push({ line: lineNo, message: 'Missing roll_number, company_name, or job_title' });
        continue;
      }

      const sr = await query(
        `SELECT id FROM student_profiles
         WHERE tenant_id = $1::uuid AND TRIM(roll_number) = $2
         LIMIT 1`,
        [tenantId, roll],
      );
      const studentId = sr.rows[0]?.id;
      if (!studentId) {
        errors.push({
          line: lineNo,
          message: `Roll ${roll} is not in your campus master student list`,
        });
        continue;
      }

      const salary = parseSalary(pickCell(row, ['salary', 'ctc', 'annual_ctc', 'package']));
      const location = pickCell(row, ['location', 'city', 'base']) || null;
      const deadline = parseDeadline(pickCell(row, ['deadline', 'last_date', 'respond_by']));
      let status = pickCell(row, ['status', 'offer_status']).toLowerCase() || 'pending';
      if (status === 'declined') status = 'rejected';
      if (!OFFER_STATUSES.has(status)) status = 'pending';

      try {
        await query(
          `INSERT INTO offers (
             student_id, employer_id, job_title, salary, location, status,
             joining_date, deadline, salary_currency, reported_company_name
           ) VALUES ($1, NULL, $2, $3, $4, $5, NULL, $6, 'INR', $7)`,
          [studentId, jobTitle, salary, location, status, deadline, company],
        );
        accepted += 1;
        await refreshOfferLatestFlagsForStudent(studentId);
      } catch (e) {
        console.error('college offers csv row', lineNo, e);
        errors.push({ line: lineNo, message: e.message || 'Insert failed' });
      }
    }

    return NextResponse.json({ accepted, errors });
  } catch (error) {
    console.error('POST /api/college/offers/upload', error);
    if (error?.code === '42703' || String(error?.message || '').includes('reported_company_name')) {
      return NextResponse.json(
        {
          error:
            'Database is missing offers.reported_company_name. Apply migration 018_college_offers_reported_company.sql, then retry.',
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Failed to import CSV' }, { status: 500 });
  }
}
