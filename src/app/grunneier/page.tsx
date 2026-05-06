'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Mail, MapPin } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-gray-400">
      Laster kart...
    </div>
  ),
});

type LinkedApiary = {
  apiary: {
    id: string;
    name: string | null;
    apiary_number: string | null;
    latitude: number | null;
    longitude: number | null;
    location: string | null;
    type: string | null;
    status?: 'aktiv' | 'inaktiv';
  };
  contact: {
    id: string;
    name: string;
    email: string | null;
    address: string | null;
    postal_code: string | null;
    city: string | null;
    phone: string | null;
  };
  role: 'grunneier' | 'kontaktperson' | 'samarbeidspartner';
  special_terms: string | null;
};

type Agreement = {
  id: string;
  status:
    | 'draft'
    | 'awaiting_contact'
    | 'contact_proposed'
    | 'awaiting_contact_signature'
    | 'awaiting_beekeeper_signature'
    | 'active'
    | 'rejected'
    | 'terminated';
  role: 'grunneier' | 'kontaktperson' | 'samarbeidspartner';
  base_text: string;
  final_text: string | null;
  contact_proposal: string | null;
  beekeeper_decision: 'pending' | 'accepted' | 'rejected';
  contact_signed_at: string | null;
  beekeeper_signed_at: string | null;
  created_at: string;
  updated_at: string;
  apiary: { id: string; name: string | null; apiary_number: string | null; location: string | null } | null;
  contact: { id: string; name: string; email: string | null } | null;
};

type Contact = {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
};

export default function GrunneierPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const supabase = useMemo(() => createClient(), []);

  const toNumber = (v: unknown): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [linkedApiaries, setLinkedApiaries] = useState<LinkedApiary[]>([]);
  const [sessionContacts, setSessionContacts] = useState<Contact[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [proposal, setProposal] = useState('');
  const [signatureName, setSignatureName] = useState('');
  const [activeAgreementId, setActiveAgreementId] = useState<string | null>(null);
  const [selectedApiaryId, setSelectedApiaryId] = useState<string | null>(null);
  const [recreatingAgreement, setRecreatingAgreement] = useState(false);
  const [isAgreementCollapsed, setIsAgreementCollapsed] = useState(true);
  const [specialTerms, setSpecialTerms] = useState('');
  const [specialTermsOriginal, setSpecialTermsOriginal] = useState('');
  const [savingSpecialTerms, setSavingSpecialTerms] = useState(false);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [sessionTokenPurpose, setSessionTokenPurpose] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [authFormName, setAuthFormName] = useState('');
  const [authFormEmail, setAuthFormEmail] = useState('');
  const [authFormPassword, setAuthFormPassword] = useState('');
  const [magicPassword, setMagicPassword] = useState('');

  const authedFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const { data } = await supabase.auth.getSession();
      const accessToken = data?.session?.access_token || '';
      const headers = new Headers(init?.headers || undefined);
      if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
      return fetch(input, { ...(init || {}), headers });
    },
    [supabase]
  );

  const fetchSession = useCallback(async () => {
    setSessionLoading(true);
    try {
      const res = await authedFetch('/api/grunneier/session', { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.expired) {
          setStatus('Lenken er utløpt');
        }
        setLinkedApiaries([]);
        setSessionContacts([]);
        setAgreements([]);
        setSessionEmail(null);
        setSessionTokenPurpose(null);
        return;
      }
      const data = await res.json();
      setLinkedApiaries(data?.apiaries || []);
      setSessionContacts(data?.contacts || []);
      setAgreements(data?.agreements || []);
      setSessionEmail(data?.email || null);
      setSessionTokenPurpose(data?.tokenPurpose || null);
    } finally {
      setSessionLoading(false);
    }
  }, [authedFetch]);

  useEffect(() => {
    void fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    let isMounted = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) return;
      setAuthEmail(data.user?.email || null);
      void fetchSession();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthEmail(session?.user?.email || null);
      void fetchSession();
    });
    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, fetchSession]);

  useEffect(() => {
    if (selectedApiaryId && linkedApiaries.some((i) => i.apiary.id === selectedApiaryId)) return;
    const firstWithCoords = linkedApiaries.find(
      (i) => toNumber(i.apiary.latitude) != null && toNumber(i.apiary.longitude) != null
    );
    setSelectedApiaryId(firstWithCoords?.apiary.id || linkedApiaries[0]?.apiary.id || null);
  }, [linkedApiaries, selectedApiaryId]);

  const selectedLink = useMemo(() => {
    if (!selectedApiaryId) return null;
    return linkedApiaries.find((i) => i.apiary.id === selectedApiaryId) || null;
  }, [linkedApiaries, selectedApiaryId]);

  const normalizeEmail = (v: unknown) => String(v || '').trim().toLowerCase();

  const prefillContact = useMemo(() => {
    const se = normalizeEmail(sessionEmail);
    if (!se) return null;
    if (sessionTokenPurpose === 'account') return null;

    const fromSelected = selectedLink?.contact || null;
    if (fromSelected && normalizeEmail(fromSelected.email) === se) return fromSelected;

    const fromContacts = sessionContacts.find((c) => normalizeEmail(c.email) === se) || null;
    if (fromContacts) return fromContacts;

    return fromSelected;
  }, [selectedLink, sessionContacts, sessionEmail, sessionTokenPurpose]);

  useEffect(() => {
    const next = selectedLink?.special_terms || '';
    setSpecialTerms(next);
    setSpecialTermsOriginal(next);
  }, [selectedLink?.apiary.id, selectedLink?.contact.id]);

  useEffect(() => {
    const validate = async () => {
      if (!token) return;
      setLoading(true);
      setStatus(null);
      try {
        const res = await fetch(`/api/grunneier/validate?token=${encodeURIComponent(token)}`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setStatus(data?.error || 'Lenken er utløpt');
          router.replace('/grunneier');
          return;
        }
        router.replace('/grunneier');
        await fetchSession();
      } finally {
        setLoading(false);
      }
    };
    validate();
  }, [token, router]);

  const requestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/grunneier/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus(data?.error || 'Kunne ikke sende lenke');
        return;
      }

      setStatus('Hvis e-posten finnes, er lenke sendt.');
      setEmail('');
    } finally {
      setLoading(false);
    }
  };

  const mapCenter = useMemo<[number, number]>(() => {
    const selected = selectedApiaryId
      ? linkedApiaries.find((i) => i.apiary.id === selectedApiaryId)
      : null;
    if (selected) {
      const lat = toNumber(selected.apiary.latitude);
      const lng = toNumber(selected.apiary.longitude);
      if (lat != null && lng != null) {
        return [lat, lng];
      }
    }
    for (const item of linkedApiaries) {
      const lat = toNumber(item.apiary.latitude);
      const lng = toNumber(item.apiary.longitude);
      if (lat != null && lng != null) {
        return [lat, lng];
      }
    }
    return [60.3913, 5.3221];
  }, [linkedApiaries, selectedApiaryId]);

  const markers = useMemo(() => {
    return linkedApiaries
      .map((item) => {
        const lat = toNumber(item.apiary.latitude);
        const lng = toNumber(item.apiary.longitude);
        if (lat == null || lng == null) return null;
        const title = item.apiary.apiary_number || item.apiary.name || 'Bigård';
        const description = [
          item.apiary.name ? `Navn: ${item.apiary.name}` : null,
          item.apiary.location ? `Sted: ${item.apiary.location}` : null,
          `Rolle: ${item.role}`,
          item.apiary.status ? `Status: ${item.apiary.status}` : null,
        ]
          .filter(Boolean)
          .join('\n');

        return {
          id: `${item.apiary.id}:${item.contact.id}`,
          position: [lat, lng] as [number, number],
          title,
          type: item.apiary.id === selectedApiaryId ? ('user' as const) : ('healthy' as const),
          description,
        };
      })
      .filter(Boolean) as any[];
  }, [linkedApiaries, selectedApiaryId]);

  const hasSession = linkedApiaries.length > 0;
  const pendingAgreements = useMemo(
    () =>
      (agreements || [])
        .filter((a) => a.status !== 'active')
        .sort((a, b) => {
          const aTime = new Date(a.updated_at || a.created_at).getTime();
          const bTime = new Date(b.updated_at || b.created_at).getTime();
          if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) return bTime - aTime;
          return b.id.localeCompare(a.id);
        }),
    [agreements]
  );

  const sortedAgreements = useMemo(() => {
    const list = Array.isArray(agreements) ? agreements.slice() : [];
    const rank = (a: Agreement) => {
      const status = String(a?.status || '').toLowerCase();
      if (status === 'active') return 0;
      if (status === 'awaiting_contact_signature') return 1;
      if (status === 'awaiting_beekeeper_signature') return 2;
      if (status === 'contact_proposed') return 3;
      if (status === 'awaiting_contact') return 4;
      if (status === 'draft') return 6;
      if (status === 'rejected') return 9;
      if (status === 'terminated') return 10;
      return 7;
    };
    return list.sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      const aTime = new Date(a.updated_at || a.created_at).getTime();
      const bTime = new Date(b.updated_at || b.created_at).getTime();
      if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) return bTime - aTime;
      return b.id.localeCompare(a.id);
    });
  }, [agreements]);

  const activeAgreements = useMemo(
    () => sortedAgreements.filter((a) => String(a.status || '').toLowerCase() === 'active'),
    [sortedAgreements]
  );

  const apiaryStatusById = useMemo(() => {
    const map = new globalThis.Map<string, string>();
    for (const item of linkedApiaries || []) {
      const id = String(item?.apiary?.id || '').trim();
      const status = String(item?.apiary?.status || '').trim();
      if (!id) continue;
      if (status) map.set(id, status);
    }
    return map;
  }, [linkedApiaries]);

  const displayAgreements = useMemo(() => {
    if (hasSession && activeAgreements.length > 0) return activeAgreements;
    return sortedAgreements;
  }, [activeAgreements, hasSession, sortedAgreements]);

  const currentAgreement = useMemo(() => {
    if (activeAgreementId) return displayAgreements.find((a) => a.id === activeAgreementId) || null;
    if (selectedApiaryId) {
      const byApiary = displayAgreements.filter((a) => a.apiary?.id === selectedApiaryId);
      if (byApiary.length > 0) return byApiary[0];
    }
    return displayAgreements[0] || null;
  }, [activeAgreementId, displayAgreements, selectedApiaryId]);

  const canShowPortal = hasSession || agreements.length > 0;
  const authEmailLower = authFormEmail.trim().toLowerCase();
  const sessionEmailLower = String(sessionEmail || '').trim().toLowerCase();
  const canCreateAccountHere =
    Boolean(sessionEmailLower) && sessionTokenPurpose !== 'account' && authEmailLower === sessionEmailLower;

  const openAuth = (mode: 'signup' | 'signin') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
    setStatus(null);
    const shouldUseSessionPrefill = mode === 'signup' && !authEmail && Boolean(sessionEmailLower) && sessionTokenPurpose !== 'account';

    if (mode === 'signin') {
      setAuthFormName('');
    } else {
      setAuthFormName(shouldUseSessionPrefill ? String(prefillContact?.name || '').trim() : '');
    }

    const fallbackEmail = shouldUseSessionPrefill ? (sessionEmail || '') : authEmail || sessionEmail || email || '';
    setAuthFormEmail(fallbackEmail);
    setAuthFormPassword('');
  };

  const setPasswordFromLink = async () => {
    const targetEmail = String(sessionEmail || '').trim().toLowerCase();
    if (!targetEmail) return;
    if (!magicPassword || magicPassword.length < 8) {
      setStatus('Passord må være minst 8 tegn');
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/grunneier/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: magicPassword, fullName: '' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data?.error || 'Kunne ikke sette passord');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email: targetEmail, password: magicPassword });
      if (error) {
        setMagicPassword('');
        setStatus('Passord er satt, men innlogging feilet. Prøv å logge inn manuelt.');
        return;
      }

      setMagicPassword('');
      setStatus('Passord er satt. Du er nå logget inn med konto.');
      await fetchSession();
    } finally {
      setLoading(false);
    }
  };

  const requestPasswordReset = async () => {
    const targetEmail = authFormEmail.trim().toLowerCase();
    if (!targetEmail) return;
    setLoading(true);
    setStatus(null);
    try {
      const configuredBaseUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_BASE_URL;
      const origin = window.location.origin;
      const baseUrl = origin.includes('localhost') && configuredBaseUrl ? configuredBaseUrl : origin;
      const redirectTo = `${baseUrl}/aksjer/reset-password?back=${encodeURIComponent('/grunneier')}`;
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, { redirectTo });
      if (error) {
        setStatus(error.message || 'Kunne ikke sende e-post');
        return;
      }
      setStatus('Sjekk e-posten din for lenke til å tilbakestille passordet.');
    } finally {
      setLoading(false);
    }
  };

  const signUp = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const emailValue = authFormEmail.trim().toLowerCase();
      const res = await fetch('/api/grunneier/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailValue,
          password: authFormPassword,
          fullName: authFormName.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data?.error || 'Kunne ikke opprette konto');
        return;
      }
      if (data?.exists && !data?.passwordUpdated) {
        setAuthMode('signin');
        setStatus(
          'Konto finnes allerede. Av sikkerhetshensyn kan vi ikke endre passord her. Logg inn med eksisterende passord eller bruk "Glemt passord".'
        );
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailValue,
        password: authFormPassword,
      });
      if (signInError) {
        setAuthMode('signin');
        setStatus('Konto er opprettet, men innlogging feilet. Prøv å logge inn, eller bruk "Glemt passord".');
        return;
      }

      setAuthModalOpen(false);
      await fetchSession();
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: authFormEmail.trim().toLowerCase(),
        password: authFormPassword,
      });
      if (error) {
        const msg = String(error.message || '');
        if (msg.toLowerCase().includes('invalid login credentials')) {
          setStatus(
            'Feil e-post eller passord. Bruk "Glemt passord" hvis du er usikker.'
          );
          return;
        }
        setStatus(msg || 'Kunne ikke logge inn');
        return;
      }
      setAuthModalOpen(false);
      await fetchSession();
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setStatus(null);
    try {
      await supabase.auth.signOut();
      setAuthEmail(null);
      await fetchSession();
    } finally {
      setLoading(false);
    }
  };

  const logoutMagicSession = async () => {
    setLoading(true);
    setStatus(null);
    try {
      await fetch('/api/grunneier/logout', { method: 'POST' });
      setLinkedApiaries([]);
      setAgreements([]);
      setSessionEmail(null);
      setSessionTokenPurpose(null);
      setStatus('Du er logget ut.');
    } finally {
      setLoading(false);
    }
  };

  const submitProposal = async () => {
    if (!currentAgreement) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await authedFetch('/api/grunneier/agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'propose',
          agreementId: currentAgreement.id,
          proposal,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data?.error || 'Kunne ikke sende forslag');
        return;
      }
      setProposal('');
      setStatus('Forslag sendt. Venter på birøkter.');
      await fetchSession();
    } finally {
      setLoading(false);
    }
  };

  const signAgreement = async () => {
    if (!currentAgreement) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await authedFetch('/api/grunneier/agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sign',
          agreementId: currentAgreement.id,
          signatureName,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data?.error || 'Kunne ikke signere');
        return;
      }
      const nextStatus = String(data?.status || '').toLowerCase();
      setStatus(nextStatus === 'active' ? 'Avtalen er nå aktiv.' : 'Signert. Venter på at birøkter aktiverer avtalen.');
      await fetchSession();
    } finally {
      setLoading(false);
    }
  };

  const saveSpecialTerms = async () => {
    if (!selectedLink?.apiary?.id || !selectedLink?.contact?.id) return;
    setSavingSpecialTerms(true);
    setStatus(null);
    try {
      const res = await authedFetch('/api/grunneier/agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_special_terms',
          apiaryId: selectedLink.apiary.id,
          contactId: selectedLink.contact.id,
          specialTerms,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data?.error || 'Kunne ikke lagre vilkår');
        return;
      }
      setSpecialTermsOriginal(specialTerms);
      setStatus('Spesielle vilkår er lagret.');
      await fetchSession();
    } finally {
      setSavingSpecialTerms(false);
    }
  };

  const recreateOriginalAgreement = async () => {
    if (!currentAgreement?.id) return;
    setRecreatingAgreement(true);
    setStatus(null);
    try {
      const res = await authedFetch('/api/grunneier/agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'new_original',
          agreementId: currentAgreement.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data?.error || 'Kunne ikke opprette ny avtale');
        return;
      }
      const newId = String(data?.agreementId || '');
      await fetchSession();
      if (newId) setActiveAgreementId(newId);
      setProposal('');
      setSignatureName('');
      setStatus('Ny standardavtale er opprettet. Du kan signere den under.');
    } finally {
      setRecreatingAgreement(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-gray-900">Grunneierportal</h1>
            <p className="text-xs text-gray-500">
              Kart og oversikt over bigårder du er knyttet til
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
            {authEmail ? (
              <>
                <div className="hidden sm:block text-xs text-gray-600">{authEmail}</div>
                <button
                  type="button"
                  onClick={signOut}
                  disabled={loading}
                  className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  Logg ut
                </button>
              </>
            ) : (
              <>
                {sessionTokenPurpose && sessionTokenPurpose !== 'account' ? (
                  <>
                    <div className="hidden sm:block text-xs text-gray-600">{sessionEmail || 'Innlogget med lenke'}</div>
                    <button
                      type="button"
                      onClick={logoutMagicSession}
                      disabled={loading}
                      className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      Logg ut
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => openAuth('signin')}
                  className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 px-3 py-2 rounded-lg text-sm font-medium"
                >
                  Logg inn
                </button>
                {!(sessionTokenPurpose && sessionTokenPurpose !== 'account') ? (
                  <button
                    type="button"
                    onClick={() => openAuth('signup')}
                    className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium"
                  >
                    Opprett konto
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-4">
        {!authEmail && sessionTokenPurpose && sessionTokenPurpose !== 'account' && sessionEmail ? (
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
            <div className="text-sm font-bold text-gray-900">Opprett konto (valgfritt)</div>
            <div className="text-xs text-gray-600">
              Du er inne med engangslenke som {sessionEmail}. Hvis opplysningene stemmer kan du velge et passord og få enklere innlogging.
            </div>
            {prefillContact ? (
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 text-sm text-gray-900">
                <div className="font-semibold">{prefillContact.name || 'Ukjent navn'}</div>
                <div className="text-gray-700">{prefillContact.email || sessionEmail}</div>
                {prefillContact.phone ? <div className="text-gray-700">{prefillContact.phone}</div> : null}
                {prefillContact.address || prefillContact.postal_code || prefillContact.city ? (
                  <div className="text-gray-700">
                    {[prefillContact.address, prefillContact.postal_code, prefillContact.city].filter(Boolean).join(', ')}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={magicPassword}
                onChange={(e) => setMagicPassword(e.target.value)}
                type="password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Nytt passord (minst 8 tegn)"
              />
              <button
                type="button"
                disabled={loading || magicPassword.length < 8}
                onClick={setPasswordFromLink}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                Opprett konto
              </button>
            </div>
          </div>
        ) : null}
        {authModalOpen && (
          <div className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-bold text-gray-900">
                  {authMode === 'signup' ? 'Opprett grunneierkonto' : 'Logg inn'}
                </div>
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(false)}
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  Lukk
                </button>
              </div>

              {authMode === 'signup' && canCreateAccountHere && prefillContact ? (
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
                  <div className="text-xs font-bold text-gray-700 uppercase">Stemmer dette?</div>
                  <div className="text-sm text-gray-900">
                    <div className="font-semibold">{prefillContact.name || 'Ukjent navn'}</div>
                    <div className="text-gray-700">{prefillContact.email || authFormEmail}</div>
                    {prefillContact.phone ? <div className="text-gray-700">{prefillContact.phone}</div> : null}
                    {prefillContact.address || prefillContact.postal_code || prefillContact.city ? (
                      <div className="text-gray-700">
                        {[prefillContact.address, prefillContact.postal_code, prefillContact.city].filter(Boolean).join(', ')}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-xs text-gray-600">Alt er forhåndsutfylt. Velg bare passord og trykk Opprett konto.</div>
                </div>
              ) : (
                <>
                  {authMode === 'signup' ? (
                    <div className="grid gap-1">
                      <label className="text-xs font-bold text-gray-700 uppercase">Navn</label>
                      <input
                        value={authFormName}
                        onChange={(e) => setAuthFormName(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="F.eks. Ola Nordmann"
                      />
                    </div>
                  ) : null}

                  <div className="grid gap-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">E-post</label>
                    <input
                      value={authFormEmail}
                      onChange={(e) => setAuthFormEmail(e.target.value)}
                      type="email"
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="navn@epost.no"
                    />
                  </div>
                </>
              )}

              <div className="grid gap-1">
                <label className="text-xs font-bold text-gray-700 uppercase">Passord</label>
                <input
                  value={authFormPassword}
                  onChange={(e) => setAuthFormPassword(e.target.value)}
                  type="password"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Minst 8 tegn"
                />
              </div>

              {authMode === 'signup' && !canCreateAccountHere ? (
                <div className="border border-amber-200 bg-amber-50 text-amber-900 rounded-lg p-3 text-xs">
                  For å opprette grunneierkonto uten e-postbekreftelse må du først åpne engangslenken du har fått på e-post.
                </div>
              ) : null}

              <button
                type="button"
                disabled={
                  loading ||
                  !authFormEmail.trim() ||
                  authFormPassword.length < 8 ||
                  (authMode === 'signup' && !canCreateAccountHere)
                }
                onClick={authMode === 'signup' ? signUp : signIn}
                className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {authMode === 'signup' ? 'Opprett konto' : 'Logg inn'}
              </button>

              <div className="text-xs text-gray-600">
                {authMode === 'signup' ? (
                  <button type="button" onClick={() => setAuthMode('signin')} className="underline">
                    Har du konto? Logg inn
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => setAuthMode('signup')} className="underline">
                      Ny her? Opprett konto
                    </button>
                    <button type="button" onClick={requestPasswordReset} disabled={loading || !authFormEmail.trim()} className="underline disabled:opacity-50">
                      Glemt passord
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {status && (
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-700 flex items-center justify-between gap-3">
            <span>{status}</span>
            {!hasSession && status.toLowerCase().includes('utløpt') && (
              <button
                onClick={() => (document.getElementById('grunneier-email') as HTMLInputElement | null)?.focus()}
                className="shrink-0 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium"
              >
                Send ny lenke
              </button>
            )}
          </div>
        )}

        {sessionLoading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-500">
            Laster...
          </div>
        ) : canShowPortal ? (
          <>
            {agreements.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 overflow-hidden">
                <div className="flex items-center justify-between gap-3 flex-wrap min-w-0">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">Min side</h2>
                    <p className="text-xs text-gray-500">
                      Her kan du se avtalen(e) dine og eventuelt signere eller foreslå tillegg.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAgreementCollapsed((v) => !v)}
                    className="shrink-0 bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 px-3 py-2 rounded-lg text-sm font-medium"
                  >
                    {isAgreementCollapsed ? 'Åpne' : 'Lukk'}
                  </button>
                  {displayAgreements.length > 1 && (
                    <div className="w-full sm:w-auto">
                      <select
                        value={currentAgreement?.id || ''}
                        onChange={(e) => setActiveAgreementId(e.target.value)}
                        className="w-full sm:w-auto max-w-full border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white"
                      >
                        {displayAgreements.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.apiary?.apiary_number || 'Bigård'} {a.apiary?.name ? `– ${a.apiary?.name}` : ''} (
                            {apiaryStatusById.get(String(a.apiary?.id || '')) || 'ukjent'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {!isAgreementCollapsed && currentAgreement && (
                  <>
                    {currentAgreement.status === 'rejected' ? (
                      <button
                        type="button"
                        disabled={recreatingAgreement}
                        onClick={recreateOriginalAgreement}
                        className="w-full border border-red-200 bg-red-50 text-red-800 rounded-lg p-3 text-sm text-left disabled:opacity-50"
                      >
                        Avtalen er avvist. Trykk her for å opprette en ny standardavtale.
                      </button>
                    ) : currentAgreement.status === 'terminated' ? (
                      <div className="border border-red-200 bg-red-50 text-red-900 rounded-lg p-3 text-sm">
                        Avtalen er avsluttet. Du har ikke tilgang til denne bigården.
                      </div>
                    ) : currentAgreement.status === 'contact_proposed' ||
                      (currentAgreement.contact_proposal && currentAgreement.beekeeper_decision === 'pending') ? (
                      <div className="border border-yellow-200 bg-yellow-50 text-yellow-900 rounded-lg p-3 text-sm">
                        Forslaget ditt er sendt og venter på godkjenning fra birøkter.
                      </div>
                    ) : (
                      <>
                        {currentAgreement.status === 'active' && (
                          <div className="border border-green-200 bg-green-50 text-green-900 rounded-lg p-3 text-sm">
                            Avtalen er aktiv. Begge parter har signert.
                          </div>
                        )}
                        {currentAgreement.status !== 'active' &&
                          currentAgreement.contact_signed_at &&
                          currentAgreement.beekeeper_signed_at && (
                            <div className="border border-yellow-200 bg-yellow-50 text-yellow-900 rounded-lg p-3 text-sm">
                              Begge parter har signert. Venter på at birøkter aktiverer avtalen.
                            </div>
                          )}
                        {currentAgreement.beekeeper_decision === 'rejected' && currentAgreement.contact_proposal && (
                          <div className="border border-gray-200 bg-gray-50 text-gray-800 rounded-lg p-3 text-sm">
                            Tilleggsforslaget ditt er avvist. Standard avtale gjelder, og du kan signere under.
                          </div>
                        )}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs whitespace-pre-line font-mono max-h-[280px] overflow-auto">
                          {currentAgreement.final_text || currentAgreement.base_text}
                        </div>

                        {currentAgreement.status !== 'active' && (
                          <>
                            <div className="grid gap-2">
                              <label className="text-xs font-bold text-gray-700 uppercase">
                                Unntak/tillegg (valgfritt)
                              </label>
                              <textarea
                                value={proposal}
                                onChange={(e) => setProposal(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[90px]"
                                placeholder="Skriv inn forslag til endringer/tillegg..."
                              />
                              <button
                                disabled={loading || !proposal.trim()}
                                onClick={submitProposal}
                                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                              >
                                Send forslag
                              </button>
                            </div>

                            <div className="grid gap-2">
                              <label className="text-xs font-bold text-gray-700 uppercase">Signatur</label>
                              <input
                                value={signatureName}
                                onChange={(e) => setSignatureName(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                placeholder="Skriv navnet ditt"
                              />
                              <button
                                disabled={loading || !signatureName.trim()}
                                onClick={signAgreement}
                                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                              >
                                Signer avtale
                              </button>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {hasSession ? (
              <>
                <div className="bg-white border border-gray-200 rounded-xl p-3">
                  <div className="h-[420px] w-full rounded-xl overflow-hidden">
                    <Map center={mapCenter} zoom={11} markers={markers} />
                  </div>
                </div>

                {selectedLink && (
                  <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
                    <div className="text-sm font-bold text-gray-900">Spesielle vilkår for denne bigården</div>
                    <div className="text-xs text-gray-500">
                      {selectedLink.apiary.apiary_number || 'Bigård'}
                      {selectedLink.apiary.name ? ` – ${selectedLink.apiary.name}` : ''}
                    </div>
                    <textarea
                      value={specialTerms}
                      onChange={(e) => setSpecialTerms(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[150px] resize-y"
                      placeholder="Skriv inn eventuelle spesielle vilkår/tillegg/endringer for denne bigården..."
                    />
                    <div className="flex items-center justify-end">
                      <button
                        disabled={savingSpecialTerms || specialTerms.trim() === specialTermsOriginal.trim()}
                        onClick={saveSpecialTerms}
                        className="inline-flex items-center justify-center bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                      >
                        Lagre vilkår
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-600" />
                    Bigårder
                  </h2>
                  <div className="grid gap-2">
                    {linkedApiaries.map((item) => (
                      <button
                        type="button"
                        key={`${item.apiary.id}:${item.contact.id}`}
                        onClick={() => setSelectedApiaryId(item.apiary.id)}
                        className={`border border-gray-200 rounded-lg p-3 text-left hover:bg-gray-50 ${
                          selectedApiaryId === item.apiary.id ? 'ring-2 ring-gray-900' : ''
                        }`}
                      >
                        <div className="font-semibold text-gray-900">
                          {item.apiary.apiary_number || 'Bigård'}{' '}
                          {item.apiary.name ? `– ${item.apiary.name}` : ''}
                        </div>
                        <div className="text-xs text-gray-600">
                          {item.apiary.location || 'Ukjent sted'} • Rolle: {item.role}
                          {item.apiary.status ? ` • Status: ${item.apiary.status}` : ''}
                        </div>
                        {(toNumber(item.apiary.latitude) == null || toNumber(item.apiary.longitude) == null) && (
                          <div className="text-xs text-red-600 mt-1">Mangler posisjon (lat/lon)</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-700">
                Ingen aktive bigårder ennå. Tilgang aktiveres når avtalen er signert av begge parter.
              </div>
            )}
          </>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-600" />
              Få tilsendt lenke
            </h2>
            <form onSubmit={requestLink} className="flex flex-col sm:flex-row gap-2">
              <input
                id="grunneier-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Skriv inn e-post"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              />
              <button
                disabled={loading}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Send lenke
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-2">
              Du får en engangslenke på e-post (ingen passord).
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
