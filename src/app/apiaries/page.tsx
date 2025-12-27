'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { Plus, MapPin, Warehouse, Store, Truck, LogOut, Box, Printer, CheckSquare, Square, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

export default function ApiariesPage() {
  const [apiaries, setApiaries] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Selection / Print State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedApiaries, setSelectedApiaries] = useState<string[]>([]);
  const [printLayout, setPrintLayout] = useState<'sign' | null>(null);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Fetch Profile for Sign Info
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    setProfile(profileData);

    // Fetch Apiaries
    const { data, error } = await supabase
      .from('apiaries')
      .select('*, hives(id, active)')
      .order('created_at', { ascending: false });

    if (data) setApiaries(data);
    setLoading(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'lager': return Warehouse;
      case 'bil': return Truck;
      case 'oppstart': return Store;
      default: return MapPin;
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedApiaries(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    setPrintLayout('sign');
    setTimeout(() => {
      window.print();
    }, 500);
  };

  // Exit print mode after printing (optional, or manual)
  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintLayout(null);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  if (loading) return <div className="p-8 text-center">Laster bigårder...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 print:bg-white print:pb-0">
      
      {/* HEADER & ACTIONS */}
      <div className="p-4 flex justify-between items-center print:hidden">
        <h1 className="text-xl font-bold text-gray-900">Mine Lokasjoner</h1>
        <button 
          onClick={() => {
            setIsSelectionMode(!isSelectionMode);
            setSelectedApiaries([]);
          }}
          className={`p-2 rounded-full ${isSelectionMode ? 'bg-gray-200 text-gray-800' : 'bg-white text-gray-600 border border-gray-200 shadow-sm'}`}
        >
          {isSelectionMode ? <X className="w-5 h-5" /> : <Printer className="w-5 h-5" />}
        </button>
      </div>

      {/* SELECTION BAR */}
      {isSelectionMode && (
        <div className="mx-4 mb-4 bg-white p-3 rounded-xl border border-honey-200 shadow-sm flex justify-between items-center animate-in slide-in-from-top-2 print:hidden">
          <span className="text-sm font-medium">{selectedApiaries.length} valgt</span>
          <button
            onClick={handlePrint}
            disabled={selectedApiaries.length === 0}
            className="bg-honey-500 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Skriv ut Skilt
          </button>
        </div>
      )}

      {/* LIST VIEW (Screen) */}
      <main className="p-4 space-y-4 print:hidden">
        {apiaries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">Du har ingen lokasjoner enda.</p>
            <p>Trykk på + for å komme i gang!</p>
          </div>
        ) : (
          apiaries.map((apiary) => {
            const Icon = getIcon(apiary.type);
            const activeHiveCount = apiary.hives?.filter((h: any) => h.active).length || 0;
            const isSelected = selectedApiaries.includes(apiary.id);

            return (
              <div key={apiary.id} className="relative group">
                 {isSelectionMode && (
                    <button
                      onClick={() => toggleSelection(apiary.id)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-6 h-6 text-honey-600 bg-white rounded" />
                      ) : (
                        <Square className="w-6 h-6 text-gray-300 bg-white rounded" />
                      )}
                    </button>
                 )}

                <Link 
                  href={isSelectionMode ? '#' : `/apiaries/${apiary.id}`}
                  onClick={(e) => {
                    if (isSelectionMode) {
                      e.preventDefault();
                      toggleSelection(apiary.id);
                    }
                  }}
                  className={`block transition-all ${isSelectionMode ? 'pl-12' : ''}`}
                >
                  <div className={`bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4 transition-colors cursor-pointer ${
                    isSelected ? 'border-honey-500 ring-1 ring-honey-500' : 'border-gray-200 hover:border-honey-500'
                  }`}>
                    <div className="w-12 h-12 bg-honey-50 rounded-full flex items-center justify-center text-honey-600 shrink-0">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-gray-900 truncate">{apiary.name}</h3>
                        <div className="flex items-center gap-2 shrink-0">
                          {activeHiveCount > 0 && (
                            <span className="text-xs font-medium bg-honey-100 text-honey-700 px-2 py-1 rounded-full flex items-center gap-1">
                              <Box className="w-3 h-3" />
                              {activeHiveCount}
                            </span>
                          )}
                          <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                            {apiary.apiary_number}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{apiary.location || 'Ingen adresse'}</p>
                      {apiary.registration_number && (
                        <p className="text-xs text-gray-400 mt-1">Skilt: {apiary.registration_number}</p>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            );
          })
        )}
      </main>

      {/* PRINT VIEW (Varselskilt) */}
      {printLayout === 'sign' && (
        <div className="hidden print:block bg-white">
          {apiaries
            .filter(a => selectedApiaries.includes(a.id))
            .map(apiary => (
              <div key={apiary.id} className="w-full h-screen flex flex-col items-center justify-center p-8 break-after-page text-center">
                
                {/* Yellow Sign Container */}
                <div className="border-[12px] border-black bg-yellow-300 w-full max-w-3xl aspect-[1/1.2] flex flex-col items-center justify-between p-12 shadow-none box-border relative">
                  
                  {/* HEXAGON SHAPE (Optional visual flair via ClipPath or just CSS) */}
                  {/* Using a simple rectangular warning sign style for maximum readability and ease of print */}

                  <div className="w-full space-y-6">
                    <h1 className="text-[120px] leading-none font-black tracking-tighter uppercase mb-8">BIGÅRD</h1>
                    
                    <div className="text-4xl font-bold">
                      <p className="uppercase tracking-wide mb-2">Tilhører:</p>
                      <p className="text-6xl mb-4">{profile?.full_name || 'Ukjent Eier'}</p>
                      <p className="text-3xl font-normal">{profile?.address || ''}</p>
                      <p className="text-3xl font-normal">{profile?.post_code} {profile?.city}</p>
                    </div>

                    <div className="text-4xl font-bold mt-8">
                      <p>Tlf: {profile?.phone_number || ''}</p>
                    </div>

                    <div className="flex flex-col gap-4 mt-12 items-center">
                      {profile?.is_norges_birokterlag_member && (
                        <div className="bg-black text-yellow-300 px-6 py-2 text-2xl font-bold uppercase w-full max-w-2xl">
                          Medlem av Norges Birøkterlag
                        </div>
                      )}
                      {profile?.is_lek_honning_member && (
                        <div className="bg-black text-yellow-300 px-6 py-2 text-2xl font-bold uppercase w-full max-w-2xl">
                          Medlem av LEK-Honning™ Norge
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="w-full flex justify-between items-end mt-12">
                     {/* ID */}
                     <div className="text-left">
                        <p className="text-2xl font-bold uppercase text-gray-800 mb-1">Bigård ID</p>
                        <p className="text-6xl font-black font-mono tracking-widest">{apiary.apiary_number}</p>
                     </div>

                     {/* QR Code */}
                     <div className="bg-white p-4 border-4 border-black">
                        <QRCodeSVG 
                          value={`${window.location.origin}/apiaries/${apiary.id}`}
                          size={200}
                          level="H"
                          includeMargin={true}
                        />
                     </div>
                  </div>

                </div>
                
                {/* Cut Instructions */}
                <p className="mt-8 text-gray-400 text-sm print:hidden">Klipp ut og laminer for best holdbarhet.</p>
              </div>
            ))}
        </div>
      )}

      {/* Floating Action Button (Hide in selection mode) */}
      {!isSelectionMode && (
        <Link 
          href="/apiaries/new"
          className="fixed bottom-24 right-6 w-14 h-14 bg-honey-500 hover:bg-honey-600 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-20 print:hidden"
        >
          <Plus className="w-8 h-8" />
        </Link>
      )}
    </div>
  );
}
