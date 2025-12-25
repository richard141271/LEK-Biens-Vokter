'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Truck, Calendar, Activity, X, Check, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { Warehouse, Store } from 'lucide-react';

export default function HiveDetailsPage({ params }: { params: { id: string } }) {
  const [hive, setHive] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInspectionId, setExpandedInspectionId] = useState<string | null>(null);
  
  // Move Modal State
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [apiaries, setApiaries] = useState<any[]>([]);
  const [targetApiaryId, setTargetApiaryId] = useState('');
  const [moving, setMoving] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchHiveDetails();
  }, [params.id]);

  const fetchHiveDetails = async () => {
    // Fetch Hive with Apiary info
    const { data: hiveData, error: hiveError } = await supabase
      .from('hives')
      .select('*, apiaries(name, location, type)')
      .eq('id', params.id)
      .single();

    if (hiveError) {
      console.error('Error fetching hive:', hiveError);
      return;
    }
    setHive(hiveData);

    // Fetch Logs
    const { data: logsData } = await supabase
      .from('hive_logs')
      .select('*')
      .eq('hive_id', params.id)
      .order('created_at', { ascending: false });

    if (logsData) setLogs(logsData);

    // Fetch Inspections
    const { data: inspectionsData } = await supabase
      .from('inspections')
      .select('*')
      .eq('hive_id', params.id)
      .order('inspection_date', { ascending: false });

    if (inspectionsData) setInspections(inspectionsData);

    setLoading(false);
  };

  const moveHive = async () => {
    // Fetch apiaries for the modal
    const { data } = await supabase.from('apiaries').select('*').order('name');
    if (data) setApiaries(data);
    setIsMoveModalOpen(true);
  };

  const handleMoveSubmit = async () => {
    if (!targetApiaryId) return;
    setMoving(true);

    try {
      const targetApiary = apiaries.find(a => a.id === targetApiaryId);
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Update hive location
      const { error: updateError } = await supabase
        .from('hives')
        .update({ apiary_id: targetApiaryId })
        .eq('id', params.id);

      if (updateError) throw updateError;

      // 2. Log movement
      const { error: logError } = await supabase
        .from('hive_logs')
        .insert({
          hive_id: params.id,
          user_id: user?.id,
          action: 'FLYTTET',
          details: `Flyttet fra ${hive.apiaries?.name || 'Ukjent'} til ${targetApiary?.name} (${targetApiary?.apiary_number})`
        });

      if (logError) throw logError;

      // 3. Refresh and close
      await fetchHiveDetails();
      setIsMoveModalOpen(false);
      setTargetApiaryId('');
      alert('Kuben er flyttet!');

    } catch (error: any) {
      alert('Feil ved flytting: ' + error.message);
    } finally {
      setMoving(false);
    }
  };

  const toggleInspection = (id: string) => {
    if (expandedInspectionId === id) {
      setExpandedInspectionId(null);
    } else {
      setExpandedInspectionId(id);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'lager': return Warehouse;
      case 'butikk': return Store;
      case 'bil': return Truck;
      default: return MapPin;
    }
  };

  if (loading) return <div className="p-8 text-center">Laster bikube...</div>;
  if (!hive) return <div className="p-8 text-center">Fant ikke bikube</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 print:bg-white print:pb-0">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10 print:hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{hive.name}</h1>
              <p className="text-sm text-gray-500">{hive.hive_number}</p>
            </div>
          </div>
          <button onClick={handlePrint} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
            <Printer className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Print Header */}
      <div className="hidden print:block p-8 pb-0">
        <h1 className="text-3xl font-bold">{hive.name} (#{hive.hive_number})</h1>
        <p>Utskrift dato: {new Date().toLocaleDateString()}</p>
      </div>

      <main className="p-4 space-y-6 print:p-8">
        
        {/* Status Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm print:border-black">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-honey-100 rounded-full flex items-center justify-center text-honey-600 print:hidden">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Status</h2>
              <p className={`font-medium px-2 py-0.5 rounded-full inline-block text-sm ${
                hive.status === 'OK' ? 'bg-green-100 text-green-800' :
                hive.status === 'DØD' ? 'bg-red-100 text-red-800' :
                'bg-orange-100 text-orange-800'
              }`}>
                {hive.status || 'OK'}
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-100 pt-4 mt-4 print:border-gray-300">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5 print:hidden" />
              <div>
                <p className="text-sm font-medium text-gray-900">Nåværende lokasjon</p>
                <p className="text-gray-600">{hive.apiaries?.name || 'Ukjent'}</p>
                <p className="text-xs text-gray-500">{hive.apiaries?.location}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions (Hidden on Print) */}
        <div className="grid grid-cols-2 gap-4 print:hidden">
          <button 
            onClick={moveHive}
            className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <Truck className="w-8 h-8 text-blue-500" />
            <span className="font-medium text-gray-900">Flytt kube</span>
          </button>
          
          <Link 
            href={`/hives/${hive.id}/new-inspection`}
            className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <Calendar className="w-8 h-8 text-honey-500" />
            <span className="font-medium text-gray-900">Ny inspeksjon</span>
          </Link>
        </div>

        {/* Inspections History */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3 print:text-xl">Inspeksjonshistorikk</h3>
          <div className="space-y-3">
            {inspections.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Ingen inspeksjoner enda.</p>
            ) : (
              inspections.map((inspection) => (
                <div 
                  key={inspection.id} 
                  className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all print:border-black print:shadow-none print:break-inside-avoid ${
                    expandedInspectionId === inspection.id ? 'ring-2 ring-honey-500' : ''
                  }`}
                >
                  <div 
                    onClick={() => toggleInspection(inspection.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 print:hover:bg-white"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-gray-100 p-2 rounded-lg text-center min-w-[3rem] print:bg-white print:border print:border-gray-300">
                        <div className="text-xs text-gray-500 uppercase font-bold">{new Date(inspection.inspection_date).toLocaleString('default', { month: 'short' })}</div>
                        <div className="text-lg font-bold text-gray-900">{new Date(inspection.inspection_date).getDate()}</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <span className="font-bold text-gray-900">{inspection.status}</span>
                           {inspection.weather && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{inspection.weather}</span>}
                        </div>
                        <p className="text-sm text-gray-500 truncate max-w-[200px] print:max-w-none">
                          {inspection.notes || 'Ingen notater'}
                        </p>
                      </div>
                    </div>
                    {expandedInspectionId === inspection.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400 print:hidden" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 print:hidden" />
                    )}
                  </div>

                  {/* Expanded Details */}
                  {(expandedInspectionId === inspection.id || typeof window !== 'undefined' && window.matchMedia('print').matches) && (
                    <div className="px-4 pb-4 pt-0 bg-gray-50 border-t border-gray-100 print:bg-white print:block">
                      <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                        <div>
                          <span className="block text-xs font-bold text-gray-500 uppercase">Dronning</span>
                          <span className={inspection.queen_seen ? 'text-green-600 font-bold' : 'text-gray-400'}>
                            {inspection.queen_seen ? 'Observert' : 'Ikke sett'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-gray-500 uppercase">Egg</span>
                          <span className={inspection.eggs_seen ? 'text-green-600 font-bold' : 'text-gray-400'}>
                            {inspection.eggs_seen ? 'Observert' : 'Ikke sett'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-gray-500 uppercase">Gemytt</span>
                          <span className="capitalize">{inspection.temperament}</span>
                        </div>
                         <div>
                          <span className="block text-xs font-bold text-gray-500 uppercase">Yngel</span>
                          <span className="capitalize">{inspection.brood_condition}</span>
                        </div>
                         <div>
                          <span className="block text-xs font-bold text-gray-500 uppercase">Fôr</span>
                          <span className="capitalize">{inspection.honey_stores}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-gray-500 uppercase">Temperatur</span>
                          <span>{inspection.temperature ? `${inspection.temperature}°C` : '-'}</span>
                        </div>
                      </div>
                      {inspection.notes && (
                        <div className="mt-4 bg-white p-3 rounded border border-gray-200 print:border-none print:p-0">
                          <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Notater</span>
                          <p className="text-gray-800 whitespace-pre-wrap">{inspection.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Logs History (Optional, hidden on print usually but good to keep) */}
        <div className="print:hidden">
          <h3 className="text-lg font-bold text-gray-900 mb-3 mt-8">Logg</h3>
          <div className="space-y-3">
             {logs.map((log) => (
                <div key={log.id} className="bg-white p-3 rounded-lg border border-gray-100 text-sm text-gray-500">
                   <span className="font-bold text-gray-700">{log.action}: </span>
                   {log.details}
                   <div className="text-xs text-gray-400 mt-1">{new Date(log.created_at).toLocaleString()}</div>
                </div>
             ))}
          </div>
        </div>

      </main>

      {/* Move Hive Modal */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-honey-50">
              <h3 className="font-bold text-lg text-gray-900">Flytt {hive.name}</h3>
              <button 
                onClick={() => setIsMoveModalOpen(false)}
                className="p-1 hover:bg-honey-100 rounded-full text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">Velg hvor du vil flytte kuben:</p>
              
              <div className="space-y-2 max-h-[60vh] overflow-y-auto mb-4">
                {apiaries.map((apiary) => {
                  const Icon = getIcon(apiary.type);
                  const isSelected = targetApiaryId === apiary.id;
                  
                  return (
                    <button
                      key={apiary.id}
                      onClick={() => setTargetApiaryId(apiary.id)}
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
                        <div className="font-medium text-gray-900">{apiary.name}</div>
                        <div className="text-xs text-gray-500">{apiary.apiary_number}</div>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-honey-600" />}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleMoveSubmit}
                disabled={!targetApiaryId || moving}
                className="w-full bg-honey-500 hover:bg-honey-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {moving ? 'Flytter...' : 'Bekreft flytting'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
