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
    fetchUnits();
    fetchStats();
  }, []);

  useEffect(() => {
    if (isCreateModalOpen) {
        fetchProfiles();
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
    try {
        const payload = {
            ...newUnit,
            owner_id: newUnit.owner_id || null // Handle empty string as null
        };
        
        const { error } = await supabase
            .from('franchise_units')
            .insert([payload]);

        if (error) throw error;
        
        setIsCreateModalOpen(false);
        setNewUnit({ name: '', org_number: '', address: '', owner_id: '', status: 'active' });
        fetchUnits();
    } catch (error) {
        alert('Kunne ikke opprette enhet. Sjekk at du har rettigheter.');
        console.error(error);
    } finally {
        setSubmitting(false);
    }
  };

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-500">Totalt antall enheter</h3>
                    <Building className="w-5 h-5 text-yellow-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{units.length}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-500">Aktive enheter</h3>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                    {units.filter(u => u.status === 'active').length}
                </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-500">Signerte avtaler</h3>
                    <FileText className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.signatures}</p>
                <p className="text-xs text-gray-400 mt-1">Av totalt {units.length} enheter</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-500">Innsendte rapporter</h3>
                    <BarChart2 className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.reportsThisWeek}</p>
                <p className="text-xs text-gray-400 mt-1">Denne uken</p>
            </div>
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
