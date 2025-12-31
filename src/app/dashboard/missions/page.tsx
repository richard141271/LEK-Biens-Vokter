'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { getDistanceFromLatLonInM } from '@/utils/geo';
import { MapPin, Calendar, Users, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';

export default function MissionsPage() {
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [message, setMessage] = useState('');

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

      // Fetch Beekeeper Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setProfile(profileData);

      // Fetch Pending Rentals
      // In a real app with many users, we would filter by distance in PostGIS on the server.
      // Here we fetch pending rentals and filter client-side for the prototype.
      const { data: rentals, error } = await supabase
        .from('rentals')
        .select(`
            *,
            profiles:user_id (
                full_name,
                address,
                postal_code,
                city
            )
        `)
        .eq('status', 'pending')
        .is('assigned_beekeeper_id', null);

      if (error) throw error;

      if (rentals && profileData?.latitude && profileData?.longitude) {
        const radius = profileData.service_radius || 50000; // Default 50km
        
        const nearbyRentals = rentals.filter(rental => {
            if (!rental.latitude || !rental.longitude) return false;
            
            const dist = getDistanceFromLatLonInM(
                profileData.latitude,
                profileData.longitude,
                rental.latitude,
                rental.longitude
            );
            
            return dist <= radius;
        }).map(rental => ({
            ...rental,
            distance: getDistanceFromLatLonInM(
                profileData.latitude,
                profileData.longitude,
                rental.latitude,
                rental.longitude
            )
        }));

        setMissions(nearbyRentals);
      } else {
        // Fallback if no coords (show all or prompt to set location)
        setMissions(rentals || []);
      }

    } catch (e) {
      console.error('Error fetching missions:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptMission = async (rentalId: string, tenantId: string, hiveCount: number) => {
    setAccepting(rentalId);
    setMessage('');

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Assign Rental
        const { error: rentalError } = await supabase
            .from('rentals')
            .update({ 
                assigned_beekeeper_id: user.id,
                status: 'assigned', // Or 'active' depending on flow
                delivery_status: 'assigned'
            })
            .eq('id', rentalId);

        if (rentalError) throw rentalError;

        // 2. Create Apiary for Tenant (Managed by Beekeeper)
        // Check if apiary already exists linked to this rental? 
        // For now, create a new one.
        const { error: apiaryError } = await supabase
            .from('apiaries')
            .insert({
                user_id: tenantId, // Tenant owns it
                managed_by: user.id, // Beekeeper manages it
                name: 'Leie-bigård',
                location: 'Hos Leietaker', // Should get from rental address
                type: 'rental',
                latitude: missions.find(m => m.id === rentalId)?.latitude,
                longitude: missions.find(m => m.id === rentalId)?.longitude
            });

        if (apiaryError) throw apiaryError;

        setMessage('Oppdrag akseptert! Bigården er nå lagt til i din oversikt.');
        
        // Remove from list
        setMissions(prev => prev.filter(m => m.id !== rentalId));

    } catch (e: any) {
        console.error('Error accepting mission:', e);
        setMessage('Feil ved akseptering: ' + e.message);
    } finally {
        setAccepting(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Laster oppdrag...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-md mx-auto p-4 space-y-6">
        <header>
            <h1 className="text-2xl font-bold text-gray-900">Tilgjengelige Oppdrag 🐝</h1>
            <p className="text-gray-500 text-sm">
                Basert på din lokasjon og radius ({profile?.service_radius ? profile.service_radius / 1000 : 50} km)
            </p>
        </header>

        {message && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
                {message}
            </div>
        )}

        {missions.length === 0 ? (
            <div className="bg-white p-8 rounded-xl text-center shadow-sm">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Ingen nye oppdrag</h3>
                <p className="text-gray-500 text-sm">
                    Det er ingen nye leieforespørsler i ditt område akkurat nå. Vi varsler deg når det dukker opp noe!
                </p>
            </div>
        ) : (
            <div className="space-y-4">
                {missions.map((mission) => (
                    <div key={mission.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-honey-50/50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-honey-600" />
                                        {mission.hive_count} Bikuber ønskes
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Opprettet: {new Date(mission.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="bg-white px-2 py-1 rounded text-xs font-bold text-honey-600 shadow-sm">
                                    {Math.round(mission.distance / 1000)} km unna
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 space-y-3">
                            <div className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{mission.profiles?.full_name || 'Anonym'}</p>
                                    <p className="text-xs text-gray-500">{mission.contact_address}, {mission.contact_postal_code} {mission.contact_city}</p>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={() => handleAcceptMission(mission.id, mission.user_id, mission.hive_count)}
                                    disabled={!!accepting}
                                    className="w-full bg-honey-500 hover:bg-honey-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {accepting === mission.id ? 'Behandler...' : 'Godta Oppdrag (Først til mølla)'}
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                                <p className="text-[10px] text-gray-400 text-center mt-2">
                                    Ved å godta forplikter du deg til å levere innen rimelig tid.
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
