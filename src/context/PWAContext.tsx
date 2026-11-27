'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient, getUserWithSessionFallback } from '@/utils/supabase/client';

interface PWAContextType {
  installApp: () => Promise<boolean>;
  isInstallable: boolean;
  isStandalone: boolean;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  browserName: 'samsung' | 'chrome' | 'safari' | 'other';
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | 'unknown'>('unknown');
  const [browserName, setBrowserName] = useState<'samsung' | 'chrome' | 'safari' | 'other'>('other');

  useEffect(() => {
    let mounted = true;
    // #region debug-point A:provider-hydration
    const report = typeof window !== 'undefined' ? (window as any).__lekAuthDebug : null;
    if (report) {
      const controller = 'serviceWorker' in navigator ? navigator.serviceWorker.controller : null;
      report('A', 'pwa-provider-mounted', {
        userAgent: String(navigator.userAgent || '').slice(0, 220),
        serviceWorkerControlled: Boolean(controller),
        serviceWorkerScript: controller ? controller.scriptURL : '',
      }, 'src/context/PWAContext.tsx');
    }
    // #endregion
    (async () => {
      try {
        if (typeof window === 'undefined') return;
        const supabase = createClient();
        const user = await getUserWithSessionFallback(supabase, (stage) => {
          if (report) report('B', 'provider-auth-stage', { stage }, 'src/context/PWAContext.tsx');
        });
        if (report) report('B', 'provider-auth-finished', { hasUser: Boolean(user) }, 'src/context/PWAContext.tsx');
        if (!mounted) return;
        const userId = String(user?.id || '').trim();
        if (userId) window.localStorage.setItem('lek_current_user_id', userId);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const prev = window.localStorage.getItem('lek_prev_pathname') || '';
      window.localStorage.setItem('lek_prev_pathname', pathname || '');
      if (pathname && !pathname.startsWith('/feedback')) {
        window.localStorage.setItem('lek_last_user_pathname', pathname);
      }

      const isManaged = (p: string) =>
        p.startsWith('/apiaries') || p.startsWith('/hives') || p.startsWith('/scan');

      const demoOwnerId = window.localStorage.getItem('lek_demo_owner_id') || '';
      const demoSessionId = window.localStorage.getItem('lek_demo_session_id') || '';
      const isDemoActive = Boolean(demoOwnerId && demoSessionId);
      if (isDemoActive) return;

      if (prev && isManaged(prev) && !isManaged(pathname || '')) {
        const userId = window.localStorage.getItem('lek_current_user_id') || '';
        if (userId) window.localStorage.setItem('lek_active_owner_id', userId);
      }
    } catch {}
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const displayMode = typeof window.matchMedia === 'function'
      ? window.matchMedia('(display-mode: standalone)')
      : null;

    const checkStandalone = () => {
      const standalone = Boolean(displayMode?.matches) ||
                         (window.navigator as any).standalone === true;
      setIsStandalone(standalone);
    };
    
    checkStandalone();
    if (displayMode?.addEventListener) {
      displayMode.addEventListener('change', checkStandalone);
    } else if (displayMode?.addListener) {
      displayMode.addListener(checkStandalone);
    }
    
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (
      /iphone|ipad|ipod/.test(userAgent) ||
      (userAgent.includes('macintosh') && window.navigator.maxTouchPoints > 1)
    ) {
        setPlatform('ios');
    } else if (/android/.test(userAgent)) {
        setPlatform('android');
    } else {
        setPlatform('desktop');
    }

    if (/samsungbrowser/.test(userAgent)) {
      setBrowserName('samsung');
    } else if (/crios|chrome/.test(userAgent)) {
      setBrowserName('chrome');
    } else if (/safari/.test(userAgent)) {
      setBrowserName('safari');
    } else {
      setBrowserName('other');
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      if (displayMode?.removeEventListener) {
        displayMode.removeEventListener('change', checkStandalone);
      } else if (displayMode?.removeListener) {
        displayMode.removeListener(checkStandalone);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installApp = async () => {
    const prompt = deferredPrompt;
    if (!prompt) return false;

    setDeferredPrompt(null);
    setIsInstallable(false);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
      return true;
    } catch {
      return false;
    }
  };

  return (
    <PWAContext.Provider value={{ installApp, isInstallable, isStandalone, platform, browserName }}>
      {children}
    </PWAContext.Provider>
  );
}

export function usePWA() {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
}
