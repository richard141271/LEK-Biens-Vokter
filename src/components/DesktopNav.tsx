'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Map, Box, Settings, LogOut, Wallet, Archive, ShoppingBag } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function DesktopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Hide on login/register/about pages
  if (pathname === '/login' || pathname === '/register' || pathname === '/' || pathname === '/about' || pathname === '/signin' || pathname === '/lei-en-kube' || pathname.startsWith('/info/')) return null;

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const navItems = [
    { href: '/dashboard', label: 'Oversikt', icon: Home },
    { href: '/shop', label: 'Nettbutikk', icon: ShoppingBag },
    { href: '/apiaries', label: 'Bigårder', icon: Map },
    { href: '/hives', label: 'Bikuber', icon: Box },
    { href: '/archive', label: 'Arkiv', icon: Archive },
    { href: '/settings', label: 'Innstillinger', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 z-50">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <img src="/icon.png" alt="Logo" className="w-8 h-8 rounded-full" />
          <span className="font-bold text-lg text-gray-900">Biens Vokter</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                active 
                  ? 'bg-honey-50 text-honey-700 font-medium' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-honey-600' : 'text-gray-400'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-3 w-full text-left text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logg ut
        </button>
      </div>
    </aside>
  );
}
