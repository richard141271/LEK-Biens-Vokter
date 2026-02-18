'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, UploadCloud, Activity, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';

type InferenceResult = {
  count: number;
  boxes?: Array<{ x: number; y: number; w: number; h: number; conf?: number }>;
};

function resizeImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(file);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const maxSide = 1600;
      let width = img.width;
      let height = img.height;
      if (width > height && width > maxSide) {
        height = Math.round((height * maxSide) / width);
        width = maxSide;
      } else if (height > maxSide) {
        width = Math.round((width * maxSide) / height);
        height = maxSide;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const out = new File([blob], file.name.replace(/\.[^.]+$/, '') + '-scaled.jpg', { type: 'image/jpeg' });
          resolve(out);
        },
        'image/jpeg',
        0.85
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

export default function VarroaDemoPage() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const risk = useMemo(() => {
    const c = result?.count ?? 0;
    // Simple thresholds for demo, per 24h
    if (c <= 10) return { label: 'Lav', color: 'green', advice: 'Normalt nivå. Fortsett å følge med.' };
    if (c <= 30) return { label: 'Moderat', color: 'amber', advice: 'Følg med. Ny telling om 5 dager.' };
    return { label: 'Høy', color: 'red', advice: 'Tiltak anbefales innen 48 timer.' };
  }, [result]);

  const trend = useMemo(() => {
    // Static demo trend if none
    const base = [6, 8, 12, 9, 14, 18, 22];
    const today = result?.count ?? 18;
    return [...base.slice(0, -1), today];
  }, [result]);

  const handleFile = async (f: File) => {
    const resized = await resizeImage(f);
    setImage(resized);
    setPreview(URL.createObjectURL(resized));
    setResult(null);
    setError(null);
  };

  const inferMock = async () => {
    setLoading(true);
    setError(null);
    try {
      // Deterministic-ish mock based on size
      const bytes = await image?.arrayBuffer();
      const size = bytes ? (bytes.byteLength % 35) + 5 : Math.floor(Math.random() * 35) + 5;
      setResult({ count: size });
    } catch {
      setResult({ count: Math.floor(Math.random() * 30) + 8 });
    } finally {
      setLoading(false);
    }
  };

  const run = async () => {
    if (!image) {
      setError('Last opp et bilde av bunnbrettet først.');
      return;
    }
    return inferMock();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10 flex items-center justify-between">
        <Link href="/dashboard/smittevern" className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </Link>
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-amber-600" />
          <h1 className="text-lg font-bold text-gray-900">Varroamidd Teller</h1>
        </div>
        <div />
      </header>

      <main className="p-4 max-w-3xl mx-auto space-y-6">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="px-3 py-1.5 rounded-lg text-xs font-bold border bg-amber-100 text-amber-800 border-amber-200">
              Demo-modus (Mock) – for testing i Birøkterregisteret
            </span>
            <a
              href="https://demo.roboflow.com/varroa-detection-sqgvi/2?publishable_key=rf_iw8Xkt6B2oWxpbnTivdUBFwvxY82"
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border bg-indigo-50 text-indigo-700 border-indigo-200"
            >
              Åpne live-demo
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
              }}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg font-bold hover:bg-black transition-colors"
            >
              <UploadCloud className="w-5 h-5" />
              Last opp bilde
            </button>
            <button
              onClick={run}
              disabled={!image || loading}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              <Camera className="w-5 h-5" />
              {loading ? 'Analyserer...' : 'Analyser'}
            </button>
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">Bilde</div>
            <div className="aspect-video bg-gray-50 border border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
              {preview ? (
                <img src={preview} alt="Varroa preview" className="w-full h-full object-contain" />
              ) : (
                <div className="text-gray-400 text-sm flex items-center gap-2">
                  <UploadCloud className="w-5 h-5" /> Ingen bilde valgt
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">Resultat</div>
            {result ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">Antall midd (24h)</div>
                  <div className="text-2xl font-extrabold text-gray-900">{result.count}</div>
                </div>
                <div className={`p-3 rounded-lg border flex items-center gap-2 ${risk.color === 'green' ? 'bg-green-50 border-green-200 text-green-800' : risk.color === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  {risk.color === 'green' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  <div className="text-sm font-bold">Risiko: {risk.label}</div>
                  <div className="ml-auto text-xs">{risk.advice}</div>
                </div>

                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase mb-1">Trend (7 dager)</div>
                  <div className="w-full h-24 bg-gray-50 border border-gray-200 rounded-lg p-2 flex items-end gap-2">
                    {trend.map((v, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div className="w-full bg-amber-500 rounded-t" style={{ height: `${Math.min(100, v * 3)}%` }} />
                        <div className="text-[10px] text-gray-500 mt-1">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">Ingen analyse ennå. Last opp et bilde og trykk Analyser.</div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">Om</div>
            <p className="text-sm text-gray-600">
              Dette er en demo. Tellingen i appen er simulert (mock) for å vise hvordan produktet vil fungere,
              uten å være avhengig av nettet eller Roboflow‑kontoen din.
            </p>
          </div>

          <div className="border-t border-dashed border-gray-200 pt-3">
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">Eksempelbilder til live-demo</div>
            <p className="text-sm text-gray-600 mb-3">
              Last ned noen ferdige bunnbrett‑bilder som kan vises på skjerm eller skrives ut. Bruk dem sammen
              med live‑demoen for å teste modellen uten å måtte lage egne brett først.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 aspect-video flex items-center justify-center overflow-hidden">
                  <img
                    src="/varroa-samples/varroa-demo-1.jpg"
                    alt="Varroa demo 1"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="block text-center text-xs font-semibold text-amber-700 py-2 border-t border-gray-200">
                  Bilde 1 – hold inne for å lagre eller dele
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 aspect-video flex items-center justify-center overflow-hidden">
                  <img
                    src="/varroa-samples/varroa-demo-2.jpg"
                    alt="Varroa demo 2"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="block text-center text-xs font-semibold text-amber-700 py-2 border-t border-gray-200">
                  Bilde 2 – hold inne for å lagre eller dele
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 aspect-video flex items-center justify-center overflow-hidden">
                  <img
                    src="/varroa-samples/varroa-demo-3.jpg"
                    alt="Varroa demo 3"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="block text-center text-xs font-semibold text-amber-700 py-2 border-t border-gray-200">
                  Bilde 3 – hold inne for å lagre eller dele
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 aspect-video flex items-center justify-center overflow-hidden">
                  <img
                    src="/varroa-samples/varroa-demo-4.jpg"
                    alt="Varroa demo 4"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="block text-center text-xs font-semibold text-amber-700 py-2 border-t border-gray-200">
                  Bilde 4 – hold inne for å lagre eller dele
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 aspect-video flex items-center justify-center overflow-hidden">
                  <img
                    src="/varroa-samples/varroa-demo-5.jpg"
                    alt="Varroa demo 5"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="block text-center text-xs font-semibold text-amber-700 py-2 border-t border-gray-200">
                  Bilde 5 – hold inne for å lagre eller dele
                </div>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-gray-400">
              Legg inn filer med disse navnene i mappen <span className="font-mono text-gray-500">/public/varroa-samples</span> for at nedlasting skal fungere.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
