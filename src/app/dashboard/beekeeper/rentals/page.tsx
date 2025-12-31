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

  useEffect(() => {
    fetchRentals();
  }, []);

  const fetchRentals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Now we fetch rentals even if they have apiary_id (since they are created immediately)
      // But we only want those that are NOT yet assigned to this beekeeper (or unassigned)
      const { data, error } = await supabase
        .from('rentals')
        .select('*, apiaries(*)')
        .eq('status', 'active')
        //.is('apiary_id', null) // Removed check since apiary is now created immediately
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter client side to find "Actionable" rentals (Unassigned or assigned to me but not acknowledged?)
      // For now: Show all rentals that need "Acceptance" (which now means taking responsibility)
      const actionableRentals = (data || []).filter(r => !r.assigned_beekeeper_id || r.assigned_beekeeper_id === user.id);
      
      setRentals(actionableRentals);
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

      // 1. Update Rental Assignment
      const { error: updateError } = await supabase
        .from('rentals')
        .update({ 
          assigned_beekeeper_id: user.id,
          distance_to_beekeeper: 0 // Or calculate real distance
        })
        .eq('id', rental.id);

      if (updateError) throw updateError;

      // 2. Log Action
      if (rental.apiary_id) {
         await supabase.from('logs').insert({
            action: 'BEEKEEPER_ASSIGNED',
            details: `Birøkter har tatt oppdraget for bigård ID: ${rental.apiary_id}`,
            apiary_id: rental.apiary_id
         });
      }

      alert('Oppdrag godtatt! Du er nå ansvarlig birøkter.');
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
                <button 
                  onClick={() => handleAcceptRental(rental)}
                  disabled={processingId === rental.id}
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
