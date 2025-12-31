'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { MapPin, Warehouse, Store, Truck, ArrowLeft, ClipboardCheck } from 'lucide-react';
import Link from 'next/link';

export default function NewApiaryPage() {
  const [name, setName] = useState('');
  const [type, setType] = useState('bigård');
  const [locationStr, setLocationStr] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState(''); // New: Car Reg Number
  const [loading, setLoading] = useState(false);
  const [pendingRentals, setPendingRentals] = useState<any[]>([]);
  const [nextApiaryNumber, setNextApiaryNumber] = useState(1);
  const router = useRouter();
  const supabase = createClient();

  // Fetch pending rentals on mount
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Pending Rentals
      const { data: rentals } = await supabase
        .from('rentals')
        .select('*')
        .eq('assigned_beekeeper_id', user.id)
        .is('apiary_id', null);
      
      if (rentals) setPendingRentals(rentals);

      // 2. Fetch Next Apiary Number
      const { data: allApiaries } = await supabase
        .from('apiaries')
        .select('apiary_number')
        .eq('user_id', user.id);
      
      let nextNum = 1;
      if (allApiaries && allApiaries.length > 0) {
          const maxNum = allApiaries.reduce((max, apiary) => {
              if (!apiary.apiary_number) return max;
              const parts = apiary.apiary_number.split('-');
              if (parts.length === 2) {
                  const num = parseInt(parts[1], 10);
                  return !isNaN(num) && num > max ? num : max;
              }
              return max;
          }, 0);
          nextNum = maxNum + 1;
      }
      setNextApiaryNumber(nextNum);
    };
    fetchData();
  }, []);

  const handleCreateFromRental = async (rental: any) => {
    if (!confirm(`Opprette bigård for ${rental.contact_name}?`)) return;

    setLoading(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // 1. Get Next Apiary Number
        const { data: allApiaries } = await supabase
            .from('apiaries')
            .select('apiary_number')
            .eq('user_id', user.id);
        
        let nextNum = 1;
        if (allApiaries && allApiaries.length > 0) {
            const maxNum = allApiaries.reduce((max, apiary) => {
                if (!apiary.apiary_number) return max;
                const parts = apiary.apiary_number.split('-');
                if (parts.length === 2) {
                    const num = parseInt(parts[1], 10);
                    return !isNaN(num) && num > max ? num : max;
                }
                return max;
            }, 0);
            nextNum = maxNum + 1;
        }
        const apiaryNumber = `BG-${nextNum.toString().padStart(3, '0')}`;

        // 2. Extract Last Name for Name
        const lastName = rental.contact_name.split(' ').pop() || 'Utleie';
        const apiaryName = `${lastName}`;

        // 3. Create Apiary
        const { data: newApiary, error: apiaryError } = await supabase
            .from('apiaries')
            .insert({
                user_id: user.id,
                name: apiaryName,
                apiary_number: apiaryNumber,
                type: 'utleie', // New type
                location: rental.contact_address,
                latitude: rental.latitude,
                longitude: rental.longitude
            })
            .select()
            .single();

        if (apiaryError) throw apiaryError;

        // 4. Assign Hives (Inactive first)
        // Find hives that are NOT active (assuming 'active' is the status for deployed hives)
        // We look for 'lagret', 'inactive', 'storage' or null. 
        // For now let's assume anything NOT 'aktiv' or 'active' is available.
        const { data: allUserHives } = await supabase
            .from('hives')
            .select('*')
            .eq('user_id', user.id);
        
        const inactiveHives = allUserHives?.filter(h => h.status !== 'aktiv' && h.status !== 'active') || [];
        
        // Take required count
        const hivesToUpdate = inactiveHives.slice(0, rental.hive_count);
        const hivesToCreateCount = rental.hive_count - hivesToUpdate.length;

        // Update existing inactive hives
        for (const hive of hivesToUpdate) {
            await supabase
                .from('hives')
                .update({ 
                    apiary_id: newApiary.id, 
                    status: 'aktiv' 
                })
                .eq('id', hive.id);
        }

        // Create new hives if needed
        if (hivesToCreateCount > 0) {
             let maxHiveNum = 0;
             if (allUserHives) {
                maxHiveNum = allUserHives.reduce((max, h) => {
                    const match = h.hive_number?.match(/KUBE-(\d+)/);
                    if (match) return Math.max(max, parseInt(match[1]));
                    return max;
                }, 0);
             }

             const newHives = [];
             for(let i=0; i<hivesToCreateCount; i++) {
                 newHives.push({
                     user_id: user.id,
                     apiary_id: newApiary.id,
                     hive_number: `KUBE-${(maxHiveNum + 1 + i).toString().padStart(3, '0')}`,
                     status: 'aktiv'
                 });
             }
             if (newHives.length > 0) {
                 await supabase.from('hives').insert(newHives);
             }
        }

        // 5. Update Rental with Apiary Link
        await supabase
            .from('rentals')
            .update({ apiary_id: newApiary.id })
            .eq('id', rental.id);

        alert(`Utleiebigård ${apiaryName} opprettet med ${rental.hive_count} kuber!`);
        router.push('/apiaries');

    } catch (e: any) {
        console.error(e);
        alert('Feil: ' + e.message);
    } finally {
        setLoading(false);
    }
  };

  const types = [
    { id: 'bigård', label: 'Bigård', icon: MapPin },
    { id: 'lager', label: 'Lager', icon: Warehouse },
    { id: 'bil', label: 'Bil', icon: Truck },
    { id: 'oppstart', label: 'Oppstart', icon: Store }, // Added 'Oppstart'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Hent brukeren
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Du må være logget inn');

      // 2. Generer ID basert på type for innlogget bruker
      const { data: allApiaries } = await supabase
        .from('apiaries')
        .select('apiary_number')
        .eq('user_id', user.id);
      
      let nextNum = 1;
      
      if (allApiaries && allApiaries.length > 0) {
        // Finn høyeste nummer uavhengig av sortering
        const maxNum = allApiaries.reduce((max, apiary) => {
          if (!apiary.apiary_number) return max;
          const parts = apiary.apiary_number.split('-');
          if (parts.length === 2) {
            const num = parseInt(parts[1], 10);
            return !isNaN(num) && num > max ? num : max;
          }
          return max;
        }, 0);
        
        nextNum = maxNum + 1;
      }

      let prefix = 'BG'; // Default Bigård
      
      if (type === 'bil') prefix = 'BIL';
      if (type === 'lager') prefix = 'LG';
      if (type === 'oppstart') prefix = 'START';

      const apiaryNumber = `${prefix}-${nextNum.toString().padStart(3, '0')}`;

      // 3. Lagre i databasen
      const { error } = await supabase.from('apiaries').insert({
        user_id: user.id,
        name,
        type,
        location: locationStr,
        apiary_number: apiaryNumber,
        registration_number: type === 'bil' ? registrationNumber : null, // Only for cars
      });

      if (error) throw error;

      router.push('/apiaries');
    } catch (error: any) {
      alert('Feil ved lagring: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <Link href="/dashboard" className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Registrer ny lokasjon</h1>
      </header>

      <main className="max-w-md mx-auto p-4">
        
        {/* Pending Rentals Section */}
        {pendingRentals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-honey-500" />
              Nye Oppdrag (Utleie)
            </h2>
            <div className="space-y-4">
              {pendingRentals.map((rental, index) => {
                const lastName = rental.contact_name.split(' ').pop() || rental.contact_name;
                const predictedNumber = `BG-${(nextApiaryNumber + index).toString().padStart(3, '0')}`;
                const displayName = `${predictedNumber} - ${lastName}`;

                return (
                  <div key={rental.id} className="bg-white p-4 rounded-xl border-2 border-honey-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-gray-900">{displayName}</h3>
                      <p className="text-sm text-gray-600">
                        Utleiebigård med <span className="font-bold text-honey-600">{rental.hive_count} bikuber</span>.
                      </p>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {rental.contact_address}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCreateFromRental(rental)}
                      className="bg-honey-500 hover:bg-honey-600 text-white font-bold py-2 px-4 rounded-lg text-sm whitespace-nowrap"
                    >
                      Opprett lokasjon
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="border-b border-gray-200 my-6"></div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Navn */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">Navn på lokasjon</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="F.eks. Hjemmebigården"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none"
              required
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 px-1">Type lokasjon</label>
            <div className="grid grid-cols-2 gap-3">
              {types.map((t) => {
                const Icon = t.icon;
                const isSelected = type === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                      isSelected 
                        ? 'border-honey-500 bg-honey-50 text-honey-700' 
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-8 h-8 mb-2 ${isSelected ? 'text-honey-600' : 'text-gray-400'}`} />
                    <span className="font-medium">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bilnummer (Conditional) */}
          {type === 'bil' && (
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Registreringsnummer (Bilskilt)</label>
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                placeholder="AB 12345"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none font-mono uppercase"
                required={type === 'bil'}
              />
            </div>
          )}

          {/* Lokasjon */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">Adresse / Beskrivelse</label>
            <textarea
              value={locationStr}
              onChange={(e) => setLocationStr(e.target.value)}
              placeholder="Hvor er dette?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none h-24 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-honey-500 hover:bg-honey-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-honey-500/30 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Lagrer...' : 'Opprett lokasjon'}
          </button>
        </form>
      </main>
    </div>
  );
}
