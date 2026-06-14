export type SignRequestStatus =
  | 'DRAFT'
  | 'SENT'
  | 'SIGNED_BY_RECIPIENT'
  | 'COMPLETED'
  | 'CANCELLED';

export function getSignStatusMeta(status: string) {
  switch (status) {
    case 'DRAFT':
      return { label: 'Kladd', cls: 'bg-gray-100 text-gray-700 border-gray-200' };
    case 'SIGNED_BY_RECIPIENT':
      return { label: 'Signert av mottaker', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'COMPLETED':
      return { label: 'Fullfort', cls: 'bg-green-50 text-green-700 border-green-200' };
    case 'CANCELLED':
      return { label: 'Avbrutt', cls: 'bg-red-50 text-red-700 border-red-200' };
    default:
      return { label: 'Sendt', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
  }
}

export function getBaseUrlFromHeaders(headers: Headers) {
  const proto = headers.get('x-forwarded-proto') || 'https';
  const host = headers.get('x-forwarded-host') || headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

export function buildPublicSigningUrl(baseUrl: string, token: string) {
  return `${baseUrl.replace(/\/$/, '')}/sign/${encodeURIComponent(token)}`;
}

export function isStagingLikeHost(host: string) {
  const normalized = String(host || '').trim().toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === 'staging.lekbie.no' ||
    normalized.endsWith('.staging.lekbie.no') ||
    normalized === 'lek-biens-vokter-staging.vercel.app' ||
    normalized.endsWith('-staging.vercel.app') ||
    normalized.includes('staging')
  );
}

export function formatSigningTimestamp(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('nb-NO', { dateStyle: 'medium', timeStyle: 'short' });
}
