'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, User, Package, CheckCircle, AlertCircle, Calendar } from 'lucide-react';

export default function BeekeeperRentalsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchRentals();
  }, []);

  const fetchRentals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) setProfile(profileData);

      // Now we fetch rentals even if they have apiary_id (since they are created immediately)
      // But we only want those that are NOT yet assigned to this beekeeper (or unassigned)
      const { data, error } = await supabase
        .from('rentals')
        .select('*, apiaries(*)')
        .eq('status', 'active')
        //.is('apiary_id', null) // Removed check since apiary is now created immediately
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setRentals(data || []);
    } catch (error) {
      console.error('Error fetching rentals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRental = async (rental: any) => {
    setProcessingId(rental.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Calculate Next BG Number for THIS Beekeeper
      const { data: existingApiaries } = await supabase
        .from('apiaries')
        .select('apiary_number')
        .eq('user_id', user.id);

      let nextNum = 1;
      if (existingApiaries && existingApiaries.length > 0) {
        const numbers = existingApiaries
          .map(a => parseInt(a.apiary_number.replace(/\D/g, ''), 10))
          .filter(n => !isNaN(n));
        if (numbers.length > 0) {
          nextNum = Math.max(...numbers) + 1;
        }
      }
      const newApiaryNumber = `BG-${nextNum.toString().padStart(3, '0')}`;

      // 2. Create Apiary
      const { data: newApiary, error: apiaryError } = await supabase
        .from('apiaries')
        .insert({
          user_id: user.id, // Beekeeper owns the apiary entry
          name: `${rental.contact_name} sin hage`,
          location: rental.contact_address,
          // description: `Bigård opprettet fra leieavtale (Ref: ${rental.id})`, // Commented out until schema migration is verified
          type: 'rental',
          status: 'active',
          apiary_number: newApiaryNumber
        })
        .select()
        .single();

      if (apiaryError) throw apiaryError;

      // 3. Create Hives
      const hivesToCreate = Array.from({ length: rental.hive_count }).map((_, index) => ({
        apiary_id: newApiary.id,
        user_id: user.id, // Beekeeper manages the hives
        hive_number: `LEK-${newApiary.id.slice(0, 4)}-0${index + 1}`.toUpperCase(),
        active: true,
        queen_color: 'Ukjent',
        condition: 'good',
        honey_type: 'sommer',
        installation_date: new Date().toISOString()
      }));

      const { error: hivesError } = await supabase
        .from('hives')
        .insert(hivesToCreate);

      if (hivesError) console.error('Error creating hives:', hivesError);

      // 4. Update Rental Assignment & Link Apiary
      const { error: updateError } = await supabase
        .from('rentals')
        .update({ 
          assigned_beekeeper_id: user.id,
          apiary_id: newApiary.id,
          distance_to_beekeeper: 0 // Or calculate real distance
        })
        .eq('id', rental.id);

      if (updateError) throw updateError;

      // 5. Log Action
      await supabase.from('logs').insert({
         action: 'BEEKEEPER_ASSIGNED',
         details: `Birøkter ${user.email} opprettet bigård ${newApiaryNumber} for oppdrag ${rental.id}`,
         apiary_id: newApiary.id
      });

      alert(`Oppdrag godtatt! Bigård ${newApiaryNumber} er opprettet.`);
      router.push('/dashboard'); 

    } catch (error: any) {
      console.error('Error processing rental:', error);
      alert('Noe gikk galt: ' + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Birøkter-oppdrag</h1>
              <p className="text-xs text-gray-500">Nye bestillinger som venter på oppsett</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Laster oppdrag...</div>
        ) : rentals.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-green-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Alt er à jour!</h3>
            <p className="text-gray-500">Ingen nye bestillinger å behandle akkurat nå.</p>
          </div>
        ) : (
          rentals.map((rental) => (
            <div key={rental.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                {rental.assigned_beekeeper_id && profile && rental.assigned_beekeeper_id !== profile.id && (
                  <div className="mb-3 p-2 rounded-lg bg-yellow-50 border border-yellow-100 flex items-center gap-2 text-xs text-yellow-800">
                    <AlertCircle className="w-4 h-4" />
                    <span>Dette oppdraget er allerede reservert til en annen birøkter.</span>
                  </div>
                )}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-honey-500" />
                      {rental.contact_name}
                    </h2>
                    <p className="text-sm text-gray-500">{rental.contact_organization || 'Privatperson'}</p>
                  </div>
                  <span className="bg-honey-100 text-honey-700 px-3 py-1 rounded-full text-xs font-bold">
                    NY BESTILLING
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Lokasjon</p>
                      <p className="text-gray-600">{rental.contact_address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Package className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Bestilling</p>
                      <p className="text-gray-600">{rental.hive_count} stk LEK-kuber</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Dato</p>
                      <p className="text-gray-600">{new Date(rental.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                
                {rental.notes && (
                   <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 italic border border-gray-100">
                     "{rental.notes}"
                   </div>
                )}
              </div>

              <div className="p-4 bg-gray-50 flex justify-end gap-3">
                {!profile?.wants_to_be_beekeeper && (
                  <div className="mr-auto flex items-center gap-1 text-[11px] text-gray-500">
                    <AlertCircle className="w-3 h-3 text-gray-400" />
                    <span>Aktiver «Ønsker å drifte utleiekuber» under Innstillinger for å ta oppdrag.</span>
                  </div>
                )}
                <button 
                  onClick={() => handleAcceptRental(rental)}
                  disabled={processingId === rental.id || !profile?.wants_to_be_beekeeper}
                  className="bg-honey-500 hover:bg-honey-600 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {processingId === rental.id ? 'Oppretter...' : 'Godta & Opprett Bigård'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
