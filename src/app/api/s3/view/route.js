import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createDownloadUrlForKey, isS3Configured } from '@/lib/s3';

function extractS3KeyAndHost(rawUrl) {
  try {
    const u = new URL(String(rawUrl || ''));
    if (!u.hostname || !u.pathname) return null;
    const bucket = process.env.S3_BUCKET_NAME;
    const region = process.env.AWS_REGION;
    const host = String(u.hostname || '').toLowerCase();

    if (bucket && region) {
      const virtualHost = `${bucket}.s3.${region}.amazonaws.com`.toLowerCase();
      if (host === virtualHost) {
        const key = decodeURIComponent(u.pathname.replace(/^\/+/, ''));
        if (key) return { host: u.hostname, key };
      }

      const pathStyleHost = `s3.${region}.amazonaws.com`.toLowerCase();
      if (host === pathStyleHost) {
        const parts = u.pathname.replace(/^\/+/, '').split('/').map((part) => decodeURIComponent(part));
        if (parts[0] === bucket && parts.length > 1) {
          const key = parts.slice(1).join('/');
          if (key) return { host: u.hostname, key };
        }
      }
    }

    const key = decodeURIComponent(u.pathname.replace(/^\/+/, ''));
    if (!key) return null;
    return { host: u.hostname, key };
  } catch {
    return null;
  }
}

function isHostInConfiguredBucket(host) {
  const bucket = process.env.S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;
  if (!bucket || !region) return false;
  const normalized = String(host || '').toLowerCase();
  const virtualHost = `${bucket}.s3.${region}.amazonaws.com`.toLowerCase();
  const pathStyleHost = `s3.${region}.amazonaws.com`.toLowerCase();
  return normalized === virtualHost || normalized === pathStyleHost;
}

async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id && !session?.user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isS3Configured()) {
      return NextResponse.json({ error: 'S3 not configured' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const sourceUrl = String(searchParams.get('url') || '').trim();
    if (!sourceUrl) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

    const parsed = extractS3KeyAndHost(sourceUrl);
    if (!parsed || !isHostInConfiguredBucket(parsed.host)) {
      return NextResponse.json({ error: 'Unsupported S3 host' }, { status: 400 });
    }

    const { downloadUrl } = await createDownloadUrlForKey(parsed.key, 60 * 30);
    return NextResponse.redirect(downloadUrl);
  } catch (e) {
    console.error('GET /api/s3/view', e);
    return NextResponse.json({ error: 'Could not open file' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_s3_view' });
export const GET = __platformApiHandlers.GET;
