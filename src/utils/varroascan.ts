import { isStagingLikeHost } from '@/lib/signing';

const VARROASCAN_STAGING_URL = 'https://lek-varroa-scan-staging.vercel.app';
const VARROASCAN_PROD_URL = 'https://lek-varroa-scan.vercel.app';

function trimTrailingSlash(value: string) {
  return String(value || '').replace(/\/+$/, '');
}

export function getVarroaScanBaseUrl(host?: string) {
  const configuredBaseUrl = trimTrailingSlash(process.env.NEXT_PUBLIC_VARROASCAN_URL || '');
  if (configuredBaseUrl) return configuredBaseUrl;
  return isStagingLikeHost(host || '') ? VARROASCAN_STAGING_URL : VARROASCAN_PROD_URL;
}

export function buildVarroaScanUrl(
  path: string,
  options?: {
    host?: string;
    source?: string;
    returnTo?: string;
    params?: Record<string, string | null | undefined>;
  }
) {
  const baseUrl = getVarroaScanBaseUrl(options?.host);
  const url = new URL(path, `${baseUrl}/`);

  if (options?.source) {
    url.searchParams.set('source', options.source);
  }

  if (options?.returnTo) {
    url.searchParams.set('returnTo', options.returnTo);
  }

  if (options?.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value == null || value === '') continue;
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}
