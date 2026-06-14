'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertCircle, Download, FileText, Loader2, ShieldCheck } from 'lucide-react';
import { formatSigningTimestamp } from '@/lib/signing';

type CompletedRequest = {
  id: string;
  title: string;
  description: string | null;
  recipient_name: string;
  recipient_email: string;
  status: string;
  recipient_signed_at: string | null;
  sender_signed_at: string | null;
  recipient_signature_name: string | null;
  sender_signature_name: string | null;
};

export default function CompletedSigningPage() {
  const params = useParams<{ token: string }>();
  const token = String(params?.token || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<CompletedRequest | null>(null);
  const [completedPdfUrl, setCompletedPdfUrl] = useState('');
  const [receiptPdfUrl, setReceiptPdfUrl] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/signing/token/${encodeURIComponent(token)}/completed`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Kunne ikke hente ferdig signering');
      }
      setRequest(data.request || null);
      setCompletedPdfUrl(String(data?.completedPdfUrl || ''));
      setReceiptPdfUrl(data?.receiptPdfUrl ? String(data.receiptPdfUrl) : null);
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke hente ferdig signering');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    void fetchData();
  }, [token]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Laster ferdig signering...</div>;
  }

  if (!request) {
    return <div className="p-8 text-center text-gray-500">Fant ikke signering.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <main className="max-w-5xl mx-auto px-4 space-y-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <div className="inline-flex items-center gap-2 text-xs font-black text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
            <ShieldCheck className="w-4 h-4" />
            Ferdig signert
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-3 break-words">{request.title}</h1>
          <p className="text-sm text-gray-600 mt-2 break-words">{request.description || 'Ingen beskrivelse lagt inn.'}</p>

          <div className="grid md:grid-cols-2 gap-3 mt-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <div className="text-xs font-black text-gray-500 uppercase">Mottaker</div>
              <div className="font-bold text-gray-900 mt-1">{request.recipient_signature_name || request.recipient_name}</div>
              <div className="text-sm text-gray-600 break-all">{request.recipient_email}</div>
              <div className="text-xs text-gray-500 mt-2">Signert {formatSigningTimestamp(request.recipient_signed_at)}</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <div className="text-xs font-black text-gray-500 uppercase">Avsender</div>
              <div className="font-bold text-gray-900 mt-1">{request.sender_signature_name || '-'}</div>
              <div className="text-xs text-gray-500 mt-2">Signert {formatSigningTimestamp(request.sender_signed_at)}</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <a
              href={completedPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl text-sm font-black"
            >
              <Download className="w-4 h-4" />
              Last ned ferdig dokument
            </a>
            {receiptPdfUrl ? (
              <a
                href={receiptPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-800 py-3 rounded-xl text-sm font-black"
              >
                <FileText className="w-4 h-4" />
                Last ned signeringskvittering
              </a>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
            <div className="font-black text-gray-900">Dokument</div>
            <button
              type="button"
              onClick={fetchData}
              className="inline-flex items-center gap-2 text-sm font-bold px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200"
            >
              <Loader2 className="w-4 h-4" />
              Oppdater
            </button>
          </div>
          {completedPdfUrl ? <iframe title="Ferdig dokument" src={completedPdfUrl} className="w-full h-[78vh] bg-gray-50" /> : null}
        </div>
      </main>
    </div>
  );
}

