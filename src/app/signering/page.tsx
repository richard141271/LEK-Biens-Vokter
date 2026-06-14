'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Archive, ArrowLeft, Bell, CheckCircle2, ChevronRight, CircleDot, FileText, MailCheck, MailWarning, Plus, Trash2 } from 'lucide-react';
import { getCompletedEmailDeliveryMeta, getSignStatusMeta, formatSigningTimestamp, hasSigningAttention, needsCompletedEmailAttention } from '@/lib/signing';
import { useSigningAttention } from '@/hooks/useSigningAttention';

type SignRequest = {
  id: string;
  title: string;
  description: string | null;
  recipient_name: string;
  recipient_email: string;
  status: string;
  created_at: string;
  updated_at: string;
  recipient_signed_at: string | null;
  recipient_signature_name: string | null;
  sender_signed_at: string | null;
  completed_email_delivery_status?: string | null;
  completed_email_delivery_source?: string | null;
};

function isStagingHost() {
  if (typeof window === 'undefined') return false;
  const host = window.location.host.toLowerCase();
  return host.includes('staging') || host.includes('localhost');
}

export default function SigneringPage() {
  const router = useRouter();
  const { hasCompletedEmailAttention, completedEmailCount } = useSigningAttention();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<SignRequest[]>([]);
  const [senderName, setSenderName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/signing?scope=all', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Kunne ikke hente signeringer');
      }
      setRequests(Array.isArray(data?.requests) ? data.requests : []);
      setSenderName(String(data?.senderName || ''));
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke hente signeringer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRequests();
  }, []);

  const attentionItems = useMemo(
    () => requests.filter((item) => hasSigningAttention(item)).sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)),
    [requests],
  );

  const activeRequests = useMemo(
    () => requests.filter((item) => item.status !== 'COMPLETED' && item.status !== 'CANCELLED'),
    [requests],
  );

  const createDemoData = async () => {
    setCreatingDemo(true);
    setError(null);
    try {
      const res = await fetch('/api/signing/demo', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Kunne ikke opprette demo-data');
      }
      await fetchRequests();
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke opprette demo-data');
    } finally {
      setCreatingDemo(false);
    }
  };

  const deleteRequest = async (id: string, title: string) => {
    if (!window.confirm(`Vil du slette signeringen "${title}"? Dette kan ikke angres.`)) return;

    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/signing/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Kunne ikke slette signering');
      }
      await fetchRequests();
      window.dispatchEvent(new Event('signing-attention-changed'));
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke slette signering');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/settings')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-xl font-black text-gray-900">LEK-Signering</h1>
              <p className="text-xs text-gray-500">Digital signering av PDF-avtaler mellom brukere.</p>
            </div>
          </div>
          <Link
            href="/signering/ny"
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold"
          >
            <Plus className="w-4 h-4" />
            Ny signering
          </Link>
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {attentionItems.map((item) => {
          const needsSignature = item.status === 'SIGNED_BY_RECIPIENT';
          const completedEmailMeta =
            item.status === 'COMPLETED'
              ? getCompletedEmailDeliveryMeta(item.completed_email_delivery_status, item.completed_email_delivery_source)
              : null;

          return (
          <Link
            key={`alert-${item.id}`}
            href={`/signering/${item.id}`}
            className={`block rounded-2xl p-4 ${
              needsSignature
                ? 'bg-emerald-50 border border-emerald-200'
                : String(item.completed_email_delivery_status || 'NOT_SENT').toUpperCase() === 'FAILED'
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-amber-50 border border-amber-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`bg-white rounded-full p-2 ${
                needsSignature
                  ? 'border border-emerald-200'
                  : String(item.completed_email_delivery_status || 'NOT_SENT').toUpperCase() === 'FAILED'
                    ? 'border border-red-200'
                    : 'border border-amber-200'
              }`}>
                {needsSignature ? (
                  <Bell className="w-5 h-5 text-emerald-700" />
                ) : String(item.completed_email_delivery_status || 'NOT_SENT').toUpperCase() === 'FAILED' ? (
                  <MailWarning className="w-5 h-5 text-red-700" />
                ) : (
                  <CircleDot className="w-5 h-5 text-amber-700" />
                )}
              </div>
              <div>
                <div className={`font-black ${
                  needsSignature
                    ? 'text-emerald-900'
                    : String(item.completed_email_delivery_status || 'NOT_SENT').toUpperCase() === 'FAILED'
                      ? 'text-red-900'
                      : 'text-amber-900'
                }`}>
                  {needsSignature ? 'Ny signering mottatt' : completedEmailMeta?.label || 'Kvittering venter'}
                </div>
                <div className="text-sm font-bold text-gray-900 mt-1">{item.title}</div>
                {needsSignature ? (
                  <>
                    <div className="text-sm text-emerald-900 mt-1">
                      Signert av: {item.recipient_signature_name || item.recipient_name}
                    </div>
                    <div className="text-xs text-emerald-800 mt-1">{formatSigningTimestamp(item.recipient_signed_at)}</div>
                  </>
                ) : (
                  <>
                    <div className={`text-sm mt-1 ${
                      String(item.completed_email_delivery_status || 'NOT_SENT').toUpperCase() === 'FAILED'
                        ? 'text-red-900'
                        : 'text-amber-900'
                    }`}>
                      Mottaker: {item.recipient_name} • {item.recipient_email}
                    </div>
                    <div className={`text-xs mt-1 ${
                      String(item.completed_email_delivery_status || 'NOT_SENT').toUpperCase() === 'FAILED'
                        ? 'text-red-800'
                        : 'text-amber-800'
                    }`}>
                      Åpne saken for å sende kvitteringen på nytt eller se feilmelding.
                    </div>
                  </>
                )}
              </div>
            </div>
          </Link>
        )})}

        <div className="grid md:grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="text-xs font-black text-gray-500 uppercase">Aktive</div>
            <div className="text-3xl font-black text-gray-900 mt-1">{activeRequests.length}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="text-xs font-black text-gray-500 uppercase">Venter på deg</div>
            <div className="text-3xl font-black text-emerald-700 mt-1">{attentionItems.length}</div>
          </div>
          <Link href="/archive" className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-gray-300 transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black text-gray-500 uppercase">Arkiv</div>
                <div className="text-lg font-black text-gray-900 mt-1">Se fullførte avtaler</div>
              </div>
              <div className="relative">
                <Archive className="w-5 h-5 text-gray-500" />
                {hasCompletedEmailAttention && (
                  <span className="w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full absolute -top-1 -right-1 animate-pulse" />
                )}
              </div>
            </div>
            {hasCompletedEmailAttention && (
              <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-black px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                {completedEmailCount} kvittering{completedEmailCount === 1 ? '' : 'er'} krever oppfølging
              </div>
            )}
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {isStagingHost() && !loading && requests.length === 0 && (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-5">
            <div className="font-black text-gray-900">Demo-data for staging</div>
            <div className="text-sm text-gray-600 mt-1">Opprett noen demo-signeringer slik at modulen kan testes med en gang.</div>
            <button
              type="button"
              onClick={createDemoData}
              disabled={creatingDemo}
              className="mt-4 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
            >
              {creatingDemo ? 'Oppretter demo-data...' : 'Legg inn demo-data'}
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
            <div>
              <div className="font-black text-gray-900">Mine signeringer</div>
              <div className="text-xs text-gray-500">Avsender: {senderName || 'Ikke satt'}</div>
            </div>
            <button onClick={() => void fetchRequests()} className="text-sm font-bold px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200">
              Oppdater
            </button>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-gray-500">Laster signeringer...</div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 mx-auto flex items-center justify-center">
                <FileText className="w-7 h-7 text-gray-400" />
              </div>
              <div className="font-black text-gray-900 mt-4">Ingen signeringer enda</div>
              <div className="text-sm text-gray-500 mt-1">Last opp en PDF og send ut din første signeringslenke.</div>
              <Link href="/signering/ny" className="inline-flex mt-4 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold">
                Opprett signering
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {requests.map((item) => {
                const status = getSignStatusMeta(item.status);
                const completedEmailMeta = item.status === 'COMPLETED'
                  ? getCompletedEmailDeliveryMeta(item.completed_email_delivery_status, item.completed_email_delivery_source)
                  : null;
                const needsCompletedEmail = needsCompletedEmailAttention(item);
                return (
                  <div key={item.id} className="px-4 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/signering/${item.id}`} className={`text-[11px] font-black px-2 py-1 rounded-full border ${status.cls}`}>
                            {status.label}
                          </Link>
                          <button
                            type="button"
                            onClick={() => void deleteRequest(item.id, item.title)}
                            disabled={deletingId === item.id}
                            className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-full border bg-red-50 text-red-700 border-red-200 disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {deletingId === item.id ? 'Sletter...' : 'Slett'}
                          </button>
                          {item.status === 'SIGNED_BY_RECIPIENT' && (
                            <div className="text-[11px] font-black px-2 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                              Klar for din signatur
                            </div>
                          )}
                          {completedEmailMeta && (
                            <div className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-full border ${completedEmailMeta.cls}`}>
                              {String(item.completed_email_delivery_status || 'NOT_SENT').toUpperCase() === 'SENT' ? (
                                <MailCheck className="w-3.5 h-3.5" />
                              ) : String(item.completed_email_delivery_status || 'NOT_SENT').toUpperCase() === 'FAILED' ? (
                                <MailWarning className="w-3.5 h-3.5" />
                              ) : (
                                <CircleDot className="w-3.5 h-3.5" />
                              )}
                              {completedEmailMeta.label}
                            </div>
                          )}
                        </div>
                        <Link href={`/signering/${item.id}`} className="block">
                          <div className="font-black text-gray-900 mt-2 break-words">{item.title}</div>
                          <div className="text-sm text-gray-600 mt-1 break-words">
                            {item.description || `${item.recipient_name} • ${item.recipient_email}`}
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            Opprettet {formatSigningTimestamp(item.created_at)} • Sist oppdatert {formatSigningTimestamp(item.updated_at)}
                          </div>
                        </Link>
                      </div>
                      <Link href={`/signering/${item.id}`} className="shrink-0 flex items-center gap-2">
                        {item.status === 'COMPLETED' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : null}
                        {needsCompletedEmail ? (
                          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" aria-hidden="true" />
                        ) : null}
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
