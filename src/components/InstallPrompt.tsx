'use client';

import { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { usePWA } from '@/context/PWAContext';

interface InstallPromptProps {
  embedded?: boolean;
  mode?: 'floating' | 'inline';
}

export default function InstallPrompt({ embedded = false, mode = 'floating' }: InstallPromptProps) {
  const { installApp, isInstallable, isStandalone, platform } = usePWA();
  const [showInstructions, setShowInstructions] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  
  const pathname = usePathname();

  // Determine if we are on a page where the inline button is used
  const isPublicHeaderPage = pathname === '/' || pathname === '/shop' || pathname === '/about' || pathname === '/lei-en-kube' || pathname?.startsWith('/info');
  
  const handleInstallClick = async () => {
    if (isInstallable) {
      await installApp();
    } else {
      // If no prompt available (iOS or Desktop Safari/Chrome without event), show instructions
      if (embedded) {
        setShowInstructions(!showInstructions);
      } else {
        setIsInstructionsOpen(true);
      }
    }
  };

  // If already installed, don't show anything
  if (isStandalone) return null;

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

          {showInstructions ? (
            <div className="text-xs text-gray-600 space-y-2 bg-white/50 p-3 rounded-lg">
               {platform === 'ios' && (
                  <>
                    <p>For iPhone:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-1">
                        <li>Trykk på <Share className="inline w-3 h-3 mx-1 text-blue-500" /></li>
                        <li>Velg <strong>&quot;Legg til på Hjem-skjerm&quot;</strong></li>
                    </ol>
                  </>
               )}
               {platform === 'android' && (
                   <>
                    <p>For Android:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-1">
                        <li>Trykk på menyen (tre prikker)</li>
                        <li>Velg <strong>&quot;Installer app&quot;</strong> eller <strong>&quot;Legg til på startskjerm&quot;</strong></li>
                    </ol>
                   </>
               )}
               {platform === 'desktop' && (
                   <>
                    <p>For PC/Mac:</p>
                    <ul className="list-disc list-inside space-y-1 ml-1">
                        <li><strong>Chrome/Edge:</strong> Klikk på installeringsikonet i adressefeltet.</li>
                        <li><strong>Safari:</strong> Del &rarr; Legg til i Dock.</li>
                    </ul>
                   </>
               )}
            </div>
          ) : (
            <button
              onClick={handleInstallClick}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm shadow-sm flex items-center justify-center gap-2"
            >
              <Download size={16} />
              {isInstallable ? 'Installer LEK-Appen' : 'Slik installerer du appen'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Floating version (default)
  const positionClass = (mode === 'floating' && isPublicHeaderPage) ? 'top-24' : 'top-4';

  const Instructions = () => (
    <div className={`fixed ${positionClass} right-4 z-[100] bg-white p-4 rounded-xl shadow-xl border border-gray-200 max-w-xs animate-in slide-in-from-right-5 print:hidden text-left`}>
      <button 
        onClick={() => setIsInstructionsOpen(false)} 
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        <X size={16} />
      </button>
      <h3 className="font-bold text-gray-900 mb-2">Slik installerer du appen</h3>
      
      {platform === 'ios' && (
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li>Trykk på dele-knappen <Share className="inline w-4 h-4 mx-1 text-blue-500" /></li>
            <li>Scroll ned og velg <strong>&quot;Legg til på Hjem-skjerm&quot;</strong></li>
          </ol>
      )}

      {platform === 'android' && (
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li>Trykk på menyen (tre prikker)</li>
            <li>Velg <strong>&quot;Installer app&quot;</strong> eller <strong>&quot;Legg til på startskjerm&quot;</strong></li>
          </ol>
      )}

      {platform === 'desktop' && (
          <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Chrome/Edge:</strong> Klikk på installeringsikonet i adressefeltet (til høyre).</p>
              <p><strong>Safari:</strong> Trykk på dele-knappen og velg &quot;Legg til i Dock&quot;.</p>
          </div>
      )}
    </div>
  );

  if (mode === 'inline') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className="bg-honey-500 hover:bg-honey-600 text-white font-bold py-2 px-4 rounded-full flex items-center gap-2 transition-colors text-sm shadow-sm"
        >
          <Download size={16} />
          {isInstallable ? 'Installer' : 'Installer'}
        </button>
        {isInstructionsOpen && <Instructions />}
      </>
    );
  }

  if (isInstructionsOpen) {
      return <Instructions />;
  }

  // Always show the button if not standalone (user requirement)
  return (
      <button
        onClick={handleInstallClick}
        className={`fixed ${positionClass} right-4 z-[100] bg-honey-500 hover:bg-honey-600 text-white font-bold py-2 px-4 rounded-full shadow-lg flex items-center gap-2 text-sm transition-all hover:scale-105 active:scale-95 print:hidden`}
      >
        <Download size={16} />
        {isInstallable ? 'Installer App' : 'Installer'}
      </button>
  );
}
