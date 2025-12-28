'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Calendar, Cloud, Thermometer, Info, Image as ImageIcon, X, Mic, MicOff } from 'lucide-react';

export default function NewInspectionPage({ params }: { params: { id: string } }) {
  const [hive, setHive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const searchParams = useSearchParams();
  const autoVoice = searchParams.get('autoVoice');

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));
  const [queenSeen, setQueenSeen] = useState(false);
  const [eggsSeen, setEggsSeen] = useState(false);
  const [broodCondition, setBroodCondition] = useState('normal');
  const [honeyStores, setHoneyStores] = useState('middels');
  const [temperament, setTemperament] = useState('rolig');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('OK');
  
  // Weather State
  const [weather, setWeather] = useState('');
  const [temperature, setTemperature] = useState('');
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Image Upload State
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchHiveAndWeather();
    
    // Auto-voice removed by user request
    /*
    if (autoVoice === 'true') {
        setTimeout(() => {
            startListening();
        }, 3000); 
    }
    */
  }, [params.id, autoVoice]);

  // Voice Logic
  const startListening = () => {
      if (typeof window !== 'undefined' && !recognitionRef.current) {
          const { webkitSpeechRecognition, SpeechRecognition } = window as any;
          const SpeechRecognitionConstructor = SpeechRecognition || webkitSpeechRecognition;
          
          if (SpeechRecognitionConstructor) {
              const recognition = new SpeechRecognitionConstructor();
              recognition.continuous = true; // Keep listening
              recognition.lang = 'no-NO';
              recognition.interimResults = false;
              
              recognition.onresult = (event: any) => {
                  const last = event.results.length - 1;
                  const text = event.results[last][0].transcript.toLowerCase();
                  handleVoiceCommand(text);
              };

              recognition.onend = () => {
                  // Auto-restart if we want continuous listening, or just stop
                  // setIsListening(false);
              };

              recognitionRef.current = recognition;
          }
      }

      if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
            setIsListening(true);
          } catch (e) {
              console.error(e);
          }
      }
  };

  const stopListening = () => {
      if (recognitionRef.current) {
          recognitionRef.current.stop();
          setIsListening(false);
      }
  };

  const handleVoiceCommand = (text: string) => {
      console.log("Voice Command:", text);
      
      // Simple Keyword Matching
      if (text.includes('dronning sett') || text.includes('dronning er her')) setQueenSeen(true);
      if (text.includes('ingen dronning')) setQueenSeen(false);
      
      if (text.includes('egg sett') || text.includes('ser egg')) setEggsSeen(true);
      
      if (text.includes('lite honning')) setHoneyStores('lite');
      if (text.includes('middels honning')) setHoneyStores('middels');
      if (text.includes('mye honning')) setHoneyStores('mye');
      
      if (text.includes('rolig')) setTemperament('rolig');
      if (text.includes('urolig')) setTemperament('urolig');
      if (text.includes('aggressiv') || text.includes('sint')) setTemperament('aggressiv');

      if (text.includes('svak')) setStatus('SVAK');
      if (text.includes('død')) setStatus('DØD');
      if (text.includes('ok') || text.includes('alt bra')) setStatus('OK');

      if (text.includes('lagre') || text.includes('send inn')) {
          // Trigger submit? Maybe dangerous to auto-submit
          alert('Sa du lagre? Trykk på knappen for å bekrefte.');
      }

      // Add everything to notes as well for safety
      setNotes(prev => prev + (prev ? '\n' : '') + "Stemme: " + text);
  };

  const fetchHiveAndWeather = async () => {
    // 1. Fetch Hive Info
    const { data, error } = await supabase
      .from('hives')
      .select('name, hive_number')
      .eq('id', params.id)
      .single();
    
    if (data) setHive(data);

    // 2. Fetch Weather (Geolocation)
    if (navigator.geolocation) {
      setWeatherLoading(true);
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&wind_speed_unit=ms`);
          const weatherData = await response.json();
          
          if (weatherData.current) {
            setTemperature(weatherData.current.temperature_2m.toString());
            setWeather(getWeatherDescription(weatherData.current.weather_code));
          }
        } catch (err) {
          console.error("Weather fetch failed", err);
        } finally {
          setWeatherLoading(false);
        }
      }, (err) => {
        console.error("Geolocation failed", err);
        setWeatherLoading(false);
      });
    }

    setLoading(false);
  };

  const getWeatherDescription = (code: number) => {
    if (code === 0) return 'Klart';
    if (code >= 1 && code <= 3) return 'Lettskyet/Overskyet';
    if (code >= 45 && code <= 48) return 'Tåke';
    if (code >= 51 && code <= 67) return 'Regn';
    if (code >= 71 && code <= 77) return 'Snø';
    if (code >= 80 && code <= 82) return 'Regnbyger';
    if (code >= 95) return 'Torden';
    return 'Ukjent';
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${params.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('inspection-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('inspection-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      let imageUrl = null;
      if (selectedImage) {
        setUploadingImage(true);
        imageUrl = await uploadImage(selectedImage);
        setUploadingImage(false);
      }

      // 1. Insert Inspection
      const { error: inspectionError } = await supabase
        .from('inspections')
        .insert({
          hive_id: params.id,
          user_id: user?.id,
          inspection_date: date,
          time: time,
          queen_seen: queenSeen,
          eggs_seen: eggsSeen,
          brood_condition: broodCondition,
          honey_stores: honeyStores,
          temperament: temperament,
          notes: notes,
          status: status, 
          temperature: temperature ? parseFloat(temperature) : null,
          weather: weather,
          image_url: imageUrl
        });

      if (inspectionError) throw inspectionError;

      // 2. Update Hive Status and Last Inspection Date
      await supabase
        .from('hives')
        .update({ 
          status: status === 'DØD' ? 'DØD' : 'AKTIV',
          last_inspection_date: date 
        }) 
        .eq('id', params.id);

      // 3. Log Activity
      const { error: logError } = await supabase
        .from('hive_logs')
        .insert({
          hive_id: params.id,
          user_id: user?.id,
          action: 'INSPEKSJON',
          details: `Inspeksjon utført. Status: ${status}. Temp: ${temperature}°C. ${notes ? 'Notater lagt til.' : ''}`
        });

      if (logError) throw logError;

      router.push('/hives');
    } catch (error: any) {
      alert('Feil ved lagring: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Laster...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Ny Inspeksjon {hive?.hive_number ? <span className="text-honey-600"> {hive.hive_number}</span> : ''}
            </h1>
            <p className="text-sm text-gray-500">{hive?.name || 'Laster...'}</p>
          </div>
        </div>
        
        {/* Voice Toggle */}
        <button
            onClick={isListening ? stopListening : startListening}
            className={`p-3 rounded-full transition-all ${
                isListening 
                ? 'bg-red-500 text-white animate-pulse shadow-lg' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
        >
            {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
      </header>

      <main className="p-4">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
          
          {/* Date & Weather */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Tid og Vær
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dato</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Klokkeslett</label>
                <input 
                  type="time" 
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-blue-500" />
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-blue-700 uppercase">Temperatur</label>
                  {weatherLoading ? (
                    <span className="text-xs text-blue-400">Henter...</span>
                  ) : (
                    <input 
                      type="number" 
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      placeholder="0"
                      className="bg-transparent border-none p-0 text-blue-900 font-bold w-12 focus:ring-0"
                    />
                  )}
                </div>
                <span className="text-blue-900 font-bold">°C</span>
              </div>

              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-500" />
                 <div className="flex flex-col">
                  <label className="text-xs font-bold text-blue-700 uppercase">Vær</label>
                  {weatherLoading ? (
                    <span className="text-xs text-blue-400">Henter...</span>
                  ) : (
                    <input 
                      type="text" 
                      value={weather}
                      onChange={(e) => setWeather(e.target.value)}
                      placeholder="Sol"
                      className="bg-transparent border-none p-0 text-blue-900 font-bold w-20 text-right focus:ring-0"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Queen & Eggs */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Dronning og Yngel</h3>
            
            <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
              <span className="text-gray-700">Dronning sett?</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={queenSeen} onChange={e => setQueenSeen(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-honey-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-honey-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
              <span className="text-gray-700">Egg sett?</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={eggsSeen} onChange={e => setEggsSeen(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-honey-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-honey-500"></div>
              </label>
            </div>
          </div>

          {/* Conditions */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Tilstand & Status</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kubestatus</label>
              <select 
                value={status} 
                onChange={e => setStatus(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg font-medium text-gray-900"
              >
                <option value="OK">OK</option>
                <option value="SVAK">Svak</option>
                <option value="DØD">Død</option>
                <option value="SYKDOM">Sykdom</option>
                <option value="BYTT_DRONNING">Bytt dronning</option>
                <option value="MOTTATT_FOR">Mottatt fôr</option>
                <option value="SKIFTET_RAMMER">Skiftet rammer</option>
                <option value="SVERMING">Sverming</option>
                <option value="VARROA_MISTANKE">Varroa mistanke</option>
                <option value="BYTTET_VOKS">Byttet voks</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Yngelleie</label>
                <select 
                    value={broodCondition} 
                    onChange={e => setBroodCondition(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                >
                    <option value="darlig">Dårlig / Lite</option>
                    <option value="normal">Normalt</option>
                    <option value="bra">Bra / Mye</option>
                </select>
                </div>

                <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fôr</label>
                <select 
                    value={honeyStores} 
                    onChange={e => setHoneyStores(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                >
                    <option value="lite">Lite</option>
                    <option value="middels">Middels</option>
                    <option value="mye">Mye</option>
                </select>
                </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gemytt</label>
              <select 
                value={temperament} 
                onChange={e => setTemperament(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              >
                <option value="rolig">Rolig</option>
                <option value="urolig">Urolig</option>
                <option value="aggressiv">Aggressiv</option>
              </select>
            </div>
          </div>

          {/* Notes & Image */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Info className="w-4 h-4" /> Notater & Bilde
            </h3>
            
            {/* Image Upload */}
            <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 uppercase">Last opp bilde (valgfritt)</label>
                <div className="flex items-center gap-4">
                    <label className="cursor-pointer flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <ImageIcon className="w-5 h-5 text-gray-500" />
                        <span className="text-sm text-gray-700">Velg bilde</span>
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                        />
                    </label>
                    {imagePreview && (
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            <button 
                                type="button"
                                onClick={() => {
                                    setSelectedImage(null);
                                    setImagePreview(null);
                                }}
                                className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notater</label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm h-24"
                placeholder="Skriv dine observasjoner..."
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-honey-500 hover:bg-honey-600 text-white font-bold py-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {submitting ? 'Lagrer...' : 'Lagre inspeksjon'}
          </button>
        </form>
      </main>
    </div>
  );
}
