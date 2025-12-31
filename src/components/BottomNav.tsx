'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Map, Box, Settings, Archive } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  // Hide on login/register pages
  if (pathname === '/login' || pathname === '/register' || pathname === '/' || pathname === '/about' || pathname === '/signin' || pathname === '/lei-en-kube' || pathname.startsWith('/info/')) return null;

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-[100]">
      <div className="flex justify-around items-center h-16">
        <Link 
          href="/dashboard" 
          className={`flex flex-col items-center justify-center w-full h-full ${isActive('/dashboard') ? 'text-honey-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Home className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Oversikt</span>
        </Link>
        
        <Link 
          href="/apiaries" 
          className={`flex flex-col items-center justify-center w-full h-full ${isActive('/apiaries') ? 'text-honey-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Map className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Bigårder</span>
        </Link>

        <Link 
          href="/hives" // TODO: Ensure this page exists or link to apiaries list if not
          className={`flex flex-col items-center justify-center w-full h-full ${isActive('/hives') ? 'text-honey-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Box className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Bikuber</span>
        </Link>

        <Link 
          href="/settings" 
          className={`flex flex-col items-center justify-center w-full h-full ${isActive('/settings') ? 'text-honey-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Settings className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Innstillinger</span>
        </Link>
      </div>
    </nav>
  );
}
