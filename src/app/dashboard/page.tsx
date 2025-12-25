'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [honeyStatus, setHoneyStatus] = useState('Ikke klar');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Fetch Profile Data
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, member_number, is_norges_birokterlag_member, is_lek_honning_member')
      .eq('id', user.id)
      .single();
    
    setProfile(profileData);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleTestDB = async () => {
    const { count, error } = await supabase.from('apiaries').select('*', { count: 'exact', head: true });
    if (error) alert('DB Error: ' + error.message);
    else alert('DB Connection OK! Apiaries found: ' + count);
  };

  if (loading) return <div className="p-8 text-center">Laster oversikt...</div>;

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Top Bar - Yellow */}
      <div className="bg-[#FFD700] p-4 pb-6 relative">
         <div className="flex justify-between items-start mb-2">
            <img src="/icon.png" alt="Logo" className="w-12 h-12 object-contain" />
            <div className="flex-1 text-center pt-2">
                <h1 className="font-bold text-xl text-black leading-tight">Birøkter Registeret</h1>
                <p className="text-sm text-gray-800">{profile?.full_name}</p>
            </div>
            <button 
                onClick={handleSignOut}
                className="bg-[#FFD700] text-black border-2 border-black font-bold text-xs px-3 py-2 rounded hover:bg-yellow-500 uppercase"
            >
                Logg ut
            </button>
         </div>
      </div>

      <div className="px-4">
          <div className="flex justify-center -mt-8 mb-6">
            <img src="/icon.png" alt="Logo" className="w-16 h-16 object-contain drop-shadow-md" />
          </div>

          <h2 className="text-center text-2xl font-bold text-[#0F172A] mb-6">Min oversikt</h2>
          
          {/* Profile Card */}
          <div className="bg-[#FFFBEB] rounded-lg border border-[#FEF3C7] p-6 text-center mb-6 shadow-sm">
              <h3 className="text-xl font-bold text-black uppercase mb-3">{profile?.full_name || 'UKJENT'}</h3>
              <div className="space-y-1 text-sm text-gray-700 mb-6">
                  {profile?.is_norges_birokterlag_member && <p>Medlem av Norges Birøkterlag</p>}
                  {profile?.is_lek_honning_member && <p>Medlem av LEK-Honning Norge</p>}
              </div>
              <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">MEDLEMSNUMMER</p>
                  <p className="text-3xl font-bold text-black">{profile?.member_number || '1001'}</p>
              </div>
          </div>

          {/* Honningstatus */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900">Honningstatus</h3>
                  <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded text-sm font-medium">{honeyStatus}</span>
              </div>
              <div className="flex gap-2">
                  <button onClick={() => setHoneyStatus('Klar')} className="flex-1 bg-[#22C55E] text-white py-2 rounded font-bold text-sm hover:bg-green-700">Sett Klar</button>
                  <button onClick={() => setHoneyStatus('Ikke klar')} className="flex-1 bg-[#64748B] text-white py-2 rounded font-bold text-sm hover:bg-gray-600">Sett Ikke klar</button>
                  <button onClick={handleTestDB} className="flex-1 bg-[#2563EB] text-white py-2 rounded font-bold text-sm hover:bg-blue-700 flex items-center justify-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                    Test DB
                  </button>
              </div>
          </div>

          {/* Navigation Buttons */}
          <div className="space-y-4 mb-10">
              <Link href="/apiaries" className="block w-full bg-black text-white text-center py-4 rounded font-bold uppercase tracking-wide hover:bg-gray-800 text-lg">
                  MINE BIGÅRDER
              </Link>
              <Link href="/settings" className="block w-full bg-black text-white text-center py-4 rounded font-bold uppercase tracking-wide hover:bg-gray-800 text-lg">
                  INNSTILLINGER
              </Link>
          </div>

          {/* External Links */}
          <div className="space-y-3">
              <ExternalLinkButton href="https://lek-honning.no" label="LEK-HONNING™" />
              <ExternalLinkButton href="https://honningcentralen.no" label="HONNINGCENTRALEN" />
              <ExternalLinkButton href="https://norges-birokterlag.no" label="NORGES BIRØKTERLAG" />
              <ExternalLinkButton href="#" label="NM I HONNING" />
              <ExternalLinkButton href="https://mattilsynet.no" label="MATTILSYNET" />
          </div>

          <p className="text-center text-gray-400 text-xs mt-12 mb-4">© 2025 - LEK-Honning™</p>
      </div>
    </div>
  );
}

function ExternalLinkButton({ href, label }: { href: string, label: string }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="block w-full bg-white border-2 border-black text-black text-center py-3 rounded font-bold uppercase hover:bg-gray-50">
            {label}
        </a>
    );
}
