'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Copy, Link as LinkIcon, Shield, Trash2, Users } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type InviteRole = 'viewer' | 'family' | 'substitute';

type AccessRow = {
  owner_id: string;
  member_id: string;
  role: InviteRole;
  can_write: boolean;
  can_delete: boolean;
  created_at: string;
  memberProfile?: { id: string; full_name: string | null; city: string | null } | null;
  ownerProfile?: { id: string; full_name: string | null; city: string | null } | null;
};

type InviteRow = {
  id: string;
  owner_id: string;
  email: string;
  role: InviteRole;
  can_write: boolean;
  can_delete: boolean;
  token: string;
  expires_at: string;
  created_at: string;
  ownerProfile?: { id: string; full_name: string | null; city: string | null } | null;
};

export default function AccessSettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outgoing, setOutgoing] = useState<AccessRow[]>([]);
  const [incoming, setIncoming] = useState<AccessRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [incomingInvites, setIncomingInvites] = useState<InviteRow[]>([]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InviteRole>('viewer');
  const [inviteCanWrite, setInviteCanWrite] = useState(true);
  const [inviteCanDelete, setInviteCanDelete] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setInviteUrl(null);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        setError('Ikke logget inn');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/access/list', { method: 'GET' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(String(data?.error || 'Kunne ikke hente tilganger'));
      }

      setOutgoing((data.outgoing || []) as AccessRow[]);
      setIncoming((data.incoming || []) as AccessRow[]);
      setInvites((data.invites || []) as InviteRow[]);
      setIncomingInvites((data.incomingInvites || []) as InviteRow[]);
    } catch (e: any) {
      setError(String(e?.message || 'Kunne ikke hente tilganger'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData().catch(() => {});
  }, []);

  useEffect(() => {
    if (inviteRole === 'viewer') {
      setInviteCanWrite(false);
      setInviteCanDelete(false);
    } else if (inviteRole === 'substitute') {
      setInviteCanWrite(true);
      setInviteCanDelete(false);
    } else {
      setInviteCanWrite(true);
      setInviteCanDelete(false);
    }
  }, [inviteRole]);

  const createInvite = async () => {
    setCreatingInvite(true);
    setInviteUrl(null);
    try {
      const res = await fetch('/api/access/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          canWrite: inviteCanWrite,
          canDelete: inviteCanDelete,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(String(data?.error || 'Kunne ikke opprette invitasjon'));
      }
      setInviteUrl(String(data.inviteUrl || ''));
      setInviteEmail('');
      await fetchData();
    } catch (e: any) {
      alert(String(e?.message || 'Kunne ikke opprette invitasjon'));
    } finally {
      setCreatingInvite(false);
    }
  };

  const revoke = async (memberId: string) => {
    if (!memberId) return;
    try {
      const res = await fetch('/api/access/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(String(data?.error || 'Kunne ikke fjerne tilgang'));
      await fetchData();
    } catch (e: any) {
      alert(String(e?.message || 'Kunne ikke fjerne tilgang'));
    }
  };

  const updateAccess = async (memberId: string, canWrite: boolean, canDelete: boolean) => {
    if (!memberId) return;
    try {
      const res = await fetch('/api/access/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, canWrite, canDelete }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(String(data?.error || 'Kunne ikke oppdatere tilgang'));
      await fetchData();
    } catch (e: any) {
      alert(String(e?.message || 'Kunne ikke oppdatere tilgang'));
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Lenke kopiert');
    } catch {
      alert(text);
    }
  };

  const acceptInvite = async (token: string) => {
    try {
      const res = await fetch('/api/access/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(String(data?.error || 'Kunne ikke godta invitasjon'));
      await fetchData();
      alert('Invitasjon godtatt');
    } catch (e: any) {
      alert(String(e?.message || 'Kunne ikke godta invitasjon'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 border-b border-gray-200 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/settings" className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tilganger</h1>
          <p className="text-xs text-gray-500">Inviter andre inn i din konto</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        {loading ? <div className="p-6 text-center text-gray-600">Laster...</div> : null}
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4">{error}</div>
        ) : null}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-honey-600" />
            <h2 className="font-bold text-gray-900">Inviter</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-post</label>
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-honey-500"
                placeholder="navn@epost.no"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as InviteRole)}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-honey-500"
              >
                <option value="viewer">Venn (innsyn)</option>
                <option value="family">Familie (velg)</option>
                <option value="substitute">Avløser</option>
              </select>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={inviteCanWrite}
                onChange={(e) => setInviteCanWrite(e.target.checked)}
                disabled={inviteRole !== 'family'}
              />
              Kan endre/registrere
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={inviteCanDelete}
                onChange={(e) => setInviteCanDelete(e.target.checked)}
                disabled={inviteRole !== 'family'}
              />
              Kan slette
            </label>
          </div>

          <button
            onClick={createInvite}
            disabled={creatingInvite || !inviteEmail.trim()}
            className="mt-4 w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <LinkIcon className="w-4 h-4" />
            {creatingInvite ? 'Oppretter…' : 'Lag invitasjonslenke'}
          </button>

          {inviteUrl ? (
            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold text-gray-500 uppercase">Lenke</div>
                <div className="text-sm font-mono text-gray-800 truncate">{inviteUrl}</div>
              </div>
              <button
                onClick={() => copy(inviteUrl)}
                className="shrink-0 bg-white border border-gray-300 px-3 py-2 rounded-lg font-bold text-gray-700 hover:bg-gray-100 flex items-center gap-2 text-xs"
              >
                <Copy className="w-4 h-4" />
                Kopier
              </button>
            </div>
          ) : null}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-honey-600" />
            <h2 className="font-bold text-gray-900">Dine delinger</h2>
          </div>

          {outgoing.length === 0 ? <div className="text-sm text-gray-500">Ingen ennå.</div> : null}
          <div className="space-y-3">
            {outgoing.map((a) => (
              <div key={`${a.owner_id}-${a.member_id}`} className="border border-gray-200 rounded-xl p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 truncate">
                      {a.memberProfile?.full_name || a.member_id}
                    </div>
                    <div className="text-xs text-gray-500">
                      {a.role === 'viewer' ? 'Venn (innsyn)' : a.role === 'substitute' ? 'Avløser' : 'Familie'} •{' '}
                      {a.memberProfile?.city ? a.memberProfile.city : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => revoke(a.member_id)}
                    className="shrink-0 bg-white border border-red-200 text-red-700 px-3 py-2 rounded-lg font-bold hover:bg-red-50 flex items-center gap-2 text-xs"
                  >
                    <Trash2 className="w-4 h-4" />
                    Fjern
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={Boolean(a.can_write)}
                      onChange={(e) => updateAccess(a.member_id, e.target.checked, Boolean(a.can_delete))}
                      disabled={a.role === 'viewer'}
                    />
                    Kan endre/registrere
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={Boolean(a.can_delete)}
                      onChange={(e) => updateAccess(a.member_id, Boolean(a.can_write), e.target.checked)}
                      disabled={a.role !== 'family'}
                    />
                    Kan slette
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-honey-600" />
            <h2 className="font-bold text-gray-900">Tilganger du har</h2>
          </div>

          {incoming.length === 0 ? <div className="text-sm text-gray-500">Ingen ennå.</div> : null}
          <div className="space-y-3">
            {incoming.map((a) => (
              <div key={`${a.owner_id}-${a.member_id}`} className="border border-gray-200 rounded-xl p-3">
                <div className="font-bold text-gray-900 truncate">{a.ownerProfile?.full_name || a.owner_id}</div>
                <div className="text-xs text-gray-500">
                  {a.role === 'viewer' ? 'Innsyn' : a.role === 'substitute' ? 'Avløser' : 'Familie'} •{' '}
                  {a.can_write ? 'Kan endre' : 'Kun innsyn'}
                  {a.can_delete ? ' • Kan slette' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <LinkIcon className="w-5 h-5 text-honey-600" />
            <h2 className="font-bold text-gray-900">Invitasjoner til deg</h2>
          </div>

          {incomingInvites.length === 0 ? <div className="text-sm text-gray-500">Ingen ennå.</div> : null}
          <div className="space-y-3">
            {incomingInvites.map((i) => (
              <div key={i.id} className="border border-gray-200 rounded-xl p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 truncate">
                      {i.ownerProfile?.full_name ? `Fra ${i.ownerProfile.full_name}` : `Fra ${i.owner_id}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {i.role === 'viewer' ? 'Venn (innsyn)' : i.role === 'substitute' ? 'Avløser' : 'Familie'} •
                      Utløper {new Date(i.expires_at).toLocaleDateString('nb-NO')}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => acceptInvite(i.token)}
                      className="bg-black text-white px-3 py-2 rounded-lg font-bold hover:bg-gray-800 flex items-center gap-2 text-xs"
                    >
                      Godta
                    </button>
                    <button
                      onClick={() =>
                        copy(`${window.location.origin}/settings/access/accept?token=${encodeURIComponent(i.token)}`)
                      }
                      className="bg-white border border-gray-300 px-3 py-2 rounded-lg font-bold text-gray-700 hover:bg-gray-100 flex items-center gap-2 text-xs"
                    >
                      <Copy className="w-4 h-4" />
                      Kopier
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <LinkIcon className="w-5 h-5 text-honey-600" />
            <h2 className="font-bold text-gray-900">Ventende invitasjoner</h2>
          </div>

          {invites.length === 0 ? <div className="text-sm text-gray-500">Ingen ennå.</div> : null}
          <div className="space-y-3">
            {invites.map((i) => (
              <div key={i.id} className="border border-gray-200 rounded-xl p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 truncate">{i.email}</div>
                    <div className="text-xs text-gray-500">
                      {i.role === 'viewer' ? 'Venn (innsyn)' : i.role === 'substitute' ? 'Avløser' : 'Familie'} •
                      Utløper {new Date(i.expires_at).toLocaleDateString('nb-NO')}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      copy(`${window.location.origin}/settings/access/accept?token=${encodeURIComponent(i.token)}`)
                    }
                    className="shrink-0 bg-white border border-gray-300 px-3 py-2 rounded-lg font-bold text-gray-700 hover:bg-gray-100 flex items-center gap-2 text-xs"
                  >
                    <Copy className="w-4 h-4" />
                    Kopier
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
