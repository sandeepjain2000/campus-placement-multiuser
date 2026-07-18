import { NextResponse } from 'next/server';
import {
  buildPlatformErrorResponse,
  inferApiErrorContext,
  logApiResponseIfFailure,
} from '@/lib/platformErrorLog';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

/**
 * Log + JSON response for API route catch blocks.
 * @param {unknown} error
 * @param {{
 *   context: string;
 *   request?: Request;
 *   sessionUser?: { id?: string; sub?: string; email?: string };
 *   tenantId?: string | null;
 *   employerId?: string | null;
 *   requestBody?: unknown;
 *   defaultMessage?: string;
 *   logLabel?: string;
 * }} opts
 */
export async function respondPlatformError(error, opts) {
  console.error(opts.logLabel || opts.context, error);
  const { status, body } = await buildPlatformErrorResponse(error, opts);
  return NextResponse.json(body, { status });
}

/**
 * Wrap App Router route handlers so thrown errors and unlogged error responses
 * are persisted to platform_error_logs (including soft HTTP 2xx failures such as
 * `{ unavailable: true }` when no reference was already attached).
 *
 * @param {Record<string, Function | undefined>} handlers
 * @param {{ context?: string }} [options]
 */
export function withApiHandlers(handlers, options = {}) {
  const { context: baseContext } = options;
  const out = {};

  for (const method of HTTP_METHODS) {
    const handler = handlers[method];
    if (typeof handler !== 'function') continue;

    out[method] = async (request, routeContext) => {
      const context =
        baseContext || inferApiErrorContext(new URL(request.url).pathname, method);
      try {
        const response = await handler(request, routeContext);
        return await logApiResponseIfFailure(request, response, { context });
      } catch (error) {
        return respondPlatformError(error, {
          context,
          request,
          logLabel: `${method} ${context}`,
        });
      }
    };
  }

  return out;
}
