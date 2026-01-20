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

    let targetUserId: string | null = null;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      targetUserId = params.get('user_id');
    }

    // Fetch Apiaries (valgfritt filtrert på spesifikk bruker)
    let apiaryQuery = supabase
      .from('apiaries')
      .select('*, hives(id, active)')
      .order('created_at', { ascending: false });

    if (targetUserId) {
      apiaryQuery = apiaryQuery.eq('user_id', targetUserId);
    }

    const { data: apiaryData } = await apiaryQuery;

    // Fetch Pending Rentals (Apiaries under construction)
    const { data: rentalData } = await supabase
      .from('rentals')
      .select('*')
      .eq('user_id', targetUserId || user.id)
      .is('apiary_id', null)
      .neq('status', 'cancelled');
      // Removed .eq('status', 'active') to show all pending/active rentals


    // Combine: Map rentals to temporary apiary objects
    const pendingApiaries = (rentalData || []).map(rental => ({
      id: `pending-${rental.id}`,
      name: rental.contact_name ? `${rental.contact_name} sin hage` : 'Ny bigård (leie)',
      location: rental.contact_address || 'Adresse kommer',
      type: 'rental_pending',
      hives: Array(rental.hive_count).fill({ active: true }), // Placeholder hives
      is_pending: true,
      status: rental.status // Pass status through
    }));

    if (apiaryData) setApiaries([...pendingApiaries, ...apiaryData]);
    setLoading(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'rental_pending': return Store; // Or a specific icon for pending
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

  const generateSignPDF = async () => {
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

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(28);
        doc.text((profile?.full_name || 'Ukjent Eier').toUpperCase(), 105, 75, { align: 'center' });
        
        doc.setFontSize(20);
        doc.text((profile?.address || '').toUpperCase(), 105, 85, { align: 'center' });
        doc.text(`${profile?.post_code || ''} ${profile?.city || ''}`.toUpperCase(), 105, 95, { align: 'center' });

        doc.setFontSize(28);
        doc.text(`TLF: ${profile?.phone_number || ''}`, 105, 115, { align: 'center' });

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

      doc.save('bigard-skilt.pdf');

    } catch (error) {
      console.error('PDF Generation failed', error);
      alert('Kunne ikke generere PDF. Prøv igjen.');
    } finally {
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
            onClick={generateSignPDF}
            disabled={selectedApiaries.length === 0 || isGeneratingPDF}
            className="bg-honey-500 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            {isGeneratingPDF ? 'Lager PDF...' : 'Last ned Skilt (PDF)'}
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
    </div>
  );
}
