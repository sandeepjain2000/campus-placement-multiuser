/**
 * Server-side debug tracer.
 *
 * Usage in any API route:
 *   const tracer = createServerDebugTracer(request, 'student_program_application');
 *   tracer.log('persistProgramApplication', 'query_assessment_rows', { studentId, jobId });
 *   tracer.log('persistProgramApplication', 'computed_status', { hiringResult, initialStatus });
 *   await tracer.flush(userId); // at end of request — writes one row to platform_error_logs
 *
 * Tracer is a no-op if the request does NOT carry the X-Debug-Mode: 1 header.
 */

import { query } from '@/lib/db';

const DEBUG_HEADER = 'x-debug-mode';
const MAX_STEPS = 200;

/**
 * @param {Request} request  Next.js Request (or any object with .headers.get)
 * @param {string}  module   Short module label, e.g. 'student_program_application'
 */
export function createServerDebugTracer(request, module) {
  const enabled =
    request?.headers?.get?.(DEBUG_HEADER) === '1' ||
    request?.headers?.[DEBUG_HEADER] === '1';

  if (!enabled) {
    return {
      enabled: false,
      log: () => {},
      flush: async () => null,
    };
  }

  const steps = [];
  const startedAt = Date.now();

  return {
    enabled: true,

    /**
     * @param {string} fn     Function / section name  e.g. 'persistProgramApplication'
     * @param {string} event  Short event label         e.g. 'query_assessment_rows'
     * @param {unknown} data  Any serialisable payload  (passwords are never passed here)
     */
    log(fn, event, data = null) {
      if (steps.length >= MAX_STEPS) return;
      steps.push({
        t: new Date().toISOString(),
        ms: Date.now() - startedAt,
        fn,
        event,
        data: data ?? null,
      });
    },

    /**
     * Persist accumulated steps to platform_error_logs as a single 'info' row.
     * @param {string|null} userId
     */
    async flush(userId = null) {
      if (!steps.length) return null;
      const last = steps[steps.length - 1];
      const failed =
        last?.event?.toLowerCase().includes('error') ||
        last?.event?.toLowerCase().includes('fail') ||
        last?.data?.ok === false ||
        last?.data?.error;

      const summary = `[DEBUG] ${module} — ${steps.length} steps — ${failed ? 'FAILED' : 'OK'}`;

      try {
        const res = await query(
          `INSERT INTO platform_error_logs
             (severity, context, status_code, user_id, user_message, error_message, details)
           VALUES ($1, $2, $3, $4::uuid, $5, $6, $7::jsonb)
           RETURNING id`,
          [
            failed ? 'warning' : 'info',
            `debug_${module}`.slice(0, 80),
            failed ? 400 : 200,
            userId || null,
            summary,
            summary,
            JSON.stringify({ module, steps }),
          ],
        );
        return res.rows[0]?.id || null;
      } catch (e) {
        console.error('[serverDebugTracer] flush failed', e?.message);
        return null;
      }
    },
  };
}
