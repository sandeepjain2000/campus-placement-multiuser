import { NextResponse } from 'next/server';
import { withApiHandlers } from '@/lib/platformErrorRoute';

export const dynamic = 'force-dynamic';

const REMOVED_MSG =
  'Offer CSV import was removed. Use manual Add offer for off-platform logging, or coordinate with employers using template-based bulk generation.';

async function __platform_POST() {
  return NextResponse.json({ error: REMOVED_MSG }, { status: 410 });
}

const handlers = withApiHandlers({ POST: __platform_POST }, { context: 'api_college_offers_upload_removed' });
export const POST = handlers.POST;
