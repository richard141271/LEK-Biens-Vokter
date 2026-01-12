'use client';

import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if running in browser
    if (typeof window === 'undefined') return;

    // Check if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;
    
    if (isStandalone) return;

    // Handle Android/Desktop
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Handle iOS detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    
    if (isIOS) {
        // Only show if not already standalone (checked above)
        // We might want to delay this or only show it once per session to not be annoying
        // For now, let's show it if it's not standalone
        setIsVisible(true);
        setShowIOSPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      // We've used the prompt, and can't use it again, discard it
      setDeferredPrompt(null);
      if (outcome === 'accepted') {
        setIsVisible(false);
      }
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:bottom-4 md:left-auto md:right-4 md:w-96 bg-white rounded-xl shadow-2xl border border-orange-100 p-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
      <button 
        onClick={() => setIsVisible(false)} 
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-1"
        aria-label="Lukk"
      >
        <X size={16} />
      </button>
      
      <div className="flex items-start gap-4">
        <div className="bg-orange-100 p-3 rounded-lg flex-shrink-0">
            <Download className="text-orange-600" size={24} />
        </div>
        <div className="flex-1">
            <h3 className="font-bold text-gray-900 mb-1">Installer LEK-Appen</h3>
            {showIOSPrompt ? (
                <div className="text-sm text-gray-600 mb-2">
                    <p className="mb-2">For å installere på iPhone:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-1">
                        <li>Trykk på <Share className="inline w-4 h-4 mx-1 text-blue-500" /> knappen</li>
                        <li>Velg <strong>"Legg til på Hjem-skjerm"</strong></li>
                    </ol>
                </div>
            ) : (
                <>
                    <p className="text-sm text-gray-600 mb-3">
                        Få raskere tilgang til bikubene dine direkte fra hjemskjermen.
                    </p>
                    <button
                        onClick={handleInstallClick}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm shadow-sm"
                    >
                        Installer nå
                    </button>
                </>
            )}
        </div>
      </div>
    </div>
  );
}
