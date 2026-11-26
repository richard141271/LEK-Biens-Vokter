'use client';

import type { MouseEvent } from 'react';
import { Download } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePWA } from '@/context/PWAContext';

interface InstallPromptProps {
  embedded?: boolean;
  mode?: 'floating' | 'inline';
}

export default function InstallPrompt({ embedded = false, mode = 'floating' }: InstallPromptProps) {
  const { installApp, isInstallable, isStandalone } = usePWA();
  const pathname = usePathname();
  const isPublicHeaderPage = pathname === '/' || pathname === '/shop' || pathname === '/about' || pathname === '/lei-en-kube' || pathname?.startsWith('/info');
  
  const handleInstallClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isInstallable) return;

    event.preventDefault();
    void installApp().then((promptWasShown) => {
      if (!promptWasShown) window.location.assign('/install');
    });
  };

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
          <Link
            href="/install"
            onClick={handleInstallClick}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm shadow-sm flex items-center justify-center gap-2"
          >
            <Download size={16} />
            {isInstallable ? 'Installer LEK-Appen' : 'Installer / legg til appen'}
          </Link>
        </div>
      </div>
    );
  }

  if (mode === 'inline') {
    return (
      <Link
        href="/install"
        onClick={handleInstallClick}
        className="bg-honey-500 hover:bg-honey-600 text-white font-bold py-2 px-3 sm:px-4 rounded-full flex items-center gap-1.5 transition-colors text-xs sm:text-sm shadow-sm whitespace-nowrap"
      >
        <Download size={16} />
        Installer
      </Link>
    );
  }

  return (
    <Link
      href="/install"
      onClick={handleInstallClick}
      className={`fixed ${mode === 'floating' && isPublicHeaderPage ? 'top-24' : 'top-4'} right-4 z-[100] bg-honey-500 hover:bg-honey-600 text-white font-bold py-2 px-4 rounded-full shadow-lg flex items-center gap-2 text-sm transition-all hover:scale-105 active:scale-95 print:hidden`}
    >
      <Download size={16} />
      Installer
    </Link>
  );
}
