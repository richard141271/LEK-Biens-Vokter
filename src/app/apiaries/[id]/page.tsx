'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Archive, Truck, Trash2, X, Check, MoreVertical } from 'lucide-react';
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createCount, setCreateCount] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [targetApiaryId, setTargetApiaryId] = useState('');
  const [availableApiaries, setAvailableApiaries] = useState<any[]>([]);
  const [isMoving, setIsMoving] = useState(false);

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

  // --- CREATE HIVES LOGIC ---
  const handleCreateSubmit = async () => {
    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current count for unique numbering
      const { count } = await supabase
        .from('hives')
        .select('*', { count: 'exact', head: true });
      
      let startNum = (count || 0) + 1;
      const newHives = [];

      for (let i = 0; i < createCount; i++) {
        const hiveNumber = `KUBE-${(startNum + i).toString().padStart(3, '0')}`;
        newHives.push({
          user_id: user.id,
          apiary_id: params.id,
          hive_number: hiveNumber,
          status: 'aktiv'
        });
      }

      const { error } = await supabase.from('hives').insert(newHives);
      if (error) throw error;

      // Log creation? Maybe later. For now just create.
      
      await fetchData();
      setIsCreateModalOpen(false);
      setCreateCount(1);
      
      // If we are in a "Store" (Butikk), maybe prompt to move?
      // For now, let user decide to move manually.

    } catch (error: any) {
      alert('Feil ved opprettelse: ' + error.message);
    } finally {
      setIsCreating(false);
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
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
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
          <button 
            onClick={handleDeleteApiary}
            className="p-2 hover:bg-red-50 text-red-500 rounded-full"
            title="Slett lokasjon"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Actions Bar */}
        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
           <div className="flex items-center gap-2">
             <span className="font-semibold text-gray-900">{hives.length} Kuber</span>
           </div>
           
           <div className="flex gap-2">
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
            <p className="mb-4">Ingen bikuber her enda.</p>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="text-honey-600 font-medium hover:underline"
            >
              Opprett kuber
            </button>
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
                      hive.status === 'aktiv' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {hive.status}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">{hive.hive_number}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FAB to add Hive */}
      {!isSelectionMode && (
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-honey-500 hover:bg-honey-600 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-10"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Registrer nye kuber</h3>
              <button onClick={() => setIsCreateModalOpen(false)}><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">Hvor mange kuber vil du registrere på denne lokasjonen?</p>
            
            <div className="flex items-center justify-center gap-6 mb-8">
              <button 
                onClick={() => setCreateCount(Math.max(1, createCount - 1))}
                className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold hover:bg-gray-200"
              >
                -
              </button>
              <span className="text-3xl font-bold text-honey-600">{createCount}</span>
              <button 
                onClick={() => setCreateCount(createCount + 1)}
                className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold hover:bg-gray-200"
              >
                +
              </button>
            </div>

            <button
              onClick={handleCreateSubmit}
              disabled={isCreating}
              className="w-full bg-honey-500 text-white font-bold py-3 rounded-xl hover:bg-honey-600 disabled:opacity-50"
            >
              {isCreating ? 'Oppretter...' : `Opprett ${createCount} kuber`}
            </button>
          </div>
        </div>
      )}

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

    </div>
  );
}
