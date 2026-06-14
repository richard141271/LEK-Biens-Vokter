'use client';

import { useEffect, useState } from 'react';
import { hasSigningAttention } from '@/lib/signing';

type SigningAttentionRequest = {
  status?: string | null;
  recipient_signed_at?: string | null;
  sender_signed_at?: string | null;
  completed_email_delivery_status?: string | null;
};

export function useSigningAttention() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchAttention = async () => {
      try {
        const res = await fetch('/api/signing?scope=all', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;

        const requests = Array.isArray(data?.requests) ? (data.requests as SigningAttentionRequest[]) : [];
        const nextCount = requests.filter((item) => hasSigningAttention(item)).length;
        if (!cancelled) {
          setCount(nextCount);
        }
      } catch {
        if (!cancelled) {
          setCount(0);
        }
      }
    };

    void fetchAttention();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    count,
    hasAttention: count > 0,
  };
}
