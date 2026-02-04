'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateAgreementCheck, saveAmbitions, signAgreement, exitFounder, logActivity } from '@/app/actions/founder';
import { HeartHandshake, FileText, Clock, CheckCircle, AlertTriangle, LogOut, Download, Save, History, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';

interface FounderClientProps {
  profile: any;
  checks: string[];
  ambitions: any;
  logs: any[];
}

export default function FounderClient({ profile, checks, ambitions, logs }: FounderClientProps) {
  const [activeTab, setActiveTab] = useState<'agreement' | 'dashboard'>('dashboard');
  
  if (profile.status === 'exited') {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-6">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
          <HeartHandshake className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Vennskapet er bevart</h1>
        <p className="text-gray-600">
          Du har valgt å sette vennskapet foran samarbeidet. Dette er en hederlig avgjørelse.
          Din tilgang til gründermodulen er nå stengt, men historikken er bevart.
        </p>
        <div className="text-sm text-gray-500">
          Avsluttet: {new Date(profile.exited_at).toLocaleDateString()}
        </div>
      </div>
    );
  }

  if (profile.status === 'active') {
    return <FounderDashboard profile={profile} ambitions={ambitions} logs={logs} />;
  }

  return <FounderAgreement profile={profile} initialChecks={checks} initialAmbitions={ambitions} />;
}

function FounderAgreement({ profile, initialChecks, initialAmbitions }: { profile: any, initialChecks: string[], initialAmbitions: any }) {
  const [checks, setChecks] = useState<string[]>(initialChecks);
  const [ambitions, setAmbitions] = useState(initialAmbitions || { contribution: '', goal_30_days: '', goal_1_year: '', goal_5_years: '' });
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isSigning, setIsSigning] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (profile.cooldown_until) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const end = new Date(profile.cooldown_until).getTime();
        const distance = end - now;

        if (distance < 0) {
          setTimeLeft('Klar for signering');
          clearInterval(interval);
        } else {
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          setTimeLeft(`${hours}t ${minutes}m igjen av tenkepausen`);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [profile.cooldown_until]);

  const handleCheck = async (key: string, checked: boolean) => {
    if (checked) {
      setChecks([...checks, key]);
    } else {
      setChecks(checks.filter(k => k !== key));
    }
    await updateAgreementCheck(key, checked);
  };

  const handleAmbitionChange = (key: string, value: string) => {
    setAmbitions({ ...ambitions, [key]: value });
  };

  const handleSaveAmbitions = async () => {
    await saveAmbitions(ambitions);
    alert('Ambisjoner lagret');
  };

  const handleSign = async () => {
    if (!confirm('Er du helt sikker? Dette er en juridisk bindende avtale.')) return;
    setIsSigning(true);
    const res = await signAgreement();
    if (res.error) {
        alert(res.error);
        setIsSigning(false);
    } else {
        // Refresh handled by action revalidate
    }
  };

  const allChecksDone = [
    'no_salary_guarantee', 
    'may_work_without_pay', 
    'voluntary_participation', 
    'friendship_first', 
    'read_full_agreement'
  ].every(k => checks.includes(k));

  const cooldownPassed = !profile.cooldown_until || new Date(profile.cooldown_until) < new Date();
  const ambitionsFilled = ambitions.contribution && ambitions.goal_30_days;

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-24">
      <div className="text-center space-y-4">
        <img src="/BILDER/LEK-Biens vokter våpen.png" alt="Våpenskjold" className="w-24 h-24 mx-auto" />
        <h1 className="text-3xl font-serif font-bold text-gray-900">Venne- og familiebeskyttelsesavtale</h1>
        <p className="text-gray-600 italic">"Vennskapet foran alt"</p>
      </div>

      <div className="bg-white border-2 border-amber-100 rounded-xl shadow-sm p-6 max-h-[400px] overflow-y-auto space-y-6 prose prose-amber text-sm">
        <h3>1. Formål</h3>
        <p>Denne avtalen finnes av én grunn: Å sikre at vi kan fortsette å være venner/familie uansett hva som skjer i samarbeidet i LEK-systemet.</p>

        <h3>2. Forståelse av risiko</h3>
        <p>Dette er ikke en jobb med lønn eller garantier. Jeg forstår at jeg kan komme til å legge ned hundrevis av arbeidstimer uten å tjene penger. Min økonomiske fremgang er utelukkende avhengig av min egen innsats, ideer og resultater.</p>

        <h3>3. Frivillig deltakelse</h3>
        <p>Jeg bekrefter at jeg deltar av egen fri vilje, uten press, forventning eller påvirkning.</p>

        <h3>4. Arbeidstid vs privat tid</h3>
        <p>I arbeidstiden representerer vi LEK-systemet. I privat tid representerer vi kun vårt vennskap/familieforhold. Begge parter kan når som helst stoppe jobbprat i sosiale settinger.</p>

        <h3>5. Ingen særfordeler</h3>
        <p>Å være venn eller familie gir ingen fordeler i systemet. Det stilles tvert imot høyere krav til ryddighet og profesjonalitet.</p>

        <h3>6. Loggføring i gründermodulen</h3>
        <p>Alt arbeid, ideer, planer og fremdrift skal loggføres i gründermodulen. Dette er for å sikre åpenhet og for å fange opp gnisninger tidlig.</p>

        <h3>7. Vennskapet foran alt-regelen</h3>
        <p>Dersom en av partene opplever at samarbeidet påvirker relasjonen negativt, skal samarbeidet avsluttes samme dag. Uten konflikt. Uten diskusjon. Kun for å bevare relasjonen.</p>

        <h3>8. Refleksjon før signering</h3>
        <p>Denne avtalen kan ikke signeres før 48 timer etter at den er lest.</p>
      </div>

      <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-200">
        <h3 className="font-bold text-gray-900">Bekreftelser</h3>
        {[
          { k: 'no_salary_guarantee', t: 'Jeg forstår at dette ikke er en jobb med lønnsgaranti' },
          { k: 'may_work_without_pay', t: 'Jeg forstår at jeg kan jobbe mye uten betaling' },
          { k: 'voluntary_participation', t: 'Jeg deltar frivillig' },
          { k: 'friendship_first', t: 'Vennskapet er viktigere enn samarbeidet' },
          { k: 'read_full_agreement', t: 'Jeg har lest og forstått hele avtalen' }
        ].map(({ k, t }) => (
          <label key={k} className="flex items-start gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={checks.includes(k)} 
              onChange={(e) => handleCheck(k, e.target.checked)}
              className="mt-1 w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
            />
            <span className="text-sm text-gray-700">{t}</span>
          </label>
        ))}
      </div>

      {allChecksDone && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-amber-50 p-6 rounded-xl border border-amber-200">
            <div className="flex items-center gap-3 mb-4">
               <Clock className="w-5 h-5 text-amber-600" />
               <h3 className="font-bold text-amber-900">Tenkepause</h3>
            </div>
            {timeLeft ? (
               <p className="text-amber-800 font-medium text-lg">{timeLeft}</p>
            ) : (
               <p className="text-green-700 font-bold">Tenkepausen er over. Du kan nå fylle ut ambisjoner og signere.</p>
            )}
            <p className="text-xs text-amber-700 mt-2">Du må vente 48 timer etter at du har lest og krysset av punktene før du kan signere.</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-gray-900">Mine ambisjoner</h3>
            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Hva vil du bidra med?</label>
                    <textarea 
                        value={ambitions.contribution}
                        onChange={(e) => handleAmbitionChange('contribution', e.target.value)}
                        className="w-full rounded-lg border-gray-300 text-sm" rows={3}
                        placeholder="Dine styrker, tid, kompetanse..."
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Mål om 30 dager</label>
                    <textarea 
                        value={ambitions.goal_30_days}
                        onChange={(e) => handleAmbitionChange('goal_30_days', e.target.value)}
                        className="w-full rounded-lg border-gray-300 text-sm" rows={2}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Mål om 1 år</label>
                    <textarea 
                        value={ambitions.goal_1_year}
                        onChange={(e) => handleAmbitionChange('goal_1_year', e.target.value)}
                        className="w-full rounded-lg border-gray-300 text-sm" rows={2}
                    />
                </div>
                <button 
                    onClick={handleSaveAmbitions}
                    className="text-xs text-gray-500 flex items-center gap-1 hover:text-gray-900"
                >
                    <Save className="w-3 h-3" /> Lagre utkast
                </button>
            </div>
          </div>

          <button
            onClick={handleSign}
            disabled={!cooldownPassed || !ambitionsFilled || isSigning}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all ${
                !cooldownPassed || !ambitionsFilled 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 transform hover:scale-[1.02]'
            }`}
          >
            {isSigning ? 'Signerer...' : 'Signer Vennskapsavtale'}
          </button>
        </div>
      )}
    </div>
  );
}

function FounderDashboard({ profile, ambitions, logs }: { profile: any, ambitions: any, logs: any[] }) {
    const [logForm, setLogForm] = useState({ did: '', plans: '', ideas: '', color: 'green' });
    const [isLogging, setIsLogging] = useState(false);

    const handleLogSubmit = async () => {
        if (!logForm.did) return;
        setIsLogging(true);
        await logActivity({
            did_since_last: logForm.did,
            plans_now: logForm.plans,
            ideas: logForm.ideas,
            status_color: logForm.color
        });
        setLogForm({ did: '', plans: '', ideas: '', color: 'green' });
        setIsLogging(false);
    };

    const handleExit = async () => {
        if (confirm('Er du sikker på at du vil avslutte samarbeidet for å bevare vennskapet? Dette kan ikke angres, men historikken din vil bli tatt vare på.')) {
            await exitFounder('Vennskapet foran alt');
        }
    };

    const handleDownloadPDF = async () => {
        window.open('/api/founder/agreement/pdf', '_blank');
    };

    return (
        <div className="max-w-3xl mx-auto pb-24 space-y-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-white p-6 rounded-2xl border border-amber-100 flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <img src="/BILDER/LEK-Biens vokter våpen.png" alt="Shield" className="w-10 h-10" />
                        <h1 className="text-xl font-bold text-gray-900">Gründermodul</h1>
                    </div>
                    <p className="text-sm text-gray-600 max-w-md">
                        Her loggfører du innsatsen din. Husk: Åpenhet bygger tillit. Tillit bevarer vennskap.
                    </p>
                </div>
                <div className="flex flex-col gap-2">
                    <button 
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <FileText className="w-3 h-3" />
                        Avtale PDF
                    </button>
                    <button 
                        onClick={handleExit}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg text-xs font-medium text-red-700 hover:bg-red-100"
                    >
                        <LogOut className="w-3 h-3" />
                        Exit (Vennskap først)
                    </button>
                </div>
            </div>

            {/* Log Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-amber-500" />
                    Ny loggføring
                </h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Hva har du gjort siden sist?</label>
                        <textarea 
                            value={logForm.did}
                            onChange={(e) => setLogForm({ ...logForm, did: e.target.value })}
                            className="w-full rounded-lg border-gray-300 text-sm" rows={3}
                            placeholder="Vær konkret..."
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Planer fremover</label>
                            <textarea 
                                value={logForm.plans}
                                onChange={(e) => setLogForm({ ...logForm, plans: e.target.value })}
                                className="w-full rounded-lg border-gray-300 text-sm" rows={2}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Ideer / Tanker</label>
                            <textarea 
                                value={logForm.ideas}
                                onChange={(e) => setLogForm({ ...logForm, ideas: e.target.value })}
                                className="w-full rounded-lg border-gray-300 text-sm" rows={2}
                            />
                        </div>
                    </div>
                    
                    <div>
                         <label className="block text-xs font-medium text-gray-700 mb-2">Status / Følelse</label>
                         <div className="flex gap-4">
                            {['green', 'yellow', 'red'].map(c => (
                                <button
                                    key={c}
                                    onClick={() => setLogForm({ ...logForm, color: c })}
                                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                                        logForm.color === c ? 'scale-110 ring-2 ring-offset-2 ring-gray-300' : 'opacity-50 hover:opacity-100'
                                    } ${
                                        c === 'green' ? 'bg-green-500 border-green-600' :
                                        c === 'yellow' ? 'bg-yellow-400 border-yellow-500' :
                                        'bg-red-500 border-red-600'
                                    }`}
                                />
                            ))}
                         </div>
                         <p className="text-xs text-gray-500 mt-1">
                             Grønn: Alt bra. Gul: Litt rusk/usikkerhet. Rød: Vi må prate ASAP.
                         </p>
                    </div>

                    <button 
                        onClick={handleLogSubmit}
                        disabled={!logForm.did || isLogging}
                        className="w-full py-2 bg-gray-900 text-white rounded-lg font-bold text-sm hover:bg-gray-800 disabled:opacity-50"
                    >
                        {isLogging ? 'Lagrer...' : 'Lagre logg'}
                    </button>
                </div>
            </div>

            {/* History */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 px-2">
                    <History className="w-5 h-5 text-gray-500" />
                    Historikk
                </h2>
                {logs.map((log) => (
                    <div key={log.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex gap-4">
                        <div className={`w-3 h-full min-h-[50px] rounded-full flex-shrink-0 ${
                            log.status_color === 'green' ? 'bg-green-400' :
                            log.status_color === 'yellow' ? 'bg-yellow-400' : 'bg-red-400'
                        }`} />
                        <div className="flex-1 space-y-2">
                            <div className="flex justify-between items-start">
                                <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: nb })}</p>
                            </div>
                            <div className="prose prose-sm max-w-none">
                                <p className="font-medium text-gray-900">{log.did_since_last}</p>
                                {(log.plans_now || log.ideas) && (
                                    <div className="mt-2 pt-2 border-t border-gray-100 grid grid-cols-2 gap-4 text-xs text-gray-600">
                                        {log.plans_now && <div><strong>Planer:</strong> {log.plans_now}</div>}
                                        {log.ideas && <div><strong>Ideer:</strong> {log.ideas}</div>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
