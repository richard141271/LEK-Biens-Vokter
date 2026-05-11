'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient, getUserWithSessionFallback } from '@/utils/supabase/client';

interface PWAContextType {
  installApp: () => Promise<void>;
  isInstallable: boolean;
  isStandalone: boolean;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | 'unknown'>('unknown');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (typeof window === 'undefined') return;
        const supabase = createClient();
        const user = await getUserWithSessionFallback(supabase);
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
    // Check if running in browser
    if (typeof window === 'undefined') return;

    // Check if already in standalone mode
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;
      setIsStandalone(standalone);
    };
    
    checkStandalone();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandalone);
    
    // Detect Platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
        setPlatform('ios');
    } else if (/android/.test(userAgent)) {
        setPlatform('android');
    } else {
        setPlatform('desktop');
    }

    // Handle Android/Desktop Install Prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', checkStandalone);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
    }
  };

  return (
    <PWAContext.Provider value={{ installApp, isInstallable, isStandalone, platform }}>
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
