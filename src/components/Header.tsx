'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { QrCode } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
// VoiceAssistant removed by user request

type HeaderProps = {
  isStagingHost?: boolean;
};

export default function Header({ isStagingHost }: HeaderProps) {
  const [profile, setProfile] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
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
        } catch (e) {
            console.error("Header fetch error", e);
        }
      };
      fetchData();

      const handleProfileUpdated = () => {
        fetchData();
      };

      window.addEventListener('profile_updated', handleProfileUpdated);
      return () => {
        window.removeEventListener('profile_updated', handleProfileUpdated);
      };
    }
  }, [mounted, supabase, pathname]);

  // Hide header on auth pages, landing page, and dedicated portals
  if (pathname === '/login' || 
      pathname === '/register' || 
      pathname === '/' || 
      pathname === '/about' || 
      pathname === '/signin' || 
      pathname === '/lei-en-kube' || 
      pathname.startsWith('/info/') ||
      pathname.startsWith('/survey') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/mattilsynet') ||
      pathname.startsWith('/dashboard/admin') ||
      pathname.startsWith('/dashboard/mattilsynet')) return null;

  if (!mounted) return null;

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
                  // Navigate to Inspection page directly - REMOVED autoVoice
                  router.push(`/hives/${hive.id}/new-inspection`);
                  // REMOVED voice feedback
                  alert("Kube funnet. Starter inspeksjon.");
              } else {
              alert('Kube ikke funnet. Opprett ny?');
          }
      }
  };

  return (
    <>
      <div className="md:hidden flex flex-col w-full z-40 fixed top-0 left-0 right-0"> 
        {/* Top Yellow Bar */}
        <div className="bg-[#F79009] text-black px-4 py-3 flex items-center justify-between shadow-sm relative z-50 h-[72px]">
          {/* Left: Logo */}
          <div className="flex-shrink-0">
             <Image src="/icon.png" alt="Logo" width={48} height={48} className="w-12 h-12 object-contain" />
          </div>
          
          {/* Center: Title */}
          <div className="flex-1 text-center mx-2 flex flex-col justify-center">
             <Link href="/dashboard/admin" className="cursor-default">
                 <h1 className="font-bold text-xl leading-tight tracking-tight">Birøkter Registeret</h1>
             </Link>
             <p className="text-sm font-medium opacity-80 mt-0.5">{profile?.full_name || 'Laster...'}</p>
          </div>

          {/* Right: Spacer for balance */}
          <div className="w-12"></div>
        </div>

        {isStagingHost ? (
          <div className="bg-red-600 text-white text-[10px] font-semibold text-center h-[20px] flex items-center justify-center print:hidden">
            STAGING – ikke ekte app
          </div>
        ) : null}

        {/* Bottom Black Bar - Hide on Dashboard as it has its own controls */}
        {pathname !== '/dashboard' && (
          <div className="bg-black text-white px-4 py-2 flex justify-between items-center shadow-md z-40 h-[44px]">
            {/* Left: QR Scan Button */}
            <Link 
              href="/scan" 
              className="text-honey-500 flex items-center gap-2 font-bold text-xs uppercase hover:text-white transition-colors"
            >
              <QrCode className="w-5 h-5" />
              Skann
            </Link>

            {/* Right: Log Out */}
            <button 
              onClick={handleSignOut}
              className="bg-[#F79009] text-black text-xs font-bold py-1.5 px-4 rounded-lg uppercase tracking-wider hover:bg-yellow-400 transition-colors shadow-sm"
            >
              Logg ut
            </button>
          </div>
        )}
      </div>

      {/* Spacer to prevent content overlap */}
      <div className={`md:hidden w-full transition-all duration-200 ${
        pathname !== '/dashboard'
          ? (isStagingHost ? 'h-[136px]' : 'h-[116px]')
          : (isStagingHost ? 'h-[92px]' : 'h-[72px]')
      }`}></div>
    </>
  );
}
