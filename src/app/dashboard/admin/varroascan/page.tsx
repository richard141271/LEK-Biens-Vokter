'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { buildVarroaScanUrl, getVarroaScanBaseUrl } from '@/utils/varroascan';
import { Archive, ArrowRight, Bug, FolderOpen, ShieldCheck } from 'lucide-react';

type AdminProfile = {
  full_name?: string | null;
  role?: string | null;
};

type VarroaScanLinks = {
  submissions: string;
  archive: string;
  admin: string;
  baseUrl: string;
};

export default function VarroaScanAdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [links, setLinks] = useState<VarroaScanLinks | null>(null);

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single();

        if (profileData?.role !== 'admin') {
          await supabase.auth.signOut();
          router.push('/admin');
          return;
        }

        if (!active) return;

        setProfile(profileData);

        if (typeof window !== 'undefined') {
          const host = window.location.host || window.location.hostname || '';
          const returnTo = window.location.href;
          const baseUrl = getVarroaScanBaseUrl(host);

          setLinks({
            baseUrl,
            submissions: buildVarroaScanUrl('/innsendinger/', {
              host,
              source: 'biens-vokter-admin',
              returnTo,
            }),
            archive: buildVarroaScanUrl('/admin/archive/', {
              host,
              source: 'biens-vokter-admin',
              returnTo,
            }),
            admin: buildVarroaScanUrl('/admin/', {
              host,
              source: 'biens-vokter-admin',
              returnTo,
            }),
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void init();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Laster VarroaScan-admin...</div>;
  }

  const cards = [
    {
      title: 'Innsendinger',
      description: 'Aapne admin-beskyttede innsendinger i LEK-VarroaScan.',
      href: links?.submissions || '#',
      icon: FolderOpen,
      accent: 'bg-blue-50 text-blue-600 border-blue-100',
    },
    {
      title: 'Arkiv',
      description: 'Ga til VarroaScan-arkivet for eldre eller ferdigbehandlede saker.',
      href: links?.archive || '#',
      icon: Archive,
      accent: 'bg-amber-50 text-amber-600 border-amber-100',
    },
    {
      title: 'Admin',
      description: 'Aapne VarroaScan sine adminfunksjoner og oversikter.',
      href: links?.admin || '#',
      icon: ShieldCheck,
      accent: 'bg-purple-50 text-purple-600 border-purple-100',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#111827] text-white py-6 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-2 rounded-lg">
              <Bug className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">VarroaScan</h1>
              <p className="text-gray-400 text-sm">Admin for LEK-VarroaScan</p>
            </div>
          </div>
          <div className="hidden md:block text-right">
            <div className="text-sm font-medium text-white">{profile?.full_name || 'Admin'}</div>
            <div className="text-xs text-purple-300">BV admin</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
              <Bug className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-gray-900">Admin for LEK-VarroaScan</h2>
              <p className="text-gray-600 mt-2">
                Herfra kan du aapne innsendinger og adminfunksjoner for VarroaScan.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1.5">
                Aktiv miljo-routing
                <span className="text-gray-400">•</span>
                <span className="font-mono">{links?.baseUrl || '-'}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <a
                key={card.title}
                href={card.href}
                className="group bg-white border border-gray-200 rounded-2xl shadow-sm p-6 hover:border-purple-400 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl border ${card.accent}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-purple-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-sm text-gray-500">{card.description}</p>
              </a>
            );
          })}
        </section>
      </main>
    </div>
  );
}
