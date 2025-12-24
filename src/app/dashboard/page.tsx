'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { Plus, MapPin, Warehouse, Store, Truck, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [apiaries, setApiaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchApiaries();
  }, []);

  const fetchApiaries = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    const { data, error } = await supabase
      .from('apiaries')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setApiaries(data);
    setLoading(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'lager': return Warehouse;
      case 'butikk': return Store;
      case 'bil': return Truck;
      default: return MapPin;
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return <div className="p-8 text-center">Laster bigårder...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Mine Lokasjoner</h1>
        <button onClick={handleSignOut} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="p-4 space-y-4">
        {apiaries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">Du har ingen lokasjoner enda.</p>
            <p>Trykk på + for å komme i gang!</p>
          </div>
        ) : (
          apiaries.map((apiary) => {
            const Icon = getIcon(apiary.type);
            return (
              <Link href={`/apiaries/${apiary.id}`} key={apiary.id}>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 hover:border-honey-500 transition-colors cursor-pointer">
                  <div className="w-12 h-12 bg-honey-50 rounded-full flex items-center justify-center text-honey-600 shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-gray-900">{apiary.name}</h3>
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                        {apiary.apiary_number}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{apiary.location || 'Ingen adresse'}</p>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </main>

      {/* Floating Action Button */}
      <Link 
        href="/apiaries/new"
        className="fixed bottom-6 right-6 w-14 h-14 bg-honey-500 hover:bg-honey-600 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
      >
        <Plus className="w-8 h-8" />
      </Link>
    </div>
  );
}
