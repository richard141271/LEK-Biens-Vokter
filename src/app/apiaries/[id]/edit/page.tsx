'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { MapPin, Warehouse, Store, Truck, ArrowLeft, Map as MapIcon, X } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-gray-400">Laster kart...</div>
});

export default function EditApiaryPage({ params }: { params: { id: string } }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('bigård');
  const [locationStr, setLocationStr] = useState('');
  const [coordinates, setCoordinates] = useState<string | null>(null);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const types = [
    { id: 'bigård', label: 'Bigård', icon: MapPin },
    { id: 'lager', label: 'Lager', icon: Warehouse },
    { id: 'bil', label: 'Bil', icon: Truck },
    { id: 'oppstart', label: 'Oppstart', icon: Store },
  ];

  useEffect(() => {
    const fetchApiary = async () => {
      try {
        const { data, error } = await supabase
          .from('apiaries')
          .select('*')
          .eq('id', params.id)
          .single();

        if (error) throw error;

        if (data) {
          setName(data.name || '');
          setType(data.type || 'bigård');
          setLocationStr(data.location || '');
          setCoordinates(data.coordinates || null);
          setRegistrationNumber(data.registration_number || '');
        }
      } catch (error) {
        console.error('Error fetching apiary:', error);
        alert('Kunne ikke laste inn bigård.');
        router.push(`/apiaries/${params.id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchApiary();
  }, [params.id]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolokasjon støttes ikke av din nettleser");
      return;
    }
    
    setLoading(true); // Re-use loading state or create a new one? Use saving for button state maybe? 
    // Let's just use a temporary alert or similar indicator if needed, but here we can just wait.
    // Actually, let's toggle saving to show activity
    setSaving(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coordString = `${latitude},${longitude}`;
        setCoordinates(coordString);
        
        if (!locationStr || locationStr.startsWith('Koordinater:')) {
            setLocationStr(`Koordinater: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        setSaving(false);
      },
      (error) => {
        console.error(error);
        alert("Kunne ikke hente posisjon. Sjekk at du har gitt tillatelse.");
        setSaving(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Du må være logget inn');

      // Update database
      const { error } = await supabase
        .from('apiaries')
        .update({
          name,
          type,
          location: locationStr,
          coordinates,
          registration_number: type === 'bil' ? registrationNumber : null,
        })
        .eq('id', params.id);

      if (error) throw error;

      router.push(`/apiaries/${params.id}`);
      router.refresh(); // Ensure the data is refreshed
    } catch (error: any) {
      alert('Feil ved lagring: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Laster...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <Link href={`/apiaries/${params.id}`} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Rediger lokasjon</h1>
      </header>

      <main className="max-w-md mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Navn */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">Navn på lokasjon</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="F.eks. Hjemmebigården"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none"
              required
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 px-1">Type lokasjon</label>
            <div className="grid grid-cols-2 gap-3">
              {types.map((t) => {
                const Icon = t.icon;
                const isSelected = type === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                      isSelected 
                        ? 'border-honey-500 bg-honey-50 text-honey-700' 
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-8 h-8 mb-2 ${isSelected ? 'text-honey-600' : 'text-gray-400'}`} />
                    <span className="font-medium">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bilnummer (Conditional) */}
          {type === 'bil' && (
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Registreringsnummer (Bilskilt)</label>
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                placeholder="AB 12345"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none font-mono uppercase"
                required={type === 'bil'}
              />
            </div>
          )}

          {/* Lokasjon */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">Adresse / Beskrivelse</label>
            <textarea
              value={locationStr}
              onChange={(e) => setLocationStr(e.target.value)}
              placeholder="Hvor er dette?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none h-24 resize-none mb-3"
            />

            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
              >
                  <MapPin className="w-5 h-5" />
                  {coordinates ? 'Oppdater (GPS)' : 'Hent (GPS)'}
              </button>
              
              <button
                  type="button"
                  onClick={() => setShowMapPicker(true)}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 py-3 bg-green-50 text-green-700 font-bold rounded-lg border border-green-100 hover:bg-green-100 transition-colors"
              >
                  <MapIcon className="w-5 h-5" />
                  Velg i kart
              </button>
            </div>

            {coordinates && (
                <p className="text-xs text-center text-gray-500 mt-2 font-mono">
                    Lagret: {coordinates}
                </p>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-honey-500 hover:bg-honey-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-honey-500/30 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? 'Lagrer...' : 'Lagre endringer'}
          </button>
        </form>
      </main>

      {/* Map Picker Modal */}
      {showMapPicker && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white z-10">
              <h3 className="font-bold text-lg text-gray-900">Velg posisjon</h3>
              <button 
                onClick={() => setShowMapPicker(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 relative bg-gray-100">
               <Map 
                 center={coordinates ? [parseFloat(coordinates.split(',')[0]), parseFloat(coordinates.split(',')[1])] : [59.9139, 10.7522]} // Default to Oslo or current coords
                 zoom={coordinates ? 15 : 10}
                 onMapClick={(lat, lng) => {
                   const coordString = `${lat},${lng}`;
                   setCoordinates(coordString);
                   if (!locationStr || locationStr.startsWith('Koordinater:')) {
                     setLocationStr(`Koordinater: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                   }
                   setShowMapPicker(false);
                 }}
                 markers={coordinates ? [{
                   id: 'selected',
                   position: [parseFloat(coordinates.split(',')[0]), parseFloat(coordinates.split(',')[1])],
                   title: 'Valgt posisjon',
                   type: 'user'
                 }] : []}
               />
               
               <div className="absolute top-4 left-4 right-14 z-[1000] flex gap-2">
                 <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (!navigator.geolocation) {
                            alert("Geolokasjon støttes ikke");
                            return;
                        }
                        const btn = e.currentTarget;
                        const originalText = btn.innerText;
                        btn.innerText = "Henter...";
                        
                        navigator.geolocation.getCurrentPosition(
                            (position) => {
                                const { latitude, longitude } = position.coords;
                                // We can't easily pan the map programmatically without a ref to the map instance
                                // But we can set the marker and close, OR we need to pass a 'center' prop that updates.
                                // The Map component updates view when 'center' changes.
                                const coordString = `${latitude},${longitude}`;
                                setCoordinates(coordString); // This updates the center prop
                                btn.innerText = originalText;
                            },
                            (error) => {
                                alert("Kunne ikke hente posisjon");
                                btn.innerText = originalText;
                            }
                        );
                    }}
                    className="bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-lg text-sm font-bold text-blue-700 border border-blue-100 flex items-center gap-2"
                 >
                    <MapPin className="w-4 h-4" />
                    Hent min posisjon
                 </button>
               </div>

               <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none z-[1000]">
                 <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg text-sm font-medium text-gray-700 pointer-events-auto border border-gray-200">
                   Klikk i kartet for å velge posisjon
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
