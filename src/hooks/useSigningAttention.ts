'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { hasSigningAttention, needsCompletedEmailAttention, normalizeSignRequestStatus } from '@/lib/signing';

type SigningAttentionRequest = {
  status?: string | null;
  recipient_signed_at?: string | null;
  sender_signed_at?: string | null;
  completed_email_delivery_status?: string | null;
};

export function useSigningAttention() {
  const pathname = usePathname();
  const [attentionCount, setAttentionCount] = useState(0);
  const [signatureCount, setSignatureCount] = useState(0);
  const [completedEmailCount, setCompletedEmailCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchAttention = async () => {
      try {
        const res = await fetch('/api/signing?scope=all', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;

        const requests = Array.isArray(data?.requests) ? (data.requests as SigningAttentionRequest[]) : [];
        const nextAttentionCount = requests.filter((item) => hasSigningAttention(item)).length;
        const nextSignatureCount = requests.filter((item) => normalizeSignRequestStatus(item) === 'SIGNED_BY_RECIPIENT').length;
        const nextCompletedEmailCount = requests.filter((item) => needsCompletedEmailAttention(item)).length;
        if (!cancelled) {
          setAttentionCount(nextAttentionCount);
          setSignatureCount(nextSignatureCount);
          setCompletedEmailCount(nextCompletedEmailCount);
        }
      } catch {
        if (!cancelled) {
          setAttentionCount(0);
          setSignatureCount(0);
          setCompletedEmailCount(0);
        }
      }
    };

    void fetchAttention();

    const refreshAttention = () => {
      void fetchAttention();
    };

    window.addEventListener('focus', refreshAttention);
    window.addEventListener('signing-attention-changed', refreshAttention as EventListener);
    document.addEventListener('visibilitychange', refreshAttention);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', refreshAttention);
      window.removeEventListener('signing-attention-changed', refreshAttention as EventListener);
      document.removeEventListener('visibilitychange', refreshAttention);
    };
  }, [pathname]);

  return {
    count: attentionCount,
    signatureCount,
    completedEmailCount,
    hasAttention: attentionCount > 0,
    hasSignatureAttention: signatureCount > 0,
    hasCompletedEmailAttention: completedEmailCount > 0,
  };
}
