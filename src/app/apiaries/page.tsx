'use client';

import { createClient, getUserWithSessionFallback, withTimeout } from '@/utils/supabase/client';
import { useEffect, useMemo, useState } from 'react';
import { MapPin, Warehouse, Store, Truck, Box, Printer, CheckSquare, Square, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

const ACTIVE_OWNER_KEY = 'lek_active_owner_id';

export default function ApiariesPage() {
  const [apiaries, setApiaries] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [accounts, setAccounts] = useState<{ id: string; label: string }[]>([]);
  const [activeOwnerId, setActiveOwnerId] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [apiaryTaskSummaryById, setApiaryTaskSummaryById] = useState<Record<string, { openCount: number; nextTaskTitle: string }>>({});
  const [apiaryTasksUnavailable, setApiaryTasksUnavailable] = useState(false);

  // Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedApiaries, setSelectedApiaries] = useState<string[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const visibleApiaries = useMemo(() => {
    const ownerId = activeOwnerId || currentUserId;
    if (!ownerId) return apiaries || [];
    return (apiaries || []).filter((a: any) => String(a?.user_id || '') === String(ownerId));
  }, [activeOwnerId, apiaries, currentUserId]);

  const computeNextTaskTitle = (tasks: any[]) => {
    if (!tasks || tasks.length === 0) return '';
    const sorted = tasks
      .slice()
      .sort((a, b) => {
        const aHasDate = Boolean((a as any)?.due_date);
        const bHasDate = Boolean((b as any)?.due_date);
        if (aHasDate !== bHasDate) return aHasDate ? -1 : 1;
        const aDue = (a as any)?.due_date ? new Date(String((a as any).due_date)).getTime() : 0;
        const bDue = (b as any)?.due_date ? new Date(String((b as any).due_date)).getTime() : 0;
        if (aDue !== bDue) return aDue - bDue;
        const aCreated = (a as any)?.created_at ? new Date(String((a as any).created_at)).getTime() : 0;
        const bCreated = (b as any)?.created_at ? new Date(String((b as any).created_at)).getTime() : 0;
        return aCreated - bCreated;
      });
    return String((sorted[0] as any)?.title || '').trim();
  };

  const fetchApiaryTasksSummary = async (list: any[]) => {
    const apiaryIds = (list || []).map((a: any) => String(a?.id || '').trim()).filter(Boolean);
    if (apiaryIds.length === 0) {
      setApiaryTaskSummaryById({});
      return;
    }

    try {
      const { data, error } = await supabase
        .from('apiary_tasks')
        .select('apiary_id, title, due_date, created_at')
        .in('apiary_id', apiaryIds)
        .is('completed_at', null);

      if (error) {
        const msg = String((error as any)?.message || (error as any)?.details || '');
        const missing = msg.toLowerCase().includes('apiary_tasks') && (msg.toLowerCase().includes('does not exist') || msg.toLowerCase().includes('schema cache'));
        setApiaryTasksUnavailable(missing);
        setApiaryTaskSummaryById({});
        return;
      }

      setApiaryTasksUnavailable(false);

      const tasks = Array.isArray(data) ? data : [];
      const byApiary = new Map<string, any[]>();
      for (const t of tasks) {
        const apiaryId = String((t as any)?.apiary_id || '').trim();
        if (!apiaryId) continue;
        const existing = byApiary.get(apiaryId) || [];
        existing.push(t);
        byApiary.set(apiaryId, existing);
      }

      const summary: Record<string, { openCount: number; nextTaskTitle: string }> = {};
      for (const id of apiaryIds) {
        const list = byApiary.get(id) || [];
        if (list.length === 0) continue;
        summary[id] = {
          openCount: list.length,
          nextTaskTitle: computeNextTaskTitle(list),
        };
      }
      setApiaryTaskSummaryById(summary);
    } catch {
      setApiaryTaskSummaryById({});
    }
  };

  const formatApiaryNumber = (raw: string, type?: string) => {
    const s = String(raw || '');
    return s.split('.')[0];
  };

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

      const user = await getUserWithSessionFallback(supabase);
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
      let profileData: any = null;
      try {
        const profileRes = await withTimeout(
          supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single(),
          8000,
          'Profilen svarte ikke'
        );
        profileData = profileRes.data;
      } catch {}

      setProfile(profileData);

      if (isDemoView && demoOwnerId && demoSessionId) {
        setAccounts([{ id: demoOwnerId, label: 'Demo konto' }]);
        setActiveOwnerId(demoOwnerId);
        try {
          localStorage.setItem(ACTIVE_OWNER_KEY, demoOwnerId);
        } catch {}
      } else {
        try {
          const data = await withTimeout(
            fetch('/api/access/list', { method: 'GET' }).then((res) => res.json().catch(() => ({}))),
            7000,
            'Kontotilgang svarte ikke'
          );
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

      const { data: apiariesData, error } = await withTimeout(apiaryQuery, 12000, 'Bigårder svarte ikke');

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
      await withTimeout(fetchApiaryTasksSummary(normalizedApiaries), 8000, 'Oppgaver svarte ikke').catch(() => {});

      try {
        const toFix = (apiariesData || []).filter((a: any) => {
          const raw = typeof a?.apiary_number === 'string' ? a.apiary_number : '';
          return /^START-/i.test(raw);
        });

        if (toFix.length > 0) {
          await withTimeout(
            Promise.all(
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
            ),
            8000,
            'Nummervasking svarte ikke'
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
          <div className="text-sm font-bold text-gray-900">📝 Bigårdslogg</div>
          <div className="text-xs text-gray-600 mt-1">
            Notater og oppgaver ligger inne på hver lokasjon. Trykk på en lokasjon for å åpne Bigårdslogg.
          </div>
          {apiaryTasksUnavailable ? (
            <div className="text-xs text-red-700 mt-2">
              Databasen mangler nye tabeller for Bigårdslogg. Kjør Supabase-migrasjonen 20260622_apiary_log_tasks_calendar.sql i staging og oppdater siden.
            </div>
          ) : null}
        </div>

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
                          {apiaryTaskSummaryById[apiary.id]?.openCount ? (
                            <span className="text-xs font-medium bg-indigo-50 text-indigo-800 px-2 py-1 rounded-full flex items-center gap-1 border border-indigo-100">
                              <CheckSquare className="w-3 h-3" />
                              {apiaryTaskSummaryById[apiary.id].openCount}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500 min-w-0">
                        <MapPin className="w-4 h-4 shrink-0 text-honey-600" />
                        <span className="truncate">{apiary.location || 'Ingen adresse'}</span>
                      </div>
                      {apiaryTaskSummaryById[apiary.id]?.openCount ? (
                        <div className="text-xs text-gray-600 mt-1 truncate">
                          Åpne oppgaver: {apiaryTaskSummaryById[apiary.id].openCount}
                          {apiaryTaskSummaryById[apiary.id].nextTaskTitle ? ` • Neste: ${apiaryTaskSummaryById[apiary.id].nextTaskTitle}` : ''}
                        </div>
                      ) : null}
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

    </div>
  );
}
