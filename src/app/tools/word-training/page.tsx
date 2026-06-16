'use client';

import { useRouter } from 'next/navigation';
import WordTraining from '@/components/WordTraining';
import { ArrowLeft } from 'lucide-react';

export default function WordTrainingToolPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="min-w-0">
            <div className="text-xs font-black text-gray-500 uppercase">Verktøy</div>
            <h1 className="text-xl font-black text-gray-900 break-words">📚 Ordtrening</h1>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-4 flex justify-center">
        <WordTraining onClose={() => router.push('/dashboard')} />
      </main>
    </div>
  );
}

