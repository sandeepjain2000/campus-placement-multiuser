import { NextResponse } from 'next/server';
import { isDemoDataApiEnabled, demoDataDisabledResponse } from '@/lib/demoDataAccess';
import {



  applyDemoStudentToDrive,
  approveDemoPlacementDrive,
  createDemoPlacementDrive,
} from '@/lib/demoDataFactory';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;



async function __platform_POST(request) {
  if (!isDemoDataApiEnabled()) return demoDataDisabledResponse();
  try {
    const body = await request.json().catch(() => ({}));
    const tenantId = body?.tenantId ? String(body.tenantId).trim() : undefined;
    const driveId = body?.driveId ? String(body.driveId).trim() : undefined;
    const step = String(body?.step || 'request').trim().toLowerCase();

    let payload;
    if (step === 'approve') {
      payload = await approveDemoPlacementDrive({ tenantId, driveId });
    } else if (step === 'apply' || step === 'apply-student') {
      payload = await applyDemoStudentToDrive({ tenantId, driveId });
    } else if (step === 'request-approve' || step === 'request_and_approve') {
      payload = await createDemoPlacementDrive({ tenantId, autoApprove: true });
    } else {
      payload = await createDemoPlacementDrive({ tenantId, autoApprove: false });
    }

    const status = payload.ok === false ? 400 : 200;
    return NextResponse.json({ timestamp: new Date().toISOString(), ...payload }, { status });
  } catch (e) {
    console.error('POST /api/demo/placement-drive', e);
    return NextResponse.json({ ok: false, error: e.message || 'Placement drive action failed' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_demo_placement_drive' });
export const POST = __platformApiHandlers.POST;
