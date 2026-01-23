'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Search, 
  Mail, 
  User, 
  Briefcase, 
  Check, 
  X,
  Loader2,
  ArrowLeft,
  Trash2,
  Edit2,
  Plus,
  Shield,
  Ban,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { getUsers, assignEmail, toggleEmailAccess, removeEmail } from '@/app/actions/user-management';

export default function AdminEmailPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // Email Modal State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailUser, setEmailUser] = useState<any | null>(null);
  const [emailAliasInput, setEmailAliasInput] = useState('');
  const [emailDomainInput, setEmailDomainInput] = useState('kias.no');
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      const filtered = users.filter(user => {
        const searchLower = searchTerm.toLowerCase();
        return (
          user.full_name?.toLowerCase().includes(searchLower) ||
          user.email_alias?.toLowerCase().includes(searchLower) ||
          user.role?.toLowerCase().includes(searchLower)
        );
      });
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
        const result = await assignEmail(emailUser.id, fullAlias);
        if (result.error) {
            setMessage({ text: result.error, type: 'error' });
        } else {
            setMessage({ text: 'E-postkonto oppdatert', type: 'success' });
            setUsers(users.map(u => u.id === emailUser.id ? { ...u, email_alias: fullAlias, email_enabled: true } : u));
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
        setUpdatingId(user.id);
        const result = await toggleEmailAccess(user.id, newState);
        
        if (result.error) {
            setMessage({ text: result.error, type: 'error' });
        } else {
            setMessage({ text: newState ? 'E-post aktivert' : 'E-post deaktivert', type: 'success' });
            setUsers(users.map(u => u.id === user.id ? { ...u, email_enabled: newState } : u));
        }
    } catch (e: any) {
        setMessage({ text: 'Feil: ' + e.message, type: 'error' });
    } finally {
        setUpdatingId(null);
    }
  };

  const handleRemoveEmail = async (user: any) => {
    if (!confirm('Er du sikker på at du vil slette denne e-postkontoen? Aliaset vil bli frigjort og brukeren mister tilgang.')) return;

    try {
        setUpdatingId(user.id);
        const result = await removeEmail(user.id);
        
        if (result.error) {
            setMessage({ text: result.error, type: 'error' });
        } else {
            setMessage({ text: 'E-postkonto slettet', type: 'success' });
            setUsers(users.map(u => u.id === user.id ? { ...u, email_alias: null, email_enabled: false } : u));
        }
    } catch (e: any) {
        setMessage({ text: 'Feil: ' + e.message, type: 'error' });
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Laster e-postadministrasjon...</div>;

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
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-purple-600" />
                E-postadministrasjon
              </h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="hidden sm:inline">Administrer KIAS Mail kontoer og aliaser</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Søk etter navn, alias eller rolle..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 font-medium">
                Totalt: {users.length} brukere
            </div>
            <div className="bg-purple-50 px-4 py-2 rounded-lg border border-purple-100 text-sm text-purple-700 font-medium">
                Med e-post: {users.filter(u => u.email_alias).length}
            </div>
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bruker
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    E-postadresse (Alias)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Domene
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Handlinger
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => {
                    const hasEmail = !!user.email_alias;
                    const domain = user.email_alias ? user.email_alias.split('@')[1] : '-';
                    
                    return (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold text-sm">
                              {user.full_name?.charAt(0) || 'U'}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                              <div className="text-sm text-gray-500 flex items-center gap-2">
                                {getRoleBadge(user.role)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {hasEmail ? (
                            <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-400" />
                                {user.email_alias}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 italic">Ingen e-post</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {hasEmail ? (
                              <span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">{domain}</span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {hasEmail ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.email_enabled 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                                {user.email_enabled ? 'Aktiv' : 'Deaktivert'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Ikke opprettet
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {hasEmail ? (
                                <>
                                    <Link 
                                        href={`/dashboard/admin/email/${user.id}`}
                                        className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-full transition-colors"
                                        title="Åpne innboks"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </Link>
                                    <button 
                                        onClick={() => openEmailModal(user)}
                                        className="text-indigo-600 hover:text-indigo-900 p-2 hover:bg-indigo-50 rounded-full transition-colors"
                                        title="Rediger alias"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleToggleEmail(user)}
                                        className={`${user.email_enabled ? 'text-amber-600 hover:text-amber-900 hover:bg-amber-50' : 'text-green-600 hover:text-green-900 hover:bg-green-50'} p-2 rounded-full transition-colors`}
                                        title={user.email_enabled ? 'Deaktiver' : 'Aktiver'}
                                    >
                                        {user.email_enabled ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                    </button>
                                    <button 
                                        onClick={() => handleRemoveEmail(user)}
                                        className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-full transition-colors"
                                        title="Slett e-postkonto"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </>
                            ) : (
                                <button 
                                    onClick={() => openEmailModal(user)}
                                    className="flex items-center gap-1 text-purple-600 hover:text-purple-900 px-3 py-1 bg-purple-50 hover:bg-purple-100 rounded-full transition-colors text-xs font-bold"
                                >
                                    <Plus className="w-3 h-3" />
                                    Opprett
                                </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Ingen brukere funnet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Email Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-purple-600" />
                {emailUser?.email_alias ? 'Rediger e-postkonto' : 'Opprett e-postkonto'}
            </h3>
            
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Bruker</label>
                <div className="text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                    {emailUser?.full_name}
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">E-post alias</label>
                <div className="flex rounded-md shadow-sm">
                    <input
                        type="text"
                        value={emailAliasInput}
                        onChange={(e) => setEmailAliasInput(e.target.value.toLowerCase().replace(/[^a-z0-9.]/g, ''))}
                        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border-gray-300 focus:ring-purple-500 focus:border-purple-500 sm:text-sm border"
                        placeholder="fornavn.etternavn"
                    />
                    <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                        @kias.no
                    </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">Kun små bokstaver, tall og punktum.</p>
            </div>

            <div className="flex justify-end gap-3">
                <button
                    onClick={() => setEmailModalOpen(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
                >
                    Avbryt
                </button>
                <button
                    onClick={handleEmailSubmit}
                    disabled={isEmailSubmitting || !emailAliasInput}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isEmailSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Lagre
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}