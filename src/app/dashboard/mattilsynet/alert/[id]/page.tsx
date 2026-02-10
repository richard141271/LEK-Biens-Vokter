'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { Map as MapIcon, Phone, Mail, User, AlertTriangle, CheckCircle, Clock, Ruler, AlertOctagon, FileText, Camera, Mic, Send, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

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
    // In production, use Nominatim API
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
    
    const supabase = createClient();

    useEffect(() => {
        fetchData();
    }, [params.id]);

    useEffect(() => {
        if (alert && allApiaries.length > 0) {
            calculateAffected();
        }
    }, [alert, allApiaries, radius]);

    async function fetchData() {
        try {
            const res = await fetch(`/api/mattilsynet/incident/${params.id}`);
            if (!res.ok) throw new Error('Failed to fetch data');
            
            const { alert: alertData, apiaries: apiariesData } = await res.json();

            // Prepare data with coordinates
            const centerCoords = getCoordinates(alertData.hives?.apiaries?.location || 'Halden');
            setMapCenter(centerCoords);

            const processedApiaries = apiariesData.map((a: any) => ({
                ...a,
                isOwner: a.users?.email === alertData.reporter?.email,
                ...(() => {
                    const [lat, lon] = getCoordinates(a.location || 'Ukjent');
                    return { lat, lon };
                })()
            })).filter((a: any) => a.id !== alertData.hives?.apiaries?.id); // Exclude source apiary from "others"

            setAlert(alertData);
            setAllApiaries(processedApiaries);
            setIncidentStatus(alertData.admin_status || 'investigating');
            setLoading(false);

        } catch (e) {
            console.error("Error fetching incident data:", e);
            setLoading(false);
        }
    }

    // Helper to extract image URL from details string
    function getImageUrl(details: string): string | null {
        if (!details) return null;
        const match = details.match(/Bilde: (https?:\/\/[^\s]+)/);
        return match ? match[1] : null;
    }

    // Helper to extract AI details
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
             const { error } = await supabase
                .from('hive_logs')
                .update({ admin_status: newStatus })
                .eq('id', params.id);
            
            if (error) throw error;
            setIncidentStatus(newStatus);
            // Optionally update UI logs
        } catch (e) {
            console.error("Failed to update status", e);
            alert("Kunne ikke oppdatere status");
        }
    }

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50">Laster beredskapsrom...</div>;
    if (!alert) return <div className="h-screen flex items-center justify-center">Fant ikke hendelsen</div>;

    const isResolved = incidentStatus === 'resolved';

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* TOP BANNER */}
            <div className={`w-full px-6 py-4 shadow-md flex flex-col md:flex-row justify-between items-center gap-4 ${isResolved ? 'bg-green-600' : 'bg-red-600'} text-white sticky top-0 z-50`}>
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <AlertOctagon className="w-6 h-6 animate-pulse" />
                        <h1 className="text-xl font-bold uppercase tracking-wide">
                            {isResolved ? 'HENDELSE AVSLUTTET' : 'AKTIV SMITTEHENDELSE'} – {alert.details?.split('Sykdom: ')[1]?.split(',')[0] || 'Ukjent sykdom'}
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
                                <select className="bg-white border border-slate-200 text-slate-700 text-xs font-bold py-1 px-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                                    <option>Kalkyngel (Mistenkt)</option>
                                    <option>Åpen yngelråte</option>
                                    <option>Lukket yngelråte</option>
                                    <option>Varroa</option>
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
                            <button className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded hover:bg-red-200 transition-colors flex items-center gap-2">
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
                            <button className="w-full py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors text-left px-4 flex items-center justify-between">
                                Markere som falsk alarm
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
