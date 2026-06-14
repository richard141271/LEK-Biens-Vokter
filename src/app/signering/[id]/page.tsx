'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Copy, ExternalLink, FileText, Loader2, Mail, Phone, Send, ShieldCheck, XCircle } from 'lucide-react';
import { formatSigningTimestamp, getCompletedEmailDeliveryMeta, getSignStatusMeta } from '@/lib/signing';

type SignRequest = {
  id: string;
  title: string;
  description: string | null;
  recipient_name: string;
  recipient_email: string;
  recipient_phone: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  recipient_signed_at: string | null;
  sender_signed_at: string | null;
  recipient_signature_name: string | null;
  sender_signature_name: string | null;
  completed_email_delivery_status?: string | null;
  completed_email_delivery_source?: string | null;
  completed_email_last_attempt_at?: string | null;
  completed_email_sent_at?: string | null;
  completed_email_error?: string | null;
};

export default function SigneringDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String(params?.id || '');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [request, setRequest] = useState<SignRequest | null>(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [publicSignUrl, setPublicSignUrl] = useState('');
  const [publicCompletedUrl, setPublicCompletedUrl] = useState('');
  const [receiptPdfUrl, setReceiptPdfUrl] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState('');

  const fetchRequest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/signing/${id}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Kunne ikke hente signering');
      }
      setRequest(data.request || null);
      setPdfUrl(String(data?.pdfUrl || ''));
      setPublicSignUrl(String(data?.publicSignUrl || ''));
      setPublicCompletedUrl(String(data?.publicCompletedUrl || ''));
      setReceiptPdfUrl(data?.receiptPdfUrl ? String(data.receiptPdfUrl) : null);
      const nextSenderName = String(data?.senderName || '');
      setSignatureName((current) => current || nextSenderName);
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke hente signering');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    void fetchRequest();
  }, [id]);

  const copyLink = async () => {
    if (!publicSignUrl) return;
    await navigator.clipboard.writeText(publicSignUrl);
    alert('Lenken er kopiert.');
  };

  const copyCompletedLink = async () => {
    if (!publicCompletedUrl) return;
    await navigator.clipboard.writeText(publicCompletedUrl);
    alert('Kvitteringslenken er kopiert.');
  };

  const sendEmail = async () => {
    setActionLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/signing/${id}/send-email`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Kunne ikke sende e-post');
      }
      await fetchRequest();
      alert('Signeringslenke sendt på e-post.');
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke sende e-post');
    } finally {
      setActionLoading(false);
    }
  };

  const sendCompletedEmail = async () => {
    setActionLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/signing/${id}/send-completed-email`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Kunne ikke sende e-post');
      }
      setNotice('Kvittering sendt på e-post.');
      await fetchRequest();
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke sende e-post');
    } finally {
      setActionLoading(false);
    }
  };

  const sendSms = (url: string, mode: 'sign' | 'completed') => {
    if (!request?.recipient_phone) {
      alert('Legg inn telefonnummer på mottaker for å sende via SMS.');
      return;
    }

    const intro =
      mode === 'completed'
        ? `Hei ${request.recipient_name}, her er ferdig signert dokument i LEK-Signering: `
        : `Hei ${request.recipient_name}, her er signeringslenken din i LEK-Signering: `;

    const smsUrl = `sms:${request.recipient_phone}?&body=${encodeURIComponent(`${intro}${url}`)}`;
    window.location.href = smsUrl;
  };

  const generateReceipt = async () => {
    setActionLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/signing/${id}/generate-receipt`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Kunne ikke generere kvittering');
      }
      setReceiptPdfUrl(data?.receiptPdfUrl ? String(data.receiptPdfUrl) : null);
      setPublicCompletedUrl(String(data?.publicCompletedUrl || publicCompletedUrl));
      alert('Signeringskvittering er generert.');
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke generere kvittering');
    } finally {
      setActionLoading(false);
    }
  };

  const senderSign = async () => {
    setActionLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/signing/${id}/sender-sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Kunne ikke signere som avsender');
      }
      if (data?.completedEmailError) {
        setNotice(
          `Dokumentet er fullført, men automatisk kvittering på e-post feilet: ${String(data.completedEmailError)}`,
        );
      } else if (data?.completedEmailSent) {
        setNotice('Dokumentet er fullført og kvittering er sendt automatisk på e-post.');
      } else {
        setNotice('Dokumentet er fullført.');
      }
      await fetchRequest();
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke signere som avsender');
    } finally {
      setActionLoading(false);
    }
  };

  const cancelRequest = async () => {
    if (!window.confirm('Vil du avbryte denne signeringen?')) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/signing/${id}/cancel`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Kunne ikke avbryte signeringen');
      }
      await fetchRequest();
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke avbryte signeringen');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Laster signering...</div>;
  }

  if (!request) {
    return <div className="p-8 text-center text-gray-500">Fant ikke signering.</div>;
  }

  const status = getSignStatusMeta(request.status);
  const isAwaitingSender = request.status === 'SIGNED_BY_RECIPIENT';
  const isCompleted = request.status === 'COMPLETED';
  const completedEmailStatusMeta = getCompletedEmailDeliveryMeta(
    request.completed_email_delivery_status,
    request.completed_email_delivery_source,
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/signering')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="min-w-0">
            <div className={`inline-flex items-center gap-2 text-[11px] font-black px-2 py-1 rounded-full border ${status.cls}`}>{status.label}</div>
            <h1 className="text-xl font-black text-gray-900 mt-2 break-words">{request.title}</h1>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-4 grid lg:grid-cols-[1.1fr_0.9fr] gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
            <div className="font-black text-gray-900">PDF-forhåndsvisning</div>
            {pdfUrl ? (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-bold px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200"
              >
                <ExternalLink className="w-4 h-4" />
                Åpne PDF
              </a>
            ) : null}
          </div>
          {pdfUrl ? (
            <iframe title="PDF" src={pdfUrl} className="w-full h-[75vh] bg-gray-50" />
          ) : (
            <div className="p-8 text-sm text-gray-500">PDF kunne ikke lastes.</div>
          )}
        </div>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <span>{notice}</span>
            </div>
          )}

          {isAwaitingSender && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <div className="font-black text-emerald-900">Ny signering mottatt</div>
              <div className="text-sm text-emerald-900 mt-2">
                Signert av {request.recipient_signature_name || request.recipient_name}
              </div>
              <div className="text-xs text-emerald-800 mt-1">{formatSigningTimestamp(request.recipient_signed_at)}</div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-4">
            <div>
              <div className="text-xs font-black text-gray-500 uppercase">Beskrivelse</div>
              <div className="text-sm text-gray-700 mt-1 break-words">{request.description || 'Ingen beskrivelse lagt inn.'}</div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <div className="text-xs font-black text-gray-500 uppercase">Mottaker</div>
                <div className="font-bold text-gray-900 mt-1">{request.recipient_name}</div>
                <div className="text-sm text-gray-600 break-all">{request.recipient_email}</div>
                {request.recipient_phone ? <div className="text-sm text-gray-600">{request.recipient_phone}</div> : null}
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <div className="text-xs font-black text-gray-500 uppercase">Signaturstatus</div>
                <div className="text-sm text-gray-700 mt-1">Mottaker: {request.recipient_signed_at ? 'Signert' : 'Venter'}</div>
                <div className="text-sm text-gray-700">Avsender: {request.sender_signed_at ? 'Signert' : 'Venter'}</div>
              </div>
            </div>

            <div className="space-y-2">
              {!isCompleted ? (
                <>
                  <div className="text-xs font-black text-gray-500 uppercase">Signeringslenke</div>
                  <div className="border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-700 break-all bg-gray-50">{publicSignUrl}</div>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={copyLink}
                      className="inline-flex items-center justify-center gap-2 bg-white border border-gray-300 py-3 rounded-xl text-sm font-bold"
                    >
                      <Copy className="w-4 h-4" />
                      Kopier lenke
                    </button>
                    <button
                      type="button"
                      onClick={sendEmail}
                      disabled={actionLoading}
                      className="inline-flex items-center justify-center gap-2 bg-white border border-gray-300 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                    >
                      <Mail className="w-4 h-4" />
                      Send via e-post
                    </button>
                    <button
                      type="button"
                      onClick={() => sendSms(publicSignUrl, 'sign')}
                      className="inline-flex items-center justify-center gap-2 bg-white border border-gray-300 py-3 rounded-xl text-sm font-bold"
                    >
                      <Phone className="w-4 h-4" />
                      Send via SMS
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xs font-black text-gray-500 uppercase">Ferdig signert lenke</div>
                  <div className="border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-700 break-all bg-gray-50">{publicCompletedUrl}</div>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={copyCompletedLink}
                      className="inline-flex items-center justify-center gap-2 bg-white border border-gray-300 py-3 rounded-xl text-sm font-bold"
                    >
                      <Copy className="w-4 h-4" />
                      Kopier lenke
                    </button>
                    <button
                      type="button"
                      onClick={sendCompletedEmail}
                      disabled={actionLoading}
                      className="inline-flex items-center justify-center gap-2 bg-white border border-gray-300 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                    >
                      <Mail className="w-4 h-4" />
                      Send kvittering
                    </button>
                    <button
                      type="button"
                      onClick={() => sendSms(publicCompletedUrl, 'completed')}
                      className="inline-flex items-center justify-center gap-2 bg-white border border-gray-300 py-3 rounded-xl text-sm font-bold"
                    >
                      <Phone className="w-4 h-4" />
                      Send via SMS
                    </button>
                  </div>
                </>
              )}
            </div>

            {isCompleted ? (
              <div className="space-y-2">
                <div className={`rounded-xl border p-3 ${completedEmailStatusMeta.cls}`}>
                  <div className="text-xs font-black uppercase opacity-80">Leveringsstatus</div>
                  <div className="font-black mt-1">{completedEmailStatusMeta.label}</div>
                  <div className="text-sm mt-1">{completedEmailStatusMeta.description}</div>
                  {request.completed_email_last_attempt_at ? (
                    <div className="text-xs mt-2">
                      Sist forsøk: {formatSigningTimestamp(request.completed_email_last_attempt_at)}
                    </div>
                  ) : null}
                  {request.completed_email_sent_at ? (
                    <div className="text-xs mt-1">
                      Sist sendt: {formatSigningTimestamp(request.completed_email_sent_at)}
                    </div>
                  ) : null}
                  {request.completed_email_error ? (
                    <div className="text-xs mt-2 break-words">
                      Feilmelding: {request.completed_email_error}
                    </div>
                  ) : null}
                </div>

                <div className="text-xs font-black text-gray-500 uppercase">Signeringskvittering</div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {receiptPdfUrl ? (
                    <a
                      href={receiptPdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-white border border-gray-300 py-3 rounded-xl text-sm font-bold"
                    >
                      <FileText className="w-4 h-4" />
                      Last ned kvittering
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={generateReceipt}
                      disabled={actionLoading}
                      className="inline-flex items-center justify-center gap-2 bg-white border border-gray-300 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Generer kvittering
                    </button>
                  )}
                  <a
                    href={publicCompletedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-white border border-gray-300 py-3 rounded-xl text-sm font-bold"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Åpne ferdig side
                  </a>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="text-xs font-black text-gray-500 uppercase">Signaturer</div>
              <div className="rounded-xl border border-gray-200 p-3 bg-gray-50 text-sm">
                <div className="font-bold text-gray-900">Mottaker signerte</div>
                <div className="text-gray-700 mt-1">
                  {request.recipient_signature_name || '-'} • {formatSigningTimestamp(request.recipient_signed_at)}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 p-3 bg-gray-50 text-sm">
                <div className="font-bold text-gray-900">Avsender signerte</div>
                <div className="text-gray-700 mt-1">
                  {request.sender_signature_name || '-'} • {formatSigningTimestamp(request.sender_signed_at)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-gray-500 uppercase">Signer som avsender</label>
              <input
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm"
                placeholder="Skriv navnet ditt"
              />
              <button
                type="button"
                disabled={actionLoading || !signatureName.trim() || !isAwaitingSender}
                onClick={senderSign}
                className="w-full inline-flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl text-sm font-black disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Signer som avsender
              </button>
              {!isAwaitingSender ? (
                <div className="text-xs text-gray-500">Avsender kan signere når mottaker har signert.</div>
              ) : null}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={actionLoading || request.status === 'COMPLETED' || request.status === 'CANCELLED'}
                onClick={cancelRequest}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-white border border-red-200 text-red-700 py-3 rounded-xl text-sm font-black disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Avbryt
              </button>
              <Link
                href="/archive"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-800 py-3 rounded-xl text-sm font-black"
              >
                <FileText className="w-4 h-4" />
                Arkiv
              </Link>
            </div>

            <div className="text-xs text-gray-500">
              Opprettet {formatSigningTimestamp(request.created_at)} • Sist oppdatert {formatSigningTimestamp(request.updated_at)}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
