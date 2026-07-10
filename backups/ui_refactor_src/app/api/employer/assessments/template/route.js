import { NextResponse } from 'next/server';
import { rowsToCsv } from '@/lib/csvExport';

export async function GET() {
  const headers = [
    'college_roll_no',
    'placement_drive_id',
    'candidate_name',
    'round_1',
    'round_2',
    'round_3',
    'round_4',
    'round_5',
    'remarks',
  ];
  const sample = [
    ['CSE2026-001', '', 'Aarav Singh', 'Passed', 'Pending', '', '', '', 'Strong aptitude score; interview pending'],
    ['ECE2026-017', '', 'Nisha Iyer', 'Passed', 'Passed', 'On Hold', '', '', 'Needs follow-up after panel review'],
  ];
  const csv = `\uFEFF${rowsToCsv(headers, sample)}`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="assessment_upload_template.csv"',
    },
  });
}
