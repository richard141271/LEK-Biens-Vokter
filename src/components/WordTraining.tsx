'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { Mic, MicOff, X, BookOpen, RotateCcw, ChevronLeft, ChevronRight, ClipboardList, ClipboardCopy, Download, Trash2 } from 'lucide-react';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { parseVoice2Intent } from '@/voice2/parse';
import { loadVoice2Aliases, submitVoice2Alias } from '@/voice2/alias-store';

type Props = {
  onClose: () => void;
};

export default function WordTraining({ onClose }: Props) {
  useEffect(() => {
    void loadVoice2Aliases();
  }, []);
  const phrases = useMemo(() => {
    return [
      { group: 'TID & VÆR', text: 'Temperatur 18 grader.', expected: { type: 'TEMPERATURE', celsius: 18 } },
      { group: 'TID & VÆR', text: 'Vær sol.', expected: { type: 'WEATHER', weather: 'Sol' } },
      { group: 'TID & VÆR', text: 'Vær overskyet.', expected: { type: 'WEATHER', weather: 'Overskyet' } },
      { group: 'TID & VÆR', text: 'Vær regn.', expected: { type: 'WEATHER', weather: 'Regn' } },
      { group: 'INSPEKSJON', text: 'Dronning sett.', expected: { type: 'QUEEN_SEEN' } },
      { group: 'INSPEKSJON', text: 'Ingen dronning sett.', expected: { type: 'QUEEN_NOT_SEEN' } },
      { group: 'INSPEKSJON', text: 'Dronningfarge hvit.', expected: { type: 'QUEEN_COLOR', color: 'hvit' } },
      { group: 'INSPEKSJON', text: 'Dronningfarge gul.', expected: { type: 'QUEEN_COLOR', color: 'gul' } },
      { group: 'INSPEKSJON', text: 'Dronningfarge rød.', expected: { type: 'QUEEN_COLOR', color: 'rod' } },
      { group: 'INSPEKSJON', text: 'Dronningfarge grønn.', expected: { type: 'QUEEN_COLOR', color: 'gronn' } },
      { group: 'INSPEKSJON', text: 'Dronningfarge blå.', expected: { type: 'QUEEN_COLOR', color: 'bla' } },
      { group: 'INSPEKSJON', text: 'Årgang 2025.', expected: { type: 'QUEEN_YEAR', year: 2025 } },
      { group: 'INSPEKSJON', text: 'Egg sett.', expected: { type: 'EGGS_SEEN' } },
      { group: 'INSPEKSJON', text: 'Ingen egg sett.', expected: { type: 'EGGS_NOT_SEEN' } },
      { group: 'YNGEL', text: 'Egg lite.', expected: { type: 'BROOD_EGG', amount: 'lite' } },
      { group: 'YNGEL', text: 'Egg normal.', expected: { type: 'BROOD_EGG', amount: 'normal' } },
      { group: 'YNGEL', text: 'Larver normal.', expected: { type: 'BROOD_LARVAE', amount: 'normal' } },
      { group: 'YNGEL', text: 'Yngel mye.', expected: { type: 'BROOD_YNGEL', amount: 'mye' } },
      { group: 'YNGEL', text: 'Droner lite.', expected: { type: 'BROOD_DRONES', amount: 'lite' } },
      { group: 'YNGEL', text: 'Rammer 8.', expected: { type: 'BROOD_FRAMES', count: 8 } },
      { group: 'HONNING', text: 'Honning lite.', expected: { type: 'HONEY_STORES', level: 'lite' } },
      { group: 'HONNING', text: 'Honning middels.', expected: { type: 'HONEY_STORES', level: 'middels' } },
      { group: 'HONNING', text: 'Honning mye.', expected: { type: 'HONEY_STORES', level: 'mye' } },
      { group: 'GEMYTT', text: 'Gemytt rolig.', expected: { type: 'TEMPERAMENT', temperament: 'rolig' } },
      { group: 'GEMYTT', text: 'Gemytt urolig.', expected: { type: 'TEMPERAMENT', temperament: 'urolig' } },
      { group: 'GEMYTT', text: 'Gemytt aggressiv.', expected: { type: 'TEMPERAMENT', temperament: 'aggressiv' } },
      { group: 'STATUS', text: 'Status OK.', expected: { type: 'STATUS', status: 'OK' } },
      { group: 'STATUS', text: 'Status Sterk.', expected: { type: 'STATUS', status: 'Sterk' } },
      { group: 'STATUS', text: 'Status Svak.', expected: { type: 'STATUS', status: 'Svak' } },
      { group: 'STATUS', text: 'Status Død.', expected: { type: 'STATUS', status: 'Død' } },
      { group: 'STATUS', text: 'Status Varroa mistanke.', expected: { type: 'STATUS', status: 'Varroa mistanke' } },
      { group: 'STATUS', text: 'Status Sykdom.', expected: { type: 'STATUS', status: 'Sykdom' } },
      { group: 'STATUS', text: 'Status Sverming.', expected: { type: 'STATUS', status: 'Sverming' } },
      { group: 'STATUS', text: 'Status Mottatt fôr.', expected: { type: 'STATUS', status: 'Mottatt fôr' } },
      { group: 'STATUS', text: 'Status Skiftet rammer.', expected: { type: 'STATUS', status: 'Skiftet rammer' } },
      { group: 'STATUS', text: 'Status Byttet voks.', expected: { type: 'STATUS', status: 'Byttet voks' } },
      { group: 'STATUS', text: 'Status Bytt Dronning.', expected: { type: 'STATUS', status: 'Bytt Dronning' } },
      { group: 'FÔR', text: 'Lite fôr.', expected: { type: 'FEED_LOW' } },
      { group: 'FÔR', text: 'Ga sukkerlake.', expected: { type: 'FEED_GIVEN', feedType: 'sukkerlake' } },
      { group: 'FÔR', text: 'Ga nødfôr.', expected: { type: 'FEED_GIVEN', feedType: 'nodfor' } },
      { group: 'FÔR', text: 'Gitt fôr.', expected: { type: 'FEED_GIVEN', feedType: 'annet' } },
      { group: 'UTFØRT I DAG', text: 'Satt på skattekasse.', expected: { type: 'PERFORMED_ACTION', id: 'SUPER_ADDED' } },
      { group: 'UTFØRT I DAG', text: 'Fjernet skattekasse.', expected: { type: 'PERFORMED_ACTION', id: 'SUPER_REMOVED' } },
      { group: 'UTFØRT I DAG', text: 'Høstet honning.', expected: { type: 'PERFORMED_ACTION', id: 'HONEY_HARVESTED' } },
      { group: 'UTFØRT I DAG', text: 'Byttet dronning.', expected: { type: 'PERFORMED_ACTION', id: 'QUEEN_REPLACED' } },
      { group: 'UTFØRT I DAG', text: 'Fjernet dronningceller.', expected: { type: 'PERFORMED_ACTION', id: 'QUEEN_CELLS_REMOVED' } },
      { group: 'UTFØRT I DAG', text: 'Satt inn rammer.', expected: { type: 'PERFORMED_ACTION', id: 'FRAMES_ADDED' } },
      { group: 'UTFØRT I DAG', text: 'Fjernet rammer.', expected: { type: 'PERFORMED_ACTION', id: 'FRAMES_REMOVED' } },
      { group: 'UTFØRT I DAG', text: 'Byttet voks.', expected: { type: 'PERFORMED_ACTION', id: 'WAX_REPLACED' } },
      { group: 'UTFØRT I DAG', text: 'Laget avlegger.', expected: { type: 'PERFORMED_ACTION', id: 'SPLIT_MADE' } },
      { group: 'UTFØRT I DAG', text: 'Delt kube.', expected: { type: 'PERFORMED_ACTION', id: 'HIVE_SPLIT' } },
      { group: 'UTFØRT I DAG', text: 'Gjennomført varroatest.', expected: { type: 'PERFORMED_ACTION', id: 'VARROA_TEST_DONE' } },
      { group: 'VARROA', text: 'Ingen varroa.', expected: { type: 'VARROA_NONE' } },
      { group: 'VARROA', text: 'Varroa mistanke.', expected: { type: 'VARROA_SUSPECT' } },
      { group: 'VARROA', text: 'Varroa behandlet.', expected: { type: 'VARROA_TREATED' } },
      { group: 'KAMERA', text: 'Ta bilde.', expected: { type: 'TAKE_PHOTO' } },
      { group: 'LAGRING', text: 'Lagre inspeksjon.', expected: { type: 'SAVE_INSPECTION' } },
      { group: 'STYRING', text: 'Vis flere handlinger.', expected: { type: 'SHOW_MORE_ACTIONS' } },
      { group: 'STYRING', text: 'Skjul flere handlinger.', expected: { type: 'HIDE_MORE_ACTIONS' } },
      { group: 'STYRING', text: 'Nullstill handlinger.', expected: { type: 'RESET_ACTIONS' } },
      { group: 'STYRING', text: 'Neste bikube.', expected: { type: 'NEXT_HIVE' } },
      { group: 'STYRING', text: 'Forrige bikube.', expected: { type: 'PREV_HIVE' } },
      { group: 'NOTATER', text: 'Notater.', expected: { type: 'NOTES_START' } },
      { group: 'NOTATER', text: 'Notat slutt.', expected: { type: 'NOTES_STOP' } },
      { group: 'STYRING', text: 'Angre siste.', expected: { type: 'UNDO_LAST' } },
      { group: 'STYRING', text: 'Bekreft.', expected: { type: 'CONFIRM' } },
      { group: 'STYRING', text: 'Avbryt.', expected: { type: 'CANCEL' } },
    ];
  }, []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [recognized, setRecognized] = useState<string | null>(null);
  const [parsed, setParsed] = useState<any>(null);
  const [failures, setFailures] = useState<any[]>([]);
  const reset = useCallback(() => {
    setRecognized(null);
    setParsed(null);
  }, []);

  const selectIndex = useCallback((idx: number) => {
    setCurrentIndex(idx);
    reset();
  }, [reset]);

  const handleResult = useCallback((t: string) => {
    setRecognized(t);
    const p = parseVoice2Intent(t);
    setParsed(p);
    try {
      const item: any = phrases[currentIndex] as any;
      const exp = item.expected || {};
      let ok = true;
      for (const k of Object.keys(exp)) {
        const ev = (exp as any)[k];
        const pv = (p as any)?.[k];
        if (pv !== ev) ok = false;
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
        try {
          if ((p as any)?.type === 'UNKNOWN') void submitVoice2Alias(t, item.expected || {});
        } catch {}
        try {
          const share = typeof window !== 'undefined' && localStorage.getItem('voice_share') === '1';
          if (share) {
            fetch('/api/voice/log', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recognized_text: t,
                matched_phrase: item.text,
                similarity: null,
                expected_parse: item.expected || {},
                parsed_before: p,
                parsed_after: null,
                source: 'training'
              })
            }).catch(() => {});
          }
        } catch {}
      }
    } catch {}
  }, [currentIndex, phrases]);

  const { isListening, toggleListening, isSupported } = useVoiceRecognition(handleResult);

  const next = () => selectIndex((currentIndex + 1) % phrases.length);
  const prev = () => selectIndex((currentIndex - 1 + phrases.length) % phrases.length);

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
    <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl border border-gray-200 max-h-[85vh] overflow-y-auto">
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
          type="button"
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
              type="button"
              className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
              title="Kopier til utklippstavle"
            >
              <ClipboardCopy className="w-4 h-4" />
              Kopier
            </button>
            <button
              onClick={downloadFailures}
              disabled={!hasFailures}
              type="button"
              className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
              title="Last ned JSON"
            >
              <Download className="w-4 h-4" />
              Last ned
            </button>
            <button
              onClick={() => setFailures([])}
              disabled={!hasFailures}
              type="button"
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
              type="button"
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
              title="Forrige"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={next}
              type="button"
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
            type="button"
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
            type="button"
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
              {parsed && (parsed as any).type ? (
                <div className="text-sm text-gray-900">
                  <div className="font-mono">{JSON.stringify(parsed)}</div>
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
                type="button"
                onPointerDown={(e) => {
                  try {
                    e.preventDefault();
                  } catch {}
                  selectIndex(idx);
                }}
                className={`px-3 py-1.5 rounded-full text-xs border ${
                  idx === currentIndex
                    ? 'bg-honey-500 border-honey-600 text-white'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                } touch-manipulation select-none`}
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
