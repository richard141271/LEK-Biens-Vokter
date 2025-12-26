'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Archive, Truck, Trash2, X, Check, MoreVertical, ClipboardList, Edit, QrCode } from 'lucide-react';
import Link from 'next/link';
import { Warehouse, Store, MapPin } from 'lucide-react';

export default function ApiaryDetailsPage({ params }: { params: { id: string } }) {
  const [apiary, setApiary] = useState<any>(null);
  const [hives, setHives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection State
  const [selectedHiveIds, setSelectedHiveIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Modals
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [targetApiaryId, setTargetApiaryId] = useState('');
  const [availableApiaries, setAvailableApiaries] = useState<any[]>([]);
  const [isMoving, setIsMoving] = useState(false);

  // Scan Modal State
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scannedHives, setScannedHives] = useState<{ number: string, status: 'created' | 'moved' | 'error', msg: string }[]>([]);
  const [isProcessingScan, setIsProcessingScan] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, [params.id]);

  useEffect(() => {
    if (isMoveModalOpen) {
      fetchAvailableApiaries();
    }
  }, [isMoveModalOpen]);

  const fetchData = async () => {
    // 1. Fetch Apiary
    const { data: apiaryData, error: apiaryError } = await supabase
      .from('apiaries')
      .select('*')
      .eq('id', params.id)
      .single();

    if (apiaryError) {
      console.error('Error fetching apiary:', apiaryError);
      router.push('/dashboard');
      return;
    }
    setApiary(apiaryData);

    // 2. Fetch Hives
    const { data: hivesData } = await supabase
      .from('hives')
      .select('*')
      .eq('apiary_id', params.id)
      .order('hive_number', { ascending: true });

    if (hivesData) setHives(hivesData);
    setLoading(false);
  };

  const fetchAvailableApiaries = async () => {
    const { data } = await supabase
      .from('apiaries')
      .select('id, name, type, apiary_number')
      .neq('id', params.id)
      .order('name');
    
    if (data) setAvailableApiaries(data);
  };

  // --- SELECTION LOGIC ---
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedHiveIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedHiveIds(newSet);
  };

  const selectAll = () => {
    if (selectedHiveIds.size === hives.length) {
      setSelectedHiveIds(new Set());
    } else {
      setSelectedHiveIds(new Set(hives.map(h => h.id)));
    }
  };

  // --- MOVE HIVES LOGIC ---
  const handleMoveSubmit = async () => {
    if (!targetApiaryId || selectedHiveIds.size === 0) return;
    setIsMoving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetApiary = availableApiaries.find(a => a.id === targetApiaryId);
      const idsToMove = Array.from(selectedHiveIds);

      // 1. Update hives
      const { error: updateError } = await supabase
        .from('hives')
        .update({ apiary_id: targetApiaryId })
        .in('id', idsToMove);

      if (updateError) throw updateError;

      // 2. Log movements
      const logs = idsToMove.map(id => ({
        hive_id: id,
        user_id: user?.id,
        action: 'FLYTTET',
        details: `Flyttet fra ${apiary.name} til ${targetApiary?.name} (Masseflytting)`
      }));

      const { error: logError } = await supabase
        .from('hive_logs')
        .insert(logs);

      if (logError) throw logError; // Non-fatal but good to know

      await fetchData();
      setIsMoveModalOpen(false);
      setTargetApiaryId('');
      setSelectedHiveIds(new Set());
      setIsSelectionMode(false);
      alert(`${idsToMove.length} kuber ble flyttet!`);

    } catch (error: any) {
      alert('Feil ved flytting: ' + error.message);
    } finally {
      setIsMoving(false);
    }
  };

  // --- SCAN / MASS REGISTRATION LOGIC ---
  const handleScanSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanInput.trim() || isProcessingScan) return;

    setIsProcessingScan(true);
    const input = scanInput.trim(); 
    // Assume input is Hive Number (e.g., "KUBE-101") or UUID or just "101"
    // Normalize: If just number "101", make it "KUBE-101"
    let hiveNumber = input;
    if (/^\d+$/.test(input)) {
        hiveNumber = `KUBE-${input.padStart(3, '0')}`;
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Check if hive exists
        const { data: existingHive } = await supabase
            .from('hives')
            .select('*')
            .or(`hive_number.eq.${hiveNumber},id.eq.${input}`)
            .single();

        if (existingHive) {
            // Move to this apiary if not already here
            if (existingHive.apiary_id !== params.id) {
                await supabase
                    .from('hives')
                    .update({ apiary_id: params.id })
                    .eq('id', existingHive.id);
                
                // Log movement
                await supabase.from('hive_logs').insert({
                    hive_id: existingHive.id,
                    user_id: user?.id,
                    action: 'FLYTTET',
                    details: `Flyttet til ${apiary.name} (via skanning)`
                });

                setScannedHives(prev => [{ number: existingHive.hive_number, status: 'moved', msg: 'Flyttet hit' }, ...prev]);
            } else {
                setScannedHives(prev => [{ number: existingHive.hive_number, status: 'moved', msg: 'Allerede her' }, ...prev]);
            }
        } else {
            // Create new hive
            const { data: newHive, error: createError } = await supabase
                .from('hives')
                .insert({
                    hive_number: hiveNumber,
                    apiary_id: params.id,
                    user_id: user?.id,
                    name: hiveNumber,
                    status: 'AKTIV',
                    type: 'PRODUKSJON'
                })
                .select()
                .single();

            if (createError) throw createError;

            // Log creation
            await supabase.from('hive_logs').insert({
                hive_id: newHive.id,
                user_id: user?.id,
                action: 'OPPRETTET',
                details: `Opprettet via skanning i ${apiary.name}`
            });

            setScannedHives(prev => [{ number: hiveNumber, status: 'created', msg: 'Opprettet ny' }, ...prev]);
        }
        
        setScanInput(''); // Clear for next scan
        fetchData(); // Refresh list in background

    } catch (error: any) {
        setScannedHives(prev => [{ number: hiveNumber, status: 'error', msg: 'Feil: ' + error.message }, ...prev]);
    } finally {
        setIsProcessingScan(false);
        // Keep focus
        const inputEl = document.getElementById('scan-input');
        if (inputEl) inputEl.focus();
    }
  };

  // --- DELETE APIARY LOGIC ---
  const handleDeleteApiary = async () => {
    if (hives.length > 0) {
      alert('Du kan ikke slette en bigård som inneholder bikuber. Vennligst flytt bikubene først.');
      // Optionally open move modal with all selected
      if (confirm('Vil du åpne flytte-menyen for å flytte alle kuber nå?')) {
        setSelectedHiveIds(new Set(hives.map(h => h.id)));
        setIsSelectionMode(true);
        setIsMoveModalOpen(true);
      }
      return;
    }

    if (!confirm('Er du sikker på at du vil slette denne lokasjonen?')) return;

    const { error } = await supabase
      .from('apiaries')
      .delete()
      .eq('id', params.id);

    if (error) {
      alert('Kunne ikke slette: ' + error.message);
    } else {
      router.push('/dashboard');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'lager': return Warehouse;
      case 'butikk': return Store;
      case 'bil': return Truck;
      default: return MapPin;
    }
  };

  if (loading) return <div className="p-8 text-center">Laster...</div>;
  if (!apiary) return <div className="p-8 text-center">Fant ikke bigård</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Page Title & Actions */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{apiary.name}</h1>
              <p className="text-sm text-gray-500">{apiary.apiary_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={`/apiaries/${params.id}/edit`}
              className="p-2 hover:bg-gray-100 text-gray-600 rounded-full"
              title="Rediger lokasjon"
            >
              <Edit className="w-5 h-5" />
            </Link>
            <button 
              onClick={handleDeleteApiary}
              className="p-2 hover:bg-red-50 text-red-500 rounded-full"
              title="Slett lokasjon"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <main className="p-4 space-y-4">
        {/* Actions Bar */}
        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
           <div className="flex items-center gap-2">
             <span className="font-semibold text-gray-900">{hives.length} Kuber</span>
           </div>
           
           <div className="flex gap-2">
             <button 
                onClick={() => {
                    setIsScanModalOpen(true);
                    setTimeout(() => document.getElementById('scan-input')?.focus(), 100);
                }}
                className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-800"
             >
                <QrCode className="w-4 h-4" />
                Skann / Ny
             </button>

             {hives.length > 0 && (
               <button 
                 onClick={() => setIsSelectionMode(!isSelectionMode)}
                 className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                   isSelectionMode 
                     ? 'bg-honey-100 text-honey-700' 
                     : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                 }`}
               >
                 {isSelectionMode ? 'Avbryt valg' : 'Velg kuber'}
               </button>
             )}
           </div>
        </div>

        {/* Bulk Actions Toolbar (visible when selecting) */}
        {isSelectionMode && (
          <div className="fixed bottom-20 left-4 right-4 bg-gray-900 text-white p-4 rounded-xl shadow-xl flex justify-between items-center z-20 animate-in slide-in-from-bottom-10">
            <div className="flex items-center gap-3">
              <button onClick={selectAll} className="text-sm font-medium hover:text-honey-400">
                {selectedHiveIds.size === hives.length ? 'Velg ingen' : 'Velg alle'}
              </button>
              <span className="text-gray-500">|</span>
              <span className="font-bold">{selectedHiveIds.size} valgt</span>
            </div>
            
            <button
              onClick={() => setIsMoveModalOpen(true)}
              disabled={selectedHiveIds.size === 0}
              className="bg-honey-500 text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50 flex items-center gap-2"
            >
              <Truck className="w-4 h-4" />
              Flytt valgte
            </button>
          </div>
        )}

        {/* Hives List */}
        {hives.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            <Archive className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="mb-4">Ingen bikuber her enda. Opprett fra oversikten.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {hives.map((hive) => (
              <div 
                key={hive.id} 
                className={`bg-white p-4 rounded-xl border shadow-sm flex items-center gap-3 transition-all ${
                  selectedHiveIds.has(hive.id) 
                    ? 'border-honey-500 ring-1 ring-honey-500 bg-honey-50' 
                    : 'border-gray-200'
                }`}
                onClick={() => {
                  if (isSelectionMode) toggleSelection(hive.id);
                  else router.push(`/hives/${hive.id}`);
                }}
              >
                {isSelectionMode && (
                  <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                    selectedHiveIds.has(hive.id) ? 'bg-honey-500 border-honey-500' : 'border-gray-300 bg-white'
                  }`}>
                    {selectedHiveIds.has(hive.id) && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                )}
                
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-gray-900">{hive.name}</h3>
                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${
                      (hive.active === false ? 'inaktiv' : (hive.status || 'aktiv')).toLowerCase() === 'aktiv' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {hive.active === false ? 'INAKTIV' : (hive.status || 'AKTIV')}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">{hive.hive_number}</p>
                </div>
                
                {/* Inspection Button */}
                {!isSelectionMode && (
                  <Link 
                    href={`/hives/${hive.id}/new-inspection`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 text-gray-400 hover:text-honey-600 hover:bg-honey-50 rounded-full"
                    title="Ny inspeksjon"
                  >
                    <ClipboardList className="w-5 h-5" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MOVE MODAL */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-honey-50">
              <h3 className="font-bold text-lg text-gray-900">Flytt {selectedHiveIds.size} kuber</h3>
              <button onClick={() => setIsMoveModalOpen(false)}><X className="w-6 h-6 text-gray-500" /></button>
            </div>
            
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">Velg destinasjon:</p>
              
              <div className="space-y-2 max-h-[50vh] overflow-y-auto mb-4">
                {availableApiaries.map((a) => {
                  const Icon = getIcon(a.type);
                  const isSelected = targetApiaryId === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setTargetApiaryId(a.id)}
                      className={`w-full p-3 rounded-lg border flex items-center gap-3 transition-all ${
                        isSelected 
                          ? 'border-honey-500 bg-honey-50 ring-1 ring-honey-500' 
                          : 'border-gray-200 hover:border-honey-300'
                      }`}
                    >
                      <div className={`p-2 rounded-full ${isSelected ? 'bg-honey-100 text-honey-600' : 'bg-gray-100 text-gray-500'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-medium text-gray-900">{a.name}</div>
                        <div className="text-xs text-gray-500">{a.apiary_number}</div>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-honey-600" />}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleMoveSubmit}
                disabled={!targetApiaryId || isMoving}
                className="w-full bg-honey-500 hover:bg-honey-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isMoving ? 'Flytter...' : 'Bekreft flytting'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCAN MODAL */}
      {isScanModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-900 text-white">
              <div className="flex items-center gap-2">
                <QrCode className="w-6 h-6" />
                <h3 className="font-bold text-lg">Hurtig-registrering</h3>
              </div>
              <button onClick={() => setIsScanModalOpen(false)}><X className="w-6 h-6 text-gray-400 hover:text-white" /></button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <p className="text-sm text-gray-600 mb-6">
                Skann QR-koden på kuben eller skriv inn nummeret manuelt og trykk enter. 
                Hvis kuben ikke finnes, blir den opprettet her. Hvis den finnes, flyttes den hit.
              </p>

              <form onSubmit={handleScanSubmit} className="mb-8">
                <div className="relative">
                    <input
                        id="scan-input"
                        type="text"
                        value={scanInput}
                        onChange={(e) => setScanInput(e.target.value)}
                        placeholder="KUBE-XXX"
                        className="w-full text-3xl font-mono font-bold p-4 border-2 border-gray-300 rounded-xl focus:border-honey-500 focus:ring-4 focus:ring-honey-100 outline-none text-center uppercase placeholder-gray-200"
                        autoComplete="off"
                    />
                    {isProcessingScan && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-honey-500"></div>
                        </div>
                    )}
                </div>
                <p className="text-center text-xs text-gray-400 mt-2">Trykk Enter for å registrere</p>
              </form>

              {/* Recent Scans */}
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-2">Nylig skannet</h4>
                {scannedHives.length === 0 ? (
                    <div className="text-center py-8 text-gray-300 italic">Ingen kuber skannet enda</div>
                ) : (
                    scannedHives.map((item, i) => (
                        <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${
                            item.status === 'error' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                        } animate-in slide-in-from-top-2 fade-in duration-300`}>
                            <div className="flex items-center gap-3">
                                <div className={`font-mono font-bold ${item.status === 'error' ? 'text-red-700' : 'text-green-700'}`}>
                                    {item.number}
                                </div>
                                <div className="text-sm text-gray-600">{item.msg}</div>
                            </div>
                            {item.status !== 'error' && <Check className="w-5 h-5 text-green-600" />}
                        </div>
                    ))
                )}
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50">
                <button 
                    onClick={() => setIsScanModalOpen(false)}
                    className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-gray-800"
                >
                    Ferdig
                </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
