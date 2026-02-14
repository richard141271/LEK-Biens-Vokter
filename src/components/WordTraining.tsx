'use client';

import { useMemo, useState, useCallback } from 'react';
import { Mic, MicOff, X, BookOpen, RotateCcw, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { parseVoiceCommand } from '@/utils/voice-parser';

type Props = {
  onClose: () => void;
};

export default function WordTraining({ onClose }: Props) {
  const phrases = useMemo(
    () => [
      { group: 'Handling', text: 'Ta bilde' },
      { group: 'Handling', text: 'Lagre inspeksjon' },
      { group: 'Dronning', text: 'Dronning sett' },
      { group: 'Dronning', text: 'Ingen dronning' },
      { group: 'Egg', text: 'Egg sett' },
      { group: 'Egg', text: 'Ingen egg' },
      { group: 'Honning', text: 'Lite honning' },
      { group: 'Honning', text: 'Middels honning' },
      { group: 'Honning', text: 'Mye honning' },
      { group: 'Gemytt', text: 'Rolig' },
      { group: 'Gemytt', text: 'Urolig' },
      { group: 'Gemytt', text: 'Aggressiv' },
      { group: 'Yngel', text: 'Bra yngel' },
      { group: 'Yngel', text: 'Normal yngel' },
      { group: 'Yngel', text: 'Dårlig yngel' },
      { group: 'Status', text: 'Alt bra' },
      { group: 'Status', text: 'Svak' },
      { group: 'Status', text: 'Død' },
      { group: 'Status', text: 'Sykdom' },
      { group: 'Status', text: 'Bytt dronning' },
      { group: 'Status', text: 'Mottatt fôr' },
      { group: 'Status', text: 'Skiftet rammer' },
      { group: 'Status', text: 'Sverming' },
      { group: 'Status', text: 'Varroa mistanke' },
      { group: 'Status', text: 'Byttet voks' },
      { group: 'Vær', text: 'Sol' },
      { group: 'Vær', text: 'Regn' },
      { group: 'Vær', text: 'Overskyet' },
      { group: 'Temperatur', text: '20 grader' }
    ],
    []
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [recognized, setRecognized] = useState<string | null>(null);
  const [parsed, setParsed] = useState<any>(null);

  const handleResult = useCallback((t: string) => {
    setRecognized(t);
    const p = parseVoiceCommand(t);
    setParsed(p);
  }, []);

  const { isListening, toggleListening, isSupported } = useVoiceRecognition(handleResult);

  const next = () => setCurrentIndex((i) => (i + 1) % phrases.length);
  const prev = () => setCurrentIndex((i) => (i - 1 + phrases.length) % phrases.length);
  const reset = () => {
    setRecognized(null);
    setParsed(null);
  };

  const item = phrases[currentIndex];

  return (
    <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-honey-50 text-honey-700 rounded-lg">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">ORDTRENING</h3>
            <p className="text-xs text-gray-500">Les opp setningen. Se hva appen forstår.</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-gray-500 uppercase">{item.group}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
              title="Forrige"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={next}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
              title="Neste"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>

        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">Si dette høyt</div>
          <div className="text-2xl font-extrabold tracking-wide text-gray-900">{item.text}</div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={toggleListening}
            disabled={!isSupported}
            className={`flex-1 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 ${
              isListening
                ? 'bg-red-600 text-white'
                : 'bg-black text-white hover:bg-gray-800'
            }`}
            title="Start/Stopp opptak"
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            {isListening ? 'Stopp' : 'Start'}
          </button>

          <button
            onClick={reset}
            className="px-4 py-3 rounded-lg font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            title="Nullstill"
          >
            <RotateCcw className="w-5 h-5" />
            Nullstill
          </button>
        </div>

        {!isSupported && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg text-sm">
            Nettleseren støtter ikke talegjenkjenning.
          </div>
        )}

        {recognized && (
          <div className="space-y-3">
            <div className="p-3 bg-white border border-gray-200 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Gjenkjent tekst</div>
              <div className="font-mono text-gray-900">{recognized}</div>
            </div>

            <div className="p-3 bg-white border border-gray-200 rounded-lg">
              <div className="text-xs text-gray-500 mb-2">Tolkning</div>
              {parsed && Object.keys(parsed).length > 0 ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {'queenSeen' in parsed && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className={`w-4 h-4 ${parsed.queenSeen ? 'text-green-600' : 'text-gray-400'}`} />
                      <span>Dronning: {parsed.queenSeen ? 'Sett' : 'Ikke sett'}</span>
                    </div>
                  )}
                  {'eggsSeen' in parsed && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className={`w-4 h-4 ${parsed.eggsSeen ? 'text-green-600' : 'text-gray-400'}`} />
                      <span>Egg: {parsed.eggsSeen ? 'Sett' : 'Ikke sett'}</span>
                    </div>
                  )}
                  {'honeyStores' in parsed && (
                    <div>Honning: {parsed.honeyStores}</div>
                  )}
                  {'temperament' in parsed && (
                    <div>Gemytt: {parsed.temperament}</div>
                  )}
                  {'broodCondition' in parsed && (
                    <div>Yngel: {parsed.broodCondition}</div>
                  )}
                  {'status' in parsed && (
                    <div>Status: {parsed.status}</div>
                  )}
                  {'temperature' in parsed && (
                    <div>Temperatur: {parsed.temperature}°C</div>
                  )}
                  {'weather' in parsed && (
                    <div>Vær: {parsed.weather}</div>
                  )}
                  {'action' in parsed && (
                    <div>Handling: {parsed.action === 'TAKE_PHOTO' ? 'Ta bilde' : parsed.action === 'SAVE_INSPECTION' ? 'Lagre inspeksjon' : parsed.action}</div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500 text-sm">Ingen tydelig tolkning.</div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="text-xs text-gray-500 mb-2">Eksempler</div>
          <div className="flex flex-wrap gap-2">
            {phrases.map((p, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`px-3 py-1.5 rounded-full text-xs border ${
                  idx === currentIndex
                    ? 'bg-honey-500 border-honey-600 text-white'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
                title={p.group}
              >
                {p.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

