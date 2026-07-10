import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import { getPlatformSettings } from '@/lib/platformSettings';
import { normalizeMarketingWebsiteUrl } from '@/lib/marketingWebsiteUrl';
import { buildPublicSupportConfig } from '@/lib/supportContact';

/**
 * Public read-only config for marketing links and login support (no auth).
 */
async function __platform_GET() {
  try {
    const s = await getPlatformSettings();
    const marketingWebsiteUrl = normalizeMarketingWebsiteUrl(s.marketingWebsiteUrl);
    return NextResponse.json(
      { marketingWebsiteUrl, sessionAdsEnabled: Boolean(s.sessionAdsEnabled), ...buildPublicSupportConfig(s) },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  } catch (e) {
    console.error('GET /api/public/site-config', e);
    return NextResponse.json({ marketingWebsiteUrl: '' }, { status: 200 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_public_site_config' });
export const GET = __platformApiHandlers.GET;
