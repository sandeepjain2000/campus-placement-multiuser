import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createTenantLogoPresign, isS3Configured } from '@/lib/s3';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']);
const MAX_BYTES = 2 * 1024 * 1024;

function getTenantId(session) {
  return session?.user?.tenant_id ?? session?.user?.tenantId ?? null;
}

async function __platform_POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isS3Configured()) {
      return NextResponse.json({ error: 'S3 not configured' }, { status: 503 });
    }
    const tenantId = getTenantId(session);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const body = await req.json();
    const fileName = String(body.fileName || 'logo');
    const contentType = String(body.contentType || 'application/octet-stream');
    const fileSize = Number(body.fileSize || 0);
    if (fileSize > MAX_BYTES) {
      return NextResponse.json({ error: 'Image too large (max 2MB)' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json({ error: 'Use JPEG, PNG, WebP, or GIF' }, { status: 400 });
    }

    const out = await createTenantLogoPresign({
      tenantId,
      fileName,
      contentType,
    });
    return NextResponse.json(out);
  } catch (e) {
    console.error('POST /api/college/settings/logo/presign', e);
    return NextResponse.json({ error: 'Presign failed' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_college_settings_logo_presign' });
export const POST = __platformApiHandlers.POST;
