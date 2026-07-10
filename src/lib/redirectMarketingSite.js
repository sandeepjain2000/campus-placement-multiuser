import { redirect } from 'next/navigation';
import { getPlatformSettings } from '@/lib/platformSettings';
import { normalizeMarketingWebsiteUrl } from '@/lib/marketingWebsiteUrl';

/** If `marketingWebsiteUrl` is set in platform settings, send the visitor to that public site. */
export async function redirectIfMarketingSiteConfigured() {
  const s = await getPlatformSettings();
  const url = normalizeMarketingWebsiteUrl(s.marketingWebsiteUrl);
  if (url) redirect(url);
}
