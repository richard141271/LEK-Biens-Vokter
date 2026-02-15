'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { parseVoiceCommand } from '@/utils/voice-parser';
import { analyzeAndCorrect } from '@/utils/voice-diagnostics';
import { loadAliases } from '@/utils/voice-alias';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Calendar, Cloud, Thermometer, Info, Image as ImageIcon, X, Mic, MicOff, Camera } from 'lucide-react';
import { useOffline } from '@/context/OfflineContext';

export default function NewInspectionPage({ params }: { params: { id: string } }) {
  const [hive, setHive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const searchParams = useSearchParams();
  const autoVoice = searchParams.get('autoVoice');
  
  const { isOffline, saveInspection } = useOffline();

  // Voice State
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [notesActive, setNotesActive] = useState(false);
  const [history, setHistory] = useState<Array<{ type: string; prev: any }>>([]);
  useEffect(() => { loadAliases(); }, []);

  // Camera State
  const [cameraActive, setCameraActive] = useState(false);
  const [pendingCapture, setPendingCapture] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Capture Photo Function
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video stream
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current frame
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.drawImage(video, 0, 0);
        
        // Convert to file
        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], `voice_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
                setPhotoCount((n) => {
                  const next = n + 1;
                  // Announce inside updater to use correct next number
                  speak(`Bilde tatt. Dette er bilde nummer ${next}`);
                  return next;
                });
                setSelectedImage((prev) => prev ? prev : file);
                setExtraImages((prev) => prev ? [...prev, file] : [file]);
                setImagePreview((prev) => prev || URL.createObjectURL(file));
                setLastCommand("Bilde tatt!");
                // Optional: Flash effect or sound here
                setTimeout(() => setLastCommand(null), 3000);
            }
        }, 'image/jpeg', 0.8);
    }
  }, []);

  // Initialize Camera Stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    
    if (cameraActive) {
        navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        })
        .then(s => {
            stream = s;
            if (videoRef.current) {
                videoRef.current.srcObject = s;
                videoRef.current.play();
            }
            // Trigger pending capture once video is ready
            if (pendingCapture) {
                const attempt = () => {
                    const v = videoRef.current;
                    if (v && v.readyState >= 2) {
                        capturePhoto();
                        setPendingCapture(false);
                    } else {
                        setTimeout(attempt, 200);
                    }
                };
                setTimeout(attempt, 250);
            }
        })
        .catch(err => {
            console.error("Camera error:", err);
            setCameraActive(false);
            alert("Kunne ikke starte kamera. Sjekk at du har gitt tillatelse.");
        });
    }

    return () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };
  }, [cameraActive, pendingCapture, capturePhoto]);

  const [lastCorrection, setLastCorrection] = useState<{ phrase?: string; similarity?: number } | null>(null);

  const handleVoiceCommand = (text: string) => {
      console.log("Voice Command:", text);
      const raw = text || '';
      const lower = raw.toLowerCase();
      if (/\b(start|aktiver)\s+(body|bodey)?cam\b/.test(lower) || /\bstart kamera\b/.test(lower)) {
          setCameraActive(true);
          speak('Bodycam aktivert');
          setLastCommand('Bodycam aktivert');
          setTimeout(() => setLastCommand(null), 3000);
          if (notesActive) setNotes(prev => prev + (prev ? '\n' : '') + raw);
          return;
      }
      if (/\b(stopp|deaktiver)\s+(body|bodey)?cam\b/.test(lower) || /\bstopp kamera\b/.test(lower)) {
          setCameraActive(false);
          speak('Bodycam stoppet');
          setLastCommand('Bodycam stoppet');
          setTimeout(() => setLastCommand(null), 3000);
          if (notesActive) setNotes(prev => prev + (prev ? '\n' : '') + raw);
          return;
      }
      if (/\bnotat\b(?!\s*avslutt)/.test(lower)) {
          setNotesActive(true);
          speak('Notat startet');
          setLastCommand('Notat startet');
          setTimeout(() => setLastCommand(null), 3000);
          setNotes(prev => prev + (prev ? '\n' : '') + raw.replace(/^\s*notat[:\-\s]*/i, ''));
          return;
      }
      if (/\b(avslutt notat|notat avsluttet|notat avslutt(et)?)\b/.test(lower)) {
          setNotesActive(false);
          speak('Notat avsluttet');
          setLastCommand('Notat avsluttet');
          setTimeout(() => setLastCommand(null), 3000);
          return;
      }
      if (/\b(avbryt siste|angre siste|undo)\b/.test(lower)) {
          const last = history[history.length - 1];
          if (last) {
              if (last.type === 'queenSeen') setQueenSeen(last.prev);
              if (last.type === 'eggsSeen') setEggsSeen(last.prev);
              if (last.type === 'honeyStores') setHoneyStores(last.prev);
              if (last.type === 'temperament') setTemperament(last.prev);
              if (last.type === 'broodCondition') setBroodCondition(last.prev);
              if (last.type === 'status') setStatus(last.prev);
              if (last.type === 'temperature') setTemperature(last.prev);
              if (last.type === 'weather') setWeather(last.prev);
              if (last.type === 'photo') {
                  setExtraImages((prev) => {
                      const copy = [...(prev || [])];
                      copy.pop();
                      return copy;
                  });
                  setPhotoCount((n) => Math.max(0, n - 1));
              }
              setHistory(prev => prev.slice(0, -1));
              speak('Siste endring avbrutt');
              setLastCommand('Siste endring avbrutt');
              setTimeout(() => setLastCommand(null), 3000);
              return;
          }
      }
      let parsed = parseVoiceCommand(text);
      const res = analyzeAndCorrect(text, parsed);
      parsed = res.parsed;
      let feedback: string[] = [];
      if (res.corrected && res.matched) {
          setLastCorrection({ phrase: res.matched, similarity: res.similarity });
          feedback.push(`Tolkning brukt: ${res.matched}`);
      }

      // Action: Take Photo
      if (parsed.action === 'TAKE_PHOTO') {
          if (cameraActive) {
              capturePhoto();
              feedback.push("Tar bilde...");
          } else {
              // Start camera and schedule capture when ready
              setPendingCapture(true);
              setCameraActive(true);
              feedback.push("Starter kamera og tar bilde...");
          }
      }

      // Action: Save Inspection
      if (parsed.action === 'SAVE_INSPECTION') {
          feedback.push("Lagrer inspeksjon...");
          submitInspection();
      }

      // Update State based on parsed result
      if (parsed.queenSeen !== undefined) {
          setHistory(prev => [...prev, { type: 'queenSeen', prev: queenSeen }]);
          setQueenSeen(parsed.queenSeen);
          feedback.push(parsed.queenSeen ? 'Dronning sett' : 'Ingen dronning');
      }

      if (parsed.eggsSeen !== undefined) {
          setHistory(prev => [...prev, { type: 'eggsSeen', prev: eggsSeen }]);
          setEggsSeen(parsed.eggsSeen);
          feedback.push(parsed.eggsSeen ? 'Egg sett' : 'Ingen egg');
      }

      if (parsed.honeyStores) {
          setHistory(prev => [...prev, { type: 'honeyStores', prev: honeyStores }]);
          setHoneyStores(parsed.honeyStores);
          feedback.push(`Honning: ${parsed.honeyStores}`);
      }

      if (parsed.temperament) {
          setHistory(prev => [...prev, { type: 'temperament', prev: temperament }]);
          setTemperament(parsed.temperament);
          feedback.push(`Gemytt: ${parsed.temperament}`);
      }

      if (parsed.broodCondition) {
          setHistory(prev => [...prev, { type: 'broodCondition', prev: broodCondition }]);
          setBroodCondition(parsed.broodCondition);
          feedback.push(`Yngel: ${parsed.broodCondition}`);
      }

      if (parsed.status) {
          setHistory(prev => [...prev, { type: 'status', prev: status }]);
          setStatus(parsed.status);
          feedback.push(`Status: ${parsed.status}`);
      }

      if (parsed.temperature) {
          setHistory(prev => [...prev, { type: 'temperature', prev: temperature }]);
          setTemperature(parsed.temperature);
          feedback.push(`Temp: ${parsed.temperature}°C`);
      }

      if (parsed.weather) {
          setHistory(prev => [...prev, { type: 'weather', prev: weather }]);
          setWeather(parsed.weather);
          feedback.push(`Vær: ${parsed.weather}`);
      }

      // Show feedback if we understood something
      if (feedback.length > 0) {
          setLastCommand(feedback.join(', '));
          speak(feedback.join('. '));
          // Clear feedback after 4s
          setTimeout(() => setLastCommand(null), 4000);
      }

      if (notesActive) {
          setNotes(prev => prev + (prev ? '\n' : '') + raw);
      } else {
          setNotes(prev => prev + (prev ? '\n' : '') + "Stemme: " + raw);
      }
  };

  const { isListening, toggleListening, isSupported } = useVoiceRecognition(handleVoiceCommand);
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
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null);

  // Image Upload State
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [extraImages, setExtraImages] = useState<File[] | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchHiveAndWeather();
  }, [params.id]);

  useEffect(() => {
    loadAliases();
  }, []);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const beep = (freq = 880, ms = 120) => {
    try {
      if (typeof window === 'undefined') return;
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') void ctx.resume();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.02);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
      o.stop(ctx.currentTime + ms / 1000 + 0.02);
    } catch {}
  };
  const speak = (text: string) => {
    try {
      if (typeof window === 'undefined') return;
      // Short cue to ensure audio context is unlocked on iOS
      beep(1046, 60);
      const s = (window as any).speechSynthesis as SpeechSynthesis | undefined;
      if (!s) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'nb-NO';
      s.speak(u);
    } catch {}
  };


  const fetchHiveAndWeather = async () => {
    // 1. Fetch Hive Info
    try {
      // Try LocalStorage first if offline or as backup
      if (isOffline) {
          const offlineData = localStorage.getItem('offline_data');
          if (offlineData) {
              const parsed = JSON.parse(offlineData);
              const foundHive = parsed.hives?.find((h: any) => h.id === params.id);
              if (foundHive) {
                  console.log('📦 Loaded hive from offline cache', foundHive);
                  setHive(foundHive);
                  setLoading(false);
                  return; // Skip network
              }
          }
      }

      const { data, error } = await supabase
        .from('hives')
        .select('name, hive_number, apiary_id')
        .eq('id', params.id)
        .single();
      
      if (data) setHive(data);
    } catch (e) {
      console.log('Could not fetch hive info (offline?)');
      // Fallback to local storage if network request failed unexpectedly
      const offlineData = localStorage.getItem('offline_data');
      if (offlineData) {
          const parsed = JSON.parse(offlineData);
          const foundHive = parsed.hives?.find((h: any) => h.id === params.id);
          if (foundHive) setHive(foundHive);
      }
    }

    // 2. Fetch Weather (Geolocation)
    if (navigator.geolocation && !isOffline) {
      setWeatherLoading(true);
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ lat: latitude, lng: longitude });
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

  const submitInspection = async () => {
    setSubmitting(true);

    try {
      // 1. Check Offline Mode
      if (isOffline) {
        await saveInspection({
          hiveId: params.id,
          action: 'FULL_INSPECTION',
          details: `Inspeksjon utført (Offline). Status: ${status}.`,
          sharedWithMattilsynet: false, // Page doesn't have this field?
          image: selectedImage ? {
            name: selectedImage.name,
            type: selectedImage.type,
            blob: selectedImage
          } : undefined,
          data: {
            inspection: {
              hive_id: params.id,
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
              weather: weather
            },
            hiveUpdate: {
              status: status === 'DØD' ? 'DØD' : 'AKTIV',
              last_inspection_date: date 
            }
          }
        });
        
        alert('Inspeksjon lagret offline! Den blir sendt når du får nettdekning igjen.');
        router.push('/hives');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      // Update Apiary Location if we have coordinates
      if (coordinates && hive?.apiary_id) {
          const { error: apiaryError } = await supabase
              .from('apiaries')
              .update({
                  latitude: coordinates.lat,
                  longitude: coordinates.lng
              })
              .eq('id', hive.apiary_id);
              
          if (apiaryError) {
              console.error('Kunne ikke oppdatere bigårdens posisjon:', apiaryError);
              // Don't stop inspection submission just because of this
          }
      }

      let imageUrl = null;
      const allPhotos: string[] = [];
      if (selectedImage) {
        setUploadingImage(true);
        const u = await uploadImage(selectedImage);
        if (u) {
          imageUrl = u;
          allPhotos.push(u);
        }
        setUploadingImage(false);
      }
      if (extraImages && extraImages.length > 0) {
        setUploadingImage(true);
        for (const f of extraImages) {
          const u = await uploadImage(f);
          if (u) allPhotos.push(u);
        }
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
          notes: allPhotos.length > 1 ? `${notes}\n${allPhotos.slice(1).map((u, i) => `Bilde ${i + 2}: ${u}`).join('\n')}` : notes,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitInspection();
  };

  if (loading) return <div className="p-8 text-center">Laster...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10 flex items-center justify-between">
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
        
        {/* Voice & Camera Controls */}
        <div className="flex gap-2">
            <button
                onClick={() => setCameraActive(!cameraActive)}
                className={`p-3 rounded-full transition-all ${
                    cameraActive 
                    ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-300' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Start/Stopp Bodycam"
            >
                <Camera className="w-6 h-6" />
            </button>

            <button
                onClick={toggleListening}
                className={`p-3 rounded-full transition-all ${
                    isListening 
                    ? 'bg-red-500 text-white animate-pulse shadow-lg' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Start/Stopp Talestyring"
            >
                {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
        </div>
      </header>

      <main className="p-4">
        {/* Camera Preview (Bodycam Mode) */}
        {cameraActive && (
            <div className="mb-4 relative rounded-xl overflow-hidden shadow-lg bg-black aspect-video mx-auto max-w-lg border-2 border-blue-500">
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-md flex items-center gap-1">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    BODYCAM
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white text-xs">
                    Si "Ta bilde" for å knipse
                </div>
            </div>
        )}
        <canvas ref={canvasRef} className="hidden" />

        {lastCorrection && (
          <div className="mb-3 p-2 bg-amber-50 text-amber-800 rounded-lg flex items-center gap-2 border border-amber-200">
            <Info className="w-4 h-4" />
            <span className="text-sm font-medium">Tolkning brukt: {lastCorrection.phrase} ({Math.round((lastCorrection.similarity || 0) * 100)}%)</span>
          </div>
        )}

        {/* Voice Feedback */}
        {lastCommand && (
          <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 shadow-sm border border-green-200">
            <Mic className="w-5 h-5" />
            <span className="font-medium">Oppfattet: {lastCommand}</span>
          </div>
        )}

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
                      className="bg-transparent border-none p-0 text-blue-900 font-bold w-24 focus:ring-0"
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
