'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  ShieldCheck, 
  Users, 
  FileText, 
  CheckCircle, 
  Search,
  MoreVertical,
  Building,
  BarChart2,
  X
} from 'lucide-react';

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
    email: string;
  };
}

interface Profile {
    id: string;
    full_name: string;
    email: string;
}

export default function FranchiseAdminDashboard() {
  const [units, setUnits] = useState<FranchiseUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [potentialOwners, setPotentialOwners] = useState<Profile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [stats, setStats] = useState({
    signatures: 0,
    reportsThisWeek: 0
  });
  
  const [newUnit, setNewUnit] = useState({
    name: '',
    org_number: '',
    address: '',
    owner_id: '',
    status: 'active'
  });

  const supabase = createClient();

  useEffect(() => {
    checkUser();
    fetchUnits();
    fetchStats();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setCurrentUser({ ...user, role: profile?.role });
    }
  };

  useEffect(() => {
    if (isCreateModalOpen) {
        fetchProfiles();
        setFormError(null);
    }
  }, [isCreateModalOpen]);

  const fetchStats = async () => {
    try {
        // Signatures
        const { count: signaturesCount } = await supabase
            .from('franchise_signatures')
            .select('*', { count: 'exact', head: true });

        // Reports this week
        const now = new Date();
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0,0,0,0);
        
        const { count: reportsCount } = await supabase
            .from('franchise_weekly_reports')
            .select('*', { count: 'exact', head: true })
            .gte('submitted_at', startOfWeek.toISOString());

        setStats({
            signatures: signaturesCount || 0,
            reportsThisWeek: reportsCount || 0
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
  };

  const fetchUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('franchise_units')
        .select(`
          *,
          owner:profiles(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error('Error fetching units:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
    setPotentialOwners(data || []);
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
        const payload = {
            ...newUnit,
            owner_id: newUnit.owner_id || null // Handle empty string as null
        };
        
        console.log('Attempting to create unit with payload:', payload);

        const { data, error } = await supabase
            .from('franchise_units')
            .insert([payload])
            .select();

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        console.log('Unit created successfully:', data);
        
        setIsCreateModalOpen(false);
        setNewUnit({ name: '', org_number: '', address: '', owner_id: '', status: 'active' });
        fetchUnits();
        alert('Enhet opprettet!');
    } catch (error: any) {
        console.error('Detailed error:', error);
        setFormError(`Feil: ${error.message || JSON.stringify(error)}`);
    } finally {
        setSubmitting(false);
    }
  };

  // Add this to debug
  useEffect(() => {
    console.log('Units loaded:', units);
  }, [units]);

  const filteredUnits = units.filter(unit => 
    unit.name.toLowerCase().includes(search.toLowerCase()) ||
    unit.owner?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/admin" className="text-gray-500 hover:text-gray-700 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-yellow-600" />
                  Franchise-portal
                </h1>
                <p className="text-xs text-gray-500">Super Admin Oversikt</p>
              </div>
            </div>
            <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
                <Plus className="w-4 h-4" />
                Ny enhet
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 text-sm font-medium">Totalt Enheter</h3>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Building className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{units.length}</p>
            <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              {units.filter(u => u.status === 'active').length} aktive
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 text-sm font-medium">Signerte avtaler</h3>
              <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.signatures}</p>
            <p className="text-sm text-gray-500 mt-2">Totalt antall signaturer</p>
          </div>

          <Link href="/dashboard/admin/franchise/reports" className="block group">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 group-hover:border-indigo-300 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 text-sm font-medium group-hover:text-indigo-600">Innsendte rapporter</h3>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 group-hover:text-indigo-700">{stats.reportsThisWeek}</p>
              <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                Denne uken
                <ArrowLeft className="w-3 h-3 rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </div>
          </Link>
        </div>

        {/* Units List */}
        <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-900">Franchise Enheter</h3>
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Søk etter enhet..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                </div>
            </div>
            
            {loading ? (
                <div className="p-12 text-center text-gray-500">Laster enheter...</div>
            ) : filteredUnits.length > 0 ? (
                <div className="divide-y divide-gray-200">
                    {filteredUnits.map((unit) => (
                        <div key={unit.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-700 font-bold">
                                    {unit.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900">{unit.name}</h4>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Users className="w-3 h-3" />
                                        {unit.owner?.full_name || 'Ingen eier'}
                                        <span className="text-gray-300">•</span>
                                        {unit.owner?.email}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        Org: {unit.org_number || '-'} • {unit.address || '-'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    unit.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                    {unit.status === 'active' ? 'Aktiv' : unit.status}
                                </span>
                                <div className="text-right text-xs text-gray-500 hidden sm:block">
                                    <p>Opprettet</p>
                                    <p>{new Date(unit.created_at).toLocaleDateString()}</p>
                                </div>
                                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full">
                                    <MoreVertical className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-12 text-center text-gray-500">
                    <Building className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p>Ingen enheter funnet</p>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="mt-4 text-yellow-600 font-medium hover:underline"
                    >
                        Opprett første enhet
                    </button>
                </div>
            )}
        </div>
      </main>

      {/* Debug Info Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-2 text-xs font-mono opacity-75 hover:opacity-100 transition-opacity z-50">
        <div className="max-w-7xl mx-auto flex justify-between">
            <span>Logged in as: {currentUser?.email} (ID: {currentUser?.id})</span>
            <span>Role: {currentUser?.role || 'None'}</span>
            <span>Stats: {JSON.stringify(stats)}</span>
        </div>
      </div>

      {/* Create Unit Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900">Opprett ny franchise-enhet</h2>
                    <button 
                        onClick={() => setIsCreateModalOpen(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleCreateUnit} className="p-6 space-y-4">
                    {formError && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
                            {formError}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Navn på enhet *
                        </label>
                        <input 
                            type="text" 
                            required
                            value={newUnit.name}
                            onChange={e => setNewUnit({...newUnit, name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all"
                            placeholder="F.eks. LEK-Biens Vokter Oslo"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Org. nummer
                            </label>
                            <input 
                                type="text" 
                                value={newUnit.org_number}
                                onChange={e => setNewUnit({...newUnit, org_number: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all"
                                placeholder="9 sifre"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <select 
                                value={newUnit.status}
                                onChange={e => setNewUnit({...newUnit, status: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all"
                            >
                                <option value="active">Aktiv</option>
                                <option value="inactive">Inaktiv</option>
                                <option value="pending">Venter</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Adresse
                        </label>
                        <input 
                            type="text" 
                            value={newUnit.address}
                            onChange={e => setNewUnit({...newUnit, address: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all"
                            placeholder="Gateadresse, Postnr Sted"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Eier / Kontaktperson
                        </label>
                        <select 
                            value={newUnit.owner_id}
                            onChange={e => setNewUnit({...newUnit, owner_id: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all"
                        >
                            <option value="">-- Velg eier (valgfritt) --</option>
                            {potentialOwners.map(profile => (
                                <option key={profile.id} value={profile.id}>
                                    {profile.full_name} ({profile.email})
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Velg brukeren som skal administrere denne enheten.
                        </p>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button 
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Avbryt
                        </button>
                        <button 
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {submitting ? 'Oppretter...' : 'Opprett enhet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
