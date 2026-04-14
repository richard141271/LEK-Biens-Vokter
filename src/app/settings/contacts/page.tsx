'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Link as LinkIcon, User, Mail, Phone, MapPin, ArrowLeft, Edit } from 'lucide-react';
import Link from 'next/link';

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
};

type Apiary = {
  id: string;
  name: string | null;
  apiary_number: string | null;
  location: string | null;
};

type ApiaryContact = {
  apiary_id: string;
  contact_id: string;
  role: string;
  apiary?: Apiary;
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [apiaries, setApiaries] = useState<Apiary[]>([]);
  const [apiaryContacts, setApiaryContacts] = useState<ApiaryContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    postal_code: '',
    city: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedApiaryId, setSelectedApiaryId] = useState('');
  const [selectedRole, setSelectedRole] = useState('grunneier');
  const [isLinking, setIsLinking] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    postal_code: '',
    city: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Ikke logget inn');

      const [contactsRes, apiariesRes, linksRes] = await Promise.all([
        supabase.from('contacts').select('*').eq('created_by', user.id).order('name'),
        supabase.from('apiaries').select('id, name, apiary_number, location').eq('user_id', user.id).order('name'),
        supabase.from('apiary_contacts').select('apiary_id, contact_id, role, apiary:apiaries(id, name, apiary_number, location)')
      ]);

      if (contactsRes.error) throw contactsRes.error;
      
      setContacts(contactsRes.data || []);
      setApiaries(apiariesRes.data || []);
      
      // Fix TypeScript thinking apiary is an array
      const formattedLinks = (linksRes.data || []).map((link: any) => ({
        ...link,
        apiary: Array.isArray(link.apiary) ? link.apiary[0] : link.apiary
      }));
      setApiaryContacts(formattedLinks);
    } catch (err: any) {
      setError(err.message || 'Kunne ikke laste kontakter');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name.trim()) return;
    
    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Ikke logget inn');

      const { error } = await supabase.from('contacts').insert({
        created_by: user.id,
        name: newContact.name.trim(),
        email: newContact.email.trim() || null,
        phone: newContact.phone.trim() || null,
        address: newContact.address.trim() || null,
        postal_code: newContact.postal_code.trim() || null,
        city: newContact.city.trim() || null,
      });

      if (error) {
        if (error.message.includes('does not exist')) {
          throw new Error('Database-tabell for kontakter mangler. Kjør migreringer.');
        }
        throw error;
      }

      setIsCreateModalOpen(false);
      setNewContact({ name: '', email: '', phone: '', address: '', postal_code: '', city: '' });
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Kunne ikke opprette kontakt');
    } finally {
      setIsCreating(false);
    }
  };

  const handleLinkContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !selectedApiaryId) return;

    setIsLinking(true);
    try {
      // Use the existing invite endpoint with sendInvite: false to also generate the agreement
      const res = await fetch('/api/grunneier/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiaryId: selectedApiaryId,
          contactId: selectedContact.id,
          role: selectedRole,
          sendInvite: false
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Kunne ikke knytte kontakt til bigård');
      }

      setIsLinkModalOpen(false);
      setSelectedContact(null);
      setSelectedApiaryId('');
      await fetchData();
      alert('Kontakt knyttet til bigård!');
    } catch (err: any) {
      alert(err.message || 'En feil oppstod');
    } finally {
      setIsLinking(false);
    }
  };

  const openEditModal = (contact: Contact) => {
    setEditContact(contact);
    setEditForm({
      name: contact.name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      address: contact.address || '',
      postal_code: contact.postal_code || '',
      city: contact.city || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editContact?.id) return;
    if (!editForm.name.trim()) return;

    setIsSavingEdit(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        email: editForm.email.trim() || null,
        phone: editForm.phone.trim() || null,
        address: editForm.address.trim() || null,
        postal_code: editForm.postal_code.trim() || null,
        city: editForm.city.trim() || null,
      };

      const { error } = await supabase.from('contacts').update(payload).eq('id', editContact.id);
      if (error) throw error;

      setIsEditModalOpen(false);
      setEditContact(null);
      await fetchData();
      alert('Kontakt oppdatert!');
    } catch (err: any) {
      alert(err.message || 'Kunne ikke oppdatere kontakt');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/settings" className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-gray-900">Kontakter</h1>
              <p className="text-xs text-gray-500">Forhåndsregistrer og administrer</p>
            </div>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-honey-500 hover:bg-honey-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Ny kontakt</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Laster kontakter...</div>
        ) : contacts.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">Ingen kontakter</h3>
            <p className="text-gray-500 text-sm mb-4">Du har ikke registrert noen kontakter ennå.</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-honey-500 hover:bg-honey-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Opprett din første kontakt
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {contacts.map((contact) => {
              const linked = apiaryContacts.filter(ac => ac.contact_id === contact.id);
              return (
                <div key={contact.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                        <User className="w-5 h-5 text-gray-400" />
                        {contact.name}
                      </h3>
                      <div className="mt-2 space-y-1">
                        {contact.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4 text-gray-400" />
                            {contact.email}
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4 text-gray-400" />
                            {contact.phone}
                          </div>
                        )}
                        {(contact.address || contact.city) && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {[contact.address, contact.postal_code, contact.city].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <button
                        onClick={() => openEditModal(contact)}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 rounded-lg transition-colors text-sm font-medium w-full"
                      >
                        <Edit className="w-4 h-4" />
                        Rediger
                      </button>
                      <button
                        onClick={() => {
                          setSelectedContact(contact);
                          setIsLinkModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium w-full"
                      >
                        <LinkIcon className="w-4 h-4" />
                        Knytt til bigård
                      </button>
                      
                      {linked.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                          <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Tilknyttet:</div>
                          <ul className="space-y-1">
                            {linked.map((l, i) => (
                              <li key={i} className="text-xs text-gray-700 flex items-center justify-between">
                                <span className="truncate pr-2">
                                  {l.apiary?.apiary_number || 'Bigård'} {l.apiary?.name ? `- ${l.apiary.name}` : ''}
                                </span>
                                <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-500">
                                  {l.role}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900">Opprett ny kontakt</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full text-gray-500">
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateContact} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Navn *</label>
                <input
                  required
                  type="text"
                  value={newContact.name}
                  onChange={e => setNewContact({...newContact, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Fullt navn"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
                  <input
                    type="email"
                    value={newContact.email}
                    onChange={e => setNewContact({...newContact, email: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="E-postadresse"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input
                    type="tel"
                    value={newContact.phone}
                    onChange={e => setNewContact({...newContact, phone: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Telefonnummer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input
                  type="text"
                  value={newContact.address}
                  onChange={e => setNewContact({...newContact, address: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Gateadresse"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postnr</label>
                  <input
                    type="text"
                    value={newContact.postal_code}
                    onChange={e => setNewContact({...newContact, postal_code: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Poststed</label>
                  <input
                    type="text"
                    value={newContact.city}
                    onChange={e => setNewContact({...newContact, city: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newContact.name.trim()}
                  className="px-4 py-2 bg-honey-500 text-white rounded-lg text-sm font-medium hover:bg-honey-600 disabled:opacity-50"
                >
                  {isCreating ? 'Lagrer...' : 'Opprett kontakt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Modal */}
      {isLinkModalOpen && selectedContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900">Knytt til bigård</h3>
              <button onClick={() => setIsLinkModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full text-gray-500">
                &times;
              </button>
            </div>
            <form onSubmit={handleLinkContact} className="p-4 space-y-4">
              <div className="text-sm text-gray-600 bg-blue-50 border border-blue-100 p-3 rounded-lg mb-4">
                Knytt <strong>{selectedContact.name}</strong> til en bigård. Dette vil opprette et avtaleutkast, men sender ikke invitasjon ennå. Du kan sende invitasjon fra bigårdens side senere.
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Velg Bigård *</label>
                <select
                  required
                  value={selectedApiaryId}
                  onChange={(e) => setSelectedApiaryId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="">-- Velg bigård --</option>
                  {apiaries.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.apiary_number || 'Bigård'} {a.name ? `- ${a.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rolle *</label>
                <select
                  required
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="grunneier">Grunneier</option>
                  <option value="kontaktperson">Kontaktperson</option>
                  <option value="samarbeidspartner">Samarbeidspartner</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={isLinking || !selectedApiaryId}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                >
                  <LinkIcon className="w-4 h-4" />
                  {isLinking ? 'Knytter...' : 'Knytt til bigård'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900">Rediger kontakt</h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditContact(null);
                }}
                className="p-1 hover:bg-gray-200 rounded-full text-gray-500"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleUpdateContact} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Navn *</label>
                <input
                  required
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postnr</label>
                  <input
                    type="text"
                    value={editForm.postal_code}
                    onChange={e => setEditForm({ ...editForm, postal_code: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Poststed</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditContact(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || !editForm.name.trim()}
                  className="px-4 py-2 bg-honey-500 text-white rounded-lg text-sm font-medium hover:bg-honey-600 disabled:opacity-50"
                >
                  {isSavingEdit ? 'Lagrer...' : 'Lagre endringer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
