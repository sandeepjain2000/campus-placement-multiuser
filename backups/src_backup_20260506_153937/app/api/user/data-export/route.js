import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { sendMail } from '@/lib/mailer';
import { buildUserDataExportPayload, summarizeExportSections } from '@/lib/userDataExport/buildPayload';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await query(
      `SELECT id, status, format, byte_size, section_summary, error_message, created_at
       FROM user_data_exports
       WHERE user_id = $1::uuid
       ORDER BY created_at DESC
       LIMIT 50`,
      [session.user.id],
    );
    return NextResponse.json({ exports: res.rows });
  } catch (e) {
    console.error('GET /api/user/data-export', e);
    return NextResponse.json({ error: 'Failed to load export history' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ins = await query(
      `INSERT INTO user_data_exports (user_id, role, status, format)
       VALUES ($1::uuid, $2, 'processing', 'json')
       RETURNING id`,
      [session.user.id, session.user.role],
    );
    const exportId = ins.rows[0]?.id;

    try {
      const payload = await buildUserDataExportPayload({
        id: session.user.id,
        role: session.user.role,
        tenantId: session.user.tenantId ?? null,
      });
      const json = JSON.stringify(payload, null, 2);
      const buf = Buffer.from(json, 'utf8');
      const summary = summarizeExportSections(payload);

      await query(
        `UPDATE user_data_exports
         SET status = 'completed', byte_size = $2, section_summary = $3::jsonb
         WHERE id = $1::uuid`,
        [exportId, buf.length, JSON.stringify(summary)],
      );

      const safeName = `placementhub-export-${session.user.role}-${new Date().toISOString().slice(0, 10)}.json`;
      try {
        await sendMail({
          to: session.user.email,
          subject: 'PlacementHub — your data export is ready',
          text: [
            `Hello,`,
            ``,
            `We recorded a full data export for your ${session.user.role} account.`,
            `Export id: ${exportId}`,
            `Download was started from the browser; keep the JSON file somewhere safe.`,
            ``,
            `— PlacementHub`,
          ].join('\n'),
        });
      } catch (mailErr) {
        console.warn('data-export notify email', mailErr);
      }

      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeName}"`,
          'X-Export-Id': String(exportId),
        },
      });
    } catch (inner) {
      console.error('POST /api/user/data-export build', inner);
      await query(
        `UPDATE user_data_exports SET status = 'failed', error_message = $2 WHERE id = $1::uuid`,
        [exportId, String(inner?.message || inner).slice(0, 2000)],
      );
      return NextResponse.json({ error: 'Export failed' }, { status: 500 });
    }
  } catch (e) {
    console.error('POST /api/user/data-export', e);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
