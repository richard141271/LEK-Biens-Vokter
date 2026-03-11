'use client';

import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="p-6 max-w-lg mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h1 className="text-lg font-bold text-gray-900">Du er offline</h1>
          <p className="text-sm text-gray-600 mt-1">
            Åpne sider du har brukt nylig, eller last ned offline-innhold når du har nett.
          </p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Link
              href="/hives"
              className="bg-honey-500 hover:bg-honey-600 text-white text-center py-2 rounded-lg text-sm font-bold"
            >
              Bikuber
            </Link>
            <Link
              href="/apiaries"
              className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 text-center py-2 rounded-lg text-sm font-bold"
            >
              Bigårder
            </Link>
            <Link
              href="/dashboard"
              className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 text-center py-2 rounded-lg text-sm font-bold col-span-2"
            >
              Min side
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

