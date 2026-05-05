'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Archive, Truck, Trash2, X, Check, ClipboardList, Edit, QrCode, Calendar, UserPlus, FileText, ExternalLink, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Warehouse, Store, MapPin } from 'lucide-react';
import QRCode from 'qrcode';
import { generateHiveLabelsPDF } from '@/utils/hive-labels-pdf';

export default function ApiaryDetailsPage({ params }: { params: { id: string } }) {
  const selectedContactStorageKey = `lek_apiary_selected_contact_${params.id}`;
  const [apiary, setApiary] = useState<any>(null);
  const [hives, setHives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rental, setRental] = useState<any>(null);
  const [inspections, setInspections] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [accountContextLabel, setAccountContextLabel] = useState<string>('');
  const [memberNumber, setMemberNumber] = useState<string>('');
  
  // Selection State
  const [selectedHiveIds, setSelectedHiveIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Modals
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [targetApiaryId, setTargetApiaryId] = useState('');
  const [availableApiaries, setAvailableApiaries] = useState<any[]>([]);
  const [isMoving, setIsMoving] = useState(false);

  const [apiaryContacts, setApiaryContacts] = useState<any[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      return window.localStorage.getItem(selectedContactStorageKey) || '';
    } catch {
      return '';
    }
  });
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteTab, setInviteTab] = useState<'existing' | 'new'>('existing');
  const [contactsList, setContactsList] = useState<any[]>([]);
  const [inviteRole, setInviteRole] = useState<'grunneier' | 'kontaktperson' | 'samarbeidspartner'>('grunneier');
  const [existingContactId, setExistingContactId] = useState('');
  const [newContact, setNewContact] = useState({
    name: '',
    address: '',
    postal_code: '',
    city: '',
    phone: '',
    email: '',
  });
  const [isInviting, setIsInviting] = useState(false);

  const [selectedAgreement, setSelectedAgreement] = useState<any>(null);
  const [agreementLoading, setAgreementLoading] = useState(false);
  const [agreementStatus, setAgreementStatus] = useState<string | null>(null);
  const [beekeeperSignatureName, setBeekeeperSignatureName] = useState('');
  const [isAgreementUpdating, setIsAgreementUpdating] = useState(false);
  const [isAgreementCollapsed, setIsAgreementCollapsed] = useState(true);
  const [isCounterProposalOpen, setIsCounterProposalOpen] = useState(false);
  const [counterProposalText, setCounterProposalText] = useState('');
  const [specialTerms, setSpecialTerms] = useState('');
  const [specialTermsOriginal, setSpecialTermsOriginal] = useState('');
  const [isSavingSpecialTerms, setIsSavingSpecialTerms] = useState(false);

  // Scan Modal State
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scannedHives, setScannedHives] = useState<{ number: string, status: 'selected' | 'error', msg: string }[]>([]);
  const [isProcessingScan, setIsProcessingScan] = useState(false);

  // RSVP State
  const [rsvpInspectionId, setRsvpInspectionId] = useState<string | null>(null);
  const [rsvpCount, setRsvpCount] = useState(1);
  const [rsvpSizes, setRsvpSizes] = useState('');

  // Print State
  const [printLayout, setPrintLayout] = useState<'cards' | 'list' | 'qr' | null>(null);
  const [printData, setPrintData] = useState<{ [key: string]: { inspections: any[], logs: any[], qrDataUrl?: string } }>({});
  const [loadingPrintData, setLoadingPrintData] = useState(false);
  
  // Print Options Modal
  const [isPrintOptionsOpen, setIsPrintOptionsOpen] = useState(false);
  const [printOptions, setPrintOptions] = useState({
      includeHistory: true,
      includeLogs: true,
      includeImages: true,
      includeNotes: true,
      inspectionLimit: 'last5',
      dateRange: { start: '', end: '' }
  });

  // Mass Action State
  const [isMassActionModalOpen, setIsMassActionModalOpen] = useState(false);
  const [massActionType, setMassActionType] = useState<'inspeksjon' | 'logg' | null>(null);
  const [isSubmittingMassAction, setIsSubmittingMassAction] = useState(false);
  
  // Mass Inspection Form
  const [massInspectionData, setMassInspectionData] = useState({
    queen_seen: false,
    queen_color: '',
    queen_year: '',
    eggs_seen: false,
    honey_stores: 'middels',
    temperament: 'rolig',
    notes: '',
    actions: [] as string[],
    other_action: ''
  });

  // Mass Log Form
  const [massLogData, setMassLogData] = useState({
    action: 'BEHANDLING',
    details: ''
  });

  const [latestCertification, setLatestCertification] = useState<any>(null);
  const [isCertificationModalOpen, setIsCertificationModalOpen] = useState(false);
  const [isSubmittingCertification, setIsSubmittingCertification] = useState(false);
  const [certChecklist, setCertChecklist] = useState({
    noDisease: false,
    normalBrood: false,
    queenOk: false,
    normalActivity: false,
    equipmentOk: false,
    physicalCheck: false,
  });
  const [certHiveFiles, setCertHiveFiles] = useState<Record<string, File | null>>({});

  const supabase = createClient();
  const router = useRouter();

  const formatApiaryNumber = (raw: any, type?: any) => {
    const s = String(raw || '');
    const t = String(type || '').toLowerCase();
    if (t === 'bil' || s.toUpperCase().startsWith('BIL-')) return s.split('.')[0];
    return s;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (selectedContactId) window.localStorage.setItem(selectedContactStorageKey, selectedContactId);
      else window.localStorage.removeItem(selectedContactStorageKey);
    } catch {}
  }, [selectedContactId, selectedContactStorageKey]);

  useEffect(() => {
    fetchData();
  }, [params.id]);

  useEffect(() => {
    if (isMoveModalOpen) {
      fetchAvailableApiaries();
    }
  }, [isMoveModalOpen]);

  useEffect(() => {
    if (isInviteModalOpen) {
      fetchContactsList();
      setInviteTab('existing');
      setInviteRole('grunneier');
      setExistingContactId(selectedContactId || '');
      setNewContact({
        name: '',
        address: '',
        postal_code: '',
        city: '',
        phone: '',
        email: '',
      });
    }
  }, [isInviteModalOpen]);

  useEffect(() => {
    setIsAgreementCollapsed(true);
    const ac = apiaryContacts.find((x: any) => x.contact_id === selectedContactId);
    const next = String(ac?.special_terms || '');
    setSpecialTerms(next);
    setSpecialTermsOriginal(next);
  }, [selectedContactId, apiaryContacts]);

  const saveSpecialTerms = async () => {
    if (!apiary?.id || !selectedContactId) return;
    setIsSavingSpecialTerms(true);
    try {
      const { error } = await supabase
        .from('apiary_contacts')
        .update({ special_terms: specialTerms })
        .eq('apiary_id', apiary.id)
        .eq('contact_id', selectedContactId);
      if (error) {
        alert(error.message);
        return;
      }
      setSpecialTermsOriginal(specialTerms);
      await fetchApiaryContacts();
      alert('Spesielle vilkår lagret.');
    } finally {
      setIsSavingSpecialTerms(false);
    }
  };

  const fetchData = async () => {
    if (!navigator.onLine) {
      try {
        const offlineRaw = localStorage.getItem('offline_data');
        if (offlineRaw) {
          const parsed = JSON.parse(offlineRaw);
          const offlineApiary = parsed.apiaries?.find((a: any) => a.id === params.id);
          const offlineHives = (offlineApiary?.hives && Array.isArray(offlineApiary.hives))
            ? offlineApiary.hives
            : (parsed.hives || []).filter((h: any) => h.apiary_id === params.id);

          if (offlineApiary) {
            setApiary(offlineApiary);
          }
          if (offlineHives) {
            setHives(offlineHives);
          }
        }
      } catch {}
      setLoading(false);
      return;
    }

    // 0. Fetch User
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    let brId: string | null = null;

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('member_number')
        .eq('id', user.id)
        .single();

      if (profile?.member_number) {
        setMemberNumber(profile.member_number);
      }

      const { data: lekBeekeeper } = await supabase
        .from('lek_core_beekeepers')
        .select('beekeeper_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (lekBeekeeper?.beekeeper_id) {
        brId = String(lekBeekeeper.beekeeper_id);
      }
    }

    // 1. Fetch Apiary
    const { data: apiaryData, error: apiaryError } = await supabase
      .from('apiaries')
      .select('*')
      .eq('id', params.id)
      .single();

    if (apiaryError) {
      console.error('Error fetching apiary:', apiaryError);
      router.push('/dashboard');
      return;
    }

    let coreApiaryNumber: string | null = null;

    if (apiaryData.core_apiary_id) {
      const { data: coreApiary } = await supabase
        .from('lek_core_apiaries')
        .select('apiary_id, sequence_no')
        .eq('apiary_id', apiaryData.core_apiary_id)
        .maybeSingle();

      if (coreApiary?.sequence_no != null) {
        const seq = Number(coreApiary.sequence_no);
        if (!Number.isNaN(seq) && seq > 0) {
          coreApiaryNumber = `BG-${seq.toString().padStart(3, '0')}`;
        }
      }
    }

    setApiary({
      ...apiaryData,
      br_id: brId,
      core_apiary_number: coreApiaryNumber,
    });

    try {
      const res = await fetch('/api/access/list', { method: 'GET' });
      const data = await res.json().catch(() => ({}));
      const incoming = Array.isArray(data?.incoming) ? data.incoming : [];
      const owners = new Map<string, string>();
      if (user?.id) owners.set(String(user.id), 'Min konto');
      for (const row of incoming) {
        const ownerId = String(row?.owner_id || '').trim();
        if (!ownerId) continue;
        const name = row?.ownerProfile?.full_name ? String(row.ownerProfile.full_name) : ownerId.slice(0, 8);
        owners.set(ownerId, name);
      }
      const ownerId = String(apiaryData?.user_id || '').trim();
      if (ownerId) {
        setAccountContextLabel(owners.get(ownerId) || ownerId.slice(0, 8));
      } else {
        setAccountContextLabel('');
      }
    } catch {
      setAccountContextLabel('');
    }

    // 1.1 Fetch Rental Info (if rental type)
    if (apiaryData.type === 'rental') {
        const { data: rentalData } = await supabase
            .from('rentals')
            .select('*')
            .eq('apiary_id', params.id)
            .maybeSingle();
        if (rentalData) setRental(rentalData);

        // 1.2 Fetch Inspections
        const { data: inspectionsData } = await supabase
            .from('inspections')
            .select('*, beekeeper:profiles(full_name)')
            .eq('apiary_id', params.id)
            .order('planned_date', { ascending: true });
        if (inspectionsData) setInspections(inspectionsData);
    }

    // 2. Fetch Hives
    const { data: hivesData } = await supabase
      .from('hives')
      .select('*')
      .eq('apiary_id', params.id)
      .eq('active', true)
      .order('hive_number', { ascending: true });
    
    let finalHives = hivesData || [];

    if (finalHives.length > 0) {
      const coreIds = finalHives
        .map((h: any) => h.core_hive_id)
        .filter((id: any) => !!id);

      if (coreIds.length > 0) {
        const { data: coreHives } = await supabase
          .from('lek_core_hives')
          .select('hive_id, sequence_no')
          .in('hive_id', coreIds);

        const coreMap = new Map<string, number>();
        (coreHives || []).forEach((ch: any) => {
          if (ch?.hive_id && ch.sequence_no != null) {
            coreMap.set(ch.hive_id, Number(ch.sequence_no));
          }
        });

        finalHives = finalHives.map((h: any) => ({
          ...h,
          core_sequence_no: h.core_hive_id ? coreMap.get(h.core_hive_id) ?? null : null,
        }));
      }
    }

    if (finalHives) setHives(finalHives);
    const { data: certData } = await supabase
      .from('apiary_certifications')
      .select('*')
      .eq('apiary_id', params.id)
      .order('certified_from', { ascending: false })
      .limit(1)
      .maybeSingle();
    setLatestCertification(certData || null);
    await fetchApiaryContacts();
    setLoading(false);
  };

  const fetchApiaryContacts = async () => {
    const { data: links, error: linksError } = await supabase
      .from('apiary_contacts')
      .select('contact_id, role, special_terms')
      .eq('apiary_id', params.id);

    if (linksError || !links || links.length === 0) {
      setApiaryContacts([]);
      setSelectedContactId('');
      try {
        if (typeof window !== 'undefined') window.localStorage.removeItem(selectedContactStorageKey);
      } catch {}
      return;
    }

    const contactIds = Array.from(new Set(links.map((l: any) => l.contact_id)));
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, name, email')
      .in('id', contactIds);

    const contactMap = new Map((contacts || []).map((c: any) => [c.id, c]));
    const combined = links
      .map((l: any) => ({
        contact_id: l.contact_id,
        role: l.role,
        special_terms: l.special_terms ?? null,
        contact: contactMap.get(l.contact_id) || null,
      }))
      .filter((x: any) => !!x.contact);

    setApiaryContacts(combined);
    const exists = (id: string) => combined.some((x: any) => String(x.contact_id) === String(id));
    let nextSelected = selectedContactId;
    if (nextSelected && !exists(nextSelected)) nextSelected = '';
    if (!nextSelected && combined.length > 0) {
      let stored = '';
      try {
        stored = typeof window !== 'undefined' ? window.localStorage.getItem(selectedContactStorageKey) || '' : '';
      } catch {}
      nextSelected = stored && exists(stored) ? stored : combined[0].contact_id;
    }
    if (nextSelected && nextSelected !== selectedContactId) setSelectedContactId(nextSelected);
  };

  const fetchAvailableApiaries = async () => {
    const { data } = await supabase
      .from('apiaries')
      .select('id, name, type, apiary_number')
      .neq('id', params.id)
      .order('name');
    
    if (data) setAvailableApiaries(data);
  };

  const fetchContactsList = async () => {
    const { data } = await supabase
      .from('contacts')
      .select('id, name, email, is_active')
      .neq('is_active', false)
      .order('name');
    setContactsList(data || []);
  };

  const fetchSelectedAgreement = async (contactId: string) => {
    if (!apiary?.id || !contactId) {
      setSelectedAgreement(null);
      return;
    }

    setAgreementLoading(true);
    try {
      const { data } = await supabase
        .from('grunneier_agreements')
        .select(
          'id, status, role, base_text, final_text, contact_proposal, beekeeper_decision, contact_signature_name, contact_signed_at, beekeeper_signature_name, beekeeper_signed_at, created_at, updated_at'
        )
        .eq('apiary_id', apiary.id)
        .eq('contact_id', contactId)
        .order('updated_at', { ascending: false })
        .limit(12);

      const list = Array.isArray(data) ? data : [];
      const toTime = (a: any) => new Date(a?.updated_at || a?.created_at || 0).getTime();
      const descByTime = (a: any, b: any) => {
        const ta = toTime(a);
        const tb = toTime(b);
        if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return tb - ta;
        return String(b?.id || '').localeCompare(String(a?.id || ''));
      };

      const actionableProposal = list
        .filter((a: any) => {
          const status = String(a?.status || '').toLowerCase();
          const hasProposal = Boolean(String(a?.contact_proposal || '').trim());
          const pending = String(a?.beekeeper_decision || '') === 'pending';
          if (!hasProposal || !pending) return false;
          if (status === 'rejected' || status === 'terminated') return false;
          return true;
        })
        .sort(descByTime)[0] || null;

      if (actionableProposal) {
        setSelectedAgreement(actionableProposal);
        return;
      }

      const needsBeekeeperSignature = list
        .filter((a: any) => {
          const status = String(a?.status || '').toLowerCase();
          if (status === 'rejected' || status === 'terminated') return false;
          return !a?.beekeeper_signed_at;
        })
        .sort(descByTime)[0] || null;

      if (needsBeekeeperSignature) {
        setSelectedAgreement(needsBeekeeperSignature);
        return;
      }

      const needsActivation = list
        .filter((a: any) => {
          const status = String(a?.status || '').toLowerCase();
          if (status === 'active' || status === 'rejected') return false;
          return Boolean(a?.contact_signed_at && a?.beekeeper_signed_at);
        })
        .sort(descByTime)[0] || null;

      if (needsActivation) {
        setSelectedAgreement(needsActivation);
        return;
      }

      const rank = (a: any) => {
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

      const picked =
        list.slice().sort((a: any, b: any) => {
          const ra = rank(a);
          const rb = rank(b);
          if (ra !== rb) return ra - rb;
          const ta = new Date(a?.updated_at || a?.created_at || 0).getTime();
          const tb = new Date(b?.updated_at || b?.created_at || 0).getTime();
          if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return tb - ta;
          return String(b?.id || '').localeCompare(String(a?.id || ''));
        })[0] || null;

      setSelectedAgreement(picked);
    } finally {
      setAgreementLoading(false);
    }
  };

  const getRoleLabel = (r: string) => {
    if (r === 'kontaktperson') return 'Kontaktperson';
    if (r === 'samarbeidspartner') return 'Samarbeidspartner';
    return 'Grunneier';
  };

  useEffect(() => {
    if (!selectedContactId) {
      setSelectedAgreement(null);
      return;
    }
    fetchSelectedAgreement(selectedContactId);
  }, [selectedContactId, apiary?.id]);

  const acceptContactProposal = async () => {
    if (!selectedAgreement?.id) return;
    if (!selectedAgreement.contact_proposal) return;
    setIsAgreementUpdating(true);
    setAgreementStatus(null);
    try {
      setIsCounterProposalOpen(false);
      const baseText = String(selectedAgreement.base_text || '');
      const proposal = String(selectedAgreement.contact_proposal || '').trim();
      const finalText = [
        baseText,
        '',
        '---',
        'UNNTAK/TILLEGG (foreslått av grunneier):',
        proposal,
      ].join('\n');

      const { error } = await supabase
        .from('grunneier_agreements')
        .update({
          beekeeper_decision: 'accepted',
          final_text: finalText,
          status: 'awaiting_contact_signature',
          contact_signature_name: null,
          contact_signed_at: null,
          beekeeper_signature_name: null,
          beekeeper_signed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedAgreement.id);

      if (error) {
        setAgreementStatus(error.message);
        return;
      }

      setAgreementStatus('Forslag godtatt. Venter på signatur fra grunneier.');
      await fetchSelectedAgreement(selectedContactId);
    } finally {
      setIsAgreementUpdating(false);
    }
  };

  const rejectContactProposal = async () => {
    if (!selectedAgreement?.id) return;
    if (!selectedAgreement.contact_proposal) return;
    setIsAgreementUpdating(true);
    setAgreementStatus(null);
    try {
      const { error } = await supabase
        .from('grunneier_agreements')
        .update({
          beekeeper_decision: 'rejected',
          final_text: null,
          status: 'awaiting_contact_signature',
          contact_signature_name: null,
          contact_signed_at: null,
          beekeeper_signature_name: null,
          beekeeper_signed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedAgreement.id);

      if (error) {
        setAgreementStatus(error.message);
        return;
      }

      setAgreementStatus('Forslag avvist. Standard avtale gjelder.');
      await fetchSelectedAgreement(selectedContactId);

      const shouldSend = window.confirm('Vil du sende standardavtalen på nytt til grunneier nå?');
      if (shouldSend) {
        await requestPortalLink();
      }
    } finally {
      setIsAgreementUpdating(false);
    }
  };

  const submitCounterProposal = async () => {
    if (!selectedAgreement?.id) return;
    if (!selectedAgreement.contact_proposal) return;
    const text = counterProposalText.trim();
    if (!text) {
      setAgreementStatus('Skriv inn et motforslag før du sender.');
      return;
    }
    setIsAgreementUpdating(true);
    setAgreementStatus(null);
    try {
      const baseText = String(selectedAgreement.base_text || '');
      const originalProposal = String(selectedAgreement.contact_proposal || '').trim();

      const finalText = [
        baseText,
        '',
        '---',
        'UNNTAK/TILLEGG (foreslått av grunneier):',
        originalProposal,
        '',
        '---',
        'MOTFORSLAG (foreslått av birøkter):',
        text,
      ].join('\n');

      const { error } = await supabase
        .from('grunneier_agreements')
        .update({
          beekeeper_decision: 'accepted',
          final_text: finalText,
          status: 'awaiting_contact_signature',
          contact_signature_name: null,
          contact_signed_at: null,
          beekeeper_signature_name: null,
          beekeeper_signed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedAgreement.id);

      if (error) {
        setAgreementStatus(error.message);
        return;
      }

      setAgreementStatus('Motforslag sendt. Venter på signatur fra grunneier.');
      setIsCounterProposalOpen(false);
      setCounterProposalText('');
      await fetchSelectedAgreement(selectedContactId);
    } finally {
      setIsAgreementUpdating(false);
    }
  };

  const signAsBeekeeper = async () => {
    if (!selectedAgreement?.id) return;
    if (!beekeeperSignatureName.trim()) return;
    if (selectedAgreement.status === 'rejected') return;
    if (selectedAgreement.status === 'terminated') return;

    const hasPendingProposal =
      Boolean(selectedAgreement.contact_proposal) && selectedAgreement.beekeeper_decision === 'pending';
    if (hasPendingProposal) {
      setAgreementStatus('Du må først godta/avvise forslaget fra grunneier.');
      return;
    }

    setIsAgreementUpdating(true);
    setAgreementStatus(null);
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data?.session?.access_token || '';

      const res = await fetch('/api/grunneier/agreement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          action: 'beekeeper_sign',
          agreementId: selectedAgreement.id,
          signatureName: beekeeperSignatureName.trim(),
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAgreementStatus(payload?.error || 'Kunne ikke signere');
        return;
      }

      const nextStatus = String(payload?.status || '');
      setAgreementStatus(nextStatus === 'active' ? 'Avtalen er nå aktiv.' : 'Signert. Venter på grunneier.');
      await fetchSelectedAgreement(selectedContactId);
    } finally {
      setIsAgreementUpdating(false);
    }
  };

  const activateAgreement = async () => {
    if (!selectedAgreement?.id) return;
    const status = String(selectedAgreement.status || '').toLowerCase();
    if (status === 'active' || status === 'rejected') return;
    if (!selectedAgreement.contact_signed_at || !selectedAgreement.beekeeper_signed_at) {
      setAgreementStatus('Begge parter må ha signert før avtalen kan aktiveres.');
      return;
    }

    const ok = window.confirm('Aktivere avtalen? Grunneier får tilgang til denne bigården.');
    if (!ok) return;

    setIsAgreementUpdating(true);
    setAgreementStatus(null);
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data?.session?.access_token || '';

      const res = await fetch('/api/grunneier/agreement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          action: 'beekeeper_activate',
          agreementId: selectedAgreement.id,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAgreementStatus(payload?.error || 'Kunne ikke aktivere');
        return;
      }

      setAgreementStatus('Avtalen er nå aktiv.');
      await fetchSelectedAgreement(selectedContactId);
    } finally {
      setIsAgreementUpdating(false);
    }
  };

  const terminateAgreement = async () => {
    if (!selectedAgreement?.id) return;
    const status = String(selectedAgreement.status || '').toLowerCase();
    if (status === 'terminated' || status === 'rejected') return;

    const ok = window.confirm(
      'Avslutte avtalen? Grunneier mister tilgang til denne bigården.'
    );
    if (!ok) return;

    setIsAgreementUpdating(true);
    setAgreementStatus(null);
    try {
      const update = supabase
        .from('grunneier_agreements')
        .update({
          status: 'terminated',
          terminated_at: new Date().toISOString(),
          terminated_by: currentUser?.id || null,
          updated_at: new Date().toISOString(),
        });

      const { error } =
        apiary?.id && selectedContactId
          ? await update.eq('apiary_id', apiary.id).eq('contact_id', selectedContactId)
          : await update.eq('id', selectedAgreement.id);

      if (error) {
        setAgreementStatus(error.message);
        return;
      }

      setAgreementStatus('Avtalen er avsluttet. Grunneier har ikke lenger tilgang.');
      await fetchSelectedAgreement(selectedContactId);
    } finally {
      setIsAgreementUpdating(false);
    }
  };

  const handleContactSubmit = async (sendInvite: boolean) => {
    if (!apiary?.id) return;
    if (inviteTab === 'existing' && !existingContactId) return;
    if (inviteTab === 'new' && !newContact.name.trim()) return;

    setIsInviting(true);
    try {
      const payload: any =
        inviteTab === 'existing'
          ? {
              apiaryId: apiary.id,
              role: inviteRole,
              contactId: existingContactId,
              sendInvite,
            }
          : {
              apiaryId: apiary.id,
              role: inviteRole,
              contact: newContact,
              sendInvite,
            };

      const res = await fetch('/api/grunneier/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const inviteUrl = String(data?.inviteUrl || '');
        if (inviteUrl) {
          try {
            await navigator.clipboard.writeText(inviteUrl);
            alert(`${data?.error || 'Kunne ikke sende e-post'}\n\nLenke er kopiert:\n${inviteUrl}`);
          } catch {
            alert(`${data?.error || 'Kunne ikke sende e-post'}\n\nLenke:\n${inviteUrl}`);
          }
        } else {
          alert(data?.error || 'Kunne ikke lagre');
        }
        return;
      }
      const data = await res.json().catch(() => ({}));

      setIsInviteModalOpen(false);
      await fetchApiaryContacts();
      const nextContactId = String(data?.contact?.id || '');
      if (nextContactId) {
        setSelectedContactId(nextContactId);
        await fetchSelectedAgreement(nextContactId);
      }
      const inviteUrl = String(data?.inviteUrl || '');
      const mailProvider = String(data?.mailProvider || '');
      const agreementAlreadyActive = Boolean(data?.agreementAlreadyActive);
      if (agreementAlreadyActive) {
        alert('Kontakt er knyttet. Avtalen er allerede aktiv, så det trengs ingen ny signering for denne bigården.');
        return;
      }
      if (sendInvite && inviteUrl) {
        try {
          await navigator.clipboard.writeText(inviteUrl);
          const providerNote =
            mailProvider && mailProvider.toLowerCase().includes('mock')
              ? `\n\nNB: Staging sender ikke ekte e-post uten SMTP. Mail-provider: ${mailProvider}`
              : mailProvider
                ? `\n\nMail-provider: ${mailProvider}`
                : '';
          alert(`Avtale sendt til grunneier!\n\nLenke er kopiert:\n${inviteUrl}${providerNote}`);
        } catch {
          const providerNote =
            mailProvider && mailProvider.toLowerCase().includes('mock')
              ? `\n\nNB: Staging sender ikke ekte e-post uten SMTP. Mail-provider: ${mailProvider}`
              : mailProvider
                ? `\n\nMail-provider: ${mailProvider}`
                : '';
          alert(`Avtale sendt til grunneier!\n\nLenke:\n${inviteUrl}${providerNote}`);
        }
      } else {
        alert(sendInvite ? 'Avtale sendt til grunneier!' : 'Kontakt lagret!');
      }
    } finally {
      setIsInviting(false);
    }
  };

  const requestPortalLink = async () => {
    const ac = apiaryContacts.find((x: any) => x.contact_id === selectedContactId);
    const email = String(ac?.contact?.email || '').trim();
    if (!email) {
      alert('Kontakt mangler e-post');
      return;
    }

    try {
      const res = await fetch('/api/grunneier/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      const inviteUrl = String(data?.inviteUrl || '');
      const mailProvider = String(data?.mailProvider || '');
      if (!inviteUrl) {
        alert(data?.error || 'Kunne ikke hente lenke');
        return;
      }
      try {
        await navigator.clipboard.writeText(inviteUrl);
        alert(
          `${res.ok ? 'Lenke er kopiert:' : (data?.error || 'Kunne ikke sende e-post')}\n${inviteUrl}${
            mailProvider ? `\n\nMail-provider: ${mailProvider}` : ''
          }`
        );
      } catch {
        alert(
          `${res.ok ? 'Lenke:' : (data?.error || 'Kunne ikke sende e-post')}\n${inviteUrl}${
            mailProvider ? `\n\nMail-provider: ${mailProvider}` : ''
          }`
        );
      }
    } catch {
      alert('Kunne ikke hente lenke');
    }
  };

  // --- SELECTION LOGIC ---
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedHiveIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedHiveIds(newSet);
  };

  const selectAll = () => {
    if (selectedHiveIds.size === hives.length) {
      setSelectedHiveIds(new Set());
    } else {
      setSelectedHiveIds(new Set(hives.map(h => h.id)));
    }
  };

  // --- MOVE HIVES LOGIC ---
  const handleMoveSubmit = async () => {
    if (!targetApiaryId || selectedHiveIds.size === 0) return;
    setIsMoving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetApiary = availableApiaries.find(a => a.id === targetApiaryId);
      const idsToMove = Array.from(selectedHiveIds);

      // 1. Update hives
      const { error: updateError } = await supabase
        .from('hives')
        .update({ apiary_id: targetApiaryId })
        .in('id', idsToMove);

      if (updateError) throw updateError;

      // 2. Log movements
      const logs = idsToMove.map(id => ({
        hive_id: id,
        user_id: user?.id,
        action: 'FLYTTET',
        details: `Flyttet fra ${apiary.name} til ${targetApiary?.name} (Masseflytting)`
      }));

      const { error: logError } = await supabase
        .from('hive_logs')
        .insert(logs);

      if (logError) throw logError;

      await fetchData();
      setIsMoveModalOpen(false);
      setTargetApiaryId('');
      setSelectedHiveIds(new Set());
      setIsSelectionMode(false);
      alert(`${idsToMove.length} kuber ble flyttet!`);

    } catch (error: any) {
      alert('Feil ved flytting: ' + error.message);
    } finally {
      setIsMoving(false);
    }
  };

  // --- SCAN / MASS REGISTRATION LOGIC ---
  const handleScanSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanInput.trim() || isProcessingScan) return;

    setIsProcessingScan(true);
    const input = scanInput.trim();

    let hiveNumber = input;
    const suffix = memberNumber ? `.${memberNumber}` : '';

    if (/^\d+$/.test(input)) {
      hiveNumber = `KUBE-${input.padStart(3, '0')}${suffix}`;
    } else if (/^KUBE-\d+$/i.test(input)) {
      const numPart = input.split('-')[1];
      hiveNumber = `KUBE-${numPart.padStart(3, '0')}${suffix}`;
    }

    try {
      const { data: existingHive, error } = await supabase
        .from('hives')
        .select('id, hive_number, apiary_id')
        .or(`hive_number.eq.${hiveNumber},hive_number.eq.${input},id.eq.${input}`)
        .maybeSingle();

      if (error) throw error;

      if (!existingHive) {
        setScannedHives(prev => [
          { number: input, status: 'error', msg: 'Kube ikke funnet' },
          ...prev,
        ]);
        return;
      }

      if (existingHive.apiary_id && existingHive.apiary_id !== params.id) {
        try {
          const { data: sourceApiary } = await supabase
            .from('apiaries')
            .select('id, name, apiary_number')
            .eq('id', existingHive.apiary_id)
            .maybeSingle();

          const fromLabel = formatApiaryNumber(sourceApiary?.apiary_number) || sourceApiary?.name || 'annen bigård';
          const toLabel = formatApiaryNumber(apiary?.apiary_number, apiary?.type) || apiary?.name || 'denne bigården';

          const confirmMessage = `Kuben står registrert i ${fromLabel}. Er det riktig at du har flyttet denne bikuben til ${toLabel}?`;
          const confirmed = typeof window !== 'undefined' ? window.confirm(confirmMessage) : false;

          if (!confirmed) {
            setScannedHives(prev => [
              { number: existingHive.hive_number || input, status: 'error', msg: 'Flytting avbrutt' },
              ...prev,
            ]);
            return;
          }

          const { data: authData } = await supabase.auth.getUser();

          const { error: updateError } = await supabase
            .from('hives')
            .update({ apiary_id: params.id })
            .eq('id', existingHive.id);

          if (updateError) throw updateError;

          const { error: logError } = await supabase
            .from('hive_logs')
            .insert({
              hive_id: existingHive.id,
              user_id: authData?.user?.id,
              action: 'FLYTTET',
              details: `Flyttet fra ${fromLabel} til ${toLabel} (via skann)`,
            });

          if (logError) throw logError;

          await fetchData();

          setScannedHives(prev => [
            { number: existingHive.hive_number || input, status: 'selected', msg: 'Kube flyttet til denne bigården' },
            ...prev,
          ]);

          setSelectedHiveIds(prev => {
            const next = new Set(prev);
            next.add(existingHive.id);
            return next;
          });

          setScanInput('');
          return;
        } catch (moveError: any) {
          setScannedHives(prev => [
            { number: existingHive.hive_number || input, status: 'error', msg: 'Feil ved flytting: ' + moveError.message },
            ...prev,
          ]);
          return;
        }
      }

      setSelectedHiveIds(prev => {
        const next = new Set(prev);
        const alreadySelected = next.has(existingHive.id);

        if (!alreadySelected) {
          next.add(existingHive.id);
          setScannedHives(prevScans => [
            { number: existingHive.hive_number || input, status: 'selected', msg: 'Lagt til i valget' },
            ...prevScans,
          ]);
        } else {
          setScannedHives(prevScans => [
            { number: existingHive.hive_number || input, status: 'selected', msg: 'Allerede valgt' },
            ...prevScans,
          ]);
        }

        return next;
      });

      setScanInput('');
    } catch (err: any) {
      setScannedHives(prev => [
        { number: input, status: 'error', msg: 'Feil: ' + err.message },
        ...prev,
      ]);
    } finally {
      setIsProcessingScan(false);
      const inputEl = document.getElementById('scan-input');
      if (inputEl) inputEl.focus();
    }
  };

  const generateHiveLabelsPDFLocal = async (hivesToPrint: any[]) => {
    const apiaryName = apiary?.name || 'Ukjent Bigård';
    const hivesWithApiary = hivesToPrint.map((h: any) => {
      if (h?.apiaries?.name) return h;
      return { ...h, apiaries: { ...(h?.apiaries || {}), name: apiaryName } };
    });
    await generateHiveLabelsPDF(hivesWithApiary);
  };

  // --- PRINT LOGIC ---
  const handlePrint = async (layout: 'cards' | 'list' | 'qr', skipOptions = false) => {
    // If cards and options not skipped, open modal first
    if (layout === 'cards' && !skipOptions) {
        setIsPrintOptionsOpen(true);
        return;
    }

    setLoadingPrintData(true);
    
    // Determine which hives to print
    const hivesToPrint = hives
        .filter(h => selectedHiveIds.size === 0 || selectedHiveIds.has(h.id));

    if (layout === 'qr') {
        await generateHiveLabelsPDFLocal(hivesToPrint);
        setLoadingPrintData(false);
        return;
    }

    const hiveIds = hivesToPrint.map(h => h.id);
    let fetchedData: any = {};

    if (hiveIds.length > 0 && layout === 'cards') {
        const { data: inspections } = await supabase
            .from('inspections')
            .select('*')
            .in('hive_id', hiveIds)
            .order('inspection_date', { ascending: false });

        const { data: logs } = await supabase
            .from('hive_logs')
            .select('*')
            .in('hive_id', hiveIds)
            .order('created_at', { ascending: false });
        
        hiveIds.forEach(id => {
            fetchedData[id] = {
                inspections: inspections?.filter(i => i.hive_id === id) || [],
                logs: logs?.filter(l => l.hive_id === id) || []
            };
        });
    }

    // Generate QR codes for Cards or Labels
    if (layout === 'cards') {
        await Promise.all(hivesToPrint.map(async (h) => {
            try {
                const qrUrl = `${window.location.origin}/hives/${h.id}`;
                const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 0, width: 200 });
                if (!fetchedData[h.id]) fetchedData[h.id] = { inspections: [], logs: [] };
                fetchedData[h.id].qrDataUrl = qrDataUrl;
            } catch (e) { console.error(e); }
        }));
    }

    setPrintData(fetchedData);
    setLoadingPrintData(false);
    setPrintLayout(layout);

    setTimeout(() => {
        window.print();
    }, 500);
  };

  // --- MASS ACTION LOGIC ---
  const handleMassActionSubmit = async () => {
    if (selectedHiveIds.size === 0 || !massActionType) return;
    setIsSubmittingMassAction(true);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const ids = Array.from(selectedHiveIds);

        if (massActionType === 'inspeksjon') {
            const actionList = [
              ...(massInspectionData.actions || []),
              ...(massInspectionData.other_action?.trim() ? [`Annet: ${massInspectionData.other_action.trim()}`] : []),
            ];
            const inspections = ids.map(id => ({
                hive_id: id,
                user_id: user.id,
                inspection_date: new Date().toISOString().split('T')[0],
                queen_seen: massInspectionData.queen_seen,
                queen_color: massInspectionData.queen_color || null,
                queen_year: massInspectionData.queen_year ? parseInt(massInspectionData.queen_year, 10) : null,
                eggs_seen: massInspectionData.eggs_seen,
                honey_stores: massInspectionData.honey_stores,
                temperament: massInspectionData.temperament,
                notes: massInspectionData.notes,
                actions: actionList.length > 0 ? actionList : null
            }));

            const { error } = await supabase.from('inspections').insert(inspections);
            if (error) throw error;

            if (actionList.length > 0) {
              const logs = ids.map(id => ({
                hive_id: id,
                user_id: user.id,
                action: 'BEHANDLING',
                details: `Masseinspeksjon: ${actionList.join(', ')}${massInspectionData.notes ? `. ${massInspectionData.notes}` : ''}`
              }));
              const { error: logError } = await supabase.from('hive_logs').insert(logs);
              if (logError) throw logError;
            }
        } else {
            const logs = ids.map(id => ({
                hive_id: id,
                user_id: user.id,
                action: massLogData.action,
                details: massLogData.details
            }));

            const { error } = await supabase.from('hive_logs').insert(logs);
            if (error) throw error;
        }

        alert(`${massActionType === 'inspeksjon' ? 'Inspeksjoner' : 'Logger'} registrert på ${ids.length} kuber!`);
        setIsMassActionModalOpen(false);
        setMassActionType(null);
        setSelectedHiveIds(new Set());
        setIsSelectionMode(false);
        // Reset forms
        setMassInspectionData({
            queen_seen: false,
            queen_color: '',
            queen_year: '',
            eggs_seen: false,
            honey_stores: 'middels',
            temperament: 'rolig',
            notes: '',
            actions: [],
            other_action: ''
        });
        setMassLogData({
            action: 'BEHANDLING',
            details: ''
        });
        
        // Refresh data
        fetchData();

    } catch (error: any) {
        alert('Feil ved masseregistrering: ' + error.message);
    } finally {
        setIsSubmittingMassAction(false);
    }
  };

  // --- RENTAL MANAGEMENT LOGIC ---
  const handleUpdateDeliveryDate = async (date: string) => {
    if (!rental) return;
    
    const { error } = await supabase
        .from('rentals')
        .update({ estimated_delivery_date: date })
        .eq('id', rental.id);

    if (error) {
        alert('Kunne ikke oppdatere leveringsdato: ' + error.message);
    } else {
        fetchData();
    }
  };

  const handleCreateInspection = async (date: string) => {
    if (!date) return;
    
    const { error } = await supabase
        .from('inspections')
        .insert({
            apiary_id: params.id,
            rental_id: rental?.id,
            beekeeper_id: currentUser?.id,
            planned_date: date,
            status: 'planned'
        });

    if (error) {
        alert('Kunne ikke opprette inspeksjon: ' + error.message);
    } else {
        fetchData();
    }
  };

  const handleRSVP = async (inspectionId: string, status: string, count: number = 0, sizes: string[] = []) => {
    const { error } = await supabase
        .from('inspections')
        .update({
            tenant_rsvp_status: status,
            attendees_count: count,
            suit_sizes: sizes
        })
        .eq('id', inspectionId);

    if (error) {
        alert('Kunne ikke oppdatere RSVP: ' + error.message);
    } else {
        fetchData();
    }
  };

  // --- DELETE APIARY LOGIC ---
  const handleDeleteApiary = async () => {
    if (hives.length > 0) {
      alert('Du kan ikke slette en bigård som inneholder bikuber. Vennligst flytt bikubene først.');
      if (confirm('Vil du åpne flytte-menyen for å flytte alle kuber nå?')) {
        setSelectedHiveIds(new Set(hives.map(h => h.id)));
        setIsSelectionMode(true);
        setIsMoveModalOpen(true);
      }
      return;
    }

    if (!confirm('Er du sikker på at du vil slette denne lokasjonen?')) return;

    const { error } = await supabase
      .from('apiaries')
      .delete()
      .eq('id', params.id);

    if (error) {
      alert('Kunne ikke slette: ' + error.message);
    } else {
      router.push('/dashboard');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'lager': return Warehouse;
      case 'butikk': return Store;
      case 'bil': return Truck;
      default: return MapPin;
    }
  };

  const getStatusColor = (hive: any) => {
    if (hive.active === false) return 'bg-gray-100 text-gray-500 border-gray-200';
    switch (hive.status) {
      case 'DØD': return 'bg-red-100 text-red-800 border-red-200';
      case 'SVAK': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'AKTIV': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getStatusText = (hive: any) => {
    if (hive.active === false) return 'INAKTIV';
    return hive.status || 'AKTIV';
  };

  if (loading) return <div className="p-8 text-center">Laster...</div>;
  if (!apiary) return <div className="p-8 text-center">Fant ikke bigård</div>;

  const mattilsynetUrl = 'https://www.mattilsynet.no/skjemaer/registrere-eller-oppdatere-birokt-registreringsskjema-nn';
  const todayIso = new Date().toISOString().split('T')[0];
  const plusTwoYearsIso = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d.toISOString().split('T')[0];
  })();

  const certificationTo = latestCertification?.certified_to ? new Date(latestCertification.certified_to) : null;
  const certificationFrom = latestCertification?.certified_from ? new Date(latestCertification.certified_from) : null;
  const isCertificationActive = certificationTo ? certificationTo.getTime() >= new Date().setHours(0, 0, 0, 0) : false;
  const daysToExpiry = certificationTo
    ? Math.ceil((certificationTo.getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))
    : null;
  const reminderDays =
    daysToExpiry != null && daysToExpiry >= 0 && daysToExpiry <= 30
      ? (daysToExpiry <= 7 ? 7 : daysToExpiry <= 14 ? 14 : 30)
      : null;

  const openCertificationModal = () => {
    setCertChecklist({
      noDisease: false,
      normalBrood: false,
      queenOk: false,
      normalActivity: false,
      equipmentOk: false,
      physicalCheck: false,
    });
    const nextFiles: Record<string, File | null> = {};
    (hives || []).forEach((h: any) => {
      if (h?.id) nextFiles[h.id] = null;
    });
    setCertHiveFiles(nextFiles);
    setIsCertificationModalOpen(true);
  };

  const canCompleteCertification =
    Object.values(certChecklist).every(Boolean) &&
    (hives || []).length > 0 &&
    (hives || []).every((h: any) => !!certHiveFiles[h.id]);

  const submitCertification = async () => {
    if (!canCompleteCertification) return;
    setIsSubmittingCertification(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const certId = crypto.randomUUID();
      const ownerId = apiary?.user_id || user.id;
      const hivePhotos: Record<string, string> = {};

      for (const h of (hives || [])) {
        const file = certHiveFiles[h.id];
        if (!file) throw new Error('Mangler bilde for en eller flere kuber.');
        const ext = String(file.name || '').split('.').pop() || 'jpg';
        const path = `certifications/${apiary.id}/${certId}/${h.id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('inspection-images')
          .upload(path, file, { upsert: true });
        if (uploadError) {
          const msg = String(uploadError.message || '').toLowerCase();
          if (msg.includes('bucket') && msg.includes('not found')) {
            throw new Error('Bilde-lagring er ikke satt opp (bucket mangler).');
          }
          throw uploadError;
        }
        const { data } = supabase.storage.from('inspection-images').getPublicUrl(path);
        hivePhotos[h.id] = data.publicUrl;
      }

      const checklistPayload = {
        no_disease: certChecklist.noDisease,
        normal_brood: certChecklist.normalBrood,
        queen_ok: certChecklist.queenOk,
        normal_activity: certChecklist.normalActivity,
        equipment_ok: certChecklist.equipmentOk,
        physical_check: certChecklist.physicalCheck,
      };

      const { data: inserted, error } = await supabase
        .from('apiary_certifications')
        .insert({
          id: certId,
          apiary_id: apiary.id,
          owner_id: ownerId,
          certified_from: todayIso,
          certified_to: plusTwoYearsIso,
          checklist: checklistPayload,
          hive_photos: hivePhotos,
        })
        .select('*')
        .single();

      if (error) throw error;
      setLatestCertification(inserted);
      setIsCertificationModalOpen(false);
      alert(`Egensertifisering fullført. Sertifisert til ${new Date(inserted.certified_to).toLocaleDateString()}.`);
    } catch (e: any) {
      const raw = String(e?.message || 'Ukjent feil');
      const msg = raw.toLowerCase();
      if (msg.includes('apiary_certifications') && msg.includes('schema cache')) {
        alert(
          'Kunne ikke fullføre sertifisering: Databasen mangler tabellen apiary_certifications. Kjør migrasjon 85_apiary_certification_and_inspection_extras.sql i Supabase (staging), og prøv igjen.'
        );
      } else if (msg.includes('apiary_certifications') && msg.includes('does not exist')) {
        alert(
          'Kunne ikke fullføre sertifisering: Databasen mangler tabellen apiary_certifications. Kjør migrasjon 85_apiary_certification_and_inspection_extras.sql i Supabase (staging), og prøv igjen.'
        );
      } else {
        alert('Kunne ikke fullføre sertifisering: ' + raw);
      }
    } finally {
      setIsSubmittingCertification(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 print:bg-white print:pb-0">
      {/* Loading Overlay */}
      {loadingPrintData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
            <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-honey-500 mb-4"></div>
                <p className="font-bold text-lg">Klargjør utskrift...</p>
                <p className="text-sm text-gray-500">Dette kan ta noen sekunder</p>
            </div>
        </div>
      )}

      {/* Page Title & Actions */}
      <div className={`bg-white border-b border-gray-200 px-4 py-4 ${printLayout === 'list' ? '' : 'print:hidden'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <Link href="/apiaries" className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-gray-900 font-mono tracking-tight">
                {formatApiaryNumber(apiary.apiary_number, apiary.type)}
              </h1>
              {apiary.name && (
                <p className="text-sm text-gray-600">
                  {apiary.name}
                </p>
              )}
              {accountContextLabel && (
                <p className="text-[11px] text-gray-500 font-mono mt-1">
                  Konto: {accountContextLabel}
                </p>
              )}
              {apiary.core_apiary_number && (
                <p className="text-[11px] text-gray-500 font-mono mt-1">
                  Core: {apiary.core_apiary_number}
                </p>
              )}
              {apiary.br_id && (
                <p className="text-[11px] text-gray-500 font-mono">
                  Birøkter: {apiary.br_id}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <select
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
                className="w-full sm:w-auto max-w-[240px] border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white"
              >
                <option value="">Kontakter</option>
                {apiaryContacts.map((ac: any) => (
                  <option key={ac.contact_id} value={ac.contact_id}>
                    {ac.contact?.name || 'Ukjent'} {ac.role ? `(${getRoleLabel(ac.role)})` : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-honey-500 hover:bg-honey-600 text-white rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4" />
                <span>Legg til kontakt</span>
              </button>
            </div>
            <Link
              href={`/apiaries/${params.id}/edit`}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
              title="Rediger lokasjon"
            >
              <Edit className="w-4 h-4" />
              <span>Rediger</span>
            </Link>
            <button 
              onClick={handleDeleteApiary}
              className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors"
              title="Slett lokasjon"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <main className="p-4 space-y-4 print:hidden">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3 bg-gray-50">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-gray-600" />
              <h2 className="font-bold text-gray-900">Egensertifisering</h2>
            </div>
            <button
              onClick={openCertificationModal}
              disabled={(hives || []).length === 0}
              className="px-3 py-2 rounded-lg bg-honey-500 hover:bg-honey-600 text-white font-bold text-sm disabled:opacity-50"
            >
              Ny sertifisering
            </button>
          </div>
          <div className="p-4 space-y-3">
            {latestCertification ? (
              <div className="text-sm text-gray-800">
                <div className="font-bold">
                  {isCertificationActive ? 'Sertifisert' : 'Utløpt'}
                  {certificationTo ? ` til ${certificationTo.toLocaleDateString()}` : ''}
                </div>
                <div className="text-xs text-gray-600">
                  {certificationFrom ? `Sertifisert fra ${certificationFrom.toLocaleDateString()}. ` : ''}
                  {daysToExpiry != null ? `Gjenstår ${daysToExpiry} dager.` : ''}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-700">
                Ingen egensertifisering registrert på denne bigården enda.
              </div>
            )}

            {reminderDays != null && (
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-bold text-sm">
                      {reminderDays} dager før utløp
                    </div>
                    <div className="text-xs mt-1">
                      Husk å oppdatere hos Mattilsynet.
                    </div>
                    <button
                      onClick={() => window.open(mattilsynetUrl, '_blank')}
                      className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-amber-200 hover:bg-amber-100 text-amber-900 font-bold text-xs"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Åpne Mattilsynet
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedContactId && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div
              className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3 bg-gray-50 cursor-pointer select-none"
              role="button"
              tabIndex={0}
              onClick={() => setIsAgreementCollapsed(v => !v)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setIsAgreementCollapsed(v => !v);
              }}
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <h2 className="font-bold text-gray-900">Avtale</h2>
                </div>
                <div
                  className="text-sm text-gray-900 font-semibold"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAgreementCollapsed(v => !v);
                  }}
                >
                  {apiaryContacts.find((ac: any) => ac.contact_id === selectedContactId)?.contact?.name || 'Kontakt'}
                  {apiaryContacts.find((ac: any) => ac.contact_id === selectedContactId)?.role
                    ? ` (${getRoleLabel(apiaryContacts.find((ac: any) => ac.contact_id === selectedContactId)?.role)})`
                    : ''}
                </div>
              </div>
              <span className="text-xs font-bold uppercase bg-white px-2 py-1 rounded text-gray-700 border border-gray-200">
                {selectedAgreement?.status || (agreementLoading ? 'LASTER' : 'INGEN')}
              </span>
            </div>

            {!isAgreementCollapsed && (
              <div className="p-4 space-y-3">
              {agreementStatus && (
                <div className="border border-gray-200 rounded-lg p-3 text-sm text-gray-700 bg-white">
                  {agreementStatus}
                </div>
              )}

              {agreementLoading ? (
                <div className="text-sm text-gray-600">Laster avtale...</div>
              ) : selectedAgreement ? (
                <>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs whitespace-pre-line font-mono max-h-[220px] overflow-auto">
                    {selectedAgreement.final_text || selectedAgreement.base_text}
                  </div>

                  <div className="grid gap-2">
                    <div className="text-xs font-bold uppercase text-gray-700">Spesielle vilkår for denne bigården</div>
                    <textarea
                      value={specialTerms}
                      onChange={(e) => setSpecialTerms(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[90px]"
                      placeholder="Skriv inn eventuelle spesielle vilkår/tillegg/endringer for denne bigården..."
                    />
                    <button
                      onClick={saveSpecialTerms}
                      disabled={isSavingSpecialTerms || specialTerms.trim() === specialTermsOriginal.trim()}
                      className="w-full bg-gray-900 text-white font-bold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
                      type="button"
                    >
                      Lagre vilkår
                    </button>
                  </div>

                  <button
                    onClick={requestPortalLink}
                    className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 font-bold py-2.5 px-4 rounded-lg transition-colors"
                    type="button"
                  >
                    Kopier portal-lenke
                  </button>

                  {String(selectedAgreement.status || '').toLowerCase() !== 'active' &&
                  String(selectedAgreement.status || '').toLowerCase() !== 'rejected' &&
                  selectedAgreement.contact_signed_at &&
                  selectedAgreement.beekeeper_signed_at ? (
                    <button
                      onClick={activateAgreement}
                      disabled={isAgreementUpdating}
                      className="w-full bg-white border border-green-200 hover:bg-green-50 text-green-700 font-bold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
                      type="button"
                    >
                      Aktiver avtale
                    </button>
                  ) : null}

                  {String(selectedAgreement.status || '').toLowerCase() !== 'terminated' &&
                  String(selectedAgreement.status || '').toLowerCase() !== 'rejected' ? (
                    <button
                      onClick={terminateAgreement}
                      disabled={isAgreementUpdating}
                      className="w-full bg-white border border-red-200 hover:bg-red-50 text-red-700 font-bold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
                      type="button"
                    >
                      Avslutt avtale
                    </button>
                  ) : null}

                  {selectedAgreement.contact_proposal &&
                    selectedAgreement.beekeeper_decision === 'pending' &&
                    (
                      <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-3 space-y-2">
                        <div className="text-xs font-bold uppercase text-yellow-900">
                          Unntak/tillegg foreslått av grunneier
                        </div>
                        <div className="text-sm text-yellow-900 whitespace-pre-line">
                          {selectedAgreement.contact_proposal}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <button
                            onClick={acceptContactProposal}
                            disabled={isAgreementUpdating}
                            className="w-full bg-gray-900 text-white font-bold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Godta forslag
                          </button>
                          <button
                            onClick={rejectContactProposal}
                            disabled={isAgreementUpdating}
                            className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 font-bold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Avvis forslag
                          </button>
                          <button
                            onClick={() => {
                              setIsCounterProposalOpen(true);
                              setCounterProposalText('');
                            }}
                            disabled={isAgreementUpdating}
                            className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 font-bold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Motforslag
                          </button>
                        </div>

                        {isCounterProposalOpen && (
                          <div className="grid gap-2 pt-1">
                            <label className="text-xs font-bold uppercase text-yellow-900">Motforslag fra birøkter</label>
                            <textarea
                              value={counterProposalText}
                              onChange={(e) => setCounterProposalText(e.target.value)}
                              className="border border-yellow-200 rounded-lg px-3 py-2 text-sm min-h-[110px] bg-white"
                              placeholder="Skriv hva du ønsker endret/justert..."
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <button
                                onClick={submitCounterProposal}
                                disabled={isAgreementUpdating || !counterProposalText.trim()}
                                className="w-full bg-gray-900 text-white font-bold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
                              >
                                Send motforslag
                              </button>
                              <button
                                onClick={() => setIsCounterProposalOpen(false)}
                                disabled={isAgreementUpdating}
                                className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 font-bold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
                              >
                                Avbryt
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  <div className="grid gap-2">
                    <div className="text-xs text-gray-600">
                      Grunneier signert: {selectedAgreement.contact_signed_at ? 'Ja' : 'Nei'} • Birøkter signert:{' '}
                      {selectedAgreement.beekeeper_signed_at ? 'Ja' : 'Nei'}
                    </div>

                    {selectedAgreement.status !== 'rejected' &&
                      selectedAgreement.status !== 'terminated' &&
                      selectedAgreement.status !== 'active' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          value={beekeeperSignatureName}
                          onChange={(e) => setBeekeeperSignatureName(e.target.value)}
                          className="sm:col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          placeholder="Din signatur (navn)"
                        />
                        <button
                          onClick={signAsBeekeeper}
                          disabled={isAgreementUpdating || !beekeeperSignatureName.trim()}
                          className="w-full bg-honey-500 hover:bg-honey-600 text-white font-bold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {selectedAgreement.beekeeper_signed_at ? 'Signer på nytt' : 'Signer'}
                        </button>
                      </div>
                    )}

                    {selectedAgreement.status === 'active' && (
                      <div className="border border-green-200 bg-green-50 text-green-800 rounded-lg p-3 text-sm">
                        Avtalen er aktiv. Grunneier får tilgang til portal.
                      </div>
                    )}

                    {String(selectedAgreement.status || '').toLowerCase() !== 'active' &&
                      String(selectedAgreement.status || '').toLowerCase() !== 'rejected' &&
                      selectedAgreement.contact_signed_at &&
                      selectedAgreement.beekeeper_signed_at && (
                        <div className="border border-yellow-200 bg-yellow-50 text-yellow-900 rounded-lg p-3 text-sm">
                          Begge parter har signert. Du kan aktivere avtalen når du ønsker.
                        </div>
                      )}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-700">
                  Ingen avtaleutkast funnet for valgt kontakt. Trykk «Lagre» i kontakt-dialogen for å opprette utkast.
                </div>
              )}
              </div>
            )}
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
           <div className="flex items-center gap-2">
             <span className="font-semibold text-gray-900 whitespace-nowrap">{hives.length} Kuber</span>
           </div>
           
           <div className="flex gap-2 items-center">
             <button 
                onClick={() => {
                    setIsScanModalOpen(true);
                    setTimeout(() => document.getElementById('scan-input')?.focus(), 100);
                }}
                className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-800 whitespace-nowrap"
             >
                <QrCode className="w-4 h-4" />
                Skann
             </button>

             {isSelectionMode && selectedHiveIds.size > 0 && (
                <>
                  <div className="h-6 w-px bg-gray-300 mx-1 hidden md:block"></div>
                  
                  {/* Mass Actions */}
                  <button 
                    onClick={() => {
                        setMassActionType(null);
                        setIsMassActionModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-honey-500 text-white hover:bg-honey-600 whitespace-nowrap flex items-center gap-2"
                  >
                    <ClipboardList className="w-4 h-4" />
                    <span>Massehandling</span>
                  </button>
                
                  <div className="h-6 w-px bg-gray-300 mx-1 hidden md:block"></div>
                
                  {/* Print Buttons - match Alle Bikuber */}
                  <button 
                    onClick={() => handlePrint('list')}
                    className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap"
                  >
                    Liste
                  </button>
                  <button 
                    onClick={() => handlePrint('cards')}
                    className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap"
                  >
                    Kort
                  </button>
                  <button 
                    onClick={() => handlePrint('qr')}
                    className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap"
                  >
                    QR-Koder
                  </button>
                </>
             )}

             {hives.length > 0 && (
               <>
                 {isSelectionMode && (
                   <button 
                     onClick={selectAll}
                     className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors whitespace-nowrap"
                   >
                     {selectedHiveIds.size === hives.length ? 'Velg ingen' : 'Velg alle'}
                   </button>
                 )}
                 <button 
                   onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      if (isSelectionMode) setSelectedHiveIds(new Set());
                   }}
                   className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                     isSelectionMode 
                       ? 'bg-red-50 text-red-600 border border-red-100' 
                       : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                   }`}
                 >
                   {isSelectionMode ? 'Avbryt' : 'Valg'}
                 </button>
               </>
             )}
           </div>
        </div>

        {/* Rental Management Section */}
        {(apiary.type === 'rental' && (apiary.managed_by === currentUser?.id || apiary.user_id === currentUser?.id)) && (
          <div className="bg-white rounded-xl border border-honey-200 shadow-sm overflow-hidden">
            <div className="bg-honey-50 px-4 py-3 border-b border-honey-100 flex justify-between items-center">
               <h2 className="font-bold text-honey-900 flex items-center gap-2">
                 <Truck className="w-5 h-5" />
                 Leieavtale & Levering
               </h2>
               <span className="text-xs font-bold uppercase bg-white px-2 py-1 rounded text-honey-800 border border-honey-200">
                 {rental?.status || 'PENDING'}
               </span>
            </div>
            
            <div className="p-4 space-y-4">
               {/* Delivery Date */}
               <div className="flex justify-between items-center">
                 <div>
                   <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Planlagt Levering</label>
                   {apiary.managed_by === currentUser?.id ? (
                      <input 
                        type="date" 
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                        value={rental?.estimated_delivery_date ? new Date(rental.estimated_delivery_date).toISOString().split('T')[0] : ''}
                        onChange={(e) => handleUpdateDeliveryDate(e.target.value)}
                      />
                   ) : (
                      <div className="font-medium text-gray-900">
                        {rental?.estimated_delivery_date 
                           ? new Date(rental.estimated_delivery_date).toLocaleDateString() 
                           : 'Ikke satt enda'}
                      </div>
                   )}
                 </div>
                 
                 {apiary.managed_by === currentUser?.id && (
                    <button className="text-sm bg-honey-500 text-white px-3 py-1.5 rounded hover:bg-honey-600">
                       Oppdater Status
                    </button>
                 )}
               </div>

               {/* Inspections List */}
               <div className="border-t border-gray-100 pt-4">
                  <div className="flex justify-between items-center mb-3">
                     <h3 className="font-bold text-gray-900 text-sm">Inspeksjoner</h3>
                     {apiary.managed_by === currentUser?.id && (
                        <button 
                            onClick={() => {
                                const date = prompt('Dato for inspeksjon (YYYY-MM-DD):');
                                if (date) handleCreateInspection(date);
                            }}
                            className="text-xs bg-gray-900 text-white px-2 py-1 rounded hover:bg-gray-800"
                        >
                            + Ny Inspeksjon
                        </button>
                     )}
                  </div>
                  
                  {inspections.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">Ingen planlagte inspeksjoner.</p>
                  ) : (
                      <div className="space-y-2">
                         {inspections.map(insp => (
                            <div key={insp.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between items-start">
                               <div>
                                  <div className="font-bold text-gray-900">
                                     {new Date(insp.planned_date).toLocaleDateString()}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                     Ansvarlig: {insp.beekeeper?.full_name || 'Birøkter'}
                                  </div>
                                  {insp.tenant_rsvp_status !== 'pending' && (
                                     <div className="mt-1 text-xs">
                                        <span className={`font-bold ${insp.tenant_rsvp_status === 'attending' ? 'text-green-600' : 'text-red-500'}`}>
                                           {insp.tenant_rsvp_status === 'attending' ? `Kommer (${insp.attendees_count} pers)` : 'Kan ikke'}
                                        </span>
                                        {insp.suit_sizes && (
                                            <div className="text-gray-500">Str: {Array.isArray(insp.suit_sizes) ? insp.suit_sizes.join(', ') : JSON.stringify(insp.suit_sizes)}</div>
                                        )}
                                     </div>
                                  )}
                               </div>
                               
                               {/* RSVP Action for Tenant */}
                               {apiary.user_id === currentUser?.id && insp.status === 'planned' && (
                                   <div className="flex flex-col gap-1">
                                      {rsvpInspectionId === insp.id ? (
                                         <div className="bg-white p-2 rounded shadow-sm border border-gray-200 text-right">
                                             <div className="mb-2 text-left bg-blue-50 p-2 rounded text-[10px] text-blue-800">
                                                <p className="font-bold">Betaling:</p>
                                                <p>Inspeksjon/Leie av drakt betales via Vipps.</p>
                                             </div>
                                             <input 
                                                 type="number" min="1" 
                                                 className="border p-1 w-16 text-sm mb-1" 
                                                 placeholder="Antall"
                                                 value={rsvpCount}
                                                 onChange={e => setRsvpCount(parseInt(e.target.value))}
                                             />
                                             <input 
                                                 type="text" 
                                                 className="border p-1 w-24 text-sm mb-1" 
                                                 placeholder="Str (S,M,L)"
                                                 value={rsvpSizes}
                                                 onChange={e => setRsvpSizes(e.target.value)}
                                             />
                                             <div className="flex gap-1 justify-end mt-1">
                                                <button onClick={() => setRsvpInspectionId(null)} className="text-xs text-gray-500">Avbryt</button>
                                                <button 
                                                    onClick={() => {
                                                        const sizes = rsvpSizes.split(',').map(s => s.trim());
                                                        if (confirm(`Betal ${rsvpCount * 150} kr med Vipps og bekreft?`)) {
                                                            handleRSVP(insp.id, 'attending', rsvpCount, sizes);
                                                            setRsvpInspectionId(null);
                                                        }
                                                    }}
                                                    className="text-xs bg-[#ff5b24] text-white px-2 py-1 rounded font-bold flex items-center gap-1"
                                                >
                                                    <span>Vipps & Bekreft</span>
                                                </button>
                                             </div>
                                          </div>
                                      ) : (
                                        <>
                                          <button 
                                            onClick={() => setRsvpInspectionId(insp.id)}
                                            className="text-xs bg-honey-100 text-honey-800 px-2 py-1 rounded font-medium hover:bg-honey-200"
                                          >
                                            Bli med 👋
                                          </button>
                                          <button 
                                            onClick={() => handleRSVP(insp.id, 'not_attending')}
                                            className="text-xs text-gray-400 hover:text-gray-600 underline"
                                          >
                                            Kan ikke
                                          </button>
                                        </>
                                      )}
                                   </div>
                               )}
                            </div>
                         ))}
                      </div>
                  )}
               </div>
            </div>
          </div>
        )}

        {isSelectionMode && (
          <div className="fixed bottom-20 left-4 right-4 bg-gray-900 text-white p-4 rounded-xl shadow-xl flex justify-between items-center z-20 animate-in slide-in-from-bottom-10">
            <div className="flex items-center gap-3">
              <button onClick={selectAll} className="text-sm font-medium hover:text-honey-400">
                {selectedHiveIds.size === hives.length ? 'Velg ingen' : 'Velg alle'}
              </button>
              <span className="text-gray-500">|</span>
              <span className="font-bold">{selectedHiveIds.size} valgt</span>
            </div>
            
            <button
              onClick={() => setIsMoveModalOpen(true)}
              disabled={selectedHiveIds.size === 0}
              className="bg-honey-500 text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50 flex items-center gap-2"
            >
              <Truck className="w-4 h-4" />
              Flytt valgte
            </button>
          </div>
        )}

        {/* Hives List */}
        {hives.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            <Archive className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="mb-4">Ingen bikuber her enda. Opprett fra oversikten.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {hives.map((hive) => {
              const coreHiveId = hive.core_hive_id || null;

              return (
              <div 
                key={hive.id} 
                className={`bg-white p-4 rounded-xl border shadow-sm transition-all hover:border-honey-300 ${
                  selectedHiveIds.has(hive.id) 
                    ? 'border-honey-500 ring-1 ring-honey-500 bg-honey-50' 
                    : 'border-gray-200'
                }`}
                onClick={() => {
                  if (isSelectionMode) toggleSelection(hive.id);
                  else router.push(`/hives/${hive.id}`);
                }}
              >
                <div className="flex items-start gap-3">
                    {/* Selection Checkbox */}
                    {isSelectionMode && (
                    <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                        selectedHiveIds.has(hive.id) ? 'bg-honey-500 border-honey-500' : 'border-gray-300 bg-white'
                    }`}>
                        {selectedHiveIds.has(hive.id) && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    )}
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-honey-600 font-black text-lg tracking-tight">
                                    {hive.hive_number}
                                </span>
                                <h3 className="font-bold text-gray-900 truncate">
                                    {hive.name !== hive.hive_number ? hive.name : ''}
                                </h3>
                                
                                {/* Type Badge */}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                    hive.type === 'AVLEGGER' 
                                        ? 'bg-blue-100 text-blue-700' 
                                        : 'bg-purple-100 text-purple-700'
                                }`}>
                                    {hive.type === 'AVLEGGER' ? 'Avlegger' : 'Prod'}
                                </span>
                            </div>

                            {/* Status Badge */}
                            <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                (hive.active === false ? 'inaktiv' : (hive.status || 'aktiv')).toLowerCase() === 'aktiv' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                {hive.active === false ? 'INAKTIV' : (hive.status || 'AKTIV')}
                            </div>
                        </div>

                        {hive.core_sequence_no && (
                          <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                            Core: {`KUBE-${String(hive.core_sequence_no).padStart(3, '0')}`}
                          </p>
                        )}

                        {/* Secondary Info */}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>
                                    Sist inspisert: {hive.last_inspection_date 
                                        ? new Date(hive.last_inspection_date).toLocaleDateString() 
                                        : 'Aldri'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Action Button (only when not selecting) */}
                    {!isSelectionMode && (
                        <Link 
                            href={`/hives/${hive.id}/new-inspection`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 -mr-2 -mt-2 text-gray-400 hover:text-honey-600 hover:bg-honey-50 rounded-full transition-colors"
                            title="Ny inspeksjon"
                        >
                            <ClipboardList className="w-5 h-5" />
                        </Link>
                    )}
                </div>
              </div>
            )})}
          </div>
        )}
      </main>

      {/* MOVE MODAL */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-honey-50">
              <h3 className="font-bold text-lg text-gray-900">Flytt {selectedHiveIds.size} kuber</h3>
              <button onClick={() => setIsMoveModalOpen(false)}><X className="w-6 h-6 text-gray-500" /></button>
            </div>
            
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">Velg destinasjon:</p>
              
              <div className="space-y-2 max-h-[50vh] overflow-y-auto mb-4">
                {availableApiaries.map((a) => {
                  const Icon = getIcon(a.type);
                  const isSelected = targetApiaryId === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setTargetApiaryId(a.id)}
                      className={`w-full p-3 rounded-lg border flex items-center gap-3 transition-all ${
                        isSelected 
                          ? 'border-honey-500 bg-honey-50 ring-1 ring-honey-500' 
                          : 'border-gray-200 hover:border-honey-300'
                      }`}
                    >
                      <div className={`p-2 rounded-full ${isSelected ? 'bg-honey-100 text-honey-600' : 'bg-gray-100 text-gray-500'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-medium text-gray-900">{a.name}</div>
                        <div className="text-xs text-gray-500">{formatApiaryNumber(a.apiary_number, a.type)}</div>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-honey-600" />}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleMoveSubmit}
                disabled={!targetApiaryId || isMoving}
                className="w-full bg-honey-500 hover:bg-honey-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isMoving ? 'Flytter...' : 'Bekreft flytting'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVITE CONTACT MODAL */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-honey-50">
              <h3 className="font-bold text-lg text-gray-900">Legg til kontakt</h3>
              <button onClick={() => setIsInviteModalOpen(false)}>
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setInviteTab('existing')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold border ${
                    inviteTab === 'existing'
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-200'
                  }`}
                >
                  Velg eksisterende
                </button>
                <button
                  onClick={() => setInviteTab('new')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold border ${
                    inviteTab === 'new'
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-200'
                  }`}
                >
                  Opprett ny
                </button>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Rolle</label>
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as 'grunneier' | 'kontaktperson' | 'samarbeidspartner')
                  }
                  className="w-full border border-gray-300 rounded-lg p-2.5"
                >
                  <option value="grunneier">Grunneier</option>
                  <option value="kontaktperson">Kontaktperson</option>
                  <option value="samarbeidspartner">Samarbeidspartner</option>
                </select>
              </div>

              {inviteTab === 'existing' ? (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Person</label>
                  <select
                    value={existingContactId}
                    onChange={(e) => setExistingContactId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5"
                  >
                    <option value="">Velg person...</option>
                    {contactsList.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.email ? `(${c.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Navn</label>
                    <input
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Adresse</label>
                    <input
                      value={newContact.address}
                      onChange={(e) => setNewContact({ ...newContact, address: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Postnummer</label>
                    <input
                      value={newContact.postal_code}
                      onChange={(e) => setNewContact({ ...newContact, postal_code: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Sted</label>
                    <input
                      value={newContact.city}
                      onChange={(e) => setNewContact({ ...newContact, city: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Telefon</label>
                    <input
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">E-post</label>
                    <input
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      type="email"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => handleContactSubmit(false)}
                  disabled={isInviting || (inviteTab === 'existing' && !existingContactId) || (inviteTab === 'new' && !newContact.name.trim())}
                  className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isInviting ? 'Lagrer...' : 'Lagre'}
                </button>
                <button
                  onClick={() => handleContactSubmit(true)}
                  disabled={
                    isInviting ||
                    (inviteTab === 'existing' &&
                      (!existingContactId ||
                        !(contactsList.find((c: any) => c.id === existingContactId)?.email || '').trim())) ||
                    (inviteTab === 'new' && (!newContact.name.trim() || !newContact.email.trim()))
                  }
                  className="w-full bg-honey-500 hover:bg-honey-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isInviting ? 'Sender...' : 'Send avtale'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MASS ACTION MODAL */}
      {isMassActionModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[200]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-900 text-white">
              <h3 className="font-bold text-lg">Massehandling ({selectedHiveIds.size} kuber)</h3>
              <button onClick={() => setIsMassActionModalOpen(false)}><X className="w-6 h-6 text-gray-400 hover:text-white" /></button>
            </div>
            
            <div className="p-6">
              {!massActionType ? (
                <div className="space-y-3">
                  <p className="text-gray-600 mb-4">Hva vil du registrere for disse kubene?</p>
                  <button
                    onClick={() => setMassActionType('inspeksjon')}
                    className="w-full p-4 rounded-lg border border-gray-200 hover:border-honey-500 hover:bg-honey-50 flex items-center gap-3 transition-colors text-left"
                  >
                    <Calendar className="w-6 h-6 text-honey-500" />
                    <div>
                      <div className="font-bold text-gray-900">Inspeksjon</div>
                      <div className="text-sm text-gray-500">Registrer samme inspeksjon på alle</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setMassActionType('logg')}
                    className="w-full p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 flex items-center gap-3 transition-colors text-left"
                  >
                    <Archive className="w-6 h-6 text-blue-500" />
                    <div>
                      <div className="font-bold text-gray-900">Logghendelse</div>
                      <div className="text-sm text-gray-500">F.eks. fôring eller behandling</div>
                    </div>
                  </button>
                </div>
              ) : massActionType === 'inspeksjon' ? (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 border p-3 rounded-lg w-full cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={massInspectionData.queen_seen}
                        onChange={e => setMassInspectionData({ ...massInspectionData, queen_seen: e.target.checked })}
                        className="w-5 h-5 text-honey-600 rounded"
                      />
                      <span className="font-medium">Dronning sett</span>
                    </label>
                    <label className="flex items-center gap-2 border p-3 rounded-lg w-full cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={massInspectionData.eggs_seen}
                        onChange={e => setMassInspectionData({ ...massInspectionData, eggs_seen: e.target.checked })}
                        className="w-5 h-5 text-honey-600 rounded"
                      />
                      <span className="font-medium">Egg sett</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Dronningfarge</label>
                      <select
                        value={massInspectionData.queen_color}
                        onChange={e => setMassInspectionData({ ...massInspectionData, queen_color: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg p-2.5"
                      >
                        <option value="">Ukjent</option>
                        <option value="Hvit">Hvit</option>
                        <option value="Gul">Gul</option>
                        <option value="Rød">Rød</option>
                        <option value="Grønn">Grønn</option>
                        <option value="Blå">Blå</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Årgang</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={massInspectionData.queen_year}
                        onChange={e => setMassInspectionData({ ...massInspectionData, queen_year: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg p-2.5"
                        placeholder="f.eks. 2025"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Felles handlinger</label>
                    <div className="flex gap-2 flex-wrap">
                      {['Medisinering', 'Varroabehandling'].map((a) => (
                        <label key={a} className="flex items-center gap-2 border p-2 rounded cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={(massInspectionData.actions || []).includes(a)}
                            onChange={(e) => {
                              const next = new Set(massInspectionData.actions || []);
                              if (e.target.checked) next.add(a);
                              else next.delete(a);
                              setMassInspectionData({ ...massInspectionData, actions: Array.from(next) });
                            }}
                            className="w-5 h-5 text-honey-600 rounded"
                          />
                          <span className="font-medium">{a}</span>
                        </label>
                      ))}
                    </div>
                    <input
                      value={massInspectionData.other_action}
                      onChange={(e) => setMassInspectionData({ ...massInspectionData, other_action: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2.5 mt-2"
                      placeholder="Andre viktige handlinger (valgfritt)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Fôr</label>
                    <select
                      value={massInspectionData.honey_stores}
                      onChange={e => setMassInspectionData({ ...massInspectionData, honey_stores: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2.5"
                    >
                      <option value="lite">Lite</option>
                      <option value="middels">Middels</option>
                      <option value="mye">Mye</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Lynne</label>
                    <select
                      value={massInspectionData.temperament}
                      onChange={e => setMassInspectionData({ ...massInspectionData, temperament: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2.5"
                    >
                      <option value="rolig">Rolig</option>
                      <option value="urolig">Urolig</option>
                      <option value="aggressiv">Aggressiv</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Notat</label>
                    <textarea
                      value={massInspectionData.notes}
                      onChange={e => setMassInspectionData({ ...massInspectionData, notes: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2.5 h-24"
                      placeholder="Notat som gjelder alle kubene..."
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Handling</label>
                    <select
                      value={massLogData.action}
                      onChange={e => setMassLogData({ ...massLogData, action: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2.5"
                    >
                      <option value="BEHANDLING">Behandling (f.eks. Varroa)</option>
                      <option value="FÔRING">Fôring</option>
                      <option value="ANNET">Annet</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Detaljer</label>
                    <textarea
                      value={massLogData.details}
                      onChange={e => setMassLogData({ ...massLogData, details: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2.5 h-24"
                      placeholder="Beskriv hva som ble gjort..."
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    if (massActionType) setMassActionType(null);
                    else setIsMassActionModalOpen(false);
                  }}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg"
                >
                  {massActionType ? 'Tilbake' : 'Avbryt'}
                </button>
                {massActionType && (
                  <button
                    onClick={handleMassActionSubmit}
                    disabled={isSubmittingMassAction}
                    className="flex-1 py-3 px-4 bg-honey-500 hover:bg-honey-600 text-white font-bold rounded-lg disabled:opacity-50"
                  >
                    {isSubmittingMassAction ? 'Lagrer...' : 'Bekreft'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CERTIFICATION MODAL */}
      {isCertificationModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[200]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-900 text-white">
              <h3 className="font-bold text-lg">Egensertifisering</h3>
              <button onClick={() => setIsCertificationModalOpen(false)}>
                <X className="w-6 h-6 text-gray-400 hover:text-white" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-136px)] pb-10">
              <div className="text-sm text-gray-700">
                <div className="font-bold text-gray-900">Sertifiseringsperiode</div>
                <div className="text-xs text-gray-600">Sertifisert fra: {new Date(todayIso).toLocaleDateString()}</div>
                <div className="text-xs text-gray-600">Sertifisert til: {new Date(plusTwoYearsIso).toLocaleDateString()}</div>
              </div>

              <div className="space-y-3">
                <div className="font-bold text-gray-900 text-sm">Sjekkliste (må bekreftes)</div>
                {[
                  { key: 'noDisease', label: 'Ingen tegn til sykdom' },
                  { key: 'normalBrood', label: 'Normal yngel' },
                  { key: 'queenOk', label: 'Dronning ok' },
                  { key: 'normalActivity', label: 'Normal aktivitet' },
                  { key: 'equipmentOk', label: 'Utstyr og kube i orden' },
                  { key: 'physicalCheck', label: 'Kontroll gjennomført fysisk' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(certChecklist as any)[item.key]}
                      onChange={(e) => setCertChecklist({ ...certChecklist, [item.key]: e.target.checked } as any)}
                      className="w-5 h-5 text-honey-600"
                    />
                    <span className="font-medium text-gray-800">{item.label}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-3">
                <div className="font-bold text-gray-900 text-sm">
                  Bilder av hver bikube ({(hives || []).length} kuber = minst {(hives || []).length} bilder)
                </div>
                <div className="space-y-2">
                  {(hives || []).map((h: any) => (
                    <div key={h.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                      <div className="text-sm font-bold text-gray-900">
                        {h.hive_number || h.name || 'Kube'}
                      </div>
                      <label className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-honey-500 hover:bg-honey-600 text-white font-bold text-xs cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
                            setCertHiveFiles((prev) => ({ ...prev, [h.id]: file }));
                            e.currentTarget.value = '';
                          }}
                        />
                        {certHiveFiles[h.id] ? 'Bilde valgt' : 'Ta/legg ved bilde'}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
                Dette er en veiledning basert på krav fra Mattilsynet – bruker er selv ansvarlig for korrekt registrering.
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
              <button
                onClick={() => setIsCertificationModalOpen(false)}
                className="flex-1 py-3 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50"
                disabled={isSubmittingCertification}
              >
                Avbryt
              </button>
              <button
                onClick={submitCertification}
                disabled={!canCompleteCertification || isSubmittingCertification}
                className="flex-1 py-3 bg-honey-500 text-white rounded-lg font-bold hover:bg-honey-600 disabled:opacity-50"
              >
                {isSubmittingCertification ? 'Fullfører...' : 'Fullfør sertifisering'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT OPTIONS MODAL */}
      {isPrintOptionsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-900 text-white">
                    <h3 className="font-bold text-lg">Utskriftsvalg</h3>
                    <button onClick={() => setIsPrintOptionsOpen(false)}><X className="w-6 h-6 text-gray-400 hover:text-white" /></button>
                </div>
                
                <div className="p-6 space-y-4">
                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input 
                            type="checkbox"
                            checked={printOptions.includeHistory}
                            onChange={(e) => setPrintOptions({...printOptions, includeHistory: e.target.checked})}
                            className="w-5 h-5 text-honey-600"
                        />
                        <span className="font-medium">Inkluder inspeksjonshistorikk</span>
                    </label>

                    {printOptions.includeHistory && (
                        <div className="pl-8 space-y-2">
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input 
                                    type="radio"
                                    name="limit"
                                    checked={printOptions.inspectionLimit === 'last5'}
                                    onChange={() => setPrintOptions({...printOptions, inspectionLimit: 'last5'})}
                                    className="text-honey-600"
                                />
                                Siste 5 inspeksjoner
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input 
                                    type="radio"
                                    name="limit"
                                    checked={printOptions.inspectionLimit === 'all'}
                                    onChange={() => setPrintOptions({...printOptions, inspectionLimit: 'all'})}
                                    className="text-honey-600"
                                />
                                Alle inspeksjoner
                            </label>
                        </div>
                    )}

                    <button
                        onClick={() => {
                            setIsPrintOptionsOpen(false);
                            handlePrint('cards', true);
                        }}
                        className="w-full bg-honey-500 text-white font-bold py-3 rounded-lg hover:bg-honey-600 mt-4"
                    >
                        Skriv ut
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* SCAN MODAL */}
      {isScanModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-900 text-white">
              <div className="flex items-center gap-2">
                <QrCode className="w-6 h-6" />
                <h3 className="font-bold text-lg">Hurtig-registrering</h3>
              </div>
              <button onClick={() => setIsScanModalOpen(false)}><X className="w-6 h-6 text-gray-400 hover:text-white" /></button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <p className="text-sm text-gray-600 mb-6">
                Skann QR-koden på en kube i denne bigården, eller skriv inn nummeret manuelt og trykk Enter.
                Kuber som ikke finnes, eller som tilhører en annen bigård, gir bare feilmelding.
              </p>

              <form onSubmit={handleScanSubmit} className="mb-8">
                <div className="relative">
                    <input
                        id="scan-input"
                        type="text"
                        value={scanInput}
                        onChange={(e) => setScanInput(e.target.value)}
                        placeholder="KUBE-XXX"
                        className="w-full text-3xl font-mono font-bold p-4 border-2 border-gray-300 rounded-xl focus:border-honey-500 focus:ring-4 focus:ring-honey-100 outline-none text-center uppercase placeholder-gray-200"
                        autoComplete="off"
                    />
                    {isProcessingScan && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-honey-500"></div>
                        </div>
                    )}
                </div>
                <p className="text-center text-xs text-gray-400 mt-2">Trykk Enter for å registrere</p>
              </form>

              {/* Recent Scans */}
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-2">Nylig skannet</h4>
                {scannedHives.length === 0 ? (
                    <div className="text-center py-8 text-gray-300 italic">Ingen kuber skannet enda</div>
                ) : (
                    scannedHives.map((item, i) => (
                        <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${
                            item.status === 'error' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                        } animate-in slide-in-from-top-2 fade-in duration-300`}>
                            <div className="flex items-center gap-3">
                                <div className={`font-mono font-bold ${item.status === 'error' ? 'text-red-700' : 'text-green-700'}`}>
                                    {item.number}
                                </div>
                                <div className="text-sm text-gray-600">{item.msg}</div>
                            </div>
                            {item.status !== 'error' && <Check className="w-5 h-5 text-green-600" />}
                        </div>
                    ))
                )}
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50">
                <button 
                    onClick={() => setIsScanModalOpen(false)}
                    className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-gray-800"
                >
                    Ferdig
                </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT CONTENT (Hidden on screen) */}
      {printLayout === 'list' && (
        <div className="hidden print:block p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-2">Bikubeoversikt - {apiary.name}</h1>
                <p className="text-sm text-gray-500">Utskriftsdato: {new Date().toLocaleDateString()}</p>
            </div>

            <table className="w-full text-left border-collapse text-xs">
                <thead>
                    <tr className="border-b-2 border-black">
                        <th className="py-2 font-bold w-16">Kube #</th>
                        <th className="py-2 font-bold w-32">Navn</th>
                        <th className="py-2 font-bold w-16">Status</th>
                        <th className="py-2 font-bold w-64">Siste Inspeksjon</th>
                        <th className="py-2 font-bold">Siste Logg</th>
                    </tr>
                </thead>
                <tbody>
                    {hives
                        .filter(h => selectedHiveIds.size === 0 || selectedHiveIds.has(h.id))
                        .map(hive => {
                            const lastInsp = printData[hive.id]?.inspections?.[0];
                            const lastLog = printData[hive.id]?.logs?.[0];
                            return (
                                <tr key={hive.id} className="border-b border-gray-300 break-inside-avoid">
                                    <td className="py-2 align-top font-mono font-bold">{hive.hive_number}</td>
                                    <td className="py-2 align-top">
                                        <div className="font-bold">{hive.name}</div>
                                        <div className="text-gray-500 uppercase text-[10px]">{hive.type || 'PRODUKSJON'}</div>
                                    </td>
                                    <td className="py-2 align-top">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getStatusColor(hive)}`}>
                                            {getStatusText(hive)}
                                        </span>
                                    </td>
                                    <td className="py-2 align-top">
                                        {lastInsp ? (
                                            <div>
                                                <div className="font-bold">{new Date(lastInsp.inspection_date).toLocaleDateString()}</div>
                                                <div className="flex gap-1 flex-wrap mt-0.5">
                                                    {lastInsp.queen_seen && <span className="text-[10px] bg-green-50 text-green-700 px-1 rounded">Dronning</span>}
                                                    {lastInsp.eggs_seen && <span className="text-[10px] bg-green-50 text-green-700 px-1 rounded">Egg</span>}
                                                </div>
                                                {lastInsp.notes && <div className="text-gray-600 italic mt-1 line-clamp-3">{lastInsp.notes}</div>}
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className="py-2 align-top">
                                        {lastLog ? (
                                            <div>
                                                <div className="font-bold">{new Date(lastLog.created_at).toLocaleDateString()}</div>
                                                <div className="text-[10px] uppercase font-bold text-gray-500">{lastLog.action}</div>
                                                <div className="text-gray-600 line-clamp-2">{lastLog.details}</div>
                                            </div>
                                        ) : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                </tbody>
            </table>
        </div>
      )}

      {/* PRINT: CARDS (2 per page) */}
      {printLayout === 'cards' && (
        <div className="hidden print:block">
           {hives
              .filter(h => selectedHiveIds.size === 0 || selectedHiveIds.has(h.id))
              .map((hive) => {
                 const data = printData[hive.id];
                 return (
                     <div key={hive.id} className="relative w-full h-[130mm] border-b-2 border-dashed border-gray-300 p-6 break-inside-avoid page-break-after-auto flex flex-col justify-between">
                        {/* Header */}
                       <div className="flex justify-between items-start mb-4">
                          <div>
                             <h1 className="text-4xl font-black text-gray-900 mb-2">{hive.hive_number}</h1>
                             <h2 className="text-xl font-bold text-gray-600">{hive.name}</h2>
                             <div className="mt-2 flex gap-2">
                                <span className="border border-black px-2 py-1 rounded text-sm font-bold uppercase">{hive.type}</span>
                                <span className="border border-black px-2 py-1 rounded text-sm font-bold uppercase">{hive.status}</span>
                             </div>
                          </div>
                          {data?.qrDataUrl && (
                             <img src={data.qrDataUrl} alt="QR" className="w-32 h-32 object-contain" />
                          )}
                       </div>

                       {/* History */}
                       <div className="grid grid-cols-2 gap-8 flex-1 overflow-hidden">
                          {/* Inspections */}
                          <div>
                             <h3 className="font-bold border-b-2 border-black mb-2 pb-1">Siste Inspeksjoner</h3>
                             <div className="space-y-2 text-xs">
                                {data?.inspections?.slice(0, 5).map((insp: any, i: number) => (
                                   <div key={i} className="grid grid-cols-[auto_1fr] gap-2 border-b border-gray-100 pb-1">
                                      <span className="font-mono font-bold whitespace-nowrap">{new Date(insp.inspection_date).toLocaleDateString()}</span>
                                      <div className="min-w-0">
                                         <div className="flex gap-1 mb-0.5">
                                            {insp.queen_seen && <span className="bg-green-100 text-green-800 px-1 rounded text-[10px] font-bold">Dronning</span>}
                                            {insp.eggs_seen && <span className="bg-green-100 text-green-800 px-1 rounded text-[10px] font-bold">Egg</span>}
                                         </div>
                                         <div className="truncate text-gray-600">{insp.notes || '-'}</div>
                                      </div>
                                   </div>
                                ))}
                             </div>
                          </div>
                          
                          {/* Logs */}
                          <div>
                             <h3 className="font-bold border-b-2 border-black mb-2 pb-1">Siste Hendelser</h3>
                             <div className="space-y-2 text-xs">
                                {data?.logs?.slice(0, 5).map((log: any, i: number) => (
                                   <div key={i} className="grid grid-cols-[auto_1fr] gap-2 border-b border-gray-100 pb-1">
                                      <span className="font-mono font-bold whitespace-nowrap">{new Date(log.created_at).toLocaleDateString()}</span>
                                      <div className="min-w-0">
                                         <span className="font-bold uppercase text-[10px] mr-1 block">{log.action}</span>
                                         <span className="truncate text-gray-600 block">{log.details}</span>
                                      </div>
                                   </div>
                                ))}
                             </div>
                          </div>
                       </div>
                       
                       <div className="text-center text-[10px] text-gray-400 mt-4">
                          {apiary.name} - Utskrift: {new Date().toLocaleDateString()}
                       </div>
                    </div>
                 );
              })}
        </div>
      )}

      {/* PRINT: QR LABELS (3x8 Grid) */}
      {printLayout === 'qr' && (
         <div className="hidden print:grid grid-cols-3 gap-0 content-start">
            {hives
               .filter(h => selectedHiveIds.size === 0 || selectedHiveIds.has(h.id))
               .map(hive => (
                  <div key={hive.id} className="w-[70mm] h-[37mm] border border-gray-100 p-2 flex items-center justify-between overflow-hidden break-inside-avoid relative bg-white">
                     <div className="flex flex-col justify-center h-full pl-1 z-10">
                        <span className="text-[8px] uppercase text-gray-500 font-bold leading-none mb-0.5">LEK-Biens Vokter</span>
                        <span className="text-xl font-black leading-none">{hive.hive_number}</span>
                        <span className="text-[10px] font-bold truncate max-w-[35mm] leading-tight mt-1">{hive.name}</span>
                     </div>
                     {printData[hive.id]?.qrDataUrl && (
                        <img src={printData[hive.id]?.qrDataUrl} className="w-[28mm] h-[28mm] object-contain z-10" />
                     )}
                  </div>
               ))}
         </div>
      )}
    </div>
  );
}
