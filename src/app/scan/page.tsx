'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ScanPage() {
  const router = useRouter();
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      if (!scanner) return;

      (async () => {
        try {
          if (scanner.isScanning) {
            await scanner.stop();
          }
        } catch {}

        try {
          scanner.clear();
        } catch {}
      })();
    };
  }, [router]);

  const startScanner = async () => {
    if (isStarting) return;

    setError(null);
    setScanResult(null);
    hasScannedRef.current = false;
    setIsStarting(true);

    let scanner = scannerRef.current;
    if (!scanner) {
      scanner = new Html5Qrcode("reader");
      scannerRef.current = scanner;
    }

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch {}

    try {
      scanner.clear();
    } catch {}

    const qrboxSize = (() => {
      const size = Math.min(360, Math.max(240, Math.floor(window.innerWidth * 0.8)));
      return { width: size, height: size };
    })();

    const config = { 
      fps: 12, 
      qrbox: qrboxSize,
      aspectRatio: 1.0,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      experimentalFeatures: { useBarCodeDetectorIfSupported: true }
    };

    const pickCameraId = (cameras: Array<{ id: string; label?: string }>) => {
      const normalized = cameras.map((c) => ({
        ...c,
        label: (c.label || '').toLowerCase(),
      }));

      const back = normalized.find((c) => c.label.includes('back') || c.label.includes('rear'));
      if (back) return back.id;

      const environment = normalized.find((c) => c.label.includes('environment'));
      if (environment) return environment.id;

      const wide = normalized.find((c) => c.label.includes('wide'));
      if (wide) return wide.id;

      return cameras[cameras.length - 1]?.id;
    };

    const applyPreferredZoom = () => {
      setTimeout(async () => {
        try {
          const video = document.querySelector<HTMLVideoElement>('#reader video');
          const stream = video?.srcObject as MediaStream | null;
          const track = stream?.getVideoTracks?.()[0];
          const capabilities = track?.getCapabilities?.() as any;
          if (!track || !capabilities?.zoom) return;

          const min = typeof capabilities.zoom.min === 'number' ? capabilities.zoom.min : 1;
          const max = typeof capabilities.zoom.max === 'number' ? capabilities.zoom.max : 1;
          const preferred = Math.min(Math.max(2, min), max);
          await track.applyConstraints({ advanced: [{ zoom: preferred }] } as any);
        } catch {}
      }, 300);
    };

    const onScanSuccess = (decodedText: string, decodedResult: any) => {
      if (hasScannedRef.current) return;

      console.log(`Scan result: ${decodedText}`, decodedResult);

      if (decodedText.includes('/apiaries/') || decodedText.includes('/hives/')) {
        hasScannedRef.current = true;
        setScanResult(decodedText);
        setIsRunning(false);
        if (scanner && scanner.isScanning) {
          scanner.stop().catch(console.error);
        }
        try {
          if (decodedText.startsWith('http')) {
            const url = new URL(decodedText);
            router.push(url.pathname);
          } else {
            router.push(decodedText);
          }
        } catch {
          router.push(decodedText);
        }
      } else if (decodedText.startsWith('BG-') || decodedText.startsWith('KUBE-')) {
        hasScannedRef.current = true;
        setScanResult(decodedText);
        setIsRunning(false);
        if (scanner && scanner.isScanning) {
          scanner.stop().catch(console.error);
        }
        setError('Fant ID: ' + decodedText + '. Søk etter denne ID-en i oversikten.');
      }
    };

    const onScanFailure = (err: any) => {
      void err;
    };

    try {
      const cameras = await Html5Qrcode.getCameras();
      const cameraId = cameras?.length ? pickCameraId(cameras as any) : null;
      if (cameraId) {
        await scanner.start(cameraId, config, onScanSuccess, onScanFailure);
        applyPreferredZoom();
        setIsRunning(true);
        return;
      }
    } catch (err: any) {
      const name = typeof err?.name === 'string' ? err.name : 'Ukjent feil';
      const message = typeof err?.message === 'string' ? err.message : '';
      console.error("Error getting cameras / starting by camera id", err);
      setError(`Kunne ikke starte kamera. (${name}${message ? `: ${message}` : ''})`);
    }

    try {
      await scanner.start(
        { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        config,
        onScanSuccess,
        onScanFailure
      );
      applyPreferredZoom();
      setIsRunning(true);
      return;
    } catch {}

    try {
      await scanner.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanFailure
      );
      applyPreferredZoom();
      setIsRunning(true);
    } catch (err: any) {
      const name = typeof err?.name === 'string' ? err.name : 'Ukjent feil';
      const message = typeof err?.message === 'string' ? err.message : '';
      console.error("Error starting scanner", err);
      setIsRunning(false);
      setError(`Kunne ikke starte kamera. (${name}${message ? `: ${message}` : ''})`);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 flex items-center gap-4 bg-black/50 backdrop-blur-sm fixed top-0 w-full z-10">
        <Link href="/dashboard" className="p-2 -ml-2 hover:bg-white/10 rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-xl font-bold">Skann QR-kode</h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 mt-16">
        <div id="reader" className="w-full max-w-sm overflow-hidden rounded-xl border-2 border-honey-500 shadow-2xl bg-black"></div>

        {!isRunning && !scanResult && !error && (
          <button
            onClick={startScanner}
            disabled={isStarting}
            className="mt-6 w-full max-w-sm bg-honey-500 hover:bg-honey-600 disabled:bg-honey-700 text-black font-bold py-3 rounded-xl transition-colors"
          >
            {isStarting ? 'Starter kamera...' : 'Start scanning'}
          </button>
        )}
        
        {scanResult && (
          <div className="mt-8 p-4 bg-white text-black rounded-xl max-w-sm w-full text-center animate-in slide-in-from-bottom-4">
            <p className="text-sm text-gray-500 mb-1">Fant kode:</p>
            <p className="font-mono font-bold break-all">{scanResult}</p>
            <p className="text-xs text-gray-400 mt-2">Videresender...</p>
          </div>
        )}

        {error && (
          <div className="mt-8 p-4 bg-red-100 text-red-800 rounded-xl max-w-sm w-full text-center animate-in slide-in-from-bottom-4">
            <p className="font-bold mb-1">Feil</p>
            <p className="text-sm">{error}</p>
            <button 
              onClick={startScanner}
              disabled={isStarting}
              className="mt-4 px-4 py-2 bg-red-200 hover:bg-red-300 rounded-lg text-sm font-bold transition-colors"
            >
              {isStarting ? 'Starter kamera...' : 'Prøv igjen'}
            </button>
          </div>
        )}

        <div className="mt-8 text-center text-gray-400 text-sm max-w-xs">
          <p>Pek kameraet mot en QR-kode på en bikube eller bigård.</p>
          <p className="mt-2 text-xs opacity-60">Funker det ikke? Gå til Oversikt og søk på ID-en.</p>
        </div>
      </main>
    </div>
  );
}
