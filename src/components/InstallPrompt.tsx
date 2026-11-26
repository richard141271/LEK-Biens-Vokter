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
  const { installApp, isInstallable, isStandalone, platform, browserName } = usePWA();
  const [showInstructions, setShowInstructions] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  
  const pathname = usePathname();

  const isPublicHeaderPage = pathname === '/' || pathname === '/shop' || pathname === '/about' || pathname === '/lei-en-kube' || pathname?.startsWith('/info');
  
  const handleInstallClick = async () => {
    if (isInstallable) {
      const promptWasShown = await installApp();
      if (promptWasShown) return;
    }

    if (embedded) setShowInstructions((current) => !current);
    else setIsInstructionsOpen(true);
  };

  if (isStandalone) return null;

  const instructions = (
    <div className="text-sm text-gray-700 space-y-3">
      {platform === 'ios' && (
        <>
          {browserName !== 'safari' && (
            <p>Åpne denne siden i Safari for å legge den til på Hjem-skjermen.</p>
          )}
          <ol className="list-decimal list-inside space-y-2">
            <li>Trykk på dele-knappen <Share className="inline w-4 h-4 mx-1 text-blue-500" /></li>
            <li>Velg <strong>&quot;Legg til på Hjem-skjerm&quot;</strong>, og trykk Legg til.</li>
          </ol>
        </>
      )}

      {platform === 'android' && (
        <>
          <p className="rounded-lg bg-amber-50 p-3 text-amber-900">
            Hvis du bruker privat/inkognito-fane, åpne siden i en vanlig fane først. Privat modus kan blokkere installering.
          </p>
          {browserName === 'samsung' ? (
            <>
              <p><strong>Samsung Internet:</strong></p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Åpne nettlesermenyen (tre streker eller tre prikker).</li>
                <li>Velg <strong>&quot;Legg til side på&quot;</strong> og deretter <strong>&quot;Startskjerm&quot;</strong>.</li>
              </ol>
            </>
          ) : browserName === 'chrome' ? (
            <>
              <p><strong>Chrome:</strong></p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Åpne menyen med tre prikker øverst.</li>
                <li>Velg <strong>&quot;Installer app&quot;</strong> eller <strong>&quot;Legg til på startskjermen&quot;</strong>.</li>
              </ol>
            </>
          ) : (
            <p>Åpne nettlesermenyen og velg <strong>&quot;Legg til på startskjermen&quot;</strong> eller <strong>&quot;Installer app&quot;</strong>.</p>
          )}
        </>
      )}

      {platform === 'desktop' && (
        <div className="space-y-2">
          <p><strong>Chrome/Edge:</strong> Velg installeringsikonet i adressefeltet eller «Installer app» i menyen.</p>
          <p><strong>Safari på Mac:</strong> Del-menyen → «Legg til i Dock».</p>
        </div>
      )}

      {platform === 'unknown' && (
        <p>Åpne nettlesermenyen og velg «Legg til på startskjermen» eller «Installer app».</p>
      )}
    </div>
  );

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
            <div className="bg-white/70 p-3 rounded-lg">
              {instructions}
              <button
                onClick={() => setShowInstructions(false)}
                type="button"
                className="mt-3 w-full rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white"
              >
                Skjul veiledning
              </button>
            </div>
          ) : (
            <button
              onClick={handleInstallClick}
              type="button"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm shadow-sm flex items-center justify-center gap-2"
            >
              <Download size={16} />
              {isInstallable ? 'Installer LEK-Appen' : 'Installer / legg til appen'}
            </button>
          )}
        </div>
      </div>
    );
  }

  const closeInstructions = () => setIsInstructionsOpen(false);
  const instructionsDialog = isInstructionsOpen ? (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 print:hidden">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-help-title"
        className="relative max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 text-left shadow-2xl"
      >
        <button
          onClick={closeInstructions}
          type="button"
          aria-label="Lukk installasjonsveiledning"
          className="absolute right-3 top-3 rounded-full p-2 text-gray-500 hover:bg-gray-100"
        >
          <X size={18} />
        </button>
        <h2 id="install-help-title" className="mb-3 pr-8 text-lg font-bold text-gray-900">
          Installer Biens Vokter
        </h2>
        {instructions}
        <button
          onClick={closeInstructions}
          type="button"
          className="mt-5 w-full rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white"
        >
          Forstått
        </button>
      </section>
    </div>
  ) : null;
  if (mode === 'inline') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          type="button"
          aria-haspopup="dialog"
          className="bg-honey-500 hover:bg-honey-600 text-white font-bold py-2 px-3 sm:px-4 rounded-full flex items-center gap-1.5 transition-colors text-xs sm:text-sm shadow-sm whitespace-nowrap"
        >
          <Download size={16} />
          Installer
        </button>
        {instructionsDialog}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        type="button"
        className={`fixed ${mode === 'floating' && isPublicHeaderPage ? 'top-24' : 'top-4'} right-4 z-[100] bg-honey-500 hover:bg-honey-600 text-white font-bold py-2 px-4 rounded-full shadow-lg flex items-center gap-2 text-sm transition-all hover:scale-105 active:scale-95 print:hidden`}
      >
        <Download size={16} />
        Installer
      </button>
      {instructionsDialog}
    </>
  );
}
