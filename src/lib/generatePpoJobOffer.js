import { query } from '@/lib/db';
import { buildRenderedOfferLetter } from '@/lib/offerTemplateRender';
import { loadEmployerOfferTemplate } from '@/lib/bulkOfferGenerate';
import { refreshOfferLatestFlagsForStudent } from '@/lib/offersLatestFlag';
import { notifyStudentFormalOfferByOfferId } from '@/lib/studentFormalOfferNotify';
import { AND_JP_NOT_DELETED, AND_OFFER_NOT_DELETED, AND_PA_NOT_DELETED } from '@/lib/softDeleteSql';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { toDateOnlyString, toDeadlineTimestampIso } from '@/lib/dateOnly';
import { INTERNSHIP_PPO_ACCEPTED } from '@/lib/internshipPpo';

/**
 * Create one formal job offer from a template after the student has accepted PPO.
 */
export async function generatePpoJobOffer({ employerId, programApplicationId, templateId }) {
  const ppoRes = await query(
    `SELECT ip.id, ip.status, ip.offer_id, ip.student_profile_id,
            jp.title AS opening_title,
            TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS student_name,
            t.name AS college_name,
            ep.company_name
     FROM internship_ppo ip
     INNER JOIN program_applications pa ON pa.id = ip.program_application_id
     INNER JOIN job_postings jp ON jp.id = pa.job_id AND jp.job_type = 'internship'
     INNER JOIN student_profiles sp ON sp.id = pa.student_id AND ${SP_ACTIVE_CLAUSE}
     INNER JOIN users u ON u.id = sp.user_id
     LEFT JOIN tenants t ON t.id = sp.tenant_id
     INNER JOIN employer_profiles ep ON ep.id = ip.employer_id
     WHERE ip.program_application_id = $1::uuid
       AND ip.employer_id = $2::uuid
       ${AND_PA_NOT_DELETED} ${AND_JP_NOT_DELETED}`,
    [programApplicationId, employerId],
  );
  const ctx = ppoRes.rows[0];
  if (!ctx) {
    const err = new Error('PPO_NOT_FOUND');
    throw err;
  }
  if (String(ctx.status) !== INTERNSHIP_PPO_ACCEPTED) {
    const err = new Error('PPO_NOT_ACCEPTED');
    throw err;
  }
  if (ctx.offer_id) {
    const err = new Error('OFFER_ALREADY_GENERATED');
    throw err;
  }

  const existingOffer = await query(
    `SELECT id FROM offers
     WHERE program_application_id = $1::uuid AND employer_id = $2::uuid ${AND_OFFER_NOT_DELETED}
     LIMIT 1`,
    [programApplicationId, employerId],
  );
  if (existingOffer.rows[0]) {
    const err = new Error('OFFER_ALREADY_GENERATED');
    throw err;
  }

  const template = await loadEmployerOfferTemplate(templateId, employerId);
  if (!template) {
    const err = new Error('TEMPLATE_NOT_FOUND');
    throw err;
  }

  const deadlineIso = toDeadlineTimestampIso(template.response_deadline);
  const joiningDate = template.joining_date ? toDateOnlyString(template.joining_date) : null;
  const renderedLetter = buildRenderedOfferLetter({
    template,
    studentName: ctx.student_name,
    companyName: ctx.company_name,
    collegeName: ctx.college_name,
  });

  let insertRes;
  try {
    insertRes = await query(
      `INSERT INTO offers (
         student_id, employer_id, program_application_id, job_title, salary, location,
         status, joining_date, deadline, salary_currency, offer_template_id, rendered_letter_html, offer_kind
       ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, 'INR', $9, $10, 'ppo_job')
       RETURNING id`,
      [
        ctx.student_profile_id,
        employerId,
        programApplicationId,
        template.job_title,
        Number(template.salary) || 0,
        template.location || null,
        joiningDate,
        deadlineIso,
        template.id,
        renderedLetter,
      ],
    );
  } catch (e) {
    if (e?.code === '42703') {
      insertRes = await query(
        `INSERT INTO offers (
           student_id, employer_id, job_title, salary, location,
           status, joining_date, deadline, salary_currency
         ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, 'INR')
         RETURNING id`,
        [
          ctx.student_profile_id,
          employerId,
          template.job_title,
          Number(template.salary) || 0,
          template.location || null,
          joiningDate,
          deadlineIso,
        ],
      );
    } else {
      throw e;
    }
  }

  const offerId = insertRes.rows[0]?.id;
  if (!offerId) {
    const err = new Error('OFFER_INSERT_FAILED');
    throw err;
  }

  await refreshOfferLatestFlagsForStudent(ctx.student_profile_id);

  await query(
    `UPDATE internship_ppo
     SET offer_id = $1::uuid, updated_at = NOW()
     WHERE id = $2::uuid`,
    [offerId, ctx.id],
  );

  notifyStudentFormalOfferByOfferId(String(offerId)).catch((err) => {
    console.error('Formal offer notification after PPO job offer:', err);
  });

  return { offerId: String(offerId), templateName: template.name };
}
