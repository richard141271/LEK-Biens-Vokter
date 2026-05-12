'use client';

import { createClient, getUserWithSessionFallback } from '@/utils/supabase/client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { parseVoiceCommand } from '@/utils/voice-parser';
import { analyzeAndCorrect } from '@/utils/voice-diagnostics';
import { loadAliases } from '@/utils/voice-alias';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Calendar, Cloud, Thermometer, Info, Image as ImageIcon, X, Mic, MicOff, Camera } from 'lucide-react';
import { useOffline } from '@/context/OfflineContext';
import { getDistanceFromLatLonInM } from '@/utils/geo';

export default function NewInspectionPage({ params }: { params: { id: string } }) {
  const [hive, setHive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const searchParams = useSearchParams();
  const autoVoice = searchParams.get('autoVoice');
  const shouldAutoVoice = autoVoice === '1' || autoVoice === 'true';
  const isDemoParam = searchParams.get('demo') === '1';
  const [isDemoActive, setIsDemoActive] = useState(isDemoParam);
  const [handsfreeReady, setHandsfreeReady] = useState(false);
  
  const { isOffline, saveInspection } = useOffline();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isDemoParam) {
      setIsDemoActive(true);
      return;
    }
    try {
      if (window.localStorage.getItem('lek_demo_session_id')) setIsDemoActive(true);
    } catch {}
  }, [isDemoParam]);

  // Voice State
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [notesActive, setNotesActive] = useState(false);
  const [history, setHistory] = useState<Array<{ type: string; prev: any }>>([]);
  const dirtyRef = useRef(false);
  const autoExitSavedRef = useRef(false);
  const insideApiaryRef = useRef<boolean | null>(null);
  const apiaryCoordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const submitInspectionRef = useRef<(opts?: { skipGpsConfirm?: boolean }) => Promise<void>>(async () => {});
  useEffect(() => { loadAliases(); }, []);

  // Camera State
  const [cameraActive, setCameraActive] = useState(false);
  const [pendingCapture, setPendingCapture] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speakRef = useRef<(text: string) => void>(() => {});
  const lastVoiceCaptureAtRef = useRef<number>(0);
  const lastVoiceCaptureTextRef = useRef<string>('');
  const lastManualCaptureAtRef = useRef<number>(0);
  const selectedImageRef = useRef<File | null>(null);
  const filePreviewRef = useRef<Map<File, string>>(new Map());
  const getPreviewUrl = (file: File) => {
    const existing = filePreviewRef.current.get(file);
    if (existing) return existing;
    const url = URL.createObjectURL(file);
    filePreviewRef.current.set(file, url);
    return url;
  };

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
                const nextPreviewUrl = getPreviewUrl(file);
                setPhotoCount((n) => {
                  const next = n + 1;
                  speakRef.current(`Bilde tatt. Dette er bilde nummer ${next}`);
                  return next;
                });
                setSelectedImage((prev) => {
                  if (!prev) return file;
                  setExtraImages((old) => (old ? [...old, file] : [file]));
                  return prev;
                });
                setImagePreview((prev) => prev || nextPreviewUrl);
                setLastCommand("Bilde tatt!");
                // Optional: Flash effect or sound here
                setTimeout(() => setLastCommand(null), 3000);
            }
        }, 'image/jpeg', 0.8);
    }
  }, []);

  const handleManualCapture = useCallback(() => {
    const now = Date.now();
    if (now - lastManualCaptureAtRef.current < 800) return;
    lastManualCaptureAtRef.current = now;

    if (!cameraActive) {
      setPendingCapture(true);
      setCameraActive(true);
      return;
    }

    let tries = 0;
    const attempt = () => {
      tries += 1;
      const v = videoRef.current;
      if (v && v.readyState >= 2) {
        capturePhoto();
        return;
      }
      if (tries >= 20) return;
      setTimeout(attempt, 150);
    };
    attempt();
  }, [cameraActive, capturePhoto]);

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
              if (last.type === 'queenColor') setQueenColor(last.prev);
              if (last.type === 'queenYear') setQueenYear(last.prev);
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
                      if (copy.length > 0) {
                        copy.pop();
                        setPhotoCount((n) => Math.max(0, n - 1));
                        return copy;
                      }
                      setSelectedImage(null);
                      setImagePreview(null);
                      setPhotoCount((n) => Math.max(0, n - 1));
                      return null;
                  });
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
          const now = Date.now();
          const rawKey = String(text || '').trim().toLowerCase();
          const isDuplicateText =
            rawKey &&
            rawKey === lastVoiceCaptureTextRef.current &&
            now - lastVoiceCaptureAtRef.current < 6000;
          if (now - lastVoiceCaptureAtRef.current < 2500 || isDuplicateText) {
              feedback.push("Bilde er allerede tatt");
          } else if (cameraActive) {
              lastVoiceCaptureAtRef.current = now;
              lastVoiceCaptureTextRef.current = rawKey;
              capturePhoto();
              feedback.push("Tar bilde...");
          } else {
              // Start camera and schedule capture when ready
              if (!pendingCapture) {
                  lastVoiceCaptureAtRef.current = now;
                  lastVoiceCaptureTextRef.current = rawKey;
                  setPendingCapture(true);
                  setCameraActive(true);
                  feedback.push("Starter kamera og tar bilde...");
              } else {
                  feedback.push("Kamera starter allerede");
              }
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
          setQueenSeen(parsed.queenSeen ? 'ja' : 'nei');
          feedback.push(parsed.queenSeen ? 'Dronning sett' : 'Ingen dronning');
      }

      if (parsed.queenColor) {
          setHistory(prev => [...prev, { type: 'queenColor', prev: queenColor }]);
          markTouched('queenColor');
          setQueenColor(parsed.queenColor);
          feedback.push(`Dronningfarge: ${parsed.queenColor}`);
      }

      if (parsed.queenYear) {
          setHistory(prev => [...prev, { type: 'queenYear', prev: queenYear }]);
          markTouched('queenYear');
          setQueenYear(parsed.queenYear);
          feedback.push(`Årgang: ${parsed.queenYear}`);
      }

      if (parsed.eggsSeen !== undefined) {
          setHistory(prev => [...prev, { type: 'eggsSeen', prev: eggsSeen }]);
          setEggsSeen(parsed.eggsSeen ? 'ja' : 'nei');
          feedback.push(parsed.eggsSeen ? 'Egg sett' : 'Ingen egg');
      }

      if (parsed.honeyStores) {
          setHistory(prev => [...prev, { type: 'honeyStores', prev: honeyStores }]);
          markTouched('honeyStores');
          setHoneyStores(parsed.honeyStores);
          feedback.push(`Honning: ${parsed.honeyStores}`);
      }

      if (parsed.temperament) {
          setHistory(prev => [...prev, { type: 'temperament', prev: temperament }]);
          markTouched('temperament');
          setTemperament(parsed.temperament);
          feedback.push(`Gemytt: ${parsed.temperament}`);
      }

      if (parsed.broodCondition) {
          setHistory(prev => [...prev, { type: 'broodCondition', prev: broodCondition }]);
          markTouched('broodCondition');
          setBroodCondition(parsed.broodCondition);
          feedback.push(`Yngel: ${parsed.broodCondition}`);
      }

      if (parsed.status) {
          setHistory(prev => [...prev, { type: 'status', prev: status }]);
          markTouched('status');
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
          dirtyRef.current = true;
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

  const { isListening, startListening, stopListening, pauseListening, resumeListening, toggleListening, isSupported, lastError } = useVoiceRecognition(handleVoiceCommand);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));
  const [queenSeen, setQueenSeen] = useState<'' | 'ja' | 'nei'>('');
  const [queenColor, setQueenColor] = useState<string>('');
  const [queenYear, setQueenYear] = useState<string>('');
  const [eggsSeen, setEggsSeen] = useState<'' | 'ja' | 'nei'>('');
  const [broodCondition, setBroodCondition] = useState('normal');
  const [honeyStores, setHoneyStores] = useState('middels');
  const [temperament, setTemperament] = useState('rolig');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('OK');
  const prefillDoneRef = useRef(false);
  const touchedRef = useRef({
    queenColor: false,
    queenYear: false,
    broodCondition: false,
    honeyStores: false,
    temperament: false,
    status: false,
  });
  const markTouched = (key: keyof typeof touchedRef.current) => {
    touchedRef.current[key] = true;
  };
  
  // Weather State
  const [weather, setWeather] = useState('');
  const [temperature, setTemperature] = useState('');
  const [weatherPlace, setWeatherPlace] = useState<string>('');
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
  const voiceErrorAlertedRef = useRef(false);

  useEffect(() => {
    const err = String(lastError || '').trim().toLowerCase();
    if (!err) return;
    if (voiceErrorAlertedRef.current) return;
    if (err === 'not-allowed' || err === 'service-not-allowed') {
      voiceErrorAlertedRef.current = true;
      alert('Talestyring er blokkert av nettleseren. Sjekk mikrofon-tillatelse for LEK-Biens Vokter og prøv igjen.');
    }
    if (err === 'interaction-required') {
      voiceErrorAlertedRef.current = true;
      alert('Trykk mikrofon-knappen én gang for å aktivere talestyring (iPhone/Safari krever ofte dette).');
    }
  }, [lastError]);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (shouldAutoVoice) {
        setHandsfreeReady(true);
        return;
      }
      setHandsfreeReady(localStorage.getItem('handsfree_setup_done') === '1');
    } catch {}
  }, [shouldAutoVoice]);

  useEffect(() => {
    fetchHiveAndWeather();
  }, [params.id]);

  useEffect(() => {
    prefillDoneRef.current = false;
    touchedRef.current = {
      queenColor: false,
      queenYear: false,
      broodCondition: false,
      honeyStores: false,
      temperament: false,
      status: false,
    };
  }, [params.id]);

  useEffect(() => {
    loadAliases();
  }, []);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const ttsPrimedRef = useRef(false);
  const beep = (freq = 880, ms = 220) => {
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
      o.type = 'square';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.03);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
      o.stop(ctx.currentTime + ms / 1000 + 0.05);
    } catch {}
  };

  const primeTts = (shouldSpeak: boolean) => {
    try {
      if (typeof window === 'undefined') return;
      if (ttsPrimedRef.current) return;
      const s = (window as any).speechSynthesis as SpeechSynthesis | undefined;
      if (!s) return;
      ttsPrimedRef.current = true;
      if (!shouldSpeak) return;
      s.cancel();
      const u = new SpeechSynthesisUtterance('Talestyring aktivert');
      u.lang = 'nb-NO';
      u.rate = 0.95;
      u.pitch = 1.0;
      u.volume = 0.9;
      s.speak(u);
    } catch {}
  };

  useEffect(() => {
    const onFirst = () => {
      primeTts(false);
    };
    try {
      window.addEventListener('pointerdown', onFirst, { once: true, passive: true } as any);
    } catch {}
    return () => {
      try {
        window.removeEventListener('pointerdown', onFirst as any);
      } catch {}
    };
  }, []);
  const speak = (text: string) => {
    try {
      if (typeof window === 'undefined') return;
      const s = (window as any).speechSynthesis as SpeechSynthesis | undefined;
      const wasListening = isListening;
      // Pause lytte-modus mens vi snakker; bruk midlertidig pause
      if (wasListening) {
        try { pauseListening(); } catch {}
      }
      if (!s) {
        // Fallback: gi tydelig dobbel-tone og gjenoppta lytting
        setTimeout(() => beep(900, 180), 120);
        if (wasListening) setTimeout(() => { try { resumeListening(); } catch {} }, 250);
        return;
      }
      s.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'nb-NO';
      u.rate = 0.92;
      u.pitch = 1.0;
      u.volume = 1.0;
      u.onstart = () => {
        try { beep(1200, 260); } catch {}
      };
      // Velg norsk stemme hvis tilgjengelig
      const pickVoice = () => {
        try {
          const voices = s.getVoices ? s.getVoices() : [];
          const nb = voices.find(v => (v.lang || '').toLowerCase().startsWith('nb'));
          const no = voices.find(v => (v.lang || '').toLowerCase().startsWith('no'));
          const nn = voices.find(v => (v.lang || '').toLowerCase().includes('nor'));
          u.voice = nb || no || nn || u.voice || null;
        } catch {}
      };
      if (!s.getVoices || s.getVoices().length === 0) {
        const prev = (s as any)._voicesChanged;
        (s as any)._voicesChanged = true;
        s.onvoiceschanged = () => {
          if (!(s as any)._voicesChanged) return;
          (s as any)._voicesChanged = false;
          pickVoice();
          s.speak(u);
        };
        // Fallback timeout
        setTimeout(() => {
          if ((s as any)._voicesChanged) {
            (s as any)._voicesChanged = false;
            pickVoice();
            s.speak(u);
          }
        }, 300);
      } else {
        pickVoice();
        s.speak(u);
      }
      // Safety fallback: om onend ikke fyrer (plattformbegrensning), gjenoppta etter 3s
      const safety = setTimeout(() => {
        if (wasListening) { try { resumeListening(); } catch {} }
      }, 3000);
      u.onend = () => {
        clearTimeout(safety);
        if (wasListening) {
          // Liten pause før vi gjenopptar lytting
          setTimeout(() => { try { resumeListening(); } catch {} }, 120);
        }
      };
      u.onerror = () => {
        clearTimeout(safety);
        if (wasListening) {
          setTimeout(() => { try { resumeListening(); } catch {} }, 120);
        }
      };
    } catch {}
  };
  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  useEffect(() => {
    selectedImageRef.current = selectedImage;
  }, [selectedImage]);

  useEffect(() => {
    return () => {
      try {
        Array.from(filePreviewRef.current.values()).forEach((url) => {
          try {
            URL.revokeObjectURL(url);
          } catch {}
        });
      } catch {}
      filePreviewRef.current.clear();
    };
  }, []);

  // Sikre kontinuerlig lytting gjennom hele inspeksjonen
  useEffect(() => {
    if (!handsfreeReady && !shouldAutoVoice) return;
    if (!isSupported) return;
    try { startListening(); } catch {}

    return () => {
      try { stopListening(); } catch {}
    };
  }, [handsfreeReady, isSupported, shouldAutoVoice, startListening, stopListening]);


  const fetchHiveAndWeather = async () => {
    setLoadError(null);
    const withTimeout = async <T,>(p: PromiseLike<T>, ms: number): Promise<T> => {
      return await new Promise<T>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('timeout')), ms);
        Promise.resolve(p).then((v) => {
          clearTimeout(t);
          resolve(v);
        }).catch((e) => {
          clearTimeout(t);
          reject(e);
        });
      });
    };

    try {
      if (typeof window !== 'undefined') {
        const offlineData = localStorage.getItem('offline_data');
        if (offlineData) {
          const parsed = JSON.parse(offlineData);
          const foundHive = parsed.hives?.find((h: any) => h.id === params.id);
          if (foundHive) setHive(foundHive);
          if (!prefillDoneRef.current) {
            const list = Array.isArray(parsed?.inspections) ? parsed.inspections : [];
            const mine = list.filter((i: any) => String(i?.hive_id || '') === params.id);
            mine.sort((a: any, b: any) => {
              const ad = String(a?.inspection_date || '');
              const bd = String(b?.inspection_date || '');
              if (ad !== bd) return bd.localeCompare(ad);
              const at = String(a?.time || '');
              const bt = String(b?.time || '');
              return bt.localeCompare(at);
            });
            const last = mine[0] || null;
            if (last) {
              const lastWithQueenColor = mine.find((i: any) => {
                const v = i?.queen_color;
                return v != null && String(v).trim();
              });
              const lastWithQueenYear = mine.find((i: any) => {
                const v = i?.queen_year;
                return v != null && String(v).trim();
              });
              const qc = lastWithQueenColor?.queen_color ? String(lastWithQueenColor.queen_color) : '';
              const qy = lastWithQueenYear?.queen_year != null && String(lastWithQueenYear.queen_year).trim() ? String(lastWithQueenYear.queen_year) : '';
              const bc = String(last?.brood_condition || '');
              const hs = String(last?.honey_stores || '');
              const tp = String(last?.temperament || '');
              const st = String(last?.status || '');

              if (!touchedRef.current.queenColor && qc) setQueenColor(qc);
              if (!touchedRef.current.queenYear && qy) setQueenYear(qy);
              if (!touchedRef.current.broodCondition && bc && ['darlig', 'normal', 'bra'].includes(bc)) setBroodCondition(bc);
              if (!touchedRef.current.honeyStores && hs && ['lite', 'middels', 'mye'].includes(hs)) setHoneyStores(hs);
              if (!touchedRef.current.temperament && tp && ['rolig', 'urolig', 'aggressiv'].includes(tp)) setTemperament(tp);
              if (!touchedRef.current.status && st) setStatus(st);
              prefillDoneRef.current = true;
            }
          }
          if (isOffline && !foundHive) {
            setLoadError('Kuben finnes ikke i offline-cache. Koble til nett eller last ned data for offline først.');
            return;
          }
        } else if (isOffline) {
          setLoadError('Ingen offline-data funnet. Koble til nett eller last ned data for offline først.');
          return;
        }
      }

      if (!isOffline) {
        const hiveRes: any = await withTimeout(
          supabase
            .from('hives')
            .select('name, hive_number, apiary_id, user_id')
            .eq('id', params.id)
            .single() as any,
          9000
        );

        if (hiveRes?.data) {
          const hiveData = hiveRes.data;
          const { data: { user } } = await supabase.auth.getUser();
          if (!user?.id) {
            router.push('/login');
            return;
          }
          const ownerId = String(hiveData?.user_id || '').trim();
          if (ownerId && ownerId !== user.id) {
            const { data: access } = await supabase
              .from('account_access')
              .select('owner_id, member_id')
              .eq('owner_id', ownerId)
              .eq('member_id', user.id)
              .maybeSingle();

            if (!access) {
              setLoadError('Ingen tilgang til denne kuben');
              return;
            }
          }
          setHive(hiveData);

          if (!prefillDoneRef.current) {
            const { data: last, error: lastError } = await supabase
              .from('inspections')
              .select('queen_color, queen_year, brood_condition, honey_stores, temperament, status, inspection_date, time')
              .eq('hive_id', params.id)
              .order('inspection_date', { ascending: false })
              .order('time', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!lastError && last) {
              let qc = last?.queen_color ? String(last.queen_color) : '';
              let qy = last?.queen_year != null && String(last.queen_year).trim() ? String(last.queen_year) : '';
              const bc = String(last?.brood_condition || '');
              const hs = String(last?.honey_stores || '');
              const tp = String(last?.temperament || '');
              const st = String(last?.status || '');

              if (!touchedRef.current.queenColor && !qc) {
                const { data: prev } = await supabase
                  .from('inspections')
                  .select('queen_color, inspection_date, time')
                  .eq('hive_id', params.id)
                  .not('queen_color', 'is', null)
                  .neq('queen_color', '')
                  .order('inspection_date', { ascending: false })
                  .order('time', { ascending: false })
                  .limit(1)
                  .maybeSingle();
                if (prev?.queen_color) qc = String(prev.queen_color);
              }

              if (!touchedRef.current.queenYear && !qy) {
                const { data: prev } = await supabase
                  .from('inspections')
                  .select('queen_year, inspection_date, time')
                  .eq('hive_id', params.id)
                  .not('queen_year', 'is', null)
                  .order('inspection_date', { ascending: false })
                  .order('time', { ascending: false })
                  .limit(1)
                  .maybeSingle();
                if (prev?.queen_year != null && String(prev.queen_year).trim()) qy = String(prev.queen_year);
              }

              if (!touchedRef.current.queenColor && qc) setQueenColor(qc);
              if (!touchedRef.current.queenYear && qy) setQueenYear(qy);
              if (!touchedRef.current.broodCondition && bc && ['darlig', 'normal', 'bra'].includes(bc)) setBroodCondition(bc);
              if (!touchedRef.current.honeyStores && hs && ['lite', 'middels', 'mye'].includes(hs)) setHoneyStores(hs);
              if (!touchedRef.current.temperament && tp && ['rolig', 'urolig', 'aggressiv'].includes(tp)) setTemperament(tp);
              if (!touchedRef.current.status && st) setStatus(st);
              prefillDoneRef.current = true;
            }
          }
        }
      }

      if (handsfreeReady && navigator.geolocation && !isOffline) {
        setWeatherLoading(true);
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setCoordinates({ lat: latitude, lng: longitude });

            const fetchPlaceName = async (lat: number, lon: number) => {
              try {
                const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&accept-language=no`;
                const res = await withTimeout(fetch(url, { headers: { Accept: 'application/json' } }), 8000);
                if (!res.ok) return '';
                const data: any = await res.json();
                const addr = data?.address || {};
                const name =
                  addr.city ||
                  addr.town ||
                  addr.village ||
                  addr.hamlet ||
                  addr.municipality ||
                  addr.county ||
                  data?.name ||
                  '';
                return String(name || '').trim();
              } catch {
                return '';
              }
            };

            try {
              const response = await withTimeout(
                fetch(
                  `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&wind_speed_unit=ms`
                ),
                8000
              );
              const weatherData = await response.json();

              if (weatherData.current) {
                setTemperature(weatherData.current.temperature_2m.toString());
                setWeather(getWeatherDescription(weatherData.current.weather_code));
              }
              const place = await fetchPlaceName(latitude, longitude);
              if (place) setWeatherPlace(place);
            } catch {} finally {
              setWeatherLoading(false);
            }
          },
          () => {
            setWeatherLoading(false);
          },
          { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 }
        );
      }
    } catch {
      setLoadError('Kunne ikke hente kubedata akkurat nå. Sjekk nett og prøv igjen.');
    } finally {
      setLoading(false);
    }
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
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedImage((prevSelected) => {
      if (!prevSelected) {
        const first = files[0];
        setImagePreview(URL.createObjectURL(first));
        if (files.length > 1) {
          setExtraImages((prev) => (prev ? [...prev, ...files.slice(1)] : files.slice(1)));
        }
        setPhotoCount((n) => n + files.length);
        return first;
      }

      setExtraImages((prev) => (prev ? [...prev, ...files] : files));
      setPhotoCount((n) => n + files.length);
      return prevSelected;
    });

    e.target.value = '';
  };

  const uploadImage = async (file: File, opId: string, index: number): Promise<string> => {
    let demoSessionId: string | null = null;
    if (isDemoActive) {
      try {
        demoSessionId = localStorage.getItem('lek_demo_session_id');
      } catch {}
    }
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = demoSessionId
      ? `demo/${demoSessionId}/${params.id}/${opId}/${index}.${fileExt}`
      : `${params.id}/${opId}/${index}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('inspection-images')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('inspection-images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const isBucketNotFoundError = (error: any) => {
    const msg = String(error?.message || error?.error_description || error || '').toLowerCase();
    return msg.includes('bucket not found') || msg.includes('bucket') && msg.includes('not found');
  };

  const confirmGpsMismatchIfNeeded = async () => {
    try {
      if (typeof window === 'undefined') return true;
      if (!navigator.geolocation) return true;

      const apiaryId = String((hive as any)?.apiary_id || '').trim();
      if (!apiaryId) return true;

      const getApiaryCoords = async () => {
        const { data } = await supabase
          .from('apiaries')
          .select('id, name, location, latitude, longitude, coordinates')
          .eq('id', apiaryId)
          .maybeSingle();

        const lat = typeof (data as any)?.latitude === 'number' ? (data as any).latitude : null;
        const lon = typeof (data as any)?.longitude === 'number' ? (data as any).longitude : null;
        if (lat != null && lon != null && Number.isFinite(lat) && Number.isFinite(lon)) {
          return { lat, lon, name: String((data as any)?.name || '').trim(), location: String((data as any)?.location || '').trim() };
        }

        const raw = String((data as any)?.coordinates || '').trim();
        if (raw) {
          const matches = raw.match(/-?\d+(?:\.\d+)?/g);
          if (matches && matches.length >= 2) {
            const pLat = Number(matches[0]);
            const pLon = Number(matches[1]);
            if (Number.isFinite(pLat) && Number.isFinite(pLon)) {
              return { lat: pLat, lon: pLon, name: String((data as any)?.name || '').trim(), location: String((data as any)?.location || '').trim() };
            }
          }
        }

        return null;
      };

      const apiary = await getApiaryCoords();
      if (!apiary) return true;

      const getCachedCoords = () => {
        if (coordinates && Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lng)) {
          return { lat: coordinates.lat, lon: coordinates.lng };
        }
        try {
          const w = window.localStorage.getItem('lek_last_weather_coords');
          if (w) {
            const parsed = JSON.parse(w);
            const lat = Number(parsed?.lat);
            const lon = Number(parsed?.lon);
            if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
          }
        } catch {}
        try {
          const m = window.localStorage.getItem('lek_last_map_coords');
          if (m) {
            const parsed = JSON.parse(m);
            const lat = Number(parsed?.lat);
            const lon = Number(parsed?.lng);
            if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
          }
        } catch {}
        return null;
      };

      const cached = getCachedCoords();
      const current = cached
        ? cached
        : await new Promise<{ lat: number; lon: number } | null>((resolve) => {
            let done = false;
            const timeout = setTimeout(() => {
              if (done) return;
              done = true;
              resolve(null);
            }, 7000);
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                if (done) return;
                done = true;
                clearTimeout(timeout);
                const lat = Number(pos.coords.latitude);
                const lon = Number(pos.coords.longitude);
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) resolve(null);
                else resolve({ lat, lon });
              },
              () => {
                if (done) return;
                done = true;
                clearTimeout(timeout);
                resolve(null);
              },
              { enableHighAccuracy: true, maximumAge: 2000, timeout: 6500 }
            );
          });

      if (!current) return true;

      const distanceM = getDistanceFromLatLonInM(current.lat, current.lon, apiary.lat, apiary.lon);
      if (!Number.isFinite(distanceM)) return true;

      const thresholdM = 200;
      if (distanceM <= thresholdM) return true;

      const title = apiary.name || apiary.location || 'bigård';
      const rounded = Math.round(distanceM / 10) * 10;
      const ok = window.confirm(
        `Du inspiserer nå en bikube som tilhører ${title}, men GPS viser at du er ca. ${rounded} meter unna.\n\nStemmer dette?`
      );
      return ok;
    } catch {
      return true;
    }
  };

  const submitInspection = async (opts?: { skipGpsConfirm?: boolean }) => {
    const queenSeenValue = queenSeen === 'ja' ? true : queenSeen === 'nei' ? false : null;
    const eggsSeenValue = eggsSeen === 'ja' ? true : eggsSeen === 'nei' ? false : null;
    if (!opts?.skipGpsConfirm) {
      const okLocation = await confirmGpsMismatchIfNeeded();
      if (!okLocation) return;
    }
    const opId = crypto.randomUUID();
    setSubmitting(true);

    const safeReturnTo = (value: string | null) => {
      const v = String(value || '').trim();
      if (!v) return null;
      if (!v.startsWith('/') || v.startsWith('//') || v.includes('://')) return null;
      return v;
    };
    const returnTo = safeReturnTo(searchParams?.get('returnTo') || null);
    const apiaryId = String((hive as any)?.apiary_id || '').trim();
    const afterSavePath = isDemoActive ? '/hives?demo=1' : (returnTo || (apiaryId ? `/apiaries/${apiaryId}` : '/hives'));

    try {
      const allFiles: File[] = [
        ...(selectedImage ? [selectedImage] : []),
        ...(extraImages && extraImages.length > 0 ? extraImages : []),
      ];

      const hiveOwnerId = String((hive as any)?.user_id || '').trim();
      const user = await getUserWithSessionFallback(supabase);
      let performedByTag = '';
      if (user?.id && hiveOwnerId && user.id !== hiveOwnerId) {
        const { data: me } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).maybeSingle();
        const role = String((me as any)?.role || '').trim().toLowerCase();
        const isPrivileged = role === 'admin' || role === 'mattilsynet';
        if (!isPrivileged && allFiles.length === 0) {
          alert('Tilgang/Familie/Avløser må ta minst ett bilde per inspeksjon.');
          return;
        }
        const performerName = String((me as any)?.full_name || user.email || '').trim();
        if (performerName) performedByTag = `[[LEK_UTFORT_AV:${performerName}]]`;
      }

      const baseNotes =
        performedByTag ? `${performedByTag}${notes ? `\n${notes}` : ''}` : notes;

      // 1. Check Offline Mode
      if (isOffline) {
        if (isDemoActive) {
          alert('Demo-modus krever nett for å kunne lagre inspeksjoner.');
          return;
        }
        await saveInspection({
          id: opId,
          hiveId: params.id,
          action: 'FULL_INSPECTION',
          details: `Inspeksjon utført (Offline). Status: ${status}.`,
          sharedWithMattilsynet: false, // Page doesn't have this field?
          images: allFiles.length > 0 ? allFiles.map((f) => ({ name: f.name, type: f.type, blob: f })) : undefined,
          data: {
            inspection: {
              id: opId,
              hive_id: params.id,
              inspection_date: date,
              time: time,
              queen_seen: queenSeenValue,
              queen_color: queenColor || null,
              queen_year: queenYear ? parseInt(queenYear, 10) : null,
              eggs_seen: eggsSeenValue,
              brood_condition: broodCondition,
              honey_stores: honeyStores,
              temperament: temperament,
              notes: baseNotes,
              status: status, 
              temperature: temperature ? parseFloat(temperature) : null,
              weather: weather,
              weather_place: weatherPlace || null,
            },
            hiveUpdate: {
              status: status === 'DØD' ? 'DØD' : 'AKTIV',
              last_inspection_date: date 
            }
          }
        });
        
        alert('Inspeksjon lagret offline! Den blir sendt når du får nettdekning igjen.');
        router.push(afterSavePath);
        return;
      }

      if (!user) {
        if (isDemoActive) {
          alert('Demo-modus krever at du er logget inn.');
          return;
        }
        await saveInspection({
          id: opId,
          hiveId: params.id,
          action: 'FULL_INSPECTION',
          details: `Inspeksjon utført (Offline). Status: ${status}.`,
          sharedWithMattilsynet: false,
          images: allFiles.length > 0 ? allFiles.map((f) => ({ name: f.name, type: f.type, blob: f })) : undefined,
          data: {
            inspection: {
              id: opId,
              hive_id: params.id,
              inspection_date: date,
              time: time,
              queen_seen: queenSeenValue,
              queen_color: queenColor || null,
              queen_year: queenYear ? parseInt(queenYear, 10) : null,
              eggs_seen: eggsSeenValue,
              brood_condition: broodCondition,
              honey_stores: honeyStores,
              temperament: temperament,
              notes: baseNotes,
              status: status,
              temperature: temperature ? parseFloat(temperature) : null,
              weather: weather,
              weather_place: weatherPlace || null,
            },
            hiveUpdate: {
              status: status === 'DØD' ? 'DØD' : 'AKTIV',
              last_inspection_date: date,
            },
          },
        });

        alert('Inspeksjon lagret offline! Den blir sendt når du får nettdekning igjen.');
        router.push(afterSavePath);
        return;
      }

      if (isDemoActive) {
        let imageUrl: string | null = null;
        const allPhotos: string[] = [];
        if (allFiles.length > 0) {
          setUploadingImage(true);
          try {
            for (let i = 0; i < allFiles.length; i++) {
              let u = '';
              try {
                u = await uploadImage(allFiles[i], opId, i + 1);
              } catch (e: any) {
                if (isBucketNotFoundError(e)) {
                  alert('Bilde-lagring er ikke satt opp (bucket mangler). Inspeksjonen lagres uten bilde.');
                  break;
                }
                throw e;
              }
              if (i === 0) imageUrl = u;
              if (u) allPhotos.push(u);
            }
          } finally {
            setUploadingImage(false);
          }
        }

        const notesWithImages =
          allPhotos.length > 1
            ? `${baseNotes}${baseNotes ? '\n' : ''}${allPhotos.slice(1).map((u, i) => `Bilde ${i + 2}: ${u}`).join('\n')}`
            : baseNotes;
        const details = `Inspeksjon utført. Status: ${status}. Temp: ${temperature}°C. ${notes ? 'Notater lagt til.' : ''}`;
        const res = await fetch('/api/demo/write/inspection', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-lek-demo-source': 'demo-ui' },
          body: JSON.stringify({
            hiveId: params.id,
            operationId: opId,
            details,
            inspection: {
              inspection_date: date,
              time: time,
              queen_seen: queenSeenValue,
              queen_color: queenColor || null,
              queen_year: queenYear ? parseInt(queenYear, 10) : null,
              eggs_seen: eggsSeenValue,
              brood_condition: broodCondition,
              honey_stores: honeyStores,
              temperament: temperament,
              notes: notesWithImages,
              status: status,
              temperature: temperature ? parseFloat(temperature) : null,
              weather: weather,
              weather_place: weatherPlace || null,
              image_url: imageUrl,
            },
          }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.success) {
          throw new Error(payload?.error || 'Kunne ikke lagre inspeksjon i demo');
        }

        router.push('/hives?demo=1');
        return;
      }

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
      if (allFiles.length > 0) {
        setUploadingImage(true);
        try {
          for (let i = 0; i < allFiles.length; i++) {
            let u = '';
            try {
              u = await uploadImage(allFiles[i], opId, i + 1);
            } catch (e: any) {
              if (isBucketNotFoundError(e)) {
                alert('Bilde-lagring er ikke satt opp (bucket mangler). Inspeksjonen lagres uten bilde.');
                break;
              }
              throw e;
            }
            if (i === 0) imageUrl = u;
            if (u) allPhotos.push(u);
          }
        } finally {
          setUploadingImage(false);
        }
      }

      // 1. Insert Inspection
      const { error: inspectionError } = await supabase
        .from('inspections')
        .insert({
          id: opId,
          hive_id: params.id,
          user_id: user.id,
          inspection_date: date,
          time: time,
          queen_seen: queenSeenValue,
          queen_color: queenColor || null,
          queen_year: queenYear ? parseInt(queenYear, 10) : null,
          eggs_seen: eggsSeenValue,
          brood_condition: broodCondition,
          honey_stores: honeyStores,
          temperament: temperament,
          notes:
            allPhotos.length > 1
              ? `${baseNotes}${baseNotes ? '\n' : ''}${allPhotos.slice(1).map((u, i) => `Bilde ${i + 2}: ${u}`).join('\n')}`
              : baseNotes,
          status: status, 
          temperature: temperature ? parseFloat(temperature) : null,
          weather: weather,
          weather_place: weatherPlace || null,
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
          id: opId,
          hive_id: params.id,
          user_id: user.id,
          action: 'INSPEKSJON',
          details: `Inspeksjon utført. Status: ${status}. Temp: ${temperature}°C. ${notes ? 'Notater lagt til.' : ''}`
        });

      if (logError) throw logError;

      try {
        const existingRaw = localStorage.getItem('offline_data');
        const existing = existingRaw ? JSON.parse(existingRaw) : {};
        const prevInspections = Array.isArray(existing?.inspections) ? existing.inspections : [];
        const prevHives = Array.isArray(existing?.hives) ? existing.hives : [];
        const nextInspection = {
          id: opId,
          hive_id: params.id,
          inspection_date: date,
          time: time,
          queen_seen: queenSeenValue,
          queen_color: queenColor || null,
          queen_year: queenYear ? parseInt(queenYear, 10) : null,
          eggs_seen: eggsSeenValue,
          brood_condition: broodCondition,
          honey_stores: honeyStores,
          temperament: temperament,
          notes: allPhotos.length > 1 ? `${notes}\n${allPhotos.slice(1).map((u, i) => `Bilde ${i + 2}: ${u}`).join('\n')}` : notes,
          status: status,
          temperature: temperature ? parseFloat(temperature) : null,
          weather: weather,
          weather_place: weatherPlace || null,
          image_url: imageUrl,
        };
        const mergedInspections = [nextInspection, ...prevInspections.filter((i: any) => String(i?.id || '') !== opId)];
        const mergedHives = prevHives.map((h: any) => {
          if (String(h?.id || '') !== String(params.id)) return h;
          return {
            ...h,
            status: status === 'DØD' ? 'DØD' : 'AKTIV',
            last_inspection_date: date,
          };
        });
        localStorage.setItem(
          'offline_data',
          JSON.stringify({
            ...existing,
            inspections: mergedInspections,
            hives: mergedHives,
            timestamp: Date.now(),
          })
        );
      } catch {}

      router.push(afterSavePath);
    } catch (error: any) {
      try {
        const msg = String(error?.message || '');
        const looksLikeNetwork =
          !navigator.onLine ||
          msg.toLowerCase().includes('failed to fetch') ||
          msg.toLowerCase().includes('network') ||
          msg.toLowerCase().includes('timeout');

        if (looksLikeNetwork) {
          const allFiles: File[] = [
            ...(selectedImage ? [selectedImage] : []),
            ...(extraImages && extraImages.length > 0 ? extraImages : []),
          ];

          let fallbackNotes = notes;
          try {
            const hiveOwnerId = String((hive as any)?.user_id || '').trim();
            const u = await getUserWithSessionFallback(supabase);
            if (u?.id && hiveOwnerId && u.id !== hiveOwnerId) {
              const { data: me } = await supabase.from('profiles').select('full_name, role').eq('id', u.id).maybeSingle();
              const role = String((me as any)?.role || '').trim().toLowerCase();
              const isPrivileged = role === 'admin' || role === 'mattilsynet';
              if (!isPrivileged && allFiles.length === 0) {
                alert('Tilgang/Familie/Avløser må ta minst ett bilde per inspeksjon.');
                return;
              }
              const performerName = String((me as any)?.full_name || u.email || '').trim();
              if (performerName) {
                const tag = `[[LEK_UTFORT_AV:${performerName}]]`;
                fallbackNotes = `${tag}${notes ? `\n${notes}` : ''}`;
              }
            }
          } catch {}

          await saveInspection({
            id: opId,
            hiveId: params.id,
            action: 'FULL_INSPECTION',
            details: `Inspeksjon utført (Offline). Status: ${status}.`,
            sharedWithMattilsynet: false,
            images: allFiles.length > 0 ? allFiles.map((f) => ({ name: f.name, type: f.type, blob: f })) : undefined,
            data: {
              inspection: {
                id: opId,
                hive_id: params.id,
                inspection_date: date,
                time: time,
                queen_seen: queenSeenValue,
                queen_color: queenColor || null,
                queen_year: queenYear ? parseInt(queenYear, 10) : null,
                eggs_seen: eggsSeenValue,
                brood_condition: broodCondition,
                honey_stores: honeyStores,
                temperament: temperament,
                notes: fallbackNotes,
                status: status,
                temperature: temperature ? parseFloat(temperature) : null,
                weather: weather,
                weather_place: weatherPlace || null,
              },
              hiveUpdate: {
                status: status === 'DØD' ? 'DØD' : 'AKTIV',
                last_inspection_date: date,
              },
            },
          });
          alert('Inspeksjon lagret offline! Den blir sendt når du får nettdekning igjen.');
          router.push(afterSavePath);
          return;
        }
      } catch {}

      alert('Feil ved lagring: ' + (error?.message || 'Ukjent feil'));
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    submitInspectionRef.current = submitInspection;
  }, [submitInspection]);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (!navigator.geolocation) return;
      if (!handsfreeReady && !shouldAutoVoice) return;
      if (submitting) return;

      const apiaryId = String((hive as any)?.apiary_id || '').trim();
      if (!apiaryId) return;

      let cancelled = false;
      const thresholdInM = 5;
      const thresholdOutM = 8;

      const parseCoords = (value: any): { lat: number; lon: number } | null => {
        const s = typeof value === 'string' ? value : value ? String(value) : '';
        if (!s) return null;
        const matches = s.match(/-?\d+(?:\.\d+)?/g);
        if (!matches || matches.length < 2) return null;
        const lat = Number(matches[0]);
        const lon = Number(matches[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        return { lat, lon };
      };

      const ensureApiaryCoords = async () => {
        if (apiaryCoordsRef.current) return apiaryCoordsRef.current;
        const { data } = await supabase
          .from('apiaries')
          .select('id, latitude, longitude, coordinates')
          .eq('id', apiaryId)
          .maybeSingle();
        const lat = typeof (data as any)?.latitude === 'number' ? (data as any).latitude : null;
        const lon = typeof (data as any)?.longitude === 'number' ? (data as any).longitude : null;
        if (lat != null && lon != null && Number.isFinite(lat) && Number.isFinite(lon)) {
          apiaryCoordsRef.current = { lat, lon };
          return apiaryCoordsRef.current;
        }
        const parsed = parseCoords((data as any)?.coordinates);
        if (parsed) {
          apiaryCoordsRef.current = parsed;
          return apiaryCoordsRef.current;
        }
        return null;
      };

      let watchId: number | null = null;

      void (async () => {
        const coords = await ensureApiaryCoords().catch(() => null);
        if (cancelled) return;
        if (!coords) return;

        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            if (cancelled) return;
            const curLat = Number(pos.coords.latitude);
            const curLon = Number(pos.coords.longitude);
            if (!Number.isFinite(curLat) || !Number.isFinite(curLon)) return;

            const d = getDistanceFromLatLonInM(curLat, curLon, coords.lat, coords.lon);
            if (!Number.isFinite(d)) return;

            const wasInside = insideApiaryRef.current === true;
            const isInside = d <= thresholdInM;
            const isOutside = d >= thresholdOutM;

            if (insideApiaryRef.current === null) insideApiaryRef.current = isInside;
            if (isInside) insideApiaryRef.current = true;

            if (wasInside && isOutside && !autoExitSavedRef.current && dirtyRef.current) {
              autoExitSavedRef.current = true;
              try { stopListening(); } catch {}
              try { speakRef.current('Du har forlatt bigården. Lagrer inspeksjon.'); } catch {}
              void submitInspectionRef.current({ skipGpsConfirm: true });
            }
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 }
        );
      })();

      return () => {
        cancelled = true;
        try {
          if (watchId != null) navigator.geolocation.clearWatch(watchId);
        } catch {}
      };
    } catch {
      return;
    }
  }, [handsfreeReady, hive, shouldAutoVoice, submitting, supabase, stopListening]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitInspection();
  };

  if (loading) return <div className="p-8 text-center">Laster...</div>;
  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-lg mx-auto bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h1 className="text-lg font-bold text-gray-900 mb-2">Kunne ikke åpne inspeksjon</h1>
          <p className="text-gray-700">{loadError}</p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold"
            >
              Tilbake
            </button>
            <button
              onClick={() => {
                setLoading(true);
                void fetchHiveAndWeather();
              }}
              className="px-4 py-2 rounded-lg bg-honey-500 hover:bg-honey-600 text-white font-semibold"
            >
              Prøv igjen
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                onClick={() => {
                  if (!isSupported) {
                    alert('Talestyring støttes ikke på denne enheten/nettleseren.');
                    return;
                  }
                  if (!isListening) primeTts(true);
                  toggleListening();
                }}
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
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white text-xs flex items-center justify-between gap-3">
                    <div>Si «Ta bilde» for å knipse</div>
                    <button
                      type="button"
                      onClick={handleManualCapture}
                      className="shrink-0 px-3 py-2 rounded-lg bg-white/15 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-2 border border-white/20"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Ta bilde
                    </button>
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
                  {weatherPlace && (
                    <span className="text-[10px] text-blue-600 leading-tight">{weatherPlace}</span>
                  )}
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
              <select
                value={queenSeen}
                onChange={(e) => setQueenSeen(e.target.value as any)}
                className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">Ikke valgt</option>
                <option value="ja">Ja</option>
                <option value="nei">Nei</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
              <span className="text-gray-700">Egg sett?</span>
              <select
                value={eggsSeen}
                onChange={(e) => setEggsSeen(e.target.value as any)}
                className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">Ikke valgt</option>
                <option value="ja">Ja</option>
                <option value="nei">Nei</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dronningfarge</label>
                <select
                  value={queenColor}
                  onChange={(e) => {
                    markTouched('queenColor');
                    setQueenColor(e.target.value);
                  }}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
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
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Årgang</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={queenYear}
                  onChange={(e) => {
                    markTouched('queenYear');
                    setQueenYear(e.target.value);
                  }}
                  placeholder="f.eks. 2025"
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          {/* Conditions */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Tilstand & Status</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kubestatus</label>
              <select 
                value={status} 
                onChange={(e) => {
                  markTouched('status');
                  setStatus(e.target.value);
                }}
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
                    onChange={(e) => {
                      markTouched('broodCondition');
                      setBroodCondition(e.target.value);
                    }}
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
                    onChange={(e) => {
                      markTouched('honeyStores');
                      setHoneyStores(e.target.value);
                    }}
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
                onChange={(e) => {
                  markTouched('temperament');
                  setTemperament(e.target.value);
                }}
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
                <label className="block text-xs font-bold text-gray-500 uppercase">Bilder (valgfritt)</label>
                <div className="flex items-center gap-3 flex-wrap">
                    <label className="cursor-pointer flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <ImageIcon className="w-5 h-5 text-gray-500" />
                        <span className="text-sm text-gray-700">Legg til bilde</span>
                        <input 
                            type="file" 
                            accept="image/*"
                            multiple
                            onChange={handleImageChange}
                            className="hidden"
                        />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingCapture(true);
                        setCameraActive(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Camera className="w-5 h-5 text-gray-500" />
                      <span className="text-sm text-gray-700">Ta bilde</span>
                    </button>
                </div>
                {(() => {
                  const files: Array<{ key: string; file: File; isPrimary: boolean }> = [];
                  if (selectedImage) files.push({ key: `primary:${selectedImage.name}:${selectedImage.size}:${selectedImage.lastModified}`, file: selectedImage, isPrimary: true });
                  (extraImages || []).forEach((f) => files.push({ key: `extra:${f.name}:${f.size}:${f.lastModified}`, file: f, isPrimary: false }));
                  if (files.length === 0) return null;
                  return (
                    <div className="grid grid-cols-4 gap-2">
                      {files.map(({ key, file, isPrimary }) => {
                        const src = getPreviewUrl(file);
                        return (
                          <div key={key} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                            <img src={src} alt="Bilde" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => {
                                if (isPrimary) {
                                  if ((extraImages || []).length > 0) {
                                    const nextPrimary = (extraImages || [])[0];
                                    setSelectedImage(nextPrimary);
                                    setImagePreview(URL.createObjectURL(nextPrimary));
                                    setExtraImages((prev) => (prev ? prev.slice(1) : null));
                                  } else {
                                    setSelectedImage(null);
                                    setImagePreview(null);
                                  }
                                  setPhotoCount((n) => Math.max(0, n - 1));
                                  return;
                                }
                                setExtraImages((prev) => {
                                  const list = prev || [];
                                  const idx = list.findIndex((x) => x === file);
                                  if (idx === -1) return prev;
                                  const next = [...list.slice(0, idx), ...list.slice(idx + 1)];
                                  setPhotoCount((n) => Math.max(0, n - 1));
                                  return next.length > 0 ? next : null;
                                });
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            {isPrimary && (
                              <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                                Hoved
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
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
