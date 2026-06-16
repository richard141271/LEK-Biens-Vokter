'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, QrCode } from 'lucide-react';

export default function BikubekortToolPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="min-w-0">
            <div className="text-xs font-black text-gray-500 uppercase">Verktøy</div>
            <h1 className="text-xl font-black text-gray-900 break-words">🔲 Bikubekort & QR</h1>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
            <QrCode className="w-5 h-5 text-honey-600" />
            <div className="font-bold text-gray-900">Stamkort & merking</div>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Åpne utskriftsmenyen for stamkort/QR og velg layout (kort, liste, QR).
          </p>

          <button
            type="button"
            onClick={() => router.push('/settings?tool=hive_cards_qr#toolbox')}
            className="text-sm bg-white border border-gray-300 px-4 py-3 rounded-xl font-bold text-gray-700 hover:bg-gray-100 flex items-center justify-between w-full"
          >
            Åpne utskriftsmeny <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
}

