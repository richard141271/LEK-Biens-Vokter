'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function getCookieValue(name: string) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}=([^;]*)`));
  return match ? decodeURIComponent(match[1] || '') : null;
}

export default function DemoModeBanner({ isStagingHost }: { isStagingHost: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [demoSessionId, setDemoSessionId] = useState<string | null>(null);

  const isProtectedPath = useMemo(() => {
    const protectedPrefixes = [
      '/dashboard',
      '/apiaries',
      '/hives',
      '/settings',
      '/scan',
      '/offline',
    ];
    return protectedPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }, [pathname]);

  useEffect(() => {
    if (!isStagingHost) return;
    if (typeof window === 'undefined') return;
    const fromStorage = window.localStorage.getItem('lek_demo_session_id');
    const fromCookie = getCookieValue('lek_demo_session_id');
    const resolved = fromStorage || fromCookie;
    setDemoSessionId(resolved || null);
  }, [isStagingHost, pathname, searchParams]);

  if (!isStagingHost) return null;
  if (!isProtectedPath) return null;
  if (!demoSessionId) return null;

  return (
    <div className="print:hidden bg-black text-yellow-200 text-xs font-semibold">
      <div className="md:pl-64 px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          DEMO MODUS – staging – data slettes ved avslutt (session: <span className="text-yellow-100">{demoSessionId}</span>)
        </div>
        <Link href="/dashboard/admin/temadag" className="text-yellow-200 underline">
          Til Temadag
        </Link>
      </div>
    </div>
  );
}

