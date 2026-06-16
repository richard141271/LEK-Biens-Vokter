export type SignRequestStatus =
  | 'DRAFT'
  | 'SENT'
  | 'SIGNED_BY_RECIPIENT'
  | 'COMPLETED'
  | 'CANCELLED';

export type CompletedEmailDeliveryStatus = 'NOT_SENT' | 'SENT' | 'FAILED';
const NORWAY_TIME_ZONE = 'Europe/Oslo';

type SignRequestLike = {
  status?: string | null;
  recipient_signed_at?: string | null;
  sender_signed_at?: string | null;
  completed_email_delivery_status?: string | null;
};

export function normalizeSignRequestStatus(request: SignRequestLike | null | undefined): SignRequestStatus {
  if (!request) return 'DRAFT';

  if (request.status === 'CANCELLED') {
    return 'CANCELLED';
  }

  if (request.sender_signed_at) {
    return 'COMPLETED';
  }

  if (request.recipient_signed_at) {
    return 'SIGNED_BY_RECIPIENT';
  }

  if (request.status === 'DRAFT') {
    return 'DRAFT';
  }

  return 'SENT';
}

export function normalizeSignRequestRecord<T extends SignRequestLike>(request: T): T & { status: SignRequestStatus } {
  return {
    ...request,
    status: normalizeSignRequestStatus(request),
  };
}

export function getSignStatusMeta(status: string) {
  switch (status) {
    case 'DRAFT':
      return { label: 'Ikke sendt', cls: 'bg-gray-100 text-gray-700 border-gray-200' };
    case 'SIGNED_BY_RECIPIENT':
      return { label: 'Signert av mottaker', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'COMPLETED':
      return { label: 'Fullført', cls: 'bg-green-50 text-green-700 border-green-200' };
    case 'CANCELLED':
      return { label: 'Avbrutt', cls: 'bg-red-50 text-red-700 border-red-200' };
    default:
      return { label: 'Sendt', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
  }
}

export function getCompletedEmailDeliveryMeta(status?: string | null, source?: string | null) {
  const normalizedStatus = String(status || 'NOT_SENT').trim().toUpperCase() as CompletedEmailDeliveryStatus;
  const normalizedSource = String(source || '').trim().toLowerCase();

  if (normalizedStatus === 'SENT') {
    if (normalizedSource === 'manual') {
      return {
        label: 'Sendt manuelt',
        cls: 'bg-green-50 text-green-700 border-green-200',
        description: 'Kvitteringen er sendt manuelt fra signeringssiden.',
      };
    }

    return {
      label: 'Sendt automatisk',
      cls: 'bg-green-50 text-green-700 border-green-200',
      description: 'Kvitteringen ble sendt automatisk da dokumentet ble fullført.',
    };
  }

  if (normalizedStatus === 'FAILED') {
    if (normalizedSource === 'manual') {
      return {
        label: 'Manuell sending feilet',
        cls: 'bg-red-50 text-red-700 border-red-200',
        description: 'Siste manuelle forsøk på å sende kvitteringen feilet.',
      };
    }

    return {
      label: 'Automatisk sending feilet',
      cls: 'bg-red-50 text-red-700 border-red-200',
      description: 'Det automatiske forsøket på å sende kvitteringen feilet.',
    };
  }

  return {
    label: 'Ikke sendt ennå',
    cls: 'bg-gray-100 text-gray-700 border-gray-200',
    description: 'Kvitteringen har ikke blitt sendt ennå.',
  };
}

export function hasSigningAttention(request: SignRequestLike | null | undefined) {
  const normalizedStatus = normalizeSignRequestStatus(request);
  if (normalizedStatus === 'SIGNED_BY_RECIPIENT') {
    return true;
  }

  if (normalizedStatus === 'COMPLETED') {
    const completedEmailStatus = String(request?.completed_email_delivery_status || 'NOT_SENT').trim().toUpperCase();
    return completedEmailStatus !== 'SENT';
  }

  return false;
}

export function needsCompletedEmailAttention(request: SignRequestLike | null | undefined) {
  const normalizedStatus = normalizeSignRequestStatus(request);
  if (normalizedStatus !== 'COMPLETED') {
    return false;
  }

  const completedEmailStatus = String(request?.completed_email_delivery_status || 'NOT_SENT').trim().toUpperCase();
  return completedEmailStatus !== 'SENT';
}

export function getBaseUrlFromHeaders(headers: Headers) {
  const proto = headers.get('x-forwarded-proto') || 'https';
  const host = headers.get('x-forwarded-host') || headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

export function buildPublicSigningUrl(baseUrl: string, token: string) {
  return `${baseUrl.replace(/\/$/, '')}/sign/${encodeURIComponent(token)}`;
}

export function buildPublicCompletedSigningUrl(baseUrl: string, token: string) {
  return `${baseUrl.replace(/\/$/, '')}/sign/ferdig/${encodeURIComponent(token)}`;
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
  return date.toLocaleString('nb-NO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: NORWAY_TIME_ZONE,
  });
}

export function formatSigningDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('nb-NO', {
    dateStyle: 'medium',
    timeZone: NORWAY_TIME_ZONE,
  });
}
