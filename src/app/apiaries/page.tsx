'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { Plus, MapPin, Warehouse, Store, Truck, LogOut, Box, Printer, CheckSquare, Square, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export default function ApiariesPage() {
  const [apiaries, setApiaries] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedApiaries, setSelectedApiaries] = useState<string[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [printSigns, setPrintSigns] = useState<any[]>([]);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setProfile(profileData);

      // Fetch Apiaries
      const { data: apiariesData, error } = await supabase
        .from('apiaries')
        .select(`
          *,
          hives (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiaries(apiariesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warehouse': return Warehouse;
      case 'store': return Store;
      case 'transport': return Truck;
      default: return MapPin;
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedApiaries(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handlePrintSigns = async () => {
    if (selectedApiaries.length === 0) return;
    setIsGeneratingPDF(true);

    try {
      const apiariesToPrint = apiaries.filter(a => selectedApiaries.includes(a.id));
      
      // Generate QR codes for each apiary
      const signsWithQr = await Promise.all(apiariesToPrint.map(async (apiary) => {
        try {
            const qrUrl = `${window.location.origin}/apiaries/${apiary.id}`;
            const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 400 });
            return { ...apiary, qrDataUrl };
        } catch (err) {
            console.error('QR Gen Error', err);
            return apiary;
        }
      }));

      setPrintSigns(signsWithQr);
      
      // Allow DOM to update then print
      setTimeout(() => {
        window.print();
        setIsGeneratingPDF(false);
      }, 500);

    } catch (error) {
      console.error('Print prep failed', error);
      alert('Kunne ikke klargjøre utskrift. Prøv igjen.');
      setIsGeneratingPDF(false);
    }
  };

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
            onClick={handlePrintSigns}
            disabled={selectedApiaries.length === 0 || isGeneratingPDF}
            className="bg-honey-500 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            {isGeneratingPDF ? 'Klargjør...' : 'Skriv ut Skilt'}
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

            if (apiary.is_pending) {
              return (
                <div key={apiary.id} className="relative group opacity-75">
                  <div className="bg-white p-4 rounded-xl border border-dashed border-honey-300 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-honey-50 rounded-full flex items-center justify-center text-honey-600 shrink-0 animate-pulse">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-gray-900 truncate">{apiary.name}</h3>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          apiary.status === 'active' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {apiary.status === 'active' ? 'Under opprettelse' : 'Venter på behandling'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{apiary.location}</p>
                      <p className="text-xs text-honey-600 mt-1">
                        {apiary.status === 'active' 
                          ? 'Venter på godkjenning fra birøkter' 
                          : 'Bestillingen er mottatt'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

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

      {/* Floating Action Button (Hide in selection mode and for tenants) */}
      {!isSelectionMode && profile?.role !== 'tenant' && (
        <Link 
          href="/apiaries/new"
          className="fixed bottom-24 right-6 w-14 h-14 bg-honey-500 hover:bg-honey-600 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-20 print:hidden"
        >
          <Plus className="w-8 h-8" />
        </Link>
      )}

      {/* PRINT TEMPLATE - ONLY VISIBLE WHEN PRINTING */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
      <div className="hidden print:flex fixed inset-0 bg-white z-[9999] flex-col">
        {printSigns.map((sign, index) => (
          <div 
            key={index} 
            className="w-full h-[290mm] p-[10mm] flex flex-col items-center text-center relative overflow-hidden"
            style={{ pageBreakAfter: 'always' }}
          >
            {/* Header */}
            <h1 className="text-4xl font-black text-gray-900 mb-6 uppercase tracking-wider border-b-4 border-black pb-2 w-full">
              BIGÅRD
            </h1>

            {/* Main Info */}
            <div className="flex-1 w-full flex flex-col items-center justify-center gap-6">
              
              <div className="space-y-1">
                <p className="text-lg text-gray-600 uppercase tracking-widest font-bold">Birøkter</p>
                <h2 className="text-3xl font-bold text-gray-900">{profile?.first_name} {profile?.last_name}</h2>
                <p className="text-lg text-gray-800">{profile?.phone}</p>
                <p className="text-base text-gray-600">{profile?.address}</p>
              </div>

              <div className="w-full border-t-2 border-gray-300"></div>

              <div className="space-y-1">
                <p className="text-lg text-gray-600 uppercase tracking-widest font-bold">Bigård</p>
                <h3 className="text-3xl font-bold text-gray-900">{sign.name}</h3>
                <p className="text-lg text-gray-800">Nr: {sign.apiary_number}</p>
                {sign.registration_number && (
                  <p className="text-base text-gray-600">Reg: {sign.registration_number}</p>
                )}
              </div>

              {/* QR Code */}
              <div className="mt-2 p-2 bg-white border-4 border-black rounded-xl">
                {sign.qrDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sign.qrDataUrl} alt="QR Kode" className="w-48 h-48 object-contain" />
                )}
              </div>

            </div>

            {/* Footer Warning */}
            <div className="mt-auto w-full pt-4 border-t-4 border-black mb-2">
              <p className="text-lg font-bold text-red-600 uppercase">
                Varsle Mattilsynet ved mistanke om sykdom
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
