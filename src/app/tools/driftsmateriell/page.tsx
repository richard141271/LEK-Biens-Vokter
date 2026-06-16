'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Printer } from 'lucide-react';

export default function DriftsmateriellToolPage() {
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
            <h1 className="text-xl font-black text-gray-900 break-words">📦 Driftsmateriell</h1>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
            <Printer className="w-5 h-5 text-honey-600" />
            <div className="font-bold text-gray-900">Utskrifter</div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <div className="font-bold text-gray-900 text-sm">Bigårdsskilt</div>
              <div className="text-xs text-gray-500">Skriv ut varselskilt for dine bigårder</div>
            </div>
            <button
              type="button"
              onClick={() => router.push('/apiaries')}
              className="text-xs bg-white border border-gray-300 px-3 py-2 rounded-lg font-bold text-gray-700 hover:bg-gray-100 flex items-center gap-1"
            >
              Gå til utskrift <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

