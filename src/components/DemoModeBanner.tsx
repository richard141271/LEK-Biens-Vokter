'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function DemoModeBanner({ isDemoAllowed, isStagingHost }: { isDemoAllowed: boolean; isStagingHost: boolean }) {
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

  const isTemadagPath = useMemo(() => pathname === '/dashboard/admin/temadag' || pathname.startsWith('/dashboard/admin/temadag/'), [pathname]);
  const isDemoQuery = useMemo(() => searchParams.get('demo') === '1', [searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fromStorage = window.localStorage.getItem('lek_demo_session_id');
    setDemoSessionId(fromStorage || null);
  }, [pathname, searchParams]);

  if (!isDemoAllowed) return null;
  if (!isProtectedPath) return null;
  if (!demoSessionId) return null;
  if (!isTemadagPath && !isDemoQuery) return null;

  return (
    <div className="print:hidden bg-black text-yellow-200 text-xs font-semibold">
      <div className="md:pl-64 px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          DEMO MODUS{isStagingHost ? ' – staging' : ''} – data slettes ved avslutt (session:{' '}
          <span className="text-yellow-100">{demoSessionId}</span>)
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              try {
                window.localStorage.removeItem('lek_demo_session_id');
                window.localStorage.removeItem('lek_demo_session_expires_at');
                window.localStorage.removeItem('lek_demo_session_token');
                window.localStorage.removeItem('lek_demo_owner_id');
                window.localStorage.removeItem('lek_temadag_slide_index');
                window.localStorage.removeItem('lek_temadag_phone_scale');
                window.localStorage.removeItem('lek_demo_course_active');
              } catch {}
              setDemoSessionId(null);
            }}
            className="text-yellow-200 underline"
          >
            Avslutt kurs
          </button>
          <Link href="/dashboard/admin/temadag" className="text-yellow-200 underline">
            Til Temadag
          </Link>
        </div>
      </div>
    </div>
  );
}
