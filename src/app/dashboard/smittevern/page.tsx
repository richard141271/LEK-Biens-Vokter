'use client';

import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, Scan, Map, ChevronRight, Info, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import SicknessRegistrationModal from '@/components/SicknessRegistrationModal';
import { createClient } from '@/utils/supabase/client';

export default function SmittevernPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allHives, setAllHives] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        setProfile(profileData);

        const { data: hivesData } = await supabase
            .from('hives')
            .select('*, apiaries(name)')
            .eq('user_id', user.id);
        
        if (hivesData) setAllHives(hivesData);
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-red-600" />
            Smittevern & Helse
          </h1>
          <p className="text-gray-500">Overvåk, rapporter og analyser helsetilstanden i bigårdene dine.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* AI Diagnose Card */}
        <Link href="/dashboard/smittevern/ai-diagnose" className="group">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100 hover:border-indigo-500 hover:shadow-md transition-all h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-600 text-white rounded-lg shadow-lg shadow-indigo-200">
                <Scan className="w-8 h-8" />
              </div>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-full border border-indigo-200">
                BETA
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-700 transition-colors">
              AI-Bildediagnose
            </h3>
            <p className="text-gray-600 mb-4">
              Ta bilde av en tavle, og la vår AI analysere den for sykdomstegn som lukket yngelråte og varroa.
            </p>
            <div className="flex items-center text-indigo-600 font-medium">
              Start analyse <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </Link>

        {/* Manuell Rapportering */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="group text-left"
        >
          <div className="bg-red-500 p-6 rounded-xl border border-red-600 hover:bg-red-600 hover:shadow-md transition-all h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 text-white rounded-lg transition-colors">
                <AlertTriangle className="w-8 h-8" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Meld fra om smitte
            </h3>
            <p className="text-red-100 mb-4">
              Oppdaget sykdom? Send inn en offisiell rapport til Mattilsynet direkte fra bigården.
            </p>
            <div className="flex items-center text-white font-medium">
              Opprett rapport <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </button>

        {/* Smittekart */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 opacity-75">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <Map className="w-8 h-8" />
            </div>
            <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-1 rounded-full">
              Kommer snart
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Nasjonalt Smittekart
          </h3>
          <p className="text-gray-500">
            Se oversikt over registrerte utbrudd i ditt område og få varsler om smittefare.
          </p>
        </div>

        {/* Info & Veiledere */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Info className="w-8 h-8" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Sykdomsveileder
          </h3>
          <p className="text-gray-500 mb-4">
            Usikker på hva du ser? Slå opp i vår bildebank over bisykdommer.
          </p>
          <Link href="/dashboard/smittevern/veileder" className="text-blue-600 font-medium hover:underline text-sm flex items-center gap-1">
            Åpne veileder <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

      </div>

      <SicknessRegistrationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        allHives={allHives}
        profile={profile}
      />
    </div>
  );
}
