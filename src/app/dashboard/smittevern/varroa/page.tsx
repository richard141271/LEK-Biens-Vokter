'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, UploadCloud, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

const DEFAULT_MODEL_ID = 'varroa-detection-sgqvj';
const DEFAULT_MODEL_VERSION = '2';

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
  const [mode, setMode] = useState<'mock' | 'live'>('mock');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL_ID);
  const [modelVersion, setModelVersion] = useState<string>(DEFAULT_MODEL_VERSION);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const m = localStorage.getItem('varroa_mode') as 'mock' | 'live' | null;
    if (m) setMode(m);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('varroa_mode', mode);
  }, [mode]);

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

  const inferLive = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('image', image);
      fd.append('model', modelId);
      fd.append('version', modelVersion);
      const res = await fetch('/api/varroa/infer', { method: 'POST', body: fd });
      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 413 || txt.includes('PAYLOAD_TOO_LARGE') || txt.includes('Entity Too Large')) {
          throw new Error('Bildet er for stort. Prøv et bilde med lavere oppløsning eller zoom litt inn.');
        }
        throw new Error(txt || 'Ukjent feil fra Roboflow-proxy');
      }
      const data = await res.json();
      // Normalize common Roboflow responses
      const preds = data?.predictions || data?.outputs || [];
      const count = Array.isArray(preds) ? preds.length : Number(data?.count ?? 0);
      setResult({
        count: count,
        boxes: Array.isArray(preds) ? preds.map((p: any) => ({ x: p.x, y: p.y, w: p.width || p.w, h: p.height || p.h, conf: p.confidence || p.conf })) : undefined
      });
    } catch (e: any) {
      setError(e?.message || 'Feil ved inferens');
    } finally {
      setLoading(false);
    }
  };

  const run = async () => {
    if (!image) {
      setError('Last opp et bilde av bunnbrettet først.');
      return;
    }
    if (mode === 'mock') return inferMock();
    return inferLive();
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
            <button
              onClick={() => setMode('mock')}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${mode === 'mock' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
            >
              Mock
            </button>
            <button
              onClick={() => setMode('live')}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${mode === 'live' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
            >
              Live (Roboflow API)
            </button>
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="ml-auto text-xs text-gray-600 underline"
            >
              {showAdvanced ? 'Skjul avansert' : 'Avansert'}
            </button>
          </div>

          {mode === 'live' && showAdvanced && (
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                placeholder="Modell-ID (f.eks. varroa-mitt/1)"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="text"
                placeholder="Versjon (f.eks. 1)"
                value={modelVersion}
                onChange={(e) => setModelVersion(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          )}

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

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-xs font-bold text-gray-500 uppercase mb-2">Om</div>
          <p className="text-sm text-gray-600">
            Dette er en demo. Live‑modus bruker Roboflow API via en sikker server‑proxy (krever API‑nøkkel i miljøvariabler).
            Resultatet viser ikke bare antall, men også enkel risiko og trend – for å støtte beslutninger om tiltak.
          </p>
        </div>
      </main>
    </div>
  );
}
