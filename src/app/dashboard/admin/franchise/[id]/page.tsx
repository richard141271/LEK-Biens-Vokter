'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Building, Users, MapPin, FileText, Activity } from 'lucide-react';

interface FranchiseUnit {
  id: string;
  name: string;
  org_number: string;
  address: string;
  owner_id: string;
  status: string;
  created_at: string;
  owner?: {
    full_name: string;
    email?: string;
  };
}

export default function AdminFranchiseUnitPage() {
  const params = useParams();
  const id = params?.id as string;
  const [unit, setUnit] = useState<FranchiseUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchUnit = async () => {
      if (!id) return;
      
      const { data, error } = await supabase
        .from('franchise_units')
        .select(`
          *,
          owner:profiles(full_name, email)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching unit:', error);
      } else {
        setUnit(data);
      }
      setLoading(false);
    };

    fetchUnit();
  }, [id]);

  if (loading) return <div className="p-10 text-center">Laster enhet...</div>;
  if (!unit) return <div className="p-10 text-center">Fant ikke enhet.</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/admin/franchise" 
              className="p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center text-yellow-700">
                <Building className="w-5 h-5" />
              </div>
              <h1 className="text-lg font-bold text-gray-900">{unit.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                unit.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
                {unit.status === 'active' ? 'Aktiv' : unit.status}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Owner Details */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Eierinformasjon
                </h2>
                <div className="space-y-3">
                    <div>
                        <p className="text-sm text-gray-500">Navn</p>
                        <p className="font-medium">{unit.owner?.full_name || 'Ingen eier'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">E-post</p>
                        <p className="font-medium">{unit.owner?.email || '-'}</p>
                    </div>
                </div>
            </div>

            {/* Company Details */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Foretaksinformasjon
                </h2>
                <div className="space-y-3">
                    <div>
                        <p className="text-sm text-gray-500">Org. nummer</p>
                        <p className="font-medium">{unit.org_number}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Adresse</p>
                        <p className="font-medium">{unit.address}</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Actions / Tools */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-bold text-gray-900">Administrative Verktøy</h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link href={`/dashboard/franchise/reports`} className="block p-4 border border-gray-200 rounded-lg hover:border-yellow-500 hover:shadow-md transition-all group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                            <FileText className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-gray-900">Ukesrapporter</h4>
                    </div>
                    <p className="text-sm text-gray-500">Se innsendte rapporter fra denne enheten.</p>
                </Link>
                
                <div className="block p-4 border border-gray-200 rounded-lg opacity-50 cursor-not-allowed">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                            <Activity className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-gray-900">Aktivitetslogg</h4>
                    </div>
                    <p className="text-sm text-gray-500">Kommer snart.</p>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}
