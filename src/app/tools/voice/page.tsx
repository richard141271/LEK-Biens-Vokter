'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mic } from 'lucide-react';
import { getAutoCorrectEnabled, setAutoCorrectEnabled, getShareEnabled, setShareEnabled } from '@/utils/voice-diagnostics';

export default function VoiceToolPage() {
  const router = useRouter();
  const [autoCorrect, setAutoCorrect] = useState(false);
  const [shareVoice, setShareVoice] = useState(false);

  useEffect(() => {
    setAutoCorrect(getAutoCorrectEnabled());
    setShareVoice(getShareEnabled());
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="min-w-0">
            <div className="text-xs font-black text-gray-500 uppercase">Verktøy</div>
            <h1 className="text-xl font-black text-gray-900 break-words">🎤 Stemmeinspeksjon (Beta)</h1>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
            <Mic className="w-5 h-5 text-honey-600" />
            <div className="font-bold text-gray-900">Stemme</div>
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-gray-900">Forbedre tale (beta)</div>
              <div className="text-xs text-gray-500">Sammenligner og korrigerer forsiktig under ekte inspeksjoner.</div>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={autoCorrect}
                onChange={(e) => {
                  const v = e.target.checked;
                  setAutoCorrect(v);
                  setAutoCorrectEnabled(v);
                }}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:h-5 after:w-5 after:left-[2px] after:top-[2px] after:bg-white after:rounded-full after:transition-all peer-checked:bg-honey-500 relative"></div>
            </label>
          </div>

          <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-gray-900">Del anonym feil til fellesbank</div>
              <div className="text-xs text-gray-500">Lagrer misgjenkjenninger for forbedring. Kun innloggede brukere.</div>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={shareVoice}
                onChange={(e) => {
                  const v = e.target.checked;
                  setShareVoice(v);
                  setShareEnabled(v);
                }}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:h-5 after:w-5 after:left-[2px] after:top-[2px] after:bg-white after:rounded-full after:transition-all peer-checked:bg-honey-500 relative"></div>
            </label>
          </div>
        </div>
      </main>
    </div>
  );
}

