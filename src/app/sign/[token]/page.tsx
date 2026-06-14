'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { formatSigningTimestamp, getSignStatusMeta } from '@/lib/signing';

type PublicSignRequest = {
  id: string;
  title: string;
  description: string | null;
  recipient_name: string;
  status: string;
  recipient_signed_at: string | null;
  sender_signed_at: string | null;
  recipient_signature_name: string | null;
  sender_signature_name: string | null;
};

export default function PublicSignPage() {
  const params = useParams<{ token: string }>();
  const token = String(params?.token || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<PublicSignRequest | null>(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [hasRead, setHasRead] = useState(false);
  const [signatureName, setSignatureName] = useState('');

  const fetchRequest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/signing/token/${encodeURIComponent(token)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Fant ikke signering');
      }
      setRequest(data.request || null);
      setPdfUrl(String(data?.pdfUrl || ''));
    } catch (err: any) {
      setError(err?.message || 'Fant ikke signering');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    void fetchRequest();
  }, [token]);

  const sign = async () => {
    if (!request) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/signing/token/${encodeURIComponent(token)}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureName, hasRead }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Kunne ikke signere');
      }
      await fetchRequest();
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke signere');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Laster signering...</div>;
  }

  if (!request) {
    return <div className="p-8 text-center text-gray-500">Fant ikke signering.</div>;
  }

  const status = getSignStatusMeta(request.status);
  const recipientAlreadySigned = Boolean(request.recipient_signed_at);
  const completed = request.status === 'COMPLETED';
  const blocked = request.status === 'CANCELLED' || completed || recipientAlreadySigned;

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <main className="max-w-5xl mx-auto px-4 grid lg:grid-cols-[1.1fr_0.9fr] gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
            <div className="font-black text-gray-900">Dokument</div>
            <div className={`text-[11px] font-black px-2 py-1 rounded-full border ${status.cls}`}>{status.label}</div>
          </div>
          {pdfUrl ? (
            <iframe title="PDF" src={pdfUrl} className="w-full h-[78vh] bg-gray-50" />
          ) : (
            <div className="p-6 text-sm text-gray-500">PDF kunne ikke lastes.</div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <div className="inline-flex items-center gap-2 text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
              <FileText className="w-4 h-4" />
              LEK-Signering
            </div>
            <h1 className="text-2xl font-black text-gray-900 mt-3 break-words">{request.title}</h1>
            <p className="text-sm text-gray-600 mt-2 break-words">{request.description || 'Ingen beskrivelse lagt inn.'}</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {recipientAlreadySigned ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-white border border-emerald-200 p-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <div className="font-black text-emerald-900">
                    {completed ? 'Dokumentet er ferdig signert' : 'Du har allerede signert'}
                  </div>
                  <div className="text-sm text-emerald-900 mt-1">
                    {request.recipient_signature_name || request.recipient_name} • {formatSigningTimestamp(request.recipient_signed_at)}
                  </div>
                  {request.sender_signed_at ? (
                    <div className="text-sm text-emerald-900 mt-1">
                      Avsender signerte {formatSigningTimestamp(request.sender_signed_at)}
                    </div>
                  ) : (
                    <div className="text-sm text-emerald-900 mt-1">Avsender blir varslet og kan signere na.</div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {!blocked ? (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
              <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-4 bg-gray-50">
                <input type="checkbox" checked={hasRead} onChange={(e) => setHasRead(e.target.checked)} className="mt-1 w-4 h-4" />
                <span className="text-sm text-gray-700">Jeg har lest dokumentet og er klar til aa signere.</span>
              </label>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1">Navn</label>
                <input
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm"
                  placeholder="Skriv navnet ditt"
                />
              </div>

              <button
                type="button"
                disabled={saving || !hasRead || !signatureName.trim()}
                onClick={sign}
                className="w-full bg-gray-900 text-white font-black py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Signer
              </button>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
