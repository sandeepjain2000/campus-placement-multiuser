import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { sendMail } from '@/lib/mailer';
import { buildUserDataExportPayload, summarizeExportSections } from '@/lib/userDataExport/buildPayload';
import { buildExportFile, EXPORT_FORMAT } from '@/lib/userDataExport/toCsv';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function __platform_GET() {
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

async function __platform_POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let exportId;
    try {
      const ins = await query(
        `INSERT INTO user_data_exports (user_id, role, status, format)
         VALUES ($1::uuid, $2, 'processing', $3)
         RETURNING id`,
        [session.user.id, session.user.role, EXPORT_FORMAT],
      );
      exportId = ins.rows[0]?.id;
    } catch (insertErr) {
      if (insertErr?.code === '42P01') {
        return NextResponse.json(
          { error: 'Export history is not set up on this database. Run db/migrations/014_user_data_exports.sql.' },
          { status: 503 },
        );
      }
      throw insertErr;
    }

    try {
      const payload = await buildUserDataExportPayload({
        id: session.user.id,
        role: session.user.role,
        tenantId: session.user.tenantId ?? null,
      });
      const { body: buf, contentType, ext } = buildExportFile(payload);
      const summary = summarizeExportSections(payload);

      await query(
        `UPDATE user_data_exports
         SET status = 'completed', byte_size = $2, section_summary = $3::jsonb
         WHERE id = $1::uuid`,
        [exportId, buf.length, JSON.stringify(summary)],
      );

      const safeName = `placementhub-export-${session.user.role}-${new Date().toISOString().slice(0, 10)}.${ext}`;
      let targetEmail = session.user.email;
      try {
        const commQuery = await query(
          `SELECT COALESCE(NULLIF(communication_email, ''), email) AS email FROM users WHERE id = $1::uuid`,
          [session.user.id],
        );
        targetEmail = commQuery.rows[0]?.email || targetEmail;
      } catch (commErr) {
        if (commErr?.code === '42703') {
          const emailQuery = await query(`SELECT email FROM users WHERE id = $1::uuid`, [session.user.id]);
          targetEmail = emailQuery.rows[0]?.email || targetEmail;
        } else {
          throw commErr;
        }
      }

      try {
        await sendMail({
          to: targetEmail,
          subject: 'PlacementHub — your data export is ready',
          text: [
            `Hello,`,
            ``,
            `We recorded a full data export for your ${session.user.role} account.`,
            `Export id: ${exportId}`,
            `Download was started from the browser; keep the CSV file somewhere safe.`,
            ``,
            `— PlacementHub`,
          ].join('\n'),
          context: 'user_data_export',
          userId: session.user.id,
          recipientUserId: session.user.id,
        });
      } catch (mailErr) {
        console.warn('data-export notify email', mailErr);
      }

      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': contentType,
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


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
}, { context: 'api_user_data_export' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
