'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Search, 
  Shield, 
  User, 
  Briefcase, 
  Check, 
  X,
  Loader2,
  ArrowLeft,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import { deleteUser, updateUserRole as updateUserRoleAction, getUsers } from '@/app/actions/user-management';

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userStats, setUserStats] = useState<{ apiaries: number, hives: number } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUserStats = async (userId: string) => {
    try {
      const { count: apiariesCount } = await supabase
        .from('apiaries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const { count: hivesCount } = await supabase
        .from('hives')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      setUserStats({
        apiaries: apiariesCount || 0,
        hives: hivesCount || 0
      });
    } catch (e) {
      console.error("Error fetching stats", e);
    }
  };

  const openUserDetails = (user: any) => {
    setSelectedUser(user);
    setUserStats(null);
    fetchUserStats(user.id);
  };

  useEffect(() => {
    if (users.length > 0) {
      const filtered = users.filter(user => 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { users, error } = await getUsers();

      if (error) throw new Error(error);
      
      setUsers(users || []);
      setFilteredUsers(users || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setMessage({ text: 'Kunne ikke laste brukere: ' + error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      setUpdatingId(userId);
      setMessage(null);

      const result = await updateUserRoleAction(userId, newRole);

      if (result.error) {
        throw new Error(result.error);
      }

      // Update local state
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setMessage({ text: `Bruker oppdatert til ${newRole}`, type: 'success' });
    } catch (error: any) {
      console.error('Error updating user:', error);
      setMessage({ text: 'Kunne ikke oppdatere bruker: ' + error.message, type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Er du sikker på at du vil slette denne brukeren? Dette kan ikke angres.')) return;

    try {
        setUpdatingId(userId);
        setMessage(null);
        
        const result = await deleteUser(userId);
        
        if (result.error) {
            setMessage({ text: 'Feil ved sletting: ' + result.error, type: 'error' });
        } else {
            setMessage({ text: 'Bruker slettet', type: 'success' });
            setUsers(users.filter(u => u.id !== userId));
            setFilteredUsers(filteredUsers.filter(u => u.id !== userId));
        }
    } catch (e: any) {
        console.error(e);
        setMessage({ text: 'Noe gikk galt under sletting: ' + e.message, type: 'error' });
    } finally {
        setUpdatingId(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"><Shield className="w-3 h-3 mr-1" /> Admin</span>;
      case 'mattilsynet':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Briefcase className="w-3 h-3 mr-1" /> Mattilsynet</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><User className="w-3 h-3 mr-1" /> Birøkter</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/admin" className="p-2 bg-white rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Brukeradministrasjon</h1>
                    <p className="text-gray-500">Administrer tilganger og roller</p>
                </div>
            </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Søk etter navn eller rolle..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-honey-500 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="text-sm text-gray-500">
              Viser {filteredUsers.length} av {users.length} brukere
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Navn</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nåværende Rolle</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Handlinger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-honey-500" />
                        <p>Laster brukere...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                      Ingen brukere funnet
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => openUserDetails(user)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-honey-100 flex items-center justify-center text-honey-600 font-bold">
                            {user.full_name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.full_name || 'Ukjent navn'}</div>
                            <div className="text-xs text-gray-500">ID: {user.id.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <select
                            disabled={updatingId === user.id}
                            value={user.role || 'beekeeper'}
                            onChange={(e) => updateUserRole(user.id, e.target.value)}
                            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-honey-500 outline-none"
                          >
                            <option value="beekeeper">Birøkter</option>
                            <option value="admin">Admin</option>
                            <option value="mattilsynet">Mattilsynet</option>
                          </select>
                          {updatingId === user.id && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <button 
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={updatingId === user.id}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Slett bruker"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedUser(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-honey-100 flex items-center justify-center text-honey-600 text-2xl font-bold">
                  {selectedUser.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedUser.full_name || 'Ukjent navn'}</h2>
                  <p className="text-sm text-gray-500">{getRoleBadge(selectedUser.role)}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">E-post</label>
                  <p className="text-gray-900 font-medium">{selectedUser.email || 'Ingen e-post registrert'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Telefon</label>
                  <p className="text-gray-900 font-medium">{selectedUser.phone_number || 'Ikke registrert'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Adresse</label>
                  <p className="text-gray-900 font-medium">{selectedUser.address || 'Ikke registrert'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Medlemsnummer</label>
                  <p className="text-gray-900 font-medium">#{selectedUser.member_number || 'N/A'}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Aktivitet
                </h3>
                {userStats ? (
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => window.open(`/apiaries`, '_blank')}
                      className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm text-left hover:border-honey-400 hover:shadow-md transition"
                    >
                      <div className="text-2xl font-bold text-honey-600">{userStats.apiaries}</div>
                      <div className="text-xs text-gray-500">Bigårder</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(`/hives`, '_blank')}
                      className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm text-left hover:border-honey-400 hover:shadow-md transition"
                    >
                      <div className="text-2xl font-bold text-honey-600">{userStats.hives}</div>
                      <div className="text-xs text-gray-500">Bikuber</div>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-4 text-gray-500 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Henter statistikk...</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                 <button 
                    onClick={() => {
                        if (confirm('Er du sikker på at du vil slette denne brukeren?')) {
                            handleDeleteUser(selectedUser.id);
                            setSelectedUser(null);
                        }
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium text-sm"
                >
                    <Trash2 className="w-4 h-4" />
                    Slett bruker
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
