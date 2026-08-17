import { query } from '@/lib/db';
import { requireSession, jsonError, jsonOk } from '@/lib/apiAuth';
import { newId } from '@/lib/ids';
import { notifyUser } from '@/lib/ipNotify';
import { sendMail } from '@/lib/mail';
import { ensureIpOfferRemindSchema } from '@/lib/ensureIpOfferRemindSchema';

export async function GET() {
  const { session, error } = await requireSession(['candidate', 'employer']);
  if (error) return error;

  if (session.user.role === 'candidate') {
    const cand = await query(`SELECT id FROM ip_candidates WHERE user_id = $1`, [session.user.id]);
    const result = await query(
      `SELECT o.*, i.title, i.work_mode, i.location, e.company_name, e.user_id as employer_user_id FROM ip_offers o
       JOIN ip_internships i ON i.id = o.internship_id
       JOIN ip_employers e ON e.id = o.employer_id
       WHERE o.candidate_id = $1 ORDER BY o.created_at DESC`,
      [cand.rows[0]?.id || ''],
    );
    return jsonOk({ items: result.rows });
  }

  await ensureIpOfferRemindSchema();
  const emp = await query(`SELECT id FROM ip_employers WHERE user_id = $1`, [session.user.id]);
  const result = await query(
    `SELECT o.*, i.title, c.name as candidate_name, c.college as candidate_college,
            c.user_id as candidate_user_id
     FROM ip_offers o
     JOIN ip_internships i ON i.id = o.internship_id
     JOIN ip_candidates c ON c.id = o.candidate_id
     WHERE o.employer_id = $1 ORDER BY o.created_at DESC`,
    [emp.rows[0]?.id || ''],
  );
  return jsonOk({ items: result.rows });
}

export async function POST(request) {
  const { session, error } = await requireSession(['employer']);
  if (error) return error;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }
  const { applicationId, candidateId, internshipId, roleTitle, stipendInr, startDate, validUntil, letterUrl, message } = body;
  if (!applicationId && !(candidateId && internshipId)) {
    return jsonError('applicationId, or candidateId + internshipId, is required');
  }

  const emp = await query(`SELECT id FROM ip_employers WHERE user_id = $1`, [session.user.id]);
  if (!emp.rows[0]) return jsonError('Employer profile missing', 404);

  let row;
  if (applicationId) {
    const app = await query(
      `SELECT a.candidate_id, a.internship_id, i.employer_id, i.title, c.user_id as candidate_user_id, c.name as candidate_name
       FROM ip_applications a
       JOIN ip_internships i ON i.id = a.internship_id
       JOIN ip_candidates c ON c.id = a.candidate_id
       WHERE a.id = $1`,
      [applicationId],
    );
    row = app.rows[0];
    if (!row || row.employer_id !== emp.rows[0].id) return jsonError('Application not found', 404);
  } else {
    // Direct offer from candidate search — no prior application; create/upsert one so pipeline stays consistent.
    const internship = await query(
      `SELECT id, employer_id, title FROM ip_internships WHERE id = $1 AND employer_id = $2`,
      [internshipId, emp.rows[0].id],
    );
    if (!internship.rows[0]) return jsonError('Internship not found', 404);
    const candidate = await query(`SELECT id, user_id, name FROM ip_candidates WHERE id = $1`, [candidateId]);
    if (!candidate.rows[0]) return jsonError('Candidate not found', 404);

    const upserted = await query(
      `INSERT INTO ip_applications (id, internship_id, candidate_id, status)
       VALUES ($1,$2,$3,'offered')
       ON CONFLICT (internship_id, candidate_id) DO UPDATE SET status = 'offered', updated_at = now()
       RETURNING id`,
      [newId('ip_app'), internshipId, candidateId],
    );
    row = {
      candidate_id: candidate.rows[0].id,
      internship_id: internship.rows[0].id,
      employer_id: internship.rows[0].employer_id,
      title: internship.rows[0].title,
      candidate_user_id: candidate.rows[0].user_id,
      candidate_name: candidate.rows[0].name,
      application_id: upserted.rows[0].id,
    };
  }

  const id = newId('ip_offer');
  await query(
    `INSERT INTO ip_offers (id, internship_id, candidate_id, employer_id, role_title, stipend_inr, start_date, valid_until, letter_url, message)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [id, row.internship_id, row.candidate_id, row.employer_id, roleTitle || row.title, stipendInr || null, startDate || null, validUntil || null, letterUrl || null, message || null],
  );
  await query(`UPDATE ip_applications SET status = 'offered', updated_at = now() WHERE id = $1`, [applicationId || row.application_id]);

  await notifyUser({
    userId: row.candidate_user_id,
    title: 'You received an offer!',
    body: row.title,
    link: '/candidate/offers',
    category: 'application',
  });
  try {
    await sendMail({
      to: (await query(`SELECT email FROM ip_users WHERE id = $1`, [row.candidate_user_id])).rows[0]?.email,
      subject: `Offer letter — ${roleTitle || row.title}`,
      html: `<p>Hi ${row.candidate_name},</p><p>You have received an offer for <strong>${roleTitle || row.title}</strong>. Sign in to review and respond.</p>`,
      text: `You have received an offer for ${roleTitle || row.title}. Sign in to review.`,
    });
  } catch (e) {
    console.error('[offers] email failed', e.message);
  }

  return jsonOk({ ok: true, id }, 201);
}
