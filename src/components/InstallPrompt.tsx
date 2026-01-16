'use client';

import { useState, useEffect } from 'react';
import { Download, Share } from 'lucide-react';

interface InstallPromptProps {
  embedded?: boolean;
}

export default function InstallPrompt({ embedded = false }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in browser
    if (typeof window === 'undefined') return;

    // Check if already in standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    
    // Handle Android/Desktop
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Handle iOS detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    
    if (isIOS && !standalone) {
        setIsInstallable(true);
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
        setIsInstallable(false);
      }
    }
  };

  // If already installed or not installable yet (and not iOS), don't show anything
  if (isStandalone || !isInstallable) return null;

  if (embedded) {
    return (
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-white p-2 rounded-lg shadow-sm text-orange-600">
              <Download size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Last ned appen</h3>
              <p className="text-xs text-gray-600">For bedre opplevelse på mobil</p>
            </div>
          </div>

          {showIOSPrompt ? (
            <div className="text-xs text-gray-600 space-y-2">
              <p>For iPhone:</p>
              <ol className="list-decimal list-inside space-y-1 ml-1 bg-white/50 p-2 rounded">
                <li>Trykk på <Share className="inline w-3 h-3 mx-1 text-blue-500" /></li>
                <li>Velg <strong>&quot;Legg til på Hjem-skjerm&quot;</strong></li>
              </ol>
            </div>
          ) : (
            <button
              onClick={handleInstallClick}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm shadow-sm flex items-center justify-center gap-2"
            >
              <Download size={16} />
              Installer LEK-Appen
            </button>
          )}
        </div>
      </div>
    );
  }

  // Floating version (default, but hidden if embedded is preferred)
  return null; 
}
