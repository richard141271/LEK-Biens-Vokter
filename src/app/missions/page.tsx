'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { MapPin, Box, Calendar, ChevronRight, Truck, User } from 'lucide-react';
import Link from 'next/link';

export default function MissionsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMissions();
  }, []);

  const fetchMissions = async () => {
    // In a real app, filter by location or "assigned to me"
    const { data, error } = await supabase
      .from('rentals')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching missions:', error);
    } else {
      setMissions(data || []);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gray-900 text-white pt-8 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Oppdrag</h1>
          <p className="text-gray-400">Tilgjengelige leveringsoppdrag for deg.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-8">
        <div className="space-y-4">
          {loading ? (
            <p className="text-center text-gray-500 py-8">Laster oppdrag...</p>
          ) : missions.length === 0 ? (
            <div className="bg-white p-8 rounded-xl shadow-sm text-center">
              <p className="text-gray-500">Ingen aktive oppdrag akkurat nå.</p>
            </div>
          ) : (
            missions.map((mission) => (
              <Link 
                key={mission.id} 
                href={`/missions/${mission.id}`}
                className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium 
                        ${mission.delivery_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          mission.delivery_status === 'assigned' ? 'bg-blue-100 text-blue-800' : 
                          'bg-green-100 text-green-800'}`}>
                        {mission.delivery_status === 'pending' ? 'Ny bestilling' : 
                         mission.delivery_status === 'assigned' ? 'Under levering' : 'Levert'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(mission.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-bold text-lg mb-1">{mission.contact_name}</h3>
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <MapPin className="w-4 h-4" />
                        {mission.contact_address}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1 bg-honey-50 px-3 py-2 rounded-lg">
                        <Box className="w-4 h-4 text-honey-600" />
                        <span className="font-medium text-honey-900">{mission.hive_count} Kuber</span>
                      </div>
                      <div className="flex items-center gap-1 bg-gray-50 px-3 py-2 rounded-lg">
                        <Truck className="w-4 h-4 text-gray-600" />
                        <span>Klar for levering</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
