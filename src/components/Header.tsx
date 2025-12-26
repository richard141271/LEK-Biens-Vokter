'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, QrCode } from 'lucide-react';
import VoiceAssistant from './VoiceAssistant';

export default function Header() {
  const [profile, setProfile] = useState<any>(null);
  const [apiaries, setApiaries] = useState<any[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  // Hide on auth pages
  if (pathname === '/login' || pathname === '/register' || pathname === '/') return null;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            // If we are on a protected route and no user, we might want to redirect, 
            // but Next.js middleware or page logic usually handles that.
            // For the header, we just stop.
            return;
        }

        // Fetch Profile
        const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
        // Safe check if component is still mounted would be ideal, but for now:
        setProfile(profileData || { full_name: user.user_metadata?.full_name });

        // Fetch Apiaries (for Voice Assistant context)
        const { data: apData } = await supabase.from('apiaries').select('id, name');
        if (apData) setApiaries(apData);
    } catch (e) {
        console.error("Header fetch error", e);
    }
  };

  const handleSignOut = async () => {
    try {
        await supabase.auth.signOut();
        // Force hard reload to clear any client state if needed, or just push
        window.location.href = '/'; 
    } catch (e) {
        console.error("Sign out error", e);
        router.push('/');
    }
  };

  const handleVoiceCommand = async (command: string, args: any) => {
    console.log('Voice Command:', command, args);
    if (command === 'create_hive') {
       if (args.apiaryId) {
         try {
             const { data: { user } } = await supabase.auth.getUser();
             
             const { data: newHive, error } = await supabase
                .from('hives')
                .insert({
                    hive_number: 'NY-KUBE', // Placeholder, should be auto-increment logic
                    apiary_id: args.apiaryId,
                    user_id: user?.id,
                    status: 'AKTIV',
                    type: 'PRODUKSJON'
                })
                .select()
                .single();
             
             if (newHive) {
                 alert(`Kube opprettet i bigård!`); 
                 router.push(`/apiaries/${args.apiaryId}`);
             }
         } catch (e) {
             console.error(e);
         }
       }
    }
  };

  const handleScan = async () => {
      // Simulation of QR Scan
      const input = prompt("Simulert QR-skanner: Skriv inn kubenr (f.eks. 101) eller 'scan' for kamera");
      if (!input) return;

      const hiveNum = input.match(/\d+/)?.[0]?.padStart(3, '0');
      if (hiveNum) {
          const fullNum = `KUBE-${hiveNum}`;
          
          const { data: hive } = await supabase
            .from('hives')
            .select('id, apiary_id')
            .eq('hive_number', fullNum)
            .single();

          if (hive) {
                  // Navigate to Inspection page directly
                  router.push(`/hives/${hive.id}/new-inspection?autoVoice=true`);
                  // Trigger voice feedback
                  const utterance = new SpeechSynthesisUtterance("Kube funnet. Starter inspeksjon. Hva ser du?");
                  utterance.lang = 'no-NO';
                  window.speechSynthesis.speak(utterance);
              } else {
              alert('Kube ikke funnet. Opprett ny?');
          }
      }
  };

  return (
    <div className="md:hidden flex flex-col w-full z-40 sticky top-0"> 
      {/* Top Yellow Bar */}
      <div className="bg-[#F79009] text-black px-4 py-3 flex items-center justify-between shadow-sm relative z-50">
        {/* Left: Logo */}
        <div className="flex-shrink-0">
           <img src="/icon.png" alt="Logo" className="w-12 h-12 rounded-full border-2 border-black/10" />
        </div>

        {/* Center: Title & Name */}
        <div className="flex-1 text-center mx-2 flex flex-col justify-center">
           <h1 className="font-bold text-xl leading-tight tracking-tight">Birøkter Registeret</h1>
           <p className="text-sm font-medium opacity-80 mt-0.5">{profile?.full_name || 'Laster...'}</p>
        </div>

        {/* Right: Status Dot */}
        <div className="w-12 flex justify-end items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
        </div>
      </div>

      {/* Bottom Black Bar */}
      <div className="bg-black text-white px-4 py-2 flex justify-between items-center shadow-md z-40">
          {/* Left: QR Scan Button */}
          <button 
            onClick={handleScan} 
            className="text-honey-500 flex items-center gap-2 font-bold text-xs uppercase hover:text-white transition-colors"
          >
            <QrCode className="w-5 h-5" />
            Skann
          </button>

          {/* Right: Log Out */}
          <button 
            onClick={handleSignOut}
            className="bg-[#F79009] text-black text-xs font-bold py-1.5 px-4 rounded-lg uppercase tracking-wider hover:bg-yellow-400 transition-colors shadow-sm"
          >
            Logg ut
          </button>
      </div>

      {/* Global Voice Assistant (Mounted here to persist) */}
      <VoiceAssistant onCommand={handleVoiceCommand} apiaries={apiaries} />
    </div>
  );
}
