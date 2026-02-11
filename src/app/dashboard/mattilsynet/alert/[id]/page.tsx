'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { Map as MapIcon, Phone, Mail, User, AlertTriangle, CheckCircle, Clock, Ruler, AlertOctagon, FileText, Camera, Mic, Send, Edit, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getIncidentData, updateIncidentStatus, updateIncidentDisease, sendZoneAlert } from '@/app/actions/mattilsynet';

// Dynamic import for Map to avoid SSR issues
const IncidentMap = dynamic(() => import('@/components/IncidentMap'), { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-400">Laster kart...</div>
});

// Mock Geocoding for demo stability
const GEO_CACHE: Record<string, [number, number]> = {
    'Halden': [59.1243, 11.3875],
    'Halden Øst': [59.1280, 11.4000],
    'Halden Vest': [59.1200, 11.3600],
    'Tistedal': [59.1443, 11.4545],
    'Fredrikstad': [59.2181, 10.9298],
    'Sarpsborg': [59.2840, 11.1096],
    'Oslo': [59.9139, 10.7522],
};

function getCoordinates(location: string): [number, number] {
    // Check cache first
    const cleanLoc = location.split(',')[0].trim(); // "Halden, Norway" -> "Halden"
    if (GEO_CACHE[cleanLoc]) return GEO_CACHE[cleanLoc];
    
    // Fuzzy match
    for (const key of Object.keys(GEO_CACHE)) {
        if (cleanLoc.includes(key)) return GEO_CACHE[key];
    }

    // Default random near Halden for demo if unknown
    return [59.1243 + (Math.random() - 0.5) * 0.1, 11.3875 + (Math.random() - 0.5) * 0.1];
}

// Haversine distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number): number {
    return deg * (Math.PI/180);
}

const MOCK_LOGS = [
    { time: '13:02', event: 'System opprettet hendelse', user: 'System' },
    { time: '13:07', event: 'Saksbehandler åpnet', user: 'Mattilsynet' },
    { time: '13:10', event: 'Radius satt til 3 km', user: 'Mattilsynet' },
    { time: '13:12', event: 'Varsel sendt til 4 birøktere', user: 'System' }
];

export default function IncidentPage({ params }: { params: { id: string } }) {
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState<any>(null);
    const [allApiaries, setAllApiaries] = useState<any[]>([]);
    const [mapApiaries, setMapApiaries] = useState<any[]>([]);
    const [radius, setRadius] = useState(3000); // meters
    const [affectedList, setAffectedList] = useState<any[]>([]);
    const [incidentStatus, setIncidentStatus] = useState<string>('investigating');
    const [mapCenter, setMapCenter] = useState<[number, number]>([59.1243, 11.3875]);
    const [showOtherApiariesOnMap, setShowOtherApiariesOnMap] = useState(false);
    const [debugInfo, setDebugInfo] = useState<any>(null);
    
    // Alert Modal State
    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [sendingAlert, setSendingAlert] = useState(false);
    const [alertSent, setAlertSent] = useState(false);

    useEffect(() => {
        fetchData();
    }, [params.id]);

    useEffect(() => {
        if (alert && allApiaries.length > 0) {
            calculateAffected();
        }
    }, [alert, allApiaries, radius]);

    // Update default alert message when disease name changes
    useEffect(() => {
        if (alert) {
            const disease = alert.details?.split('Sykdom: ')[1]?.split(',')[0] || 'Sykdom';
            const location = alert.hives?.apiaries?.location || 'ditt område';
            
            let advice = "Sjekk bifolket for symptomer umiddelbart.";
            if (disease.includes('Kalkyngel')) advice += " Se etter hvite/grå mumier på bunnbrettet.";
            if (disease.includes('yngelråte')) advice += " Se etter nedsunkne cellelokk og lukt.";
            if (disease.includes('Varroa')) advice += " Tell middnedfall og vurder behandling.";

            setAlertMessage(
`VIKTIG MELDING FRA MATTILSYNET

Det er påvist mistanke om smittsom sykdom (${disease}) i ${location}.
Din bigård ligger innenfor sikringssonen på ${radius/1000} km.

PÅLAGTE TILTAK:
1. ${advice}
2. Ikke flytt bier eller utstyr ut av sonen.
3. Rapporter status via appen ("Ny Inspeksjon") innen 48 timer.

Dette er en automatisk varsling. Ved spørsmål, kontakt lokalt birøkterlag eller Mattilsynet.

Mvh,
Mattilsynet`
            );
        }
    }, [alert, radius]);

    async function fetchData() {
        try {
            const result = await getIncidentData(params.id);
            
            if (result.error || !result.success) {
                console.error("Server Action Error:", result.error);
                setDebugInfo({ error: result.error });
                setLoading(false);
                return;
            }

            const { alert: alertData, apiaries: apiariesData } = result;

            // Prepare data with coordinates
            let centerCoords: [number, number];
            if (alertData?.hives?.apiaries?.coordinates) {
                const parts = alertData.hives.apiaries.coordinates.split(',');
                if (parts.length === 2) {
                    centerCoords = [parseFloat(parts[0]), parseFloat(parts[1])];
                } else {
                    centerCoords = getCoordinates(alertData?.hives?.apiaries?.location || 'Halden');
                }
            } else {
                centerCoords = getCoordinates(alertData?.hives?.apiaries?.location || 'Halden');
            }
            
            setMapCenter(centerCoords);

            // Logic to identify owner apiaries: Match by User ID first, then Email
            const reporterId = alertData?.user_id || alertData?.reporter?.id;
            const reporterEmail = alertData?.reporter?.email;

            const processedApiaries = (apiariesData || []).map((a: any) => ({
                ...a,
                isOwner: (reporterId && a.user_id === reporterId) || (reporterEmail && a.users?.email === reporterEmail),
                ...(() => {
                    if (a.coordinates) {
                        const parts = a.coordinates.split(',');
                        if (parts.length === 2) {
                            return { lat: parseFloat(parts[0]), lon: parseFloat(parts[1]) };
                        }
                    }
                    const [lat, lon] = getCoordinates(a.location || 'Ukjent');
                    return { lat, lon };
                })()
            })).filter((a: any) => a.id !== alertData?.hives?.apiaries?.id);

            setAlert(alertData);
            setAllApiaries(processedApiaries);
            setIncidentStatus(alertData?.admin_status || 'investigating');
            
            setDebugInfo({
                alertId: alertData?.id,
                reporter: alertData?.reporter?.email,
                totalApiariesFetched: apiariesData?.length || 0,
                processedApiariesCount: processedApiaries.length,
                ownerApiariesCount: processedApiaries.filter((a: any) => a.isOwner).length,
                mapCenter: centerCoords
            });

            setLoading(false);

        } catch (e) {
            console.error("Error fetching incident data:", e);
            setDebugInfo({ error: "Exception in fetchData", details: e });
            setLoading(false);
        }
    }

    function getImageUrl(details: string): string | null {
        if (!details) return null;
        const match = details.match(/Bilde: (https?:\/\/[^\s]+)/);
        return match ? match[1] : null;
    }

    function getAiDetails(details: string): string | null {
        if (!details) return null;
        if (details.includes('[AI Analyse]')) {
            return details.split('[AI Analyse]')[1];
        }
        return null;
    }

    function calculateAffected() {
        if (!mapCenter) return;
        
        const processed = allApiaries.map(apiary => {
            const distKm = calculateDistance(mapCenter[0], mapCenter[1], apiary.lat, apiary.lon);
            return {
                ...apiary,
                distance: distKm.toFixed(1),
                isInside: distKm * 1000 <= radius
            };
        });

        setMapApiaries(processed);
        setAffectedList(processed.filter(a => a.isInside));
    }

    async function handleStatusUpdate(newStatus: string) {
        try {
            const result = await updateIncidentStatus(params.id, newStatus);
            if (result.error) throw new Error(result.error);
            setIncidentStatus(newStatus);
        } catch (e) {
            console.error("Failed to update status", e);
            alert("Kunne ikke oppdatere status");
        }
    }

    async function handleDiseaseChange(newDisease: string) {
        try {
            // Clean "(Mistenkt)" from string if present for storage
            const cleanDisease = newDisease.replace(' (Mistenkt)', '');
            const result = await updateIncidentDisease(params.id, cleanDisease);
            if (result.error) throw new Error(result.error);
            
            // Optimistically update local state
            setAlert(prev => ({
                ...prev,
                details: prev.details.includes('Sykdom:') 
                    ? prev.details.replace(/Sykdom: [^,]+/, `Sykdom: ${cleanDisease}`)
                    : `Sykdom: ${cleanDisease}, ${prev.details}`
            }));
        } catch (e) {
            console.error("Failed to update disease", e);
            alert("Kunne ikke endre sykdomstype");
        }
    }

    async function handleSendAlert() {
        setSendingAlert(true);
        try {
            const emails = affectedList.map(a => a.users?.email).filter(Boolean);
            const result = await sendZoneAlert(params.id, radius, emails, alertMessage);
            
            if (result.success) {
                setAlertSent(true);
                setTimeout(() => {
                    setIsAlertModalOpen(false);
                    setAlertSent(false);
                }, 2000);
            }
        } catch (e) {
            console.error("Failed to send alert", e);
            alert("Kunne ikke sende varsel");
        } finally {
            setSendingAlert(false);
        }
    }

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50">Laster beredskapsrom...</div>;
    if (!alert) return (
        <div className="h-screen flex flex-col items-center justify-center gap-4">
            <h2 className="text-xl font-bold">Fant ikke hendelsen</h2>
            {debugInfo && (
                <pre className="bg-gray-100 p-4 rounded text-xs max-w-lg overflow-auto border border-red-300">
                    {JSON.stringify(debugInfo, null, 2)}
                </pre>
            )}
        </div>
    );

    const isResolved = incidentStatus === 'resolved';
    const rawDiseaseName = alert.details?.split('Sykdom: ')[1]?.split(',')[0] || 'Kalkyngel';
    // Logic: If investigating, show as Suspected if it matches known types, otherwise just show name
    const diseaseName = rawDiseaseName; 
    
    // Construct options dynamically to ensure current value exists
    const baseDiseases = ['Kalkyngel', 'Åpen yngelråte', 'Lukket yngelråte', 'Varroa'];
    // Add current disease if not in list
    const diseases = baseDiseases.includes(diseaseName.replace(' (Mistenkt)', '')) 
        ? baseDiseases 
        : [...baseDiseases, diseaseName.replace(' (Mistenkt)', '')];

    const currentDiseaseBase = diseases.find(d => diseaseName.includes(d)) || diseaseName;
    
    // Determine what to show in dropdown
    // If we are investigating, we want to show "X (Mistenkt)"
    const dropdownValue = incidentStatus === 'investigating' && !diseaseName.includes('(Bekreftet)')
        ? `${currentDiseaseBase} (Mistenkt)` 
        : currentDiseaseBase;

    return (
        <div className="min-h-screen bg-slate-50 pb-20 relative">
            {/* TOP BANNER */}
            <div className={`w-full px-6 py-4 shadow-md flex flex-col md:flex-row justify-between items-center gap-4 ${isResolved ? 'bg-green-600' : 'bg-red-600'} text-white sticky top-0 z-40`}>
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <AlertOctagon className="w-6 h-6 animate-pulse" />
                        <h1 className="text-xl font-bold uppercase tracking-wide">
                            {isResolved ? 'HENDELSE AVSLUTTET' : 'AKTIV SMITTEHENDELSE'} – {diseaseName}
                        </h1>
                    </div>
                    <p className="text-sm opacity-90 font-mono">
                        Område: {alert.hives?.apiaries?.location || 'Ukjent'} &bull; Opprettet: {new Date(alert.created_at).toLocaleString('nb-NO')} &bull; Ref: #{alert.id.slice(0,8)}
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    {isResolved && (
                        <div className="flex items-center gap-2 mr-4 bg-green-700 px-3 py-1 rounded">
                             <CheckCircle className="w-4 h-4" />
                             <span className="text-sm font-bold">Falsk alarm / Bekreftet håndtert</span>
                        </div>
                    )}
                    {!isResolved ? (
                        <>
                            <button className="px-4 py-2 bg-red-800 hover:bg-red-900 rounded shadow border border-red-700 font-bold text-sm transition-colors">
                                Oppgrader alvorlighet
                            </button>
                            <button 
                                onClick={() => handleStatusUpdate('resolved')}
                                className="px-4 py-2 bg-white text-red-600 hover:bg-slate-100 rounded shadow font-bold text-sm transition-colors flex items-center gap-2"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Lukk hendelse
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={() => handleStatusUpdate('investigating')}
                            className="px-4 py-2 bg-white text-green-600 hover:bg-slate-100 rounded shadow font-bold text-sm transition-colors"
                        >
                            Gjenåpne hendelse
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT COLUMN: MAP & AFFECTED (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* SECTION 1: MAP */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <MapIcon className="w-5 h-5 text-slate-500" />
                                Smittekart & Sikringssone
                            </h2>
                            <div className="flex items-center gap-4">
                                <select 
                                    value={dropdownValue}
                                    onChange={(e) => handleDiseaseChange(e.target.value)}
                                    className="bg-white border border-slate-200 text-slate-700 text-xs font-bold py-1 px-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                    {diseases.map(d => (
                                        <option key={d} value={`${d} (Mistenkt)`}>{d} (Mistenkt)</option>
                                    ))}
                                    <option disabled>──────────</option>
                                    {diseases.map(d => (
                                        <option key={`${d}-confirmed`} value={d}>{d} (Bekreftet)</option>
                                    ))}
                                </select>
                                <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                                    <Ruler className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-bold text-slate-700">{radius / 1000} km</span>
                                    <input 
                                        type="range" 
                                        min="1000" 
                                        max="10000" 
                                        step="500" 
                                        value={radius} 
                                        onChange={(e) => setRadius(parseInt(e.target.value))}
                                        className="w-24 accent-red-600 cursor-pointer"
                                    />
                                </div>
                                <button className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 transition-colors">
                                    Godkjenn sone
                                </button>
                            </div>
                        </div>
                        <div className="h-[500px] w-full relative z-0">
                            <IncidentMap 
                                center={mapCenter} 
                                radius={radius} 
                                apiaries={mapApiaries}
                                showOwnerOnly={showOtherApiariesOnMap}
                            />
                        </div>
                        <div className="p-3 bg-slate-50 text-xs text-slate-500 flex gap-4 justify-center border-t border-slate-200">
                            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-600"></div> Smittepunkt</span>
                            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-400"></div> Bigård i sonen</span>
                            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-600"></div> Bigård utenfor</span>
                            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-violet-600"></div> Eiers andre bigårder</span>
                        </div>
                    </div>

                    {/* SECTION 4: AFFECTED LIST */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                                Berørte i sonen ({affectedList.length})
                            </h2>
                            <button 
                                onClick={() => setIsAlertModalOpen(true)}
                                className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded hover:bg-red-200 transition-colors flex items-center gap-2"
                            >
                                <Mail className="w-3 h-3" />
                                Send varsel til alle i sonen
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3">Birøkter</th>
                                        <th className="px-4 py-3">Bigård</th>
                                        <th className="px-4 py-3">Avstand</th>
                                        <th className="px-4 py-3">Kontakt</th>
                                        <th className="px-4 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {affectedList.length > 0 ? affectedList.map(apiary => (
                                        <tr key={apiary.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-gray-900">{apiary.users?.full_name || 'Ukjent'}</td>
                                            <td className="px-4 py-3 text-gray-600">{apiary.name}</td>
                                            <td className="px-4 py-3 text-gray-600 font-mono">{apiary.distance} km</td>
                                            <td className="px-4 py-3 flex gap-2">
                                                {apiary.users?.phone_number && (
                                                    <a href={`tel:${apiary.users.phone_number}`} className="p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">
                                                        <Phone className="w-3 h-3" />
                                                    </a>
                                                )}
                                                {apiary.users?.email && (
                                                    <a href={`mailto:${apiary.users.email}`} className="p-1 bg-slate-50 text-slate-600 rounded hover:bg-slate-100">
                                                        <Mail className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-xs font-bold">
                                                    Ikke varslet
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500 italic">
                                                Ingen andre bigårder funnet i denne sonen.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* SECTION 5: TILTAKSLOGG */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                         <div className="p-4 border-b border-slate-200 bg-slate-50">
                            <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-slate-500" />
                                Tiltakslogg (Automatisk)
                            </h2>
                        </div>
                        <div className="p-4">
                            <div className="space-y-4">
                                {MOCK_LOGS.map((log, i) => (
                                    <div key={i} className="flex gap-4 items-start relative">
                                        <div className="w-16 pt-1 text-xs font-mono text-gray-500 text-right">{log.time}</div>
                                        <div className="w-2 h-2 rounded-full bg-slate-300 mt-1.5 z-10"></div>
                                        {i !== MOCK_LOGS.length - 1 && (
                                            <div className="absolute left-[75px] top-2.5 w-0.5 h-full bg-slate-100 -z-0"></div>
                                        )}
                                        <div className="flex-1 pb-2">
                                            <p className="text-sm font-medium text-gray-900">{log.event}</p>
                                            <p className="text-xs text-gray-500">{log.user}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* DEBUG SECTION (Only for admins/Mattilsynet) */}
                    {debugInfo && (
                        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-4 text-xs font-mono text-green-400 overflow-x-auto">
                            <h3 className="font-bold text-white mb-2 uppercase border-b border-slate-700 pb-2">Debug Info (System Status)</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p><span className="text-slate-500">Alert ID:</span> {debugInfo.alertId}</p>
                                    <p><span className="text-slate-500">Reporter:</span> {debugInfo.reporter}</p>
                                    <p><span className="text-slate-500">Total Apiaries:</span> {debugInfo.totalApiariesFetched}</p>
                                </div>
                                <div>
                                    <p><span className="text-slate-500">Processed:</span> {debugInfo.processedApiariesCount}</p>
                                    <p><span className="text-slate-500">Owner Apiaries:</span> {debugInfo.ownerApiariesCount}</p>
                                    <p><span className="text-slate-500">Center:</span> [{debugInfo.mapCenter?.join(', ')}]</p>
                                </div>
                            </div>
                            {debugInfo.error && (
                                <div className="mt-2 text-red-500 bg-red-900/20 p-2 rounded">
                                    ERROR: {JSON.stringify(debugInfo.error)}
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* RIGHT COLUMN: DETAILS & LOG (1/3 width) */}
                <div className="space-y-6">
                    
                    {/* SECTION 2: THE BEEKEEPER */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                        <div className="p-4 border-b border-slate-200 bg-slate-50">
                            <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <User className="w-5 h-5 text-slate-500" />
                                Birøkter (Kilde)
                            </h2>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-2xl font-bold">
                                    {alert.reporter?.full_name?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">{alert.reporter?.full_name || 'Ukjent navn'}</h3>
                                    <p className="text-sm text-gray-500">ID: {alert.reporter?.id?.slice(0,8)}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-3 mb-6">
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Phone className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-medium">{alert.reporter?.phone_number || 'Ikke registrert'}</span>
                                    </div>
                                    {alert.reporter?.phone_number && (
                                        <a href={`tel:${alert.reporter.phone_number}`} className="text-xs font-bold text-blue-600 hover:underline">Ring</a>
                                    )}
                                </div>
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Mail className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-medium truncate max-w-[150px]">{alert.reporter?.email || 'Ikke registrert'}</span>
                                    </div>
                                    {alert.reporter?.email && (
                                        <a href={`mailto:${alert.reporter.email}`} className="text-xs font-bold text-blue-600 hover:underline">Send epost</a>
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-4">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Bigård med smitte</h4>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-gray-900">{alert.hives?.apiaries?.name || 'Ukjent'}</span>
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">Smittekilde</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{alert.hives?.apiaries?.location}</p>
                            </div>
                            
                            <div className="border-t border-slate-100 pt-4 mt-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Andre bigårder:</span>
                                    <span className="font-bold text-gray-900">
                                        {allApiaries.filter(a => a.isOwner).length} stk
                                    </span>
                                </div>
                                <button 
                                    onClick={() => setShowOtherApiariesOnMap(!showOtherApiariesOnMap)}
                                    className={`text-xs font-bold hover:underline mt-1 flex items-center gap-1 ${showOtherApiariesOnMap ? 'text-violet-600' : 'text-blue-600'}`}
                                >
                                    <MapIcon className="w-3 h-3" />
                                    {showOtherApiariesOnMap ? 'Vis alle' : 'Vis på kart'}
                                </button>
                            </div>

                            <Link href="/dashboard/mattilsynet/registry" className="w-full mt-6 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors block text-center">
                                Åpne full profil
                            </Link>
                        </div>
                    </div>

                    {/* SECTION 3: BEVISMATERIALET */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                         <div className="p-4 border-b border-slate-200 bg-slate-50">
                            <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <Camera className="w-5 h-5 text-slate-500" />
                                Bevismaterialet
                            </h2>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Siste inspeksjon</h4>
                                <p className="text-sm text-gray-900 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    {new Date(alert.created_at).toLocaleString('nb-NO')}
                                </p>
                            </div>
                            
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Bilder</h4>
                                {getImageUrl(alert.details) ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200 relative group">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img 
                                                src={getImageUrl(alert.details)!} 
                                                alt="Smittebevis" 
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold cursor-pointer">
                                                Klikk for å forstørre
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-500 italic bg-slate-50 p-3 rounded">
                                        Ingen bilder vedlagt i rapporten.
                                    </div>
                                )}
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">KI Vurdering</h4>
                                {getAiDetails(alert.details) ? (
                                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg">
                                        <p className="text-sm text-blue-800 italic whitespace-pre-wrap">
                                            "{getAiDetails(alert.details)?.trim()}"
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 p-3 rounded-lg">
                                        <p className="text-sm text-gray-500 italic">
                                            Ingen AI-vurdering tilgjengelig.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Notater / Lydlogg</h4>
                                <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-3">
                                    <Mic className="w-5 h-5 text-slate-400" />
                                    <span className="text-sm text-gray-600">Ingen lydlogg</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 6: HANDLINGER */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                        <div className="p-4 border-b border-slate-200 bg-slate-50">
                            <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <Edit className="w-5 h-5 text-slate-500" />
                                Handlinger
                            </h2>
                        </div>
                        <div className="p-4 grid grid-cols-1 gap-3">
                            <button className="w-full py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors text-left px-4">
                                Endre sykdomstype
                            </button>
                            <button className="w-full py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors text-left px-4">
                                Endre alvorlighetsgrad
                            </button>
                            <button className="w-full py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors text-left px-4 flex items-center justify-between">
                                Sende melding til birøkter
                                <Send className="w-4 h-4 text-slate-400" />
                            </button>
                            <button 
                                onClick={() => handleStatusUpdate('resolved')}
                                className="w-full py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors text-left px-4 flex items-center justify-between"
                            >
                                Markere som falsk alarm
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            {/* SEND ALERT MODAL */}
            {isAlertModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Mail className="w-5 h-5 text-red-600" />
                                Send varsel til sikringssone
                            </h3>
                            <button onClick={() => setIsAlertModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            {!alertSent ? (
                                <>
                                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 text-sm text-amber-800">
                                        Du er i ferd med å sende varsel til <strong>{affectedList.length}</strong> birøktere innenfor en radius på <strong>{radius/1000} km</strong>.
                                    </div>
                                    
                                    {affectedList.length > 0 && (
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 max-h-32 overflow-y-auto">
                                            <p className="text-xs font-bold text-gray-500 uppercase mb-2 sticky top-0 bg-slate-50">Mottakere:</p>
                                            <ul className="text-xs text-gray-600 space-y-1">
                                                {affectedList.map((a, i) => (
                                                    <li key={i} className="flex justify-between">
                                                        <span>{a.users?.full_name || 'Ukjent'}</span>
                                                        <span className="text-gray-400">{a.users?.email}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Meldingstekst</label>
                                        <textarea 
                                            value={alertMessage}
                                            onChange={(e) => setAlertMessage(e.target.value)}
                                            className="w-full h-40 p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-2">
                                        <button 
                                            onClick={() => setIsAlertModalOpen(false)}
                                            className="px-4 py-2 text-gray-600 font-bold text-sm hover:bg-gray-100 rounded-lg"
                                        >
                                            Avbryt
                                        </button>
                                        <button 
                                            onClick={handleSendAlert}
                                            disabled={sendingAlert}
                                            className="px-6 py-2 bg-red-600 text-white font-bold text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {sendingAlert ? 'Sender...' : 'Send varsel'}
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Varsel sendt!</h3>
                                    <p className="text-gray-500">Meldingen er sendt til {affectedList.length} mottakere.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}