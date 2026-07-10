import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';

/**
 * Student self-registration is disabled — profiles are provisioned by the college (CSV / add student).
 */
async function __platform_POST() {
  return NextResponse.json(
    {
      error:
        'Student self-registration is disabled. Ask your placement office to add you to the campus list; you will receive a login email when your account is ready.',
    },
    { status: 403 },
  );
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_auth_register_validate_student' });
export const POST = __platformApiHandlers.POST;
