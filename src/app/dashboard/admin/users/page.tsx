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
  Trash2,
  Mail,
  Key,
  RefreshCw,
  Ban,
  HeartHandshake,
  GraduationCap,
  Filter
} from 'lucide-react';
import Link from 'next/link';
import { deleteUser, reactivateUser, updateUserRole as updateUserRoleAction, getUsers, assignEmail, toggleEmailAccess, updateUserPassword, toggleFounderStatus, toggleCourseFriendStatus, hardDeleteUser } from '@/app/actions/user-management';

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userStats, setUserStats] = useState<{ apiaries: number, hives: number } | null>(null);

  // Email Modal State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailUser, setEmailUser] = useState<any | null>(null);
  const [emailAliasInput, setEmailAliasInput] = useState('');
  const [emailDomainInput, setEmailDomainInput] = useState('kias.no');
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);

  // Password Modal State
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

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
      let result = users.filter(user => 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      // Sorting logic
      switch (sortOption) {
        case 'active_first':
          result.sort((a, b) => (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1));
          break;
        case 'inactive_first':
          result.sort((a, b) => (a.is_active === b.is_active ? 0 : a.is_active ? 1 : -1));
          break;
        case 'franchisee_first':
          result.sort((a, b) => {
              if (a.role === 'franchisee' && b.role !== 'franchisee') return -1;
              if (a.role !== 'franchisee' && b.role === 'franchisee') return 1;
              return 0;
          });
          break;
        case 'beekeeper_first':
          result.sort((a, b) => {
              if (a.role === 'beekeeper' && b.role !== 'beekeeper') return -1;
              if (a.role !== 'beekeeper' && b.role === 'beekeeper') return 1;
              return 0;
          });
          break;
        case 'alphabetical':
          result.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
          break;
        case 'newest':
          result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          break;
        case 'oldest':
          result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          break;
      }

      setFilteredUsers(result);
    }
  }, [searchTerm, users, sortOption]);

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

  const handleDeleteUser = async (userId: string, permanent: boolean = false) => {
    if (permanent) {
        if (!confirm('ADVARSEL: Dette vil slette brukeren PERMANENT fra systemet. All data (bigårder, kuber, logger) vil bli borte. Handlingen kan ikke angres. Er du helt sikker?')) return;
    } else {
        if (!confirm('Er du sikker på at du vil deaktivere denne brukeren? Brukeren vil miste tilgang, men data beholdes.')) return;
    }

    try {
        setUpdatingId(userId);
        setMessage(null);
        
        let result;
        if (permanent) {
            result = await hardDeleteUser(userId);
        } else {
            result = await deleteUser(userId);
        }
        
        if (result.error) {
            setMessage({ text: 'Feil ved sletting: ' + result.error, type: 'error' });
        } else {
            setMessage({ text: permanent ? 'Bruker slettet permanent' : 'Bruker deaktivert', type: 'success' });
            
            if (permanent) {
                // Remove from list
                setUsers(users.filter(u => u.id !== userId));
                setFilteredUsers(filteredUsers.filter(u => u.id !== userId));
            } else {
                // Mark as inactive
                setUsers(users.map(u => u.id === userId ? { ...u, is_active: false } : u));
                setFilteredUsers(filteredUsers.map(u => u.id === userId ? { ...u, is_active: false } : u));
            }
        }
    } catch (e: any) {
        console.error(e);
        setMessage({ text: 'Noe gikk galt under sletting: ' + e.message, type: 'error' });
    } finally {
        setUpdatingId(null);
        setSelectedUser(null); // Close modal if open
    }
  };

  const handleReactivateUser = async (userId: string) => {
    if (!confirm('Er du sikker på at du vil gjenaktivere denne brukeren?')) return;

    try {
        setUpdatingId(userId);
        setMessage(null);
        
        const result = await reactivateUser(userId);
        
        if (result.error) {
            setMessage({ text: 'Feil ved gjenaktivering: ' + result.error, type: 'error' });
        } else {
            setMessage({ text: 'Bruker gjenaktivert', type: 'success' });
            setUsers(users.map(u => u.id === userId ? { ...u, is_active: true } : u));
            setFilteredUsers(filteredUsers.map(u => u.id === userId ? { ...u, is_active: true } : u));
        }
    } catch (e: any) {
        console.error(e);
        setMessage({ text: 'Noe gikk galt under gjenaktivering: ' + e.message, type: 'error' });
    } finally {
        setUpdatingId(null);
    }
  };

  const handleToggleFounder = async (user: any) => {
    const newState = !user.is_founder;
    const confirmMsg = newState 
        ? 'Vil du markere denne brukeren som en del av gründer-teamet (V/F)?' 
        : 'Vil du fjerne denne brukeren fra gründer-teamet?';
        
    if (!confirm(confirmMsg)) return;
    
    try {
        setUpdatingId(user.id);
        const result = await toggleFounderStatus(user.id, newState);
        if (result.error) {
            setMessage({ text: result.error, type: 'error' });
        } else {
            setMessage({ text: newState ? 'Markert som gründer (V/F)' : 'Fjernet fra gründer-teamet', type: 'success' });
            setUsers(users.map(u => u.id === user.id ? { ...u, is_founder: newState } : u));
            setFilteredUsers(filteredUsers.map(u => u.id === user.id ? { ...u, is_founder: newState } : u));
        }
    } catch (e) {
        setMessage({ text: 'En feil oppstod', type: 'error' });
    } finally {
        setUpdatingId(null);
    }
  };

  const handleToggleCourseFriend = async (user: any) => {
    const newState = !user.is_course_friend;
    const confirmMsg = newState 
        ? 'Vil du markere denne brukeren som Kursvenn (K/V)? De vil få tilgang til War Room.' 
        : 'Vil du fjerne Kursvenn-status (K/V)? De vil miste tilgang til War Room.';
        
    if (!confirm(confirmMsg)) return;
    
    try {
        setUpdatingId(user.id);
        const result = await toggleCourseFriendStatus(user.id, newState);
        if (result.error) {
            setMessage({ text: result.error, type: 'error' });
        } else {
            setMessage({ text: newState ? 'Markert som Kursvenn (K/V)' : 'Fjernet Kursvenn-status', type: 'success' });
            setUsers(users.map(u => u.id === user.id ? { ...u, is_course_friend: newState } : u));
            setFilteredUsers(filteredUsers.map(u => u.id === user.id ? { ...u, is_course_friend: newState } : u));
        }
    } catch (e) {
        setMessage({ text: 'En feil oppstod', type: 'error' });
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
      case 'franchisee':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"><Shield className="w-3 h-3 mr-1" /> Franchisetaker</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><User className="w-3 h-3 mr-1" /> Birøkter</span>;
    }
  };

  // Email Functions
  const openEmailModal = (user: any) => {
    setEmailUser(user);
    if (user.email_alias) {
        const [alias, domain] = user.email_alias.split('@');
        setEmailAliasInput(alias);
        setEmailDomainInput(domain || 'kias.no');
    } else {
        // Suggest alias
        const nameParts = (user.full_name || '').toLowerCase().split(' ');
        const suggested = nameParts.length > 1 
            ? `${nameParts[0]}.${nameParts[nameParts.length - 1]}`
            : (nameParts[0] || 'bruker');
        setEmailAliasInput(suggested.replace(/[^a-z0-9.]/g, ''));
        setEmailDomainInput('kias.no');
    }
    setEmailModalOpen(true);
  };

  const handleEmailSubmit = async () => {
    if (!emailUser || !emailAliasInput) return;
    
    setIsEmailSubmitting(true);
    const fullAlias = `${emailAliasInput}@${emailDomainInput}`;
    
    try {
        // Default to true if undefined (new assignment), otherwise respect current state
        const isEnabled = emailUser.email_enabled ?? true;
        const result = await assignEmail(emailUser.id, fullAlias, isEnabled);
        
        if (result.error) {
            setMessage({ text: result.error, type: 'error' });
        } else {
            setMessage({ text: 'E-postadresse lagret', type: 'success' });
            setUsers(users.map(u => u.id === emailUser.id ? { ...u, email_alias: fullAlias, email_enabled: isEnabled } : u));
            setEmailModalOpen(false);
        }
    } catch (e) {
        setMessage({ text: 'En feil oppstod', type: 'error' });
    } finally {
        setIsEmailSubmitting(false);
    }
  };

  const handleToggleEmail = async (user: any) => {
    const newState = !user.email_enabled;
    const confirmMsg = newState 
        ? 'Vil du aktivere e-post for denne brukeren?' 
        : 'Vil du deaktivere e-post for denne brukeren?';
        
    if (!confirm(confirmMsg)) return;
    
    try {
        const result = await toggleEmailAccess(user.id, newState);
        if (result.error) {
            setMessage({ text: result.error, type: 'error' });
        } else {
            setMessage({ text: newState ? 'E-post aktivert' : 'E-post deaktivert', type: 'success' });
            setUsers(users.map(u => u.id === user.id ? { ...u, email_enabled: newState } : u));
            
            // Also update the selected user in the modal if it's the same user
            if (emailUser && emailUser.id === user.id) {
                setEmailUser({ ...emailUser, email_enabled: newState });
            }
        }
    } catch (e) {
        setMessage({ text: 'En feil oppstod', type: 'error' });
    }
  };

  const openPasswordModal = (user: any) => {
    setPasswordUser(user);
    setNewPassword('');
    setPasswordModalOpen(true);
  };

  const handlePasswordSubmit = async () => {
    if (!passwordUser || !newPassword) return;
    if (newPassword.length < 6) {
        alert('Passordet må være minst 6 tegn.');
        return;
    }

    setIsPasswordSubmitting(true);
    try {
        const result = await updateUserPassword(passwordUser.id, newPassword);
        if (result.error) {
            setMessage({ text: result.error, type: 'error' });
        } else {
            setMessage({ text: 'Passord oppdatert for ' + passwordUser.full_name, type: 'success' });
            setPasswordModalOpen(false);
        }
    } catch (e) {
        setMessage({ text: 'En feil oppstod ved endring av passord', type: 'error' });
    } finally {
        setIsPasswordSubmitting(false);
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
            <div className="flex flex-col sm:flex-row gap-4 w-full">
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
                <div className="relative w-full sm:w-64">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-honey-500 outline-none transition-all appearance-none bg-white"
                    >
                        <option value="newest">Sist innmeldt</option>
                        <option value="oldest">Først innmeldt</option>
                        <option value="active_first">Aktive øverst</option>
                        <option value="inactive_first">Inaktive øverst</option>
                        <option value="franchisee_first">Franchisetakere øverst</option>
                        <option value="beekeeper_first">Birøktere øverst</option>
                        <option value="alphabetical">Alfabetisk A-Å</option>
                    </select>
                </div>
            </div>
            <div className="text-sm text-gray-500 whitespace-nowrap">
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
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">V/F</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">K/V</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Endre Rolle</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Handlinger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-honey-500" />
                        <p>Laster brukere...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Ingen brukere funnet
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className={`hover:bg-gray-50 transition-colors cursor-pointer ${user.is_active === false ? 'bg-gray-100 opacity-75' : ''}`} onClick={() => openUserDetails(user)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center font-bold ${user.is_active === false ? 'bg-gray-200 text-gray-500' : 'bg-honey-100 text-honey-600'}`}>
                            {user.full_name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center gap-2">
                                <div className="text-sm font-medium text-gray-900">{user.full_name || 'Ukjent navn'}</div>
                                {user.is_active === false && (
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Inaktiv</span>
                                )}
                            </div>
                            <div className="text-xs text-gray-500">ID: {user.id.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                checked={user.is_founder || false} 
                                onChange={() => handleToggleFounder(user)}
                                disabled={updatingId === user.id}
                                className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500 cursor-pointer disabled:opacity-50"
                            />
                            {user.is_founder && <HeartHandshake className="w-4 h-4 text-amber-600" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                checked={user.is_course_friend || false} 
                                onChange={() => handleToggleCourseFriend(user)}
                                disabled={updatingId === user.id}
                                className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500 cursor-pointer disabled:opacity-50"
                            />
                            {user.is_course_friend && <GraduationCap className="w-4 h-4 text-amber-600" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <select
                            disabled={updatingId === user.id || user.is_active === false}
                            value={user.role || 'beekeeper'}
                            onChange={(e) => updateUserRole(user.id, e.target.value)}
                            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-honey-500 outline-none disabled:opacity-50"
                          >
                            <option value="beekeeper">Birøkter</option>
                            <option value="franchisee">Franchisetaker</option>
                            <option value="admin">Admin</option>
                            <option value="mattilsynet">Mattilsynet</option>
                          </select>
                          {updatingId === user.id && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openEmailModal(user)}
                        disabled={user.is_active === false}
                        className={`p-2 rounded-lg transition-colors ${user.email_enabled ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'} disabled:opacity-50`}
                        title={user.email_enabled ? 'Administrer e-post' : 'Tildel e-post'}
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openPasswordModal(user)}
                        disabled={user.is_active === false}
                        className="p-2 text-gray-400 hover:bg-gray-100 hover:text-yellow-600 rounded-lg transition-colors disabled:opacity-50"
                        title="Endre passord"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      {user.is_active === false ? (
                          <button 
                            onClick={() => handleReactivateUser(user.id)}
                            disabled={updatingId === user.id}
                            className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Gjenaktiver bruker"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                      ) : (
                        <button 
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={updatingId === user.id}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Deaktiver bruker"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase">Registrert</label>
                  <p className="text-gray-900 font-medium">
                    {selectedUser.created_at 
                      ? new Date(selectedUser.created_at).toLocaleString('nb-NO', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })
                      : 'Ukjent'}
                  </p>
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
                      onClick={() => window.open(`/apiaries?user_id=${selectedUser.id}`, '_blank')}
                      className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm text-left hover:border-honey-400 hover:shadow-md transition"
                    >
                      <div className="text-2xl font-bold text-honey-600">{userStats.apiaries}</div>
                      <div className="text-xs text-gray-500">Bigårder</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(`/hives?user_id=${selectedUser.id}`, '_blank')}
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

              <div className="flex justify-between pt-2">
                 <button 
                    onClick={() => {
                        handleDeleteUser(selectedUser.id, true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-red-800 bg-red-100 hover:bg-red-200 rounded-lg transition-colors font-bold text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    SLETT PERMANENT
                </button>

                 <button 
                    onClick={() => {
                        handleDeleteUser(selectedUser.id, false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm"
                  >
                    <Ban className="w-4 h-4" />
                    Deaktiver (Soft Delete)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Password Modal */}
      {passwordModalOpen && passwordUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setPasswordModalOpen(false)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900">
                        Endre passord
                    </h3>
                    <button onClick={() => setPasswordModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 font-bold">
                            <Key className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">{passwordUser.full_name}</p>
                            <p className="text-xs text-gray-500">{passwordUser.email}</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nytt passord
                        </label>
                        <input 
                            type="text" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all"
                            placeholder="Minst 6 tegn"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Dette vil overskrive brukerens eksisterende passord umiddelbart.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button 
                            onClick={() => setPasswordModalOpen(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                        >
                            Avbryt
                        </button>
                        <button 
                            onClick={handlePasswordSubmit}
                            disabled={isPasswordSubmitting || newPassword.length < 6}
                            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isPasswordSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Lagre passord
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Email Administration Modal */}
      {emailModalOpen && emailUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setEmailModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">
                {emailUser.email_enabled ? 'Administrer e-post' : 'Tildel e-post'}
              </h3>
              <button onClick={() => setEmailModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-honey-100 flex items-center justify-center text-honey-600 font-bold">
                  {emailUser.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{emailUser.full_name}</p>
                  <p className="text-xs text-gray-500">ID: {emailUser.id.substring(0, 8)}...</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-postadresse</label>
                <div className="flex rounded-md shadow-sm">
                  <input
                    type="text"
                    value={emailAliasInput}
                    onChange={(e) => setEmailAliasInput(e.target.value.toLowerCase().replace(/[^a-z0-9.]/g, ''))}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md border border-gray-300 focus:ring-honey-500 focus:border-honey-500 sm:text-sm"
                    placeholder="fornavn.etternavn"
                  />
                  <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                    @
                  </span>
                  <select
                    value={emailDomainInput}
                    onChange={(e) => setEmailDomainInput(e.target.value)}
                    className="rounded-none rounded-r-md border border-l-0 border-gray-300 bg-white px-3 py-2 focus:ring-honey-500 focus:border-honey-500 sm:text-sm"
                  >
                    <option value="kias.no">kias.no</option>
                    <option value="jornskalesje.no">jornskalesje.no</option>
                    <option value="aiinnovate.online">aiinnovate.online</option>
                  </select>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {emailAliasInput}@{emailDomainInput}
                </p>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">Aktiv e-posttilgang</span>
                  <span className="text-xs text-gray-500">Gi brukeren tilgang til innboks og sending</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailUser({ ...emailUser, email_enabled: !(emailUser.email_enabled ?? true) })}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-honey-500 focus:ring-offset-2 ${
                    (emailUser.email_enabled ?? true) ? 'bg-honey-500' : 'bg-gray-200'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      (emailUser.email_enabled ?? true) ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  onClick={() => setEmailModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Avbryt
                </button>
                <button
                  onClick={handleEmailSubmit}
                  disabled={isEmailSubmitting || !emailAliasInput}
                  className="px-4 py-2 bg-honey-500 text-white rounded-lg hover:bg-honey-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isEmailSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {emailUser.email_enabled ? 'Lagre endringer' : 'Opprett e-post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
