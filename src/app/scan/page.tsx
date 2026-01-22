'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ScanPage() {
  const router = useRouter();
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    // Initialize scanner
    // Use Html5Qrcode directly to force environment camera and skip selection UI
    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;
    hasScannedRef.current = false;

    const config = { 
      fps: 10, 
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    scanner.start(
      { facingMode: "environment" }, 
      config, 
      onScanSuccess, 
      onScanFailure
    ).catch(err => {
      console.error("Error starting scanner", err);
      setError("Kunne ikke starte kamera. Sjekk at du har gitt tillatelse.");
    });

    function onScanSuccess(decodedText: string, decodedResult: any) {
      if (hasScannedRef.current) return; // Prevent multiple scans
      hasScannedRef.current = true;

      // Handle the scanned code
      console.log(`Scan result: ${decodedText}`, decodedResult);
      setScanResult(decodedText);
      
      // Stop scanning
      if (scanner.isScanning) {
        scanner.stop().catch(console.error);
      }

      // Check if it's a valid internal URL
      if (decodedText.includes('/apiaries/') || decodedText.includes('/hives/')) {
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
          // Handle direct ID scan (future proofing)
          // We would need to look up the ID. For now, show error or manual entry.
          setError('Fant ID: ' + decodedText + '. Søk etter denne ID-en i oversikten.');
      } else {
        setError('Ukjent QR-kode. Er dette en LEK-Biens Vokter kode?');
        // Re-enable scanning after a delay if needed, but for now show error
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
