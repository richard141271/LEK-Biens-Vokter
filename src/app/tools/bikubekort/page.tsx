'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BikubekortToolPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings?print=bikube');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-600 p-8">
      Laster utskrift…
    </div>
  );
}
