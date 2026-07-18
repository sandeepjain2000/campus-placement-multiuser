import { withApiHandlers } from '@/lib/platformErrorRoute';
import { getAuditLogEntries } from '@/lib/auditLogEntriesGet';
import { PLATFORM_ERROR_CONTEXT } from '@/lib/platformErrorContext';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export { AUDIT_LOG_ERRORS } from '@/lib/auditLogEntriesGet';

const __platformApiHandlers = withApiHandlers(
  {
    GET: getAuditLogEntries,
  },
  { context: PLATFORM_ERROR_CONTEXT.AUDIT_LOG_ENTRIES },
);
export const GET = __platformApiHandlers.GET;
