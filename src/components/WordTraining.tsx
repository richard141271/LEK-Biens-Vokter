'use client';

import { useMemo, useState, useCallback } from 'react';
import { Mic, MicOff, X, BookOpen, RotateCcw, ChevronLeft, ChevronRight, CheckCircle, ClipboardList, ClipboardCopy, Download, Trash2 } from 'lucide-react';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { parseVoiceCommand } from '@/utils/voice-parser';

type Props = {
  onClose: () => void;
};

export default function WordTraining({ onClose }: Props) {
  const phrases = useMemo(
    () => [
      { group: 'Handling', text: 'Ta bilde', expected: { action: 'TAKE_PHOTO' } },
      { group: 'Handling', text: 'Lagre inspeksjon', expected: { action: 'SAVE_INSPECTION' } },
      { group: 'Dronning', text: 'Dronning sett', expected: { queenSeen: true } },
      { group: 'Dronning', text: 'Ingen dronning', expected: { queenSeen: false } },
      { group: 'Egg', text: 'Egg sett', expected: { eggsSeen: true } },
      { group: 'Egg', text: 'Ingen egg', expected: { eggsSeen: false } },
      { group: 'Honning', text: 'Lite honning', expected: { honeyStores: 'lite' } },
      { group: 'Honning', text: 'Middels honning', expected: { honeyStores: 'middels' } },
      { group: 'Honning', text: 'Mye honning', expected: { honeyStores: 'mye' } },
      { group: 'Gemytt', text: 'Rolig', expected: { temperament: 'rolig' } },
      { group: 'Gemytt', text: 'Urolig', expected: { temperament: 'urolig' } },
      { group: 'Gemytt', text: 'Aggressiv', expected: { temperament: 'aggressiv' } },
      { group: 'Yngel', text: 'Bra yngel', expected: { broodCondition: 'bra' } },
      { group: 'Yngel', text: 'Normal yngel', expected: { broodCondition: 'normal' } },
      { group: 'Yngel', text: 'Dårlig yngel', expected: { broodCondition: 'darlig' } },
      { group: 'Status', text: 'Alt bra', expected: { status: 'OK' } },
      { group: 'Status', text: 'Svak', expected: { status: 'SVAK' } },
      { group: 'Status', text: 'Død', expected: { status: 'DØD' } },
      { group: 'Status', text: 'Sykdom', expected: { status: 'SYKDOM' } },
      { group: 'Status', text: 'Bytt dronning', expected: { status: 'BYTT_DRONNING' } },
      { group: 'Status', text: 'Mottatt fôr', expected: { status: 'MOTTATT_FOR' } },
      { group: 'Status', text: 'Skiftet rammer', expected: { status: 'SKIFTET_RAMMER' } },
      { group: 'Status', text: 'Sverming', expected: { status: 'SVERMING' } },
      { group: 'Status', text: 'Varroa mistanke', expected: { status: 'VARROA_MISTANKE' } },
      { group: 'Status', text: 'Byttet voks', expected: { status: 'BYTTET_VOKS' } },
      { group: 'Vær', text: 'Sol', expected: { weather: 'Klart' } },
      { group: 'Vær', text: 'Regn', expected: { weather: 'Regn' } },
      { group: 'Vær', text: 'Overskyet', expected: { weather: 'Lettskyet/Overskyet' } },
      { group: 'Temperatur', text: '20 grader', expected: { temperature: '20' } }
    ],
    []
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [recognized, setRecognized] = useState<string | null>(null);
  const [parsed, setParsed] = useState<any>(null);
  const [failures, setFailures] = useState<any[]>([]);

  const handleResult = useCallback((t: string) => {
    setRecognized(t);
    const p = parseVoiceCommand(t);
    setParsed(p);
    try {
      const item: any = phrases[currentIndex] as any;
      const exp = item.expected || {};
      let ok = true;
      for (const k of Object.keys(exp)) {
        const ev = (exp as any)[k];
        const pv = (p as any)?.[k];
        if (k === 'temperature') {
          const pvStr = typeof pv === 'string' ? pv : pv != null ? String(pv) : '';
          if (!pvStr.startsWith(String(ev))) ok = false;
        } else {
          if (pv !== ev) ok = false;
        }
      }
      if (!ok) {
        const record = {
          timestamp: new Date().toISOString(),
          group: item.group,
          expected_phrase: item.text,
          expected_parse: item.expected || {},
          recognized_text: t,
          parsed: p
        };
        setFailures((prev) => [record, ...prev]);
      }
    } catch {}
  }, [currentIndex, phrases]);

  const { isListening, toggleListening, isSupported } = useVoiceRecognition(handleResult);

  const next = () => setCurrentIndex((i) => (i + 1) % phrases.length);
  const prev = () => setCurrentIndex((i) => (i - 1 + phrases.length) % phrases.length);
  const reset = () => {
    setRecognized(null);
    setParsed(null);
  };

  const item = phrases[currentIndex];
  const hasFailures = failures.length > 0;

  const copyFailures = async () => {
    const text = JSON.stringify(failures, null, 2);
    if (navigator.clipboard) await navigator.clipboard.writeText(text);
  };

  const downloadFailures = () => {
    const blob = new Blob([JSON.stringify(failures, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ordtrening-feil-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

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
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className={`w-4 h-4 ${hasFailures ? 'text-red-600' : 'text-gray-400'}`} />
            <span className={`text-sm font-medium ${hasFailures ? 'text-red-700' : 'text-gray-500'}`}>
              Feilfangst: {failures.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyFailures}
              disabled={!hasFailures}
              className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
              title="Kopier til utklippstavle"
            >
              <ClipboardCopy className="w-4 h-4" />
              Kopier
            </button>
            <button
              onClick={downloadFailures}
              disabled={!hasFailures}
              className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
              title="Last ned JSON"
            >
              <Download className="w-4 h-4" />
              Last ned
            </button>
            <button
              onClick={() => setFailures([])}
              disabled={!hasFailures}
              className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
              title="Tøm liste"
            >
              <Trash2 className="w-4 h-4" />
              Tøm
            </button>
          </div>
        </div>

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

            {hasFailures && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-xs font-bold text-red-700 mb-2">Sist registrerte feil</div>
                <div className="text-xs text-red-800">
                  <div className="flex items-center justify-between">
                    <div className="truncate">
                      <span className="font-semibold">{failures[0].group}:</span>{' '}
                      forventet «{failures[0].expected_phrase}», hørte «{failures[0].recognized_text}»
                    </div>
                    <span className="ml-2 text-[10px] text-red-600 whitespace-nowrap">{new Date(failures[0].timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            )}
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

        {hasFailures && (
          <div className="mt-6">
            <div className="text-xs font-bold text-gray-700 mb-2">Feilliste</div>
            <div className="max-h-48 overflow-auto border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white">
              {failures.map((f, i) => (
                <div key={i} className="text-xs p-2 flex items-start gap-2">
                  <span className="text-gray-400">{i + 1}.</span>
                  <div className="flex-1">
                    <div className="text-gray-900">
                      <span className="font-semibold">{f.group}:</span> forventet «{f.expected_phrase}»
                    </div>
                    <div className="text-gray-600">Hørte: «{f.recognized_text}»</div>
                    <div className="text-gray-400">{new Date(f.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
