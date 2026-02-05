'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { Plus, MapPin, Warehouse, Store, Truck, LogOut, Box, Printer, CheckSquare, Square, X, Download } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export default function ApiariesPage() {
  const [apiaries, setApiaries] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Offline Download State
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  
  // Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedApiaries, setSelectedApiaries] = useState<string[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

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
        .in('type', ['bigård', 'utleie']) // Filter to show only Bigård and Utleie
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
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const apiariesToPrint = apiaries.filter(a => selectedApiaries.includes(a.id));

      for (let i = 0; i < apiariesToPrint.length; i++) {
        const apiary = apiariesToPrint[i];
        if (i > 0) doc.addPage();

        // 1. Background (Yellow)
        doc.setFillColor(253, 224, 71); // Tailwind yellow-300
        doc.rect(0, 0, 210, 297, 'F');

        // 2. Black Border (Inset)
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(4); // ~11px
        doc.rect(5, 5, 200, 287);

        // 3. Header "BIGÅRD"
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(60);
        doc.setTextColor(0, 0, 0);
        doc.text('BIGÅRD', 105, 40, { align: 'center' });

        // 4. Responsible Beekeeper Section
        doc.setFontSize(14);
        doc.setTextColor(60, 60, 60);
        doc.text('ANSVARLIG BIRØKTER', 105, 60, { align: 'center' });

        const fullName = profile?.full_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
        const address = profile?.address || '';
        const city = `${profile?.post_code || ''} ${profile?.city || ''}`.trim();
        const phone = profile?.phone_number || profile?.phone || '';

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(28);
        doc.text((fullName || 'Ukjent Eier').toUpperCase(), 105, 75, { align: 'center' });
        
        doc.setFontSize(20);
        doc.text(address.toUpperCase(), 105, 85, { align: 'center' });
        doc.text(city.toUpperCase(), 105, 95, { align: 'center' });

        doc.setFontSize(28);
        doc.text(`TLF: ${phone}`, 105, 115, { align: 'center' });

        // 5. Badges
        let yPos = 140;
        if (profile?.is_norges_birokterlag_member) {
            // Black box
            doc.setFillColor(0, 0, 0);
            doc.rect(40, yPos, 130, 15, 'F');
            // Yellow text
            doc.setTextColor(253, 224, 71);
            doc.setFontSize(14);
            doc.text('MEDLEM AV NORGES BIRØKTERLAG', 105, yPos + 10, { align: 'center' });
            yPos += 25;
        }

        if (profile?.is_lek_honning_member) {
             // Black box
             doc.setFillColor(0, 0, 0);
             doc.rect(40, yPos, 130, 15, 'F');
             // Yellow text
             doc.setTextColor(253, 224, 71);
             doc.setFontSize(14);
             doc.text('MEDLEM AV LEK-HONNING™ NORGE', 105, yPos + 10, { align: 'center' });
        }

        // 6. Bottom Section (Location ID + QR)
        // Draw line
        doc.setLineWidth(2);
        doc.setDrawColor(0, 0, 0);
        doc.line(20, 230, 190, 230);

        // Location ID Text
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(16);
        doc.text('LOKASJON ID', 20, 245);
        
        doc.setTextColor(0, 0, 0);
        doc.setFont('courier', 'bold'); // Monospace look
        doc.setFontSize(36);
        doc.text(apiary.apiary_number || '', 20, 260);

        // QR Code
        try {
            const qrUrl = `${window.location.origin}/apiaries/${apiary.id}`;
            const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 200 });
            // Add QR Image (30x30mm approx)
            doc.addImage(qrDataUrl, 'PNG', 150, 235, 40, 40);
            // Border around QR
            doc.setLineWidth(1);
            doc.rect(150, 235, 40, 40);
        } catch (err) {
            console.error('QR Gen Error', err);
        }
      }

      doc.autoPrint();
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');

    } catch (error) {
      console.error('Print generation failed', error);
      alert('Kunne ikke generere PDF. Prøv igjen.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleOfflineDownload = async () => {
    if (!confirm('Vil du laste ned alle bigårder og kuber for offline bruk? Dette sikrer at du kan gjøre inspeksjoner i skogen uten dekning.')) return;
    
    setIsDownloading(true);
    setDownloadProgress(0);
    
    try {
        const urls: string[] = [];
        // Add Apiary Pages
        apiaries.forEach(a => {
            urls.push(`/apiaries/${a.id}`);
            // Add Hive Pages
            a.hives?.forEach((h: any) => {
                urls.push(`/hives/${h.id}`);
                urls.push(`/hives/${h.id}/new-inspection`);
            });
        });

        const total = urls.length;
        let completed = 0;

        // Process in batches
        const batchSize = 3;
        for (let i = 0; i < total; i += batchSize) {
            const batch = urls.slice(i, i + batchSize);
            await Promise.all(batch.map(url => fetch(url, { cache: 'reload' }).catch(e => console.error('Failed to fetch', url))));
            completed += batch.length;
            setDownloadProgress(Math.min(100, Math.round((completed / total) * 100)));
        }

        alert('✅ Alt innhold er lastet ned! Du er klar for skogen.');
    } catch (e) {
        console.error(e);
        alert('❌ Noe gikk galt. Sjekk nettet ditt og prøv igjen.');
    } finally {
        setIsDownloading(false);
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

      {/* Floating Action Buttons (Hide in selection mode and for tenants) */}
      {!isSelectionMode && profile?.role !== 'tenant' && (
        <div className="fixed bottom-24 right-6 flex flex-col items-center gap-4 z-20 print:hidden">
          
          {/* Offline Download Button */}
          <button
            onClick={handleOfflineDownload}
            disabled={isDownloading}
            className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
              isDownloading 
                ? 'bg-blue-500 text-white ring-4 ring-blue-200' 
                : 'bg-white text-gray-600 hover:text-blue-600 hover:bg-blue-50 border border-gray-200'
            }`}
            title="Last ned for offline bruk"
          >
             {isDownloading ? (
                 <span className="text-[10px] font-bold">{downloadProgress}%</span>
             ) : (
                 <Download className="w-6 h-6" />
             )}
          </button>

          {/* New Apiary Button */}
          <Link 
            href="/apiaries/new"
            className="w-14 h-14 bg-honey-500 hover:bg-honey-600 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          >
            <Plus className="w-8 h-8" />
          </Link>
        </div>
      )}


    </div>
  );
}
