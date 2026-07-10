import { NextResponse } from 'next/server';
import { withApiHandlers } from '@/lib/platformErrorRoute';

export const dynamic = 'force-dynamic';

const REMOVED_MSG =
  'Offer CSV import was removed. Use Offer templates + Generate offers from selections, or Create offer for a single student.';

async function __platform_POST() {
  return NextResponse.json({ error: REMOVED_MSG }, { status: 410 });
}

const handlers = withApiHandlers({ POST: __platform_POST }, { context: 'api_employer_offers_upload_removed' });
export const POST = handlers.POST;
