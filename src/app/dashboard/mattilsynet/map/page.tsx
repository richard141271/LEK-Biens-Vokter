'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { ArrowLeft, Map as MapIcon, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamically import the map component to avoid SSR issues
const MattilsynetMap = dynamic(() => import('@/components/MattilsynetMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-gray-400">Laster kart...</div>
});

export default function MapPage() {
  const [apiaries, setApiaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch all apiaries
      const { data: apiariesData } = await supabase
        .from('apiaries')
        .select('*, profiles(full_name)');
      
      if (!apiariesData) return;

      // 2. Fetch active sickness alerts to mark apiaries
      const { data: alerts } = await supabase
        .from('hive_logs')
        .select('hive_id, hives(apiary_id)')
        .eq('action', 'SYKDOM')
        .eq('admin_status', 'pending');
      
      const sickApiaryIds = new Set();
      if (alerts) {
        alerts.forEach((alert: any) => {
          const hive = Array.isArray(alert.hives) ? alert.hives[0] : alert.hives;
          if (hive?.apiary_id) {
            sickApiaryIds.add(hive.apiary_id);
          }
        });
      }

      // 3. Process data (Mock coordinates if missing for demo purposes)
      const processedApiaries = apiariesData.map(apiary => {
        let lat = apiary.latitude;
        let lng = apiary.longitude;

        // MOCK COORDINATES IF MISSING (For Demo/Pilot Visuals)
        // Spread them around Southern Norway
        if (!lat || !lng) {
             lat = 59.9 + (Math.random() - 0.5) * 2; // Around Oslo/Viken
             lng = 10.7 + (Math.random() - 0.5) * 4;
        }

        return {
          ...apiary,
          latitude: lat,
          longitude: lng,
          has_sickness: sickApiaryIds.has(apiary.id)
        };
      });

      setApiaries(processedApiaries);

    } catch (e) {
      console.error("Error fetching map data:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col h-screen">
       {/* Header */}
       <header className="bg-white border-b border-gray-200 p-4 shrink-0">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/mattilsynet" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <MapIcon className="w-5 h-5 text-red-600" />
                        Smittekart & Sikringssoner
                    </h1>
                    <p className="text-xs text-gray-500">Oversikt over alle registrerte bigårder og aktive utbrudd</p>
                </div>
            </div>
            <button 
                onClick={fetchData}
                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                title="Oppdater kart"
            >
                <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
       </header>

       {/* Map Container */}
       <div className="flex-1 p-4">
           <div className="max-w-7xl mx-auto h-full bg-white rounded-xl shadow-sm border border-gray-200 p-1 relative z-0">
               <MattilsynetMap apiaries={apiaries} />
               
               {/* Legend */}
               <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur p-3 rounded-lg shadow-lg border border-gray-200 z-[1000] text-xs">
                   <h4 className="font-bold mb-2">Tegnforklaring</h4>
                   <div className="space-y-1">
                       <div className="flex items-center gap-2">
                           <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                           <span>Frisk Bigård</span>
                       </div>
                       <div className="flex items-center gap-2">
                           <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                           <span className="font-bold text-red-700">Aktivt Utbrudd</span>
                       </div>
                   </div>
               </div>
           </div>
       </div>
    </div>
  );
}
