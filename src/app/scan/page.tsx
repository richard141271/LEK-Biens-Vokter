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
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;
    hasScannedRef.current = false;

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

    scanner.start(
      { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, 
      config, 
      onScanSuccess, 
      onScanFailure
    ).then(() => {
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
    }).catch(err => {
      console.error("Error starting scanner", err);
      setError("Kunne ikke starte kamera. Sjekk at du har gitt tillatelse.");
    });

    function onScanSuccess(decodedText: string, decodedResult: any) {
      if (hasScannedRef.current) return; // Prevent multiple scans

      // Handle the scanned code
      console.log(`Scan result: ${decodedText}`, decodedResult);

      // Check if it's a valid internal URL
      if (decodedText.includes('/apiaries/') || decodedText.includes('/hives/')) {
        hasScannedRef.current = true;
        setScanResult(decodedText);
        if (scanner.isScanning) {
          scanner.stop().catch(console.error);
        }
        try {
          // If it's a full URL, extract path
          if (decodedText.startsWith('http')) {
            const url = new URL(decodedText);
            // Verify it matches our domain logic (or just trust the path)
            router.push(url.pathname);
          } else {
            // Relative path
            router.push(decodedText);
          }
        } catch (e) {
          // Fallback
          router.push(decodedText);
        }
      } else if (decodedText.startsWith('BG-') || decodedText.startsWith('KUBE-')) {
          hasScannedRef.current = true;
          setScanResult(decodedText);
          if (scanner.isScanning) {
            scanner.stop().catch(console.error);
          }
          // Handle direct ID scan (future proofing)
          // We would need to look up the ID. For now, show error or manual entry.
          setError('Fant ID: ' + decodedText + '. Søk etter denne ID-en i oversikten.');
      } else {
        return;
      }
    }

    function onScanFailure(error: any) {
      // handle scan failure, usually better to ignore and keep scanning.
      // console.warn(`Code scan error = ${error}`);
    }

    return () => {
      if (scanner.isScanning) {
        scanner.stop().then(() => {
          scanner.clear();
        }).catch(err => {
          console.error("Failed to stop scanner during cleanup", err);
        });
      } else {
        scanner.clear();
      }
    };
  }, [router]);

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
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-200 hover:bg-red-300 rounded-lg text-sm font-bold transition-colors"
            >
              Prøv igjen
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
