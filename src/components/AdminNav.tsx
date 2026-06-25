'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Shield, 
  Users, 
  Activity, 
  Box,
  LogOut, 
  LayoutDashboard,
  MessageSquare,
  TrendingUp,
  GraduationCap,
  Bug
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useRef, useState } from 'react';

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [feedbackNewCount, setFeedbackNewCount] = useState(0);
  const lastNotifiedRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const res = await fetch('/api/admin/feedback?mode=counts', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        const next = Number(data?.counts?.new || 0) || 0;
        if (!mounted) return;
        setFeedbackNewCount(next);
        const prev = lastNotifiedRef.current;
        if (next > prev) {
          lastNotifiedRef.current = next;
          try {
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(`🔴 ${next} nye tilbakemeldinger`, { body: 'Åpne Tilbakemeldinger i admin.' });
            }
          } catch {}
        } else if (prev === 0) {
          lastNotifiedRef.current = next;
        }
      } catch {}
    };

    void poll();
    const timer = window.setInterval(() => void poll(), 30_000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const LAST_KEY = 'lek_admin_last_activity';
    const IDLE_TIMEOUT_MS = 60 * 60 * 1000;
    const MIN_UPDATE_MS = 10 * 1000;
    const CHECK_INTERVAL_MS = 15 * 1000;
    const REFRESH_INTERVAL_MS = 4 * 60 * 1000;

    let lastActivity = Date.now();
    let lastWrite = 0;

    try {
      const raw = window.localStorage.getItem(LAST_KEY);
      const parsed = raw ? Number(raw) : NaN;
      if (Number.isFinite(parsed) && parsed > 0) lastActivity = parsed;
    } catch {}

    const markActivity = () => {
      const now = Date.now();
      lastActivity = now;
      if (now - lastWrite < MIN_UPDATE_MS) return;
      lastWrite = now;
      try {
        window.localStorage.setItem(LAST_KEY, String(now));
      } catch {}
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key !== LAST_KEY) return;
      const parsed = e.newValue ? Number(e.newValue) : NaN;
      if (Number.isFinite(parsed) && parsed > lastActivity) lastActivity = parsed;
    };

    const signOutDueToIdle = async () => {
      try {
        await supabase.auth.signOut();
      } catch {}
      router.push('/admin');
    };

    const checkIdle = () => {
      const idleFor = Date.now() - lastActivity;
      if (idleFor >= IDLE_TIMEOUT_MS) {
        void signOutDueToIdle();
      }
    };

    const maybeRefreshSession = async () => {
      try {
        const idleFor = Date.now() - lastActivity;
        if (idleFor >= IDLE_TIMEOUT_MS) return;
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

        const { data } = await supabase.auth.getSession();
        const session = data?.session || null;
        if (!session) return;

        const expiresAtMs = typeof session.expires_at === 'number' ? session.expires_at * 1000 : 0;
        const shouldRefresh = expiresAtMs > 0 && expiresAtMs - Date.now() < 10 * 60 * 1000;
        if (shouldRefresh && typeof (supabase.auth as any).refreshSession === 'function') {
          await (supabase.auth as any).refreshSession();
        }
      } catch {}
    };

    const activityEvents: Array<keyof DocumentEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'focus',
    ];

    for (const evt of activityEvents) {
      document.addEventListener(evt, markActivity, { passive: true } as any);
    }
    window.addEventListener('storage', onStorage);

    markActivity();
    const checkTimer = window.setInterval(checkIdle, CHECK_INTERVAL_MS);
    const refreshTimer = window.setInterval(() => {
      void maybeRefreshSession();
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(checkTimer);
      window.clearInterval(refreshTimer);
      window.removeEventListener('storage', onStorage);
      for (const evt of activityEvents) {
        document.removeEventListener(evt, markActivity as any);
      }
    };
  }, [router, supabase]);

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/admin');
  };

  const navItems = [
    { href: '/dashboard/admin', label: 'Oversikt', icon: LayoutDashboard },
    { href: '/dashboard/admin/users', label: 'Brukere', icon: Users },
    { href: '/dashboard/admin/community', label: 'War Room', icon: MessageSquare },
    { href: '/dashboard/admin/pilot-interesser', label: 'Pilotprogram', icon: Activity },
    { href: '/dashboard/admin/feedback', label: 'Tilbakemeldinger', icon: MessageSquare, badge: feedbackNewCount },
    { href: '/dashboard/admin/beekeeping-course', label: 'Digitalt Birøkterkurs', icon: GraduationCap },
    { href: 'https://aksjer.lekbie.no/aksjer/admin', label: 'Aksjeadmin', icon: TrendingUp },
    { href: '/dashboard/admin/temadag', label: 'Temadag', icon: GraduationCap },
    { href: '/dashboard/admin/varroascan', label: 'VarroaScan', icon: Bug },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#111827] text-white border-r border-gray-800 h-screen fixed left-0 top-0 z-50 print:hidden">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 p-1.5 rounded-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-lg text-white">Admin</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isExternal = item.href.startsWith('http');
          const active = !isExternal && isActive(item.href);
          const Icon = item.icon;
          
          const className = `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors relative ${
            active 
              ? 'bg-purple-600 text-white font-medium shadow-lg shadow-purple-900/20' 
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`;

          if (isExternal) {
            return (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className={className}
              >
                <Icon className="w-5 h-5 text-gray-500" />
                <span className="flex-1">{item.label}</span>
              </a>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={className}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-500'}`} />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <Link
          href="/lei-en-kube"
          className="flex items-center gap-3 px-4 py-3 w-full text-left text-gray-400 hover:bg-gray-800 hover:text-white rounded-xl transition-colors"
        >
          <Box className="w-5 h-5 text-gray-500" />
          Lei en kube
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-3 w-full text-left text-gray-400 hover:bg-red-900/20 hover:text-red-400 rounded-xl transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logg ut
        </button>
      </div>
    </aside>
  );
}
