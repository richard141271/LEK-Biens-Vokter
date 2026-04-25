'use client';

import { createClient } from '@/utils/supabase/client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, MapPin, Warehouse, Store, Truck, LogOut, Box, Printer, CheckSquare, Square, X, Download, Mic, MicOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { getDistanceFromLatLonInM } from '@/utils/geo';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';

const ACTIVE_OWNER_KEY = 'lek_active_owner_id';

export default function ApiariesPage() {
  const [apiaries, setApiaries] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [accounts, setAccounts] = useState<{ id: string; label: string }[]>([]);
  const [activeOwnerId, setActiveOwnerId] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isServiceWorkerControlling, setIsServiceWorkerControlling] = useState<boolean | null>(null);
  const [offlineReady, setOfflineReady] = useState(false);
  const [voiceInfo, setVoiceInfo] = useState<string>('');
  const [nearApiary, setNearApiary] = useState<any | null>(null);
  const [voiceStep, setVoiceStep] = useState<'idle' | 'armed' | 'awaiting_apiary' | 'awaiting_hive'>('idle');
  const [selectedVoiceApiary, setSelectedVoiceApiary] = useState<any | null>(null);
  
  // Offline Download State
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  
  // Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedApiaries, setSelectedApiaries] = useState<string[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const supabase = createClient();
  const router = useRouter();
  const didAutoDownloadRef = useRef(false);
  const voiceStepRef = useRef<'idle' | 'armed' | 'awaiting_apiary' | 'awaiting_hive'>('idle');
  const nearApiaryRef = useRef<any | null>(null);
  const selectedVoiceApiaryRef = useRef<any | null>(null);
  const lastPromptApiaryIdRef = useRef<string | null>(null);
  const lastPromptAtRef = useRef<number>(0);
  const isListeningRef = useRef<boolean>(false);
  const prevVoiceStepRef = useRef<'idle' | 'armed' | 'awaiting_apiary' | 'awaiting_hive'>('idle');
  const apiariesRef = useRef<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    voiceStepRef.current = voiceStep;
  }, [voiceStep]);

  useEffect(() => {
    nearApiaryRef.current = nearApiary;
  }, [nearApiary]);

  useEffect(() => {
    selectedVoiceApiaryRef.current = selectedVoiceApiary;
  }, [selectedVoiceApiary]);

  const visibleApiaries = useMemo(() => {
    const ownerId = activeOwnerId || currentUserId;
    if (!ownerId) return apiaries || [];
    return (apiaries || []).filter((a: any) => String(a?.user_id || '') === String(ownerId));
  }, [activeOwnerId, apiaries, currentUserId]);

  useEffect(() => {
    apiariesRef.current = visibleApiaries || [];
  }, [visibleApiaries]);

  const parseLatLng = (value: any): { lat: number; lon: number } | null => {
    if (typeof value === 'number') return null;
    const s = typeof value === 'string' ? value : value ? String(value) : '';
    if (!s) return null;
    const matches = s.match(/-?\d+(?:\.\d+)?/g);
    if (!matches || matches.length < 2) return null;
    const lat = Number(matches[0]);
    const lon = Number(matches[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  };

  const normalizeApiaryCoords = (apiary: any): { lat: number; lon: number } | null => {
    const lat = apiary?.latitude;
    const lon = apiary?.longitude;
    if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
    const parsed = parseLatLng(apiary?.coordinates);
    if (parsed) return parsed;
    return null;
  };

  const normalizeText = (t: string) =>
    (t || '')
      .toLowerCase()
      .replace(/[.,;:!?]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const formatApiaryNumber = (raw: string, type?: string) => {
    const s = String(raw || '');
    const t = String(type || '').toLowerCase();
    if (t === 'bil' || s.toUpperCase().startsWith('BIL-')) return s.split('.')[0];
    return s;
  };

  const extractHiveDigits = (t: string): string | null => {
    const s = normalizeText(t)
      .replace(/\bkune\b/g, 'kube')
      .replace(/\bkupe\b/g, 'kube')
      .replace(/\bkubbe\b/g, 'kube');
    const match = s.match(/\b(?:kube|kub(e|enummer)?|nr|nummer)\s*(\d{1,4})\b/) || s.match(/\b(\d{1,4})\b/);
    const digits = match?.[1] || match?.[2] || null;
    if (!digits) return null;
    const num = Number(digits);
    if (!Number.isFinite(num) || num <= 0) return null;
    return String(Math.trunc(num));
  };

  const extractApiaryToken = (t: string): string | null => {
    const s = normalizeText(t);
    const osMatch = s.match(/\b(os)\s*[- ]?\s*(\d{1,6})\b/);
    if (osMatch?.[2]) return `os-${osMatch[2]}`;
    const digits = s.match(/\b(\d{1,6})\b/)?.[1];
    if (digits) return digits;
    return null;
  };

  const pickApiaryFromSpeech = (t: string): any | null => {
    const s = normalizeText(t);
    const list = apiariesRef.current || [];
    const token = extractApiaryToken(s);
    if (token) {
      const m = list.find((a: any) => normalizeText(String(a?.apiary_number || '')).includes(token));
      if (m) return m;
    }
    const byName = list.find((a: any) => {
      const name = normalizeText(String(a?.name || ''));
      if (!name) return false;
      return s.includes(name) || name.includes(s);
    });
    return byName || null;
  };

  const handleVoice = useCallback((text: string) => {
    const t = normalizeText(text);
    if (!t) return;

    if (t.includes('avbryt') || t.includes('stopp')) {
      if (voiceStepRef.current !== 'idle') {
        setVoiceStep('armed');
        setSelectedVoiceApiary(null);
        setVoiceInfo('Avbrutt. Si "start inspeksjon" når du er klar.');
      }
      return;
    }

    if (voiceStepRef.current === 'idle' || voiceStepRef.current === 'armed') {
      const wantsStart =
        t.includes('start inspeksjon') ||
        t.includes('start inspek') ||
        (t.includes('start') && t.includes('inspeksjon'));
      if (!wantsStart) return;

      const nearby = nearApiaryRef.current;
      if (nearby) {
        setSelectedVoiceApiary(nearby);
        setVoiceStep('awaiting_hive');
        setVoiceInfo('Hvilken kube nummer skal inspiseres?');
        return;
      }

      setSelectedVoiceApiary(null);
      setVoiceStep('awaiting_apiary');
      setVoiceInfo('Hvilken bigård? Si navn eller nummer.');
      return;
    }

    if (voiceStepRef.current === 'awaiting_apiary') {
      const picked = pickApiaryFromSpeech(t);
      if (!picked) {
        setVoiceInfo('Jeg fant ikke bigården. Si navn eller nummer en gang til.');
        return;
      }
      setSelectedVoiceApiary(picked);
      setVoiceStep('awaiting_hive');
      setVoiceInfo(`Valgt ${picked.name}. Hvilken kube nummer skal inspiseres?`);
      return;
    }

    if (voiceStepRef.current === 'awaiting_hive') {
      const apiary = selectedVoiceApiaryRef.current || nearApiaryRef.current;
      if (!apiary) {
        setVoiceStep('armed');
        setSelectedVoiceApiary(null);
        setVoiceInfo('Fant ingen bigård i nærheten. Si "start inspeksjon" når du er nær en bigård.');
        return;
      }

      const digits = extractHiveDigits(t);
      if (!digits) {
        setVoiceInfo('Jeg oppfattet ikke kubenummeret. Si for eksempel "kube nummer 101".');
        return;
      }

      const spoken = digits.padStart(3, '0');
      const hives = Array.isArray(apiary?.hives) ? apiary.hives : [];
      const match = hives.find((h: any) => {
        const raw = String(h?.hive_number || '');
        const hiveDigits = raw.match(/\d+/)?.[0] || '';
        return hiveDigits === digits || hiveDigits === spoken || raw.endsWith(spoken);
      });

      if (!match?.id) {
        setVoiceInfo(`Fant ikke kube ${digits} i ${apiary.name}. Prøv igjen.`);
        return;
      }

      router.push(`/hives/${match.id}/new-inspection?autoVoice=1`);
    }
  }, [router]);

  const { isListening, startListening, stopListening, pauseListening, resumeListening, isSupported } = useVoiceRecognition(handleVoice);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const speak = useCallback((text: string) => {
    try {
      if (typeof window === 'undefined') return;
      const s = (window as any).speechSynthesis as SpeechSynthesis | undefined;
      const wasListening = isListeningRef.current;
      if (wasListening) {
        try { pauseListening(); } catch {}
      }
      if (!s) return;
      s.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'nb-NO';
      u.rate = 0.95;
      const safety = setTimeout(() => {
        if (wasListening) { try { resumeListening(); } catch {} }
      }, 2500);
      u.onend = () => {
        clearTimeout(safety);
        if (wasListening) setTimeout(() => { try { resumeListening(); } catch {} }, 120);
      };
      u.onerror = () => {
        clearTimeout(safety);
        if (wasListening) setTimeout(() => { try { resumeListening(); } catch {} }, 120);
      };
      s.speak(u);
    } catch {}
  }, [pauseListening, resumeListening]);

  useEffect(() => {
    const prev = prevVoiceStepRef.current;
    prevVoiceStepRef.current = voiceStep;
    if (prev !== voiceStep && voiceStep === 'awaiting_hive') {
      speak('Hvilken kube nummer skal inspiseres?');
    }
    if (prev !== voiceStep && voiceStep === 'awaiting_apiary') {
      speak('Hvilken bigård? Si navn eller nummer.');
    }
  }, [speak, voiceStep]);

  const apiariesWithCoords = useMemo(() => {
    return (apiaries || [])
      .map((a: any) => {
        const coords = normalizeApiaryCoords(a);
        if (!coords) return null;
        return { ...a, __lat: coords.lat, __lon: coords.lon };
      })
      .filter(Boolean) as any[];
  }, [apiaries]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isSelectionMode) return;
    if (!navigator?.geolocation) {
      setVoiceInfo('GPS er ikke tilgjengelig på denne enheten.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

        if (apiariesWithCoords.length === 0) return;
        let best: any = null;

        for (const a of apiariesWithCoords) {
          const d = getDistanceFromLatLonInM(lat, lon, a.__lat, a.__lon);
          if (!Number.isFinite(d)) continue;
          if (!best || d < best.distance) best = { apiary: a, distance: d };
        }

        if (!best) return;

        const dist = Math.round(best.distance);
        const inside = best.distance <= 20;
        const outside = best.distance >= 35;

        if (inside) {
          setNearApiary(best.apiary);
          if (voiceStepRef.current === 'idle') setVoiceStep('armed');

          setVoiceInfo(`Nær ${best.apiary.name} (${dist} m). Si "start inspeksjon".`);

          const now = Date.now();
          const shouldPrompt =
            lastPromptApiaryIdRef.current !== best.apiary.id || now - lastPromptAtRef.current > 45_000;

          if (shouldPrompt) {
            lastPromptApiaryIdRef.current = best.apiary.id;
            lastPromptAtRef.current = now;
            speak(`Du er nær ${best.apiary.name}. Si start inspeksjon.`);
          }

          if (isSupported && !isListeningRef.current) {
            try { startListening(); } catch {}
          }
        } else if (outside) {
          if (nearApiaryRef.current?.id) {
            setNearApiary(null);
            setVoiceStep('idle');
            setVoiceInfo('Gå nær en bigård for å starte inspeksjon med tale.');
            if (isListeningRef.current) {
              try { stopListening(); } catch {}
            }
          }
        } else {
          if (voiceStepRef.current === 'idle') {
            setVoiceInfo(`Nærmeste bigård: ${best.apiary.name} (${dist} m).`);
          }
        }
      },
      () => {
        setVoiceInfo('Gi tilgang til posisjon for å starte inspeksjon med tale.');
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 }
    );

    return () => {
      try { navigator.geolocation.clearWatch(watchId); } catch {}
    };
  }, [apiariesWithCoords, isSelectionMode, isSupported, speak, startListening, stopListening]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) {
      setIsServiceWorkerControlling(false);
      return;
    }

    const update = () => {
      setIsServiceWorkerControlling(!!navigator.serviceWorker.controller);
    };

    update();
    navigator.serviceWorker.addEventListener('controllerchange', update);
    navigator.serviceWorker.ready.then(update).catch(() => setIsServiceWorkerControlling(false));

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', update);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('offline_data');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if ((parsed?.hives?.length || 0) > 0 || (parsed?.apiaries?.length || 0) > 0) setOfflineReady(true);
    } catch {}
  }, []);

  const fetchData = async () => {
    try {
      // Offline fallback for list
      if (!navigator.onLine) {
           const offlineData = localStorage.getItem('offline_data');
           if (offlineData) {
               const parsed = JSON.parse(offlineData);
               if (parsed.apiaries) {
                   const normalizedOfflineApiaries = (parsed.apiaries || []).map((a: any) => {
                     const raw = typeof a?.apiary_number === 'string' ? a.apiary_number : '';
                     if (!raw) return a;
                     if (/^START-/i.test(raw)) {
                       return { ...a, apiary_number: raw.replace(/^START-/i, 'OS-') };
                     }
                     return a;
                   });
                   setApiaries(normalizedOfflineApiaries);
                   if (parsed.profile) setProfile(parsed.profile);
               }
           }
           setLoading(false);
           return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUserId(user.id);

      let isDemoView = false;
      let demoOwnerId: string | null = null;
      let demoSessionId: string | null = null;
      try {
        const params = new URLSearchParams(window.location.search);
        isDemoView = params.get('demo') === '1';
      } catch {}
      if (isDemoView) {
        try {
          demoOwnerId = localStorage.getItem('lek_demo_owner_id');
          demoSessionId = localStorage.getItem('lek_demo_session_id');
        } catch {}
      }

      try {
        const stored = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_OWNER_KEY) : null;
        const initial = (isDemoView && demoOwnerId) ? demoOwnerId : (stored || user.id);
        setActiveOwnerId(initial);
      } catch {
        setActiveOwnerId((isDemoView && demoOwnerId) ? demoOwnerId : user.id);
      }

      // Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setProfile(profileData);

      if (isDemoView && demoOwnerId && demoSessionId) {
        setAccounts([{ id: demoOwnerId, label: 'Demo konto' }]);
        setActiveOwnerId(demoOwnerId);
        try {
          localStorage.setItem(ACTIVE_OWNER_KEY, demoOwnerId);
        } catch {}
      } else {
        try {
          const res = await fetch('/api/access/list', { method: 'GET' });
          const data = await res.json().catch(() => ({}));
          const incoming = Array.isArray(data?.incoming) ? data.incoming : [];
          const owners = new Map<string, string>();
          const myLabel = profileData?.full_name ? String(profileData.full_name) : 'Min konto';
          owners.set(user.id, myLabel === 'Min konto' ? 'Min konto' : `Min konto (${myLabel})`);

          for (const row of incoming) {
            const ownerId = String(row?.owner_id || '').trim();
            if (!ownerId) continue;
            const name = row?.ownerProfile?.full_name ? String(row.ownerProfile.full_name) : ownerId.slice(0, 8);
            owners.set(ownerId, name);
          }

          const list = Array.from(owners.entries()).map(([id, label]) => ({ id, label }));
          setAccounts(list);

          const stored = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_OWNER_KEY) : null;
          const storedId = stored || user.id;
          const ok = owners.has(storedId);
          const finalId = ok ? storedId : user.id;
          if (finalId !== storedId) {
            try {
              localStorage.setItem(ACTIVE_OWNER_KEY, finalId);
            } catch {}
          }
          setActiveOwnerId(finalId);
        } catch {}
      }

      // Fetch Apiaries
      let apiaryQuery = supabase
        .from('apiaries')
        .select(`
          *,
          hives (*)
        `)
        .order('created_at', { ascending: false });

      if (isDemoView && demoSessionId) {
        apiaryQuery = apiaryQuery.eq('demo_session_id', demoSessionId);
      }

      const { data: apiariesData, error } = await apiaryQuery;

      if (error) throw error;
      const normalizedApiaries = (apiariesData || []).map((a: any) => {
        const raw = typeof a?.apiary_number === 'string' ? a.apiary_number : '';
        if (!raw) return a;
        if (/^START-/i.test(raw)) {
          return { ...a, apiary_number: raw.replace(/^START-/i, 'OS-') };
        }
        return a;
      });

      setApiaries(normalizedApiaries);

      try {
        const toFix = (apiariesData || []).filter((a: any) => {
          const raw = typeof a?.apiary_number === 'string' ? a.apiary_number : '';
          return /^START-/i.test(raw);
        });

        if (toFix.length > 0) {
          await Promise.all(
            toFix.map(async (a: any) => {
              const raw = String(a.apiary_number || '');
              const nextNumber = raw.replace(/^START-/i, 'OS-');
              const { error: updateError } = await supabase
                .from('apiaries')
                .update({ apiary_number: nextNumber })
                .eq('id', a.id)
                .eq('user_id', user.id);
              if (updateError) throw updateError;
            })
          );
        }
      } catch {}

      try {
        const offlineData = {
          apiaries: normalizedApiaries,
          hives: normalizedApiaries.flatMap((a: any) => a.hives || []),
          profile: profileData || null,
          timestamp: Date.now(),
        };
        localStorage.setItem('offline_data', JSON.stringify(offlineData));
        setOfflineReady(true);
      } catch {}
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'lager':
      case 'warehouse':
        return Warehouse;
      case 'oppstart':
      case 'store':
        return Store;
      case 'bil':
      case 'transport':
        return Truck;
      default: return MapPin;
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedApiaries(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const selectableIds = visibleApiaries.filter((a: any) => !a?.is_pending).map((a: any) => a.id);
    const allSelected = selectableIds.length > 0 && selectableIds.every((id: string) => selectedApiaries.includes(id));
    setSelectedApiaries(allSelected ? [] : selectableIds);
  };

  const handlePrintSigns = async () => {
    if (selectedApiaries.length === 0) return;
    if (currentUserId && activeOwnerId && activeOwnerId !== currentUserId) {
      alert('Du kan ikke skrive ut skilt for en annen konto. Bytt til "Min konto" først.');
      return;
    }
    setIsGeneratingPDF(true);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const apiariesToPrint = visibleApiaries.filter(a => selectedApiaries.includes(a.id));

      for (let i = 0; i < apiariesToPrint.length; i++) {
        const apiary = apiariesToPrint[i];
        if (i > 0) doc.addPage();

        // 1. Background (Yellow)
        doc.setFillColor(253, 224, 71); // Tailwind yellow-300
        doc.rect(0, 0, 210, 297, 'F');

        // 2. Black Border (Inset)
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(4); // ~11px
        doc.rect(5, 5, 200, 287);

        // 3. Header "BIGÅRD"
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(60);
        doc.setTextColor(0, 0, 0);
        doc.text('BIGÅRD', 105, 40, { align: 'center' });

        // 4. Responsible Beekeeper Section
        doc.setFontSize(14);
        doc.setTextColor(60, 60, 60);
        doc.text('ANSVARLIG BIRØKTER', 105, 60, { align: 'center' });

        const fullName = profile?.full_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
        const address = profile?.address || '';
        const city = `${profile?.post_code || ''} ${profile?.city || ''}`.trim();
        const phone = profile?.phone_number || profile?.phone || '';

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(28);
        doc.text((fullName || 'Ukjent Eier').toUpperCase(), 105, 75, { align: 'center' });
        
        doc.setFontSize(20);
        doc.text(address.toUpperCase(), 105, 85, { align: 'center' });
        doc.text(city.toUpperCase(), 105, 95, { align: 'center' });

        doc.setFontSize(28);
        doc.text(`TLF: ${phone}`, 105, 115, { align: 'center' });

        // 5. Badges
        let yPos = 140;
        if (profile?.is_norges_birokterlag_member) {
            // Black box
            doc.setFillColor(0, 0, 0);
            doc.rect(40, yPos, 130, 15, 'F');
            // Yellow text
            doc.setTextColor(253, 224, 71);
            doc.setFontSize(14);
            doc.text('MEDLEM AV NORGES BIRØKTERLAG', 105, yPos + 10, { align: 'center' });
            yPos += 25;
        }

        if (profile?.is_lek_honning_member) {
             // Black box
             doc.setFillColor(0, 0, 0);
             doc.rect(40, yPos, 130, 15, 'F');
             // Yellow text
             doc.setTextColor(253, 224, 71);
             doc.setFontSize(14);
             doc.text('MEDLEM AV LEK-HONNING™ NORGE', 105, yPos + 10, { align: 'center' });
        }

        // 6. Bottom Section (Location ID + QR)
        // Draw line
        doc.setLineWidth(2);
        doc.setDrawColor(0, 0, 0);
        doc.line(20, 230, 190, 230);

        // Location ID Text
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(16);
        doc.text('LOKASJON ID', 20, 245);
        
        doc.setTextColor(0, 0, 0);
        doc.setFont('courier', 'bold'); // Monospace look
        doc.setFontSize(36);
        doc.text(formatApiaryNumber(String(apiary.apiary_number || ''), apiary.type), 20, 260);

        // QR Code
        try {
            const qrUrl = `${window.location.origin}/apiaries/${apiary.id}`;
            const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 200 });
            // Add QR Image (30x30mm approx)
            doc.addImage(qrDataUrl, 'PNG', 150, 235, 40, 40);
            // Border around QR
            doc.setLineWidth(1);
            doc.rect(150, 235, 40, 40);
        } catch (err) {
            console.error('QR Gen Error', err);
        }
      }

      doc.autoPrint();
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');

    } catch (error) {
      console.error('Print generation failed', error);
      alert('Kunne ikke generere PDF. Prøv igjen.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleOfflineDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadProgress(0);
    
    try {
        if (!navigator.onLine) {
          alert('Slå på nett først, trykk «Last ned», og slå av nett etterpå.');
          return;
        }

        try {
          await navigator.serviceWorker?.register?.('/sw.js', { scope: '/' });
        } catch {}

        const existingRaw = localStorage.getItem('offline_data');
        let existing: any = {};
        if (existingRaw) {
          try {
            existing = JSON.parse(existingRaw);
          } catch {}
        }

        const hives = apiaries.flatMap((a) => a.hives || []);
        const hiveIds = hives.map((h: any) => h?.id).filter(Boolean);

        const documentPaths: string[] = ['/dashboard', '/apiaries', '/hives', '/settings'];
        apiaries.forEach((a) => documentPaths.push(`/apiaries/${a.id}`));
        hiveIds.forEach((id: string) => documentPaths.push(`/hives/${id}`));
        [
          '/dashboard/smittevern/veileder',
          '/dashboard/smittevern/sykdommer/varroa',
          '/dashboard/smittevern/sykdommer/lukket-yngelrate',
          '/dashboard/smittevern/sykdommer/apen-yngelrate',
          '/dashboard/smittevern/sykdommer/kalkyngel',
          '/dashboard/smittevern/sykdommer/nosema',
          '/dashboard/smittevern/sykdommer/frisk-kube',
        ].forEach((p) => documentPaths.push(p));

        const assetUrls = [
          '/images/sykdommer/sykdommer.png',
          '/images/sykdommer/varroa.png',
          '/images/sykdommer/lukket_yngelrate.png',
          '/images/sykdommer/apen_yngelrate.png',
          '/images/sykdommer/kalkyngel.png',
          '/images/sykdommer/nosema.png',
          '/images/sykdommer/frisk_kube.jpg',
        ];

        const totalSteps = 1 + 2 + 1 + documentPaths.length + assetUrls.length;

        let completed = 0;
        const bump = () => {
          completed += 1;
          setDownloadProgress(Math.min(100, Math.round((completed / totalSteps) * 100)));
        };

        const { data: inspectionsData } = await supabase
          .from('inspections')
          .select('*')
          .in('hive_id', hiveIds)
          .order('inspection_date', { ascending: false });
        bump();

        const { data: logsData } = await supabase
          .from('hive_logs')
          .select('*')
          .in('hive_id', hiveIds)
          .order('created_at', { ascending: false });
        bump();

        const offlineData = {
          ...existing,
          apiaries: apiaries,
          hives,
          inspections: inspectionsData || existing.inspections || [],
          logs: logsData || existing.logs || [],
          profile: profile || existing.profile || null,
          timestamp: Date.now(),
        };

        localStorage.setItem('offline_data', JSON.stringify(offlineData));
        bump();

        for (const path of documentPaths) {
          try {
            await (router as any).prefetch?.(path);
          } catch {}
          bump();
        }

        for (const url of assetUrls) {
          await fetch(url, { cache: 'reload' }).catch(() => {});
          bump();
        }

        setOfflineReady(true);
        alert('Offline er klart: bigårder, bikuber og inspeksjoner er lagret lokalt.');
    } catch (e) {
        console.error(e);
        alert('❌ Noe gikk galt. Sjekk nettet ditt og prøv igjen.');
    } finally {
        setIsDownloading(false);
    }
  };

  useEffect(() => {
    if (didAutoDownloadRef.current) return;
    if (loading) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('offline') !== '1') return;
    didAutoDownloadRef.current = true;
    void handleOfflineDownload();
  }, [loading]);

  if (loading) return <div className="p-8 text-center">Laster bigårder...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 print:bg-white print:pb-0">
      
      {/* HEADER & ACTIONS */}
      <div className="p-4 flex justify-between items-start gap-3 print:hidden">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900">Mine Lokasjoner</h1>
          {accounts.length > 1 ? (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Konto</span>
              <select
                value={activeOwnerId || currentUserId || ''}
                onChange={(e) => {
                  const next = e.target.value;
                  setActiveOwnerId(next);
                  try {
                    localStorage.setItem(ACTIVE_OWNER_KEY, next);
                  } catch {}
                  setSelectedApiaries([]);
                  setIsSelectionMode(false);
                }}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white max-w-[260px]"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-xs text-gray-500 mt-1">
              Konto: {profile?.full_name ? String(profile.full_name) : 'Min konto'}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {profile?.role !== 'tenant' && (
            <button
              onClick={handleOfflineDownload}
              disabled={isDownloading}
              className={`p-2 rounded-full transition-all ${
                isDownloading
                  ? 'bg-blue-500 text-white ring-4 ring-blue-200'
                  : 'bg-white text-gray-600 border border-gray-200 shadow-sm hover:text-blue-600 hover:bg-blue-50'
              }`}
              title="Last ned for offline bruk (v1.5)"
            >
              {isDownloading ? (
                <span className="text-[10px] font-bold">{downloadProgress}%</span>
              ) : (
                <div className="relative">
                  <Download className="w-5 h-5" />
                  <span
                    className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                      offlineReady || isServiceWorkerControlling ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                  ></span>
                </div>
              )}
            </button>
          )}

          <button
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              setSelectedApiaries([]);
            }}
            className={`p-2 rounded-full ${isSelectionMode ? 'bg-gray-200 text-gray-800' : 'bg-white text-gray-600 border border-gray-200 shadow-sm'}`}
          >
            {isSelectionMode ? <X className="w-5 h-5" /> : <Printer className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* SELECTION BAR */}
      {isSelectionMode && (
        <div className="mx-4 mb-4 bg-white p-3 rounded-xl border border-honey-200 shadow-sm grid grid-cols-[1fr_auto_1fr] items-center gap-3 animate-in slide-in-from-top-2 print:hidden">
          <span className="text-sm font-medium">{selectedApiaries.length} valgt</span>
          <button
            type="button"
            onClick={toggleSelectAll}
            className="bg-gray-100 text-gray-900 px-3 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 flex items-center gap-2"
          >
            {selectedApiaries.length === visibleApiaries.filter((a: any) => !a?.is_pending).length ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            Velg alle
          </button>
          <div className="flex justify-end">
            <button
              onClick={handlePrintSigns}
              disabled={selectedApiaries.length === 0 || isGeneratingPDF}
              className="bg-honey-500 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              {isGeneratingPDF ? 'Klargjør...' : 'Skriv ut Skilt'}
            </button>
          </div>
        </div>
      )}

      {/* LIST VIEW (Screen) */}
      <main className="p-4 space-y-4 print:hidden">
        {visibleApiaries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">Du har ingen lokasjoner enda.</p>
            <p>Trykk på + for å komme i gang!</p>
          </div>
        ) : (
          visibleApiaries.map((apiary) => {
            const Icon = getIcon(apiary.type);
            const activeHiveCount = apiary.hives?.filter((h: any) => h.active).length || 0;
            const isSelected = selectedApiaries.includes(apiary.id);
            const apiaryNumberRaw = formatApiaryNumber(String(apiary.apiary_number || ''), apiary.type);
            const dashIndex = apiaryNumberRaw.indexOf('-');
            const apiaryNumberPrefix = dashIndex > 0 ? apiaryNumberRaw.slice(0, dashIndex + 1) : apiaryNumberRaw;
            const apiaryNumberRest = dashIndex > 0 ? apiaryNumberRaw.slice(dashIndex + 1) : '';

            if (apiary.is_pending) {
              return (
                <div key={apiary.id} className="relative group opacity-75">
                  <div className="bg-white p-4 rounded-xl border border-dashed border-honey-300 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-honey-50 rounded-full flex items-center justify-center text-honey-600 shrink-0 animate-pulse">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-gray-900 truncate">{apiary.name}</h3>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          apiary.status === 'active' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {apiary.status === 'active' ? 'Under opprettelse' : 'Venter på behandling'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{apiary.location}</p>
                      <p className="text-xs text-honey-600 mt-1">
                        {apiary.status === 'active' 
                          ? 'Venter på godkjenning fra birøkter' 
                          : 'Bestillingen er mottatt'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={apiary.id} className="relative group">
                 {isSelectionMode && (
                    <button
                      onClick={() => toggleSelection(apiary.id)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-6 h-6 text-honey-600 bg-white rounded" />
                      ) : (
                        <Square className="w-6 h-6 text-gray-300 bg-white rounded" />
                      )}
                    </button>
                 )}

                <Link 
                  href={isSelectionMode ? '#' : `/apiaries/${apiary.id}`}
                  onClick={(e) => {
                    if (isSelectionMode) {
                      e.preventDefault();
                      toggleSelection(apiary.id);
                      return;
                    }
                  }}
                  className={`block transition-all ${isSelectionMode ? 'pl-12' : ''}`}
                >
                  <div className={`bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4 transition-colors cursor-pointer ${
                    isSelected ? 'border-honey-500 ring-1 ring-honey-500' : 'border-gray-200 hover:border-honey-500'
                  }`}>
                    <div className="w-12 h-12 bg-honey-50 rounded-lg flex items-center justify-center text-honey-700 font-mono font-bold text-sm shrink-0">
                      <div className="text-center leading-none">
                        <div>{apiaryNumberPrefix}</div>
                        {apiaryNumberRest ? <div className="mt-0.5">{apiaryNumberRest}</div> : null}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-gray-900 truncate">{apiary.name}</h3>
                        <div className="flex items-center gap-2 shrink-0">
                          {activeHiveCount > 0 && (
                            <span className="text-xs font-medium bg-honey-100 text-honey-700 px-2 py-1 rounded-full flex items-center gap-1">
                              <Box className="w-3 h-3" />
                              {activeHiveCount}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500 min-w-0">
                        <MapPin className="w-4 h-4 shrink-0 text-honey-600" />
                        <span className="truncate">{apiary.location || 'Ingen adresse'}</span>
                      </div>
                      {apiary.registration_number && (
                        <p className="text-xs text-gray-400 mt-1">Skilt: {apiary.registration_number}</p>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            );
          })
        )}
      </main>

      {/* Floating Action Buttons (Hide in selection mode and for tenants) */}
      {!isSelectionMode && profile?.role !== 'tenant' && (
        <div className="fixed bottom-28 right-6 flex flex-col items-center gap-4 z-[200] print:hidden">

          {/* New Apiary Button */}
          <Link 
            href="/apiaries/new"
            className="w-14 h-14 bg-honey-500 hover:bg-honey-600 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          >
            <Plus className="w-8 h-8" />
          </Link>
        </div>
      )}

      {!isSelectionMode && (
        <div className="fixed bottom-28 left-6 z-[200] print:hidden">
          <button
            onClick={() => {
              if (isListeningRef.current) {
                try { stopListening(); } catch {}
                setVoiceStep('idle');
                setSelectedVoiceApiary(null);
                setVoiceInfo('');
              } else {
                try { startListening(); } catch {}
                setVoiceStep('armed');
                setSelectedVoiceApiary(null);
                setVoiceInfo('Si "start inspeksjon".');
                speak('Si start inspeksjon.');
              }
            }}
            className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 ${
              isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-honey-500 text-white'
            }`}
          >
            {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          {voiceInfo ? (
            <div className="mt-3 max-w-[280px] bg-white px-4 py-3 rounded-xl shadow-md text-sm font-medium text-gray-700 border border-gray-200">
              {voiceInfo}
            </div>
          ) : null}
        </div>
      )}


    </div>
  );
}
