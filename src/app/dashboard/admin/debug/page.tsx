'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Database,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

export default function DebugUserCheckPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAccessAndFetch();
  }, []);

  const checkAccessAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Simple client-side check, real protection is on the API
    if (user.email !== 'richard141271@gmail.com') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (profile?.role !== 'admin') {
        router.push('/dashboard');
        return;
      }
    }

    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/debug/deep-user-check');
      if (!res.ok) {
        throw new Error(`API Error: ${res.statusText}`);
      }
      const jsonData = await res.json();
      setData(jsonData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500 gap-4">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
        <p>Analyserer brukerdatabase og relasjoner...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      {/* Header */}
      <header className="bg-[#111827] text-white py-6 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/admin" className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Database className="w-6 h-6 text-purple-400" />
                Deep User Debug
              </h1>
              <p className="text-gray-400 text-sm">Diagnostiser brukerdata, slettede kontoer og foreldreløse bigårder</p>
            </div>
          </div>
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Kjør ny analyse
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-8 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-gray-500 text-xs uppercase tracking-wide font-medium mb-1">Søkte Navn</h3>
            <p className="text-3xl font-bold text-gray-900">{data?.report?.length || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-gray-500 text-xs uppercase tracking-wide font-medium mb-1">Foreldreløse Bigårder</h3>
            <p className={`text-3xl font-bold ${data?.orphanApiariesCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {data?.orphanApiariesCount || 0}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-gray-500 text-xs uppercase tracking-wide font-medium mb-1">Status</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-sm font-medium text-gray-700">System Online</span>
            </div>
          </div>
        </div>

        {/* Main Report Table */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Brukeranalyse Rapport</h2>
            <div className="text-xs text-gray-500">
              Sjekker Auth, Profiles, Logs og Eierskap
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-3">Navn (Søkt)</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-center">Auth</th>
                  <th className="px-6 py-3 text-center">Profile</th>
                  <th className="px-6 py-3 text-center">Logs</th>
                  <th className="px-6 py-3 text-right">Bigårder</th>
                  <th className="px-6 py-3 text-right">Kuber</th>
                  <th className="px-6 py-3">Funnet ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.report?.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{row.name_searched}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.found_in_auth ? 
                        <CheckCircle className="w-5 h-5 text-green-500 mx-auto" /> : 
                        <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                      }
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.found_in_profiles ? 
                        <CheckCircle className="w-5 h-5 text-green-500 mx-auto" /> : 
                        <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                      }
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.found_in_logs ? 
                        <CheckCircle className="w-5 h-5 text-amber-500 mx-auto" /> : 
                        <span className="text-gray-300">-</span>
                      }
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      {row.data_apiaries > 0 ? <span className="text-blue-600 font-bold">{row.data_apiaries}</span> : '0'}
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      {row.data_hives > 0 ? <span className="text-blue-600 font-bold">{row.data_hives}</span> : '0'}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-400 truncate max-w-[150px]" title={row.auth_id || row.profile_id || row.historical_id}>
                      {row.auth_id || row.profile_id || row.historical_id || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Orphan Apiaries Section */}
        {data?.orphanApiariesCount > 0 && (
          <section className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
            <div className="p-6 border-b border-red-100 bg-red-50">
              <h2 className="text-lg font-bold text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Foreldreløse Bigårder ({data.orphanApiariesCount})
              </h2>
              <p className="text-red-600 text-sm mt-1">
                Disse bigårdene er knyttet til en user_id som ikke lenger finnes i Auth-databasen.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium">
                  <tr>
                    <th className="px-6 py-3">Bigård ID</th>
                    <th className="px-6 py-3">Navn</th>
                    <th className="px-6 py-3">Lokasjon</th>
                    <th className="px-6 py-3">Tilhører (Død ID)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.orphanApiaries?.map((apiary: any) => (
                    <tr key={apiary.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">{apiary.id}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{apiary.name}</td>
                      <td className="px-6 py-4 text-gray-600">{apiary.location}</td>
                      <td className="px-6 py-4 font-mono text-xs text-red-600">{apiary.user_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'OK') {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">OK</span>;
  }
  if (status.includes('GHOST')) {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">GHOST DATA</span>;
  }
  if (status.includes('DELETED')) {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Slettet</span>;
  }
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Mangler</span>;
}
