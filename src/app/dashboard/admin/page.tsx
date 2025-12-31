'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getDistanceFromLatLonInM } from '@/utils/geo';
import { 
  ShieldAlert, 
  Map, 
  CheckCircle, 
  Clock, 
  Filter, 
  FileText, 
  ChevronRight,
  AlertTriangle,
  Search,
  Activity,
  Settings
} from 'lucide-react';

const MapComponent = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => <div className="h-96 w-full bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-gray-400">Laster kart...</div>
});

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [radius, setRadius] = useState(3000); // Default 3km
  const [stats, setStats] = useState({
    activeCases: 0,
    reviewedCases: 0,
    totalWarnings: 0
  });
  
  const [riskyApiaries, setRiskyApiaries] = useState<any[]>([]);
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);
  const [dangerZones, setDangerZones] = useState<any[]>([]);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchAdminData();
  }, []);

  useEffect(() => {
    if (reports.length > 0) {
      calculateRisk();
    }
  }, [reports, radius]);

  // Mock coordinates for pilot testing
  const getMockCoordinates = (location: string, id: string) => {
    // Deterministic pseudo-random based on ID char codes
    const seed = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const randomOffset = (seed % 100) / 10000; // Small offset

    if (location?.toLowerCase().includes('halden')) return { lat: 59.12 + randomOffset, lng: 11.38 + randomOffset };
    if (location?.toLowerCase().includes('sarpsborg')) return { lat: 59.28 + randomOffset, lng: 11.11 + randomOffset };
    if (location?.toLowerCase().includes('fredrikstad')) return { lat: 59.21 + randomOffset, lng: 10.93 + randomOffset };
    
    // Default fallback (Oslo area)
    return { lat: 59.91 + randomOffset, lng: 10.75 + randomOffset };
  };

  const calculateRisk = async () => {
    const { data: allApiaries } = await supabase.from('apiaries').select('*');
    if (!allApiaries) return;

    // Enhance apiaries with coordinates (use DB or Mock)
    const enhancedApiaries = allApiaries.map(a => {
        const coords = a.latitude && a.longitude 
            ? { lat: a.latitude, lng: a.longitude } 
            : getMockCoordinates(a.location, a.id);
        return { ...a, ...coords };
    });

    // Identify Outbreaks
    const activeOutbreaks = reports.filter(r => !r.details.includes('[VURDERT]'));
    
    // Map Outbreaks to Apiaries
    const outbreakApiaries = activeOutbreaks.map(r => {
        const apiary = enhancedApiaries.find(a => a.id === r.hives?.apiaries?.id);
        return apiary ? { ...apiary, logId: r.id } : null;
    }).filter(Boolean);

    // Find Neighbors within Radius
    let neighbors: any[] = [];
    const zones: any[] = [];

    outbreakApiaries.forEach(source => {
        if (!source) return;

        zones.push({
            center: [source.lat, source.lng],
            radius: radius,
            color: 'red'
        });

        const localNeighbors = enhancedApiaries.filter(target => {
            if (target.id === source.id) return false; // Skip self
            const dist = getDistanceFromLatLonInM(source.lat, source.lng, target.lat, target.lng);
            return dist <= radius;
        });
        neighbors = [...neighbors, ...localNeighbors];
    });

    // Deduplicate
    neighbors = [...new Set(neighbors.map(n => n.id))].map(id => enhancedApiaries.find(a => a.id === id));

    setRiskyApiaries(neighbors);
    setDangerZones(zones);

    // Prepare Map Markers
    const markers = enhancedApiaries.map(a => {
        const isInfected = outbreakApiaries.some(o => o.id === a.id);
        const isRisky = neighbors.some(n => n.id === a.id);
        
        return {
            id: a.id,
            position: [a.lat, a.lng],
            title: a.name,
            type: isInfected ? 'infected' : (isRisky ? 'risky' : 'healthy'),
            description: isInfected ? 'Aktivt utbrudd!' : (isRisky ? `Innenfor ${radius}m sone` : 'Ingen anmerkninger')
        };
    });

    setMapMarkers(markers);

    // Update Stats
    setStats(prev => ({
        ...prev,
        totalWarnings: neighbors.length
    }));
  };

  const fetchAdminData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 1. Fetch Sickness Reports
      const { data: sicknessLogs, error: logsError } = await supabase
        .from('hive_logs')
        .select(`
          *,
          hives (
            hive_number,
            apiaries (
              id,
              name,
              location,
              user_id
            )
          )
        `)
        .eq('action', 'SYKDOM')
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;

      if (sicknessLogs) {
        setReports(sicknessLogs);
        
        // Initial stats
        const active = sicknessLogs.filter(r => !r.details.includes('[VURDERT]')).length;
        const reviewed = sicknessLogs.length - active;
        
        setStats(prev => ({
          ...prev,
          activeCases: active,
          reviewedCases: reviewed
        }));
      }

    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReviewed = async (logId: string, currentDetails: string) => {
    try {
      const newDetails = currentDetails + ' [VURDERT]';
      const { error } = await supabase
        .from('hive_logs')
        .update({ details: newDetails })
        .eq('id', logId);

      if (error) throw error;
      
      // Refresh local state
      setReports(prev => prev.map(r => 
        r.id === logId ? { ...r, details: newDetails } : r
      ));
      setStats(prev => ({
        ...prev,
        activeCases: prev.activeCases - 1,
        reviewedCases: prev.reviewedCases + 1
      }));

    } catch (e) {
      alert('Kunne ikke oppdatere status');
    }
  };

  if (loading) return <div className="p-8 text-center">Laster Mattilsynet Admin...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      
      {/* Header */}
      <div className="bg-[#1F2937] text-white pt-8 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-red-600 p-2 rounded-lg">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Mattilsynet Admin (Pilot)</h1>
              <p className="text-gray-400 text-sm">Sykdomsovervåkning og varsling</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-6">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Aktive Utbrudd</p>
              <h3 className="text-3xl font-bold text-red-600">{stats.activeCases}</h3>
            </div>
            <div className="bg-red-50 p-3 rounded-full">
              <Activity className="w-6 h-6 text-red-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Vurderte Saker</p>
              <h3 className="text-3xl font-bold text-green-600">{stats.reviewedCases}</h3>
            </div>
            <div className="bg-green-50 p-3 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Varsler Sendt</p>
              <h3 className="text-3xl font-bold text-blue-600">{stats.totalWarnings}</h3>
            </div>
            <div className="bg-blue-50 p-3 rounded-full">
              <ShieldAlert className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-end">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Søk på bigård, sykdom eller ID..." 
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>
          
          {/* Radius Slider */}
          <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 flex flex-col w-full md:w-64">
             <label className="text-xs font-bold text-gray-500 mb-1 flex justify-between">
                <span>Simuleringsradius</span>
                <span className="text-blue-600">{radius} m</span>
             </label>
             <input 
                type="range" 
                min="50" 
                max="5000" 
                step="50"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
             />
          </div>

          <button 
            onClick={() => setShowMap(!showMap)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium transition-colors ${
                showMap ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Map className="w-5 h-5" />
            {showMap ? 'Skjul Kart' : 'Vis Kart'}
          </button>
        </div>

        {/* Map Visualization */}
        {showMap && (
            <div className="mb-8 h-[500px] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative z-0">
                <MapComponent 
                    center={[59.20, 11.05]} // Default center (Ostfold)
                    zoom={10}
                    markers={mapMarkers}
                    circles={dangerZones}
                />
            </div>
        )}

        {/* Main List: Disease Reports */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Innkomne Rapporter
            </h2>
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">{reports.length} totalt</span>
          </div>

          <div className="divide-y divide-gray-100">
            {reports.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Ingen sykdomsrapporter funnet.</div>
            ) : (
              reports.map((report) => {
                const isReviewed = report.details.includes('[VURDERT]');
                return (
                  <div key={report.id} className={`p-4 hover:bg-gray-50 transition-colors ${isReviewed ? 'opacity-60' : ''}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      {/* Left: Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${
                            isReviewed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {isReviewed ? 'Vurdert' : 'Ny sak'}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(report.created_at).toLocaleString('no-NO')}
                          </span>
                        </div>
                        
                        <h3 className="font-bold text-gray-900 text-lg mb-1">
                          {report.hives?.apiaries?.name || 'Ukjent bigård'} 
                          <span className="font-normal text-gray-500 text-sm ml-2">
                             (Kube: {report.hives?.hive_number || '?'})
                          </span>
                        </h3>
                        
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 mb-2">
                          {report.details.replace(' [VURDERT]', '')}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Map className="w-3 h-3" />
                            {report.hives?.apiaries?.location || 'Ikke stedsfestet'}
                          </span>
                          <span className="flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            Varslet: 4 naboer
                          </span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-3">
                        {!isReviewed && (
                          <button 
                            onClick={() => handleMarkReviewed(report.id, report.details)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 shadow-sm whitespace-nowrap"
                          >
                            Marker som vurdert
                          </button>
                        )}
                        <button className="text-gray-400 hover:text-gray-600 p-2">
                          <ChevronRight className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Risky Apiaries Section */}
        {riskyApiaries.length > 0 && (
          <div className="mt-8 bg-amber-50 rounded-xl shadow-sm border border-amber-200 overflow-hidden">
            <div className="p-4 border-b border-amber-200 bg-amber-100 flex justify-between items-center">
              <h2 className="font-bold text-amber-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-700" />
                Utsatte Bigårder (Smittevern)
              </h2>
              <span className="text-xs text-amber-800 bg-amber-200 px-2 py-1 rounded-full">
                {riskyApiaries.length} i faresonen
              </span>
            </div>
            <div className="p-4">
              <p className="text-sm text-amber-800 mb-3">
                Disse bigårdene befinner seg i samme område som bekreftet smitte og bør følges opp ekstra nøye.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {riskyApiaries.map((apiary) => (
                  <div key={apiary.id} className="bg-white p-3 rounded-lg border border-amber-200 text-sm flex justify-between items-center">
                    <div>
                      <p className="font-bold text-gray-900">{apiary.name}</p>
                      <p className="text-xs text-gray-500">{apiary.location}</p>
                    </div>
                    <button className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded hover:bg-amber-200">
                      Varsle eier
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Warning Log (Pilot Static) */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6 opacity-75">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-500" />
                Varslingslogg (Pilot)
            </h3>
            <div className="space-y-3">
                {reports.slice(0, 3).map((r, i) => (
                    <div key={i} className="text-sm flex items-center justify-between border-b border-gray-100 pb-2">
                        <span className="text-gray-600">
                            Automatisk varsel sendt til område <span className="font-mono font-bold text-gray-800">{r.hives?.apiaries?.location || 'Halden'}</span>
                        </span>
                        <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                ))}
                {reports.length === 0 && <p className="text-sm text-gray-500">Ingen varsler sendt ennå.</p>}
            </div>
        </div>

      </div>
    </div>
  );
}
