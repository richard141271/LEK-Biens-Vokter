'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Calendar } from 'lucide-react';

export default function NewInspectionPage({ params }: { params: { id: string } }) {
  const [hive, setHive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [queenSeen, setQueenSeen] = useState(false);
  const [eggsSeen, setEggsSeen] = useState(false);
  const [broodCondition, setBroodCondition] = useState('normal');
  const [honeyStores, setHoneyStores] = useState('middels');
  const [temperament, setTemperament] = useState('rolig');
  const [notes, setNotes] = useState('');

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchHive();
  }, [params.id]);

  const fetchHive = async () => {
    const { data, error } = await supabase
      .from('hives')
      .select('name, hive_number')
      .eq('id', params.id)
      .single();
    
    if (data) setHive(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Insert Inspection
      const { error: inspectionError } = await supabase
        .from('inspections')
        .insert({
          hive_id: params.id,
          user_id: user?.id,
          inspection_date: date,
          queen_seen: queenSeen,
          eggs_seen: eggsSeen,
          brood_condition: broodCondition,
          honey_stores: honeyStores,
          temperament: temperament,
          notes: notes
        });

      if (inspectionError) throw inspectionError;

      // 2. Log Activity
      const { error: logError } = await supabase
        .from('hive_logs')
        .insert({
          hive_id: params.id,
          user_id: user?.id,
          action: 'INSPEKSJON',
          details: `Inspeksjon utført. Gemytt: ${temperament}. ${notes ? 'Notater lagt til.' : ''}`
        });

      if (logError) throw logError;

      router.push(`/hives/${params.id}`);
    } catch (error: any) {
      alert('Feil ved lagring: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Laster...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Ny Inspeksjon</h1>
            <p className="text-sm text-gray-500">{hive?.name || 'Laster...'}</p>
          </div>
        </div>
      </header>

      <main className="p-4">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
          
          {/* Date */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">Dato</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-honey-500 focus:border-honey-500"
            />
          </div>

          {/* Queen & Eggs */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Dronning og Yngel</h3>
            
            <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
              <span className="text-gray-700">Dronning sett?</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={queenSeen} onChange={e => setQueenSeen(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-honey-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-honey-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
              <span className="text-gray-700">Egg sett?</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={eggsSeen} onChange={e => setEggsSeen(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-honey-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-honey-500"></div>
              </label>
            </div>
          </div>

          {/* Conditions */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Tilstand</h3>
            
            <div>
              <label className="block text-sm text-gray-600 mb-2">Yngelleie</label>
              <select 
                value={broodCondition} 
                onChange={e => setBroodCondition(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <option value="darlig">Dårlig / Lite</option>
                <option value="normal">Normalt</option>
                <option value="bra">Bra / Mye</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">Fôrbeholdning</label>
              <select 
                value={honeyStores} 
                onChange={e => setHoneyStores(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <option value="lite">Lite (Må fôres)</option>
                <option value="middels">Middels</option>
                <option value="mye">Mye (Kan høstes)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">Gemytt</label>
              <select 
                value={temperament} 
                onChange={e => setTemperament(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <option value="rolig">Rolig</option>
                <option value="urolig">Urolig</option>
                <option value="aggressiv">Aggressiv</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notater</label>
            <textarea 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg h-32 resize-none"
              placeholder="Skriv notater her..."
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-honey-500 hover:bg-honey-600 text-white font-bold py-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {submitting ? 'Lagrer...' : 'Lagre inspeksjon'}
          </button>
        </form>
      </main>
    </div>
  );
}
