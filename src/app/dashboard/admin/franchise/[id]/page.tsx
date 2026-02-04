'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Building, 
  Users, 
  MapPin, 
  FileText, 
  Activity,
  Edit2,
  Save,
  X,
  CheckCircle,
  ChevronDown,
  Search,
  MessageSquare,
  Clock,
  Send
} from 'lucide-react';
import { updateUserRole } from '@/app/actions/user-management';
import { getFranchiseUnitById, getFranchiseMessages } from '@/app/actions/franchise';

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

interface Message {
    id: string;
    subject: string;
    content: string;
    is_read: boolean;
    created_at: string;
    sender_id: string;
    sender?: {
        full_name: string;
        email: string;
    };
}

export default function AdminFranchiseUnitPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const [unit, setUnit] = useState<FranchiseUnit | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<FranchiseUnit | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Owner Search State
  const [potentialOwners, setPotentialOwners] = useState<any[]>([]);
  const [ownerSearch, setOwnerSearch] = useState('');
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);

    // Fetch Unit via Server Action (Admin Client)
    const { data: unitData, error: unitError } = await getFranchiseUnitById(id);
    
    if (unitError) {
        console.error('Error fetching unit:', unitError);
    } else if (unitData) {
        setUnit(unitData);
        setEditForm(unitData);
        setOwnerSearch(unitData.owner?.full_name || '');
    }

    // Fetch Messages via Server Action (Admin Client)
    const { data: messagesData, error: msgError } = await getFranchiseMessages(id);
    if (msgError) {
        console.error('Error fetching messages:', msgError);
    } else if (messagesData) {
        setMessages(messagesData);
    }

    setLoading(false);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
    setPotentialOwners(data || []);
  };

  useEffect(() => {
    if (isEditing) {
        fetchProfiles();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (!editForm || !unit) return;
    setSaving(true);

    try {
        // 1. Update Unit
        const { error } = await supabase
            .from('franchise_units')
            .update({
                name: editForm.name,
                org_number: editForm.org_number,
                address: editForm.address,
                owner_id: editForm.owner_id,
                status: editForm.status
            })
            .eq('id', id);

        if (error) throw error;

        // 2. If owner changed, update role
        if (editForm.owner_id && editForm.owner_id !== unit.owner_id) {
            await updateUserRole(editForm.owner_id, 'franchisee');
        }

        // 3. Refresh
        await fetchData();
        setIsEditing(false);
    } catch (error: any) {
        console.error('Error updating unit:', error);
        alert('Kunne ikke oppdatere enhet: ' + error.message);
    } finally {
        setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Laster enhet...</div>;
  if (!unit) return <div className="p-10 text-center">Fant ikke enhet.</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
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
            {!isEditing ? (
                <>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        unit.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                        {unit.status === 'active' ? 'Aktiv' : unit.status}
                    </span>
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <Edit2 className="w-4 h-4" /> Rediger
                    </button>
                </>
            ) : (
                <>
                    <button 
                        onClick={() => {
                            setIsEditing(false);
                            setEditForm(unit);
                            setOwnerSearch(unit.owner?.full_name || '');
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <X className="w-4 h-4" /> Avbryt
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" /> {saving ? 'Lagrer...' : 'Lagre endringer'}
                    </button>
                </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Edit Form / Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Owner Details */}
            <div className={`bg-white p-6 rounded-xl shadow-sm border ${isEditing ? 'border-yellow-300 ring-4 ring-yellow-50' : 'border-gray-200'} transition-all`}>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Eierinformasjon
                </h2>
                
                {isEditing && editForm ? (
                    <div className="space-y-4">
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Eier / Kontaktperson</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input 
                                    type="text" 
                                    placeholder="Søk etter navn..."
                                    value={ownerSearch}
                                    onChange={(e) => {
                                        setOwnerSearch(e.target.value);
                                        setShowOwnerDropdown(true);
                                        // Clear ID if search changes (force re-select)
                                        if (e.target.value !== potentialOwners.find(p => p.id === editForm.owner_id)?.full_name) {
                                            // Optional: Don't clear immediately to allow fixing typos, 
                                            // but for strictness we could. For now let's just keep search logic.
                                        }
                                    }}
                                    onFocus={() => setShowOwnerDropdown(true)}
                                    className="w-full pl-9 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none"
                                />
                                {showOwnerDropdown && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                                        {potentialOwners
                                            .filter(p => p.full_name?.toLowerCase().includes(ownerSearch.toLowerCase()) || p.email?.toLowerCase().includes(ownerSearch.toLowerCase()))
                                            .map(profile => (
                                            <button
                                                key={profile.id}
                                                type="button"
                                                onClick={() => {
                                                    setEditForm({...editForm, owner_id: profile.id});
                                                    setOwnerSearch(profile.full_name);
                                                    setShowOwnerDropdown(false);
                                                }}
                                                className="w-full text-left px-4 py-2 hover:bg-yellow-50 transition-colors border-b border-gray-50 last:border-0"
                                            >
                                                <p className="font-medium text-sm text-gray-900">{profile.full_name}</p>
                                                <p className="text-xs text-gray-500">{profile.email}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Valgt ID: {editForm.owner_id || 'Ingen valgt'}
                            </p>
                        </div>
                    </div>
                ) : (
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
                )}
            </div>

            {/* Company Details */}
            <div className={`bg-white p-6 rounded-xl shadow-sm border ${isEditing ? 'border-yellow-300 ring-4 ring-yellow-50' : 'border-gray-200'} transition-all`}>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Foretaksinformasjon
                </h2>
                
                {isEditing && editForm ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Navn på enhet</label>
                            <input 
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Org. nummer</label>
                            <input 
                                type="text"
                                value={editForm.org_number}
                                onChange={(e) => setEditForm({...editForm, org_number: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                            <input 
                                type="text"
                                value={editForm.address}
                                onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select 
                                value={editForm.status}
                                onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none"
                            >
                                <option value="active">Aktiv</option>
                                <option value="pending">Venter (Under etablering)</option>
                                <option value="inactive">Inaktiv</option>
                            </select>
                        </div>
                    </div>
                ) : (
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
                )}
            </div>
        </div>

        {/* Messages */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    Meldinger fra enheten
                </h3>
                <span className="text-sm text-gray-500">{messages.length} meldinger</span>
            </div>
            <div className="divide-y divide-gray-100">
                {messages.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        Ingen meldinger funnet.
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-gray-900">{msg.subject}</h4>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    {new Date(msg.created_at).toLocaleDateString('nb-NO')}
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{msg.content}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <Users className="w-3 h-3" />
                                <span>{msg.sender?.full_name || 'Ukjent avsender'} ({msg.sender?.email})</span>
                            </div>
                        </div>
                    ))
                )}
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
