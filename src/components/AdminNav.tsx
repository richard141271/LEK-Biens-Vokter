'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Shield, 
  Users, 
  Activity, 
  ShoppingBag, 
  Mail, 
  LogOut, 
  LayoutDashboard,
  MessageSquare
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/admin');
  };

  const navItems = [
    { href: '/dashboard/admin', label: 'Oversikt', icon: LayoutDashboard },
    { href: '/dashboard/admin/users', label: 'Brukere', icon: Users },
    { href: '/dashboard/admin/founders', label: 'Gründer-oppfølging', icon: Activity },
    { href: '/dashboard/admin/community', label: 'War Room', icon: MessageSquare },
    { href: '/dashboard/admin/shop', label: 'Nettbutikk', icon: ShoppingBag },
    { href: '/dashboard/admin/email', label: 'E-post', icon: Mail },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#111827] text-white border-r border-gray-800 h-screen fixed left-0 top-0 z-50 print:hidden">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 p-1.5 rounded-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-lg text-white">Admin</span>
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
                  ? 'bg-purple-600 text-white font-medium shadow-lg shadow-purple-900/20' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-500'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-3 w-full text-left text-gray-400 hover:bg-red-900/20 hover:text-red-400 rounded-xl transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logg ut
        </button>
      </div>
    </aside>
  );
}
