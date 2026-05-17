'use client';

import { createClient, getUserWithSessionFallback } from '@/utils/supabase/client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { parseVoiceCommand } from '@/utils/voice-parser';
import { analyzeAndCorrect } from '@/utils/voice-diagnostics';
import { loadAliases } from '@/utils/voice-alias';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Calendar, Cloud, Thermometer, Info, ClipboardList, Image as ImageIcon, X, Camera } from 'lucide-react';
import { useOffline } from '@/context/OfflineContext';
import { Voice2Engine } from '@/voice2/engine';
import { parseVoice2Intent } from '@/voice2/parse';
import { getVoice2AliasIntent, loadVoice2Aliases } from '@/voice2/alias-store';

export default function NewInspectionPage({ params }: { params: { id: string } }) {
  const [hive, setHive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const searchParams = useSearchParams();
  const autoVoice = searchParams.get('autoVoice');
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
  const notesActiveRef = useRef(false);
  const [history, setHistory] = useState<Array<{ type: string; prev: any }>>([]);
  const historyRef = useRef<Array<{ type: string; prev: any }>>([]);
  const pendingVoiceActionRef = useRef<{ label: string; apply: () => void } | null>(null);
  const [pendingVoiceLabel, setPendingVoiceLabel] = useState<string | null>(null);
  const lastUnknownAtRef = useRef<number>(0);
  const lastUnknownTextRef = useRef<string>('');
  const [queenSide, setQueenSide] = useState<1 | 2>(1);
  const [queenSideDbSupported, setQueenSideDbSupported] = useState<boolean | null>(null);
  useEffect(() => { loadAliases(); }, []);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);
  useEffect(() => {
    notesActiveRef.current = notesActive;
  }, [notesActive]);
  const [voice2Enabled, setVoice2Enabled] = useState(false);
  const [voice2State, setVoice2State] = useState<'idle' | 'listening' | 'speaking' | 'error'>('idle');
  const [voice2Supported, setVoice2Supported] = useState(false);
  const voice2Ref = useRef<Voice2Engine | null>(null);
  const voice2EnabledRef = useRef<boolean>(false);
  const lastVoice2UnknownAtRef = useRef<number>(0);
  const submitInspectionRef = useRef<() => void>(() => {});
  const goToRelativeHiveRef = useRef<(delta: 1 | -1, engine?: Voice2Engine) => Promise<void>>(async () => {});

  // Camera State
  const [cameraActive, setCameraActive] = useState(false);
  const [pendingCapture, setPendingCapture] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speakRef = useRef<(text: string, opts?: { resume?: boolean }) => void>(() => {});
  const voicePhotoFlowRef = useRef(false);
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
                  if (voicePhotoFlowRef.current) {
                    voicePhotoFlowRef.current = false;
                    speakRef.current(`Bilde tatt. Dette er bilde nummer ${next}`, { resume: true });
                  } else {
                    speakRef.current(`Bilde tatt. Dette er bilde nummer ${next}`);
                  }
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
      const raw = text || '';
      const lower = raw.toLowerCase();
      const isTwoQueen = Boolean((hive as any)?.two_queen_drift);
      if (isTwoQueen) {
          const wantsOne =
            /\b(dronning|side)\s*(1|en|ein|første|forste)\b/.test(lower) ||
            /\b(velg|bytt til|gå til)\s+(dronning|side)\s*(1|en|ein|første|forste)\b/.test(lower);
          const wantsTwo =
            /\b(dronning|side)\s*(2|to|andre)\b/.test(lower) ||
            /\b(velg|bytt til|gå til)\s+(dronning|side)\s*(2|to|andre)\b/.test(lower);
          const nextSide: 1 | 2 | null = wantsOne ? 1 : wantsTwo ? 2 : null;
          if (nextSide && nextSide !== queenSide) {
              setQueenSide(nextSide);
              speak(`Dronning ${nextSide}`);
              setLastCommand(`Dronning ${nextSide}`);
              setTimeout(() => setLastCommand(null), 2500);
              if (notesActive) setNotes(prev => prev + (prev ? '\n' : '') + raw);
              return;
          }
      }
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
              if (last.type === 'broodEgg') setBroodEgg(last.prev);
              if (last.type === 'broodLarvae') setBroodLarvae(last.prev);
              if (last.type === 'broodYngel') setBroodYngel(last.prev);
              if (last.type === 'broodDrones') setBroodDrones(last.prev);
              if (last.type === 'broodFrames') setBroodFrames(last.prev);
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
      const p: any = parsed as any;
      let feedback: string[] = [];
      let scrollTarget: string | null = null;
      const setScrollTarget = (id: string) => {
        if (!scrollTarget) scrollTarget = id;
      };
      if (res.corrected && res.matched) {
          setLastCorrection({ phrase: res.matched, similarity: res.similarity });
          feedback.push(`Tolkning brukt: ${res.matched}`);
      }

      // Action: Take Photo
      if (parsed.action === 'TAKE_PHOTO') {
          setScrollTarget('field-camera');
          const now = Date.now();
          const rawKey = String(text || '').trim().toLowerCase();
          const isDuplicateText =
            rawKey &&
            rawKey === lastVoiceCaptureTextRef.current &&
            now - lastVoiceCaptureAtRef.current < 6000;
          if (pendingCapture || now - lastVoiceCaptureAtRef.current < 3500 || isDuplicateText) {
              feedback.push("Bilde er allerede tatt");
          } else if (cameraActive) {
              lastVoiceCaptureAtRef.current = now;
              lastVoiceCaptureTextRef.current = rawKey;
              voicePhotoFlowRef.current = true;
              try { pauseListening(); } catch {}
              speak('Tar bilde', { resume: false });
              capturePhoto();
          } else {
              // Start camera and schedule capture when ready
              if (!pendingCapture) {
                  lastVoiceCaptureAtRef.current = now;
                  lastVoiceCaptureTextRef.current = rawKey;
                  voicePhotoFlowRef.current = true;
                  try { pauseListening(); } catch {}
                  speak('Starter kamera og tar bilde', { resume: false });
                  setPendingCapture(true);
                  setCameraActive(true);
              } else {
                  feedback.push("Kamera starter allerede");
              }
          }
      }

      // Action: Save Inspection
      if (parsed.action === 'SAVE_INSPECTION') {
          setScrollTarget('field-save');
          feedback.push("Lagrer inspeksjon...");
          submitInspection();
      }

      // Update State based on parsed result
      if (parsed.queenSeen !== undefined) {
          setScrollTarget('field-queenSeen');
          setHistory(prev => [...prev, { type: 'queenSeen', prev: queenSeen }]);
          setQueenSeen(parsed.queenSeen ? 'ja' : 'nei');
          feedback.push(parsed.queenSeen ? 'Dronning sett' : 'Ingen dronning');
      }

      if (parsed.queenColor) {
          setScrollTarget('field-queenColor');
          setHistory(prev => [...prev, { type: 'queenColor', prev: queenColor }]);
          markTouched('queenColor');
          setQueenColor(parsed.queenColor);
          feedback.push(`Dronningfarge: ${parsed.queenColor}`);
      }

      if (parsed.queenYear) {
          setScrollTarget('field-queenYear');
          setHistory(prev => [...prev, { type: 'queenYear', prev: queenYear }]);
          markTouched('queenYear');
          setQueenYear(parsed.queenYear);
          feedback.push(`Årgang: ${parsed.queenYear}`);
      }

      if (parsed.eggsSeen !== undefined) {
          setScrollTarget('field-eggsSeen');
          setHistory(prev => [...prev, { type: 'eggsSeen', prev: eggsSeen }]);
          setEggsSeen(parsed.eggsSeen ? 'ja' : 'nei');
          feedback.push(parsed.eggsSeen ? 'Egg sett' : 'Ingen egg');
      }

      if (parsed.honeyStores) {
          setScrollTarget('field-honeyStores');
          setHistory(prev => [...prev, { type: 'honeyStores', prev: honeyStores }]);
          markTouched('honeyStores');
          setHoneyStores(parsed.honeyStores);
          feedback.push(`Honning: ${parsed.honeyStores}`);
      }

      if (parsed.temperament) {
          setScrollTarget('field-temperament');
          setHistory(prev => [...prev, { type: 'temperament', prev: temperament }]);
          markTouched('temperament');
          setTemperament(parsed.temperament);
          feedback.push(`Gemytt: ${parsed.temperament}`);
      }

      const normalizeBrood = (v: any): BroodAmount | null => {
          const s = String(v || '').toLowerCase();
          if (s === 'lite') return 'lite';
          if (s === 'mye') return 'mye';
          if (s === 'normal' || s === 'normalt') return 'normal';
          return null;
      };
      const applyBroodAll = (v: any) => {
          const mapped = String(v || '') === 'darlig' ? 'lite' : String(v || '') === 'bra' ? 'mye' : 'normal';
          setHistory(prev => [...prev, { type: 'broodEgg', prev: broodEgg }]);
          setHistory(prev => [...prev, { type: 'broodLarvae', prev: broodLarvae }]);
          setHistory(prev => [...prev, { type: 'broodYngel', prev: broodYngel }]);
          setHistory(prev => [...prev, { type: 'broodDrones', prev: broodDrones }]);
          markTouched('broodEgg');
          markTouched('broodLarvae');
          markTouched('broodYngel');
          markTouched('broodDrones');
          setBroodEgg(mapped as any);
          setBroodLarvae(mapped as any);
          setBroodYngel(mapped as any);
          setBroodDrones(mapped as any);
          feedback.push(`Yngelleie: ${mapped}`);
      };
      if (p.broodCondition) {
          setScrollTarget('field-brood');
          applyBroodAll(p.broodCondition);
      }
      const eggV = normalizeBrood(p.broodEgg);
      if (eggV) {
          setScrollTarget('field-brood');
          setHistory(prev => [...prev, { type: 'broodEgg', prev: broodEgg }]);
          markTouched('broodEgg');
          setBroodEgg(eggV);
          feedback.push(`Egg: ${eggV}`);
      }
      const larvV = normalizeBrood(p.broodLarvae);
      if (larvV) {
          setScrollTarget('field-brood');
          setHistory(prev => [...prev, { type: 'broodLarvae', prev: broodLarvae }]);
          markTouched('broodLarvae');
          setBroodLarvae(larvV);
          feedback.push(`Larver: ${larvV}`);
      }
      const yngV = normalizeBrood(p.broodYngel);
      if (yngV) {
          setScrollTarget('field-brood');
          setHistory(prev => [...prev, { type: 'broodYngel', prev: broodYngel }]);
          markTouched('broodYngel');
          setBroodYngel(yngV);
          feedback.push(`Yngel: ${yngV}`);
      }
      const droV = normalizeBrood(p.broodDrones);
      if (droV) {
          setScrollTarget('field-brood');
          setHistory(prev => [...prev, { type: 'broodDrones', prev: broodDrones }]);
          markTouched('broodDrones');
          setBroodDrones(droV);
          feedback.push(`Droner: ${droV}`);
      }
      if (p.broodFrames != null && String(p.broodFrames).trim().length > 0) {
          setScrollTarget('field-broodFrames');
          const v = String(p.broodFrames).trim().replace(',', '.');
          setHistory(prev => [...prev, { type: 'broodFrames', prev: broodFrames }]);
          markTouched('broodFrames');
          setBroodFrames(v);
          feedback.push(`Bistyrke: ${v} rammer yngel`);
      }

      if (parsed.status) {
          setScrollTarget('field-status');
          setHistory(prev => [...prev, { type: 'status', prev: status }]);
          markTouched('status');
          setStatus(parsed.status);
          feedback.push(`Status: ${parsed.status}`);
      }

      if (parsed.temperature) {
          setScrollTarget('field-weather');
          setHistory(prev => [...prev, { type: 'temperature', prev: temperature }]);
          setTemperature(parsed.temperature);
          feedback.push(`Temp: ${parsed.temperature}°C`);
      }

      if (parsed.weather) {
          setScrollTarget('field-weather');
          setHistory(prev => [...prev, { type: 'weather', prev: weather }]);
          setWeather(parsed.weather);
          feedback.push(`Vær: ${parsed.weather}`);
      }

      // Show feedback if we understood something
      if (feedback.length > 0) {
          setLastCommand(feedback.join(', '));
          const spoken =
            feedback.length <= 2
              ? feedback.join('. ')
              : `${feedback[0]}. Oppdatert.`;
          speak(spoken);
          if (scrollTarget && typeof window !== 'undefined') {
            const id = scrollTarget;
            setTimeout(() => {
              try {
                const el = document.getElementById(id);
                if (el && typeof el.scrollIntoView === 'function') {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              } catch {}
            }, 60);
          }
          // Clear feedback after 4s
          setTimeout(() => setLastCommand(null), 4000);
      } else if (!notesActive) {
          const heard = String(raw || '').trim();
          if (heard) {
              const now = Date.now();
              const key = heard.toLowerCase();
              const same = key === lastUnknownTextRef.current;
              if (!same || now - lastUnknownAtRef.current > 6000) {
                  lastUnknownAtRef.current = now;
                  lastUnknownTextRef.current = key;
                  setLastCommand(`Hørte: ${heard}`);
                  speak('Jeg forstod ikke. Prøv igjen.');
                  setTimeout(() => setLastCommand(null), 3000);
              }
          }
      }

      if (notesActive) {
          setNotes(prev => prev + (prev ? '\n' : '') + raw);
      }
  };

  const { isListening, pauseListening, resumeListening } = useVoiceRecognition(handleVoiceCommand);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));
  const [queenSeen, setQueenSeen] = useState<'' | 'ja' | 'nei'>('');
  const [queenColor, setQueenColor] = useState<string>('');
  const [queenYear, setQueenYear] = useState<string>('');
  const [eggsSeen, setEggsSeen] = useState<'' | 'ja' | 'nei'>('');
  type BroodAmount = 'lite' | 'normal' | 'mye';
  const [broodEgg, setBroodEgg] = useState<BroodAmount>('normal');
  const [broodLarvae, setBroodLarvae] = useState<BroodAmount>('normal');
  const [broodYngel, setBroodYngel] = useState<BroodAmount>('normal');
  const [broodDrones, setBroodDrones] = useState<BroodAmount>('normal');
  const [broodFrames, setBroodFrames] = useState<string>('');
  const [honeyStores, setHoneyStores] = useState('middels');
  const [temperament, setTemperament] = useState('rolig');
  const [notes, setNotes] = useState('');
  const [speechLog, setSpeechLog] = useState<Array<{ ts: number; text: string }>>([]);
  const speechLogRef = useRef<Array<{ ts: number; text: string }>>([]);
  const [status, setStatus] = useState('OK');

  type PerformedAction = {
    id: string;
    meta?: {
      feedType?: 'nodfor' | 'sukkerlake' | 'annet';
    };
  };

  const performedActionDefs: Array<{ id: string; label: string; group: string; quick?: boolean }> = [
    { id: 'FEED_GIVEN', label: 'Gitt fôr', group: 'Fôr', quick: true },
    { id: 'VARROA_TREATED', label: 'Behandlet varroa', group: 'Varroa', quick: true },
    { id: 'SUPER_ADDED', label: 'Satt på skattekasse', group: 'Produksjon', quick: true },
    { id: 'HONEY_HARVESTED', label: 'Høstet honning', group: 'Produksjon', quick: true },
    { id: 'QUEEN_REPLACED', label: 'Byttet dronning', group: 'Dronning', quick: true },
    { id: 'QUEEN_CELLS_REMOVED', label: 'Fjernet dronningceller', group: 'Dronning' },
    { id: 'SUPER_REMOVED', label: 'Fjernet skattekasse', group: 'Produksjon' },
    { id: 'FRAMES_ADDED', label: 'Satt inn rammer', group: 'Rammer' },
    { id: 'FRAMES_REMOVED', label: 'Fjernet rammer', group: 'Rammer' },
    { id: 'WAX_REPLACED', label: 'Byttet voks', group: 'Rammer' },
    { id: 'SPLIT_MADE', label: 'Laget avlegger', group: 'Kube' },
    { id: 'HIVE_SPLIT', label: 'Delt kube', group: 'Kube' },
    { id: 'VARROA_TEST_DONE', label: 'Gjennomført varroatest', group: 'Varroa' },
  ];

  const performedActionLabel = (a: PerformedAction) => {
    const def = performedActionDefs.find((d) => d.id === a.id);
    const base = def?.label || a.id;
    if (a.id === 'FEED_GIVEN') {
      const t = a.meta?.feedType;
      if (t === 'nodfor') return `${base} (nødfôr)`;
      if (t === 'sukkerlake') return `${base} (sukkerlake)`;
      if (t === 'annet') return `${base} (annet)`;
    }
    return base;
  };

  const [performedActions, setPerformedActions] = useState<PerformedAction[]>([]);
  const [showAllPerformedActions, setShowAllPerformedActions] = useState(false);

  const isPerformed = (id: string) => performedActions.some((a) => a.id === id);
  const togglePerformedAction = (id: string) => {
    setPerformedActions((prev) => {
      const exists = prev.some((a) => a.id === id);
      if (exists) return prev.filter((a) => a.id !== id);
      return [...prev, { id }];
    });
  };

  const setPerformedMeta = (id: string, meta: PerformedAction['meta']) => {
    setPerformedActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, meta: { ...(a.meta || {}), ...(meta || {}) } } : a))
    );
  };

  useEffect(() => {
    voice2EnabledRef.current = voice2Enabled;
  }, [voice2Enabled]);

  useEffect(() => {
    speechLogRef.current = speechLog;
  }, [speechLog]);

  const appendNote = useCallback((line: string) => {
    const l = String(line || '').trim();
    if (!l) return;
    setNotes((prev) => (prev ? `${prev}\n${l}` : l));
  }, []);

  const appendSpeechLog = useCallback((text: string) => {
    const t = String(text || '').trim();
    if (!t) return;
    const entry = { ts: Date.now(), text: t };
    setSpeechLog((prev) => {
      const next = [...prev, entry];
      return next.length > 250 ? next.slice(next.length - 250) : next;
    });
  }, []);

  const buildVoiceLogTag = useCallback((entries: Array<{ ts: number; text: string }>) => {
    const safe = (entries || [])
      .filter(Boolean)
      .map((e) => ({ ts: Number(e.ts || 0), text: String(e.text || '').trim() }))
      .filter((e) => e.text)
      .slice(-200);
    if (safe.length === 0) return '';
    try {
      return `[[LEK_VOICE_LOG:${encodeURIComponent(JSON.stringify(safe))}]]`;
    } catch {
      return '';
    }
  }, []);

  const upsertPerformedAction = useCallback((id: string, meta?: PerformedAction['meta']) => {
    const mid = String(id || '').trim();
    if (!mid) return;
    setPerformedActions((prev) => {
      const exists = prev.some((a) => a.id === mid);
      if (!exists) return [...prev, meta ? { id: mid, meta } : { id: mid }];
      if (!meta) return prev;
      return prev.map((a) => (a.id === mid ? { ...a, meta: { ...(a.meta || {}), ...(meta || {}) } } : a));
    });
  }, []);

  const handleVoice2Text = useCallback(async (text: string) => {
    const engine = voice2Ref.current;
    if (!engine) return;
    appendSpeechLog(text);
    const rawText = String(text || '').trim();
    const parsed = parseVoice2Intent(text) as any;
    const fromAlias = parsed?.type === 'UNKNOWN' ? getVoice2AliasIntent(text) : null;
    const intent = (fromAlias && typeof fromAlias === 'object' && typeof (fromAlias as any).type === 'string'
      ? (fromAlias as any)
      : parsed) as any;

    const clearPending = () => {
      pendingVoiceActionRef.current = null;
      setPendingVoiceLabel(null);
    };

    const requestConfirm = async (label: string, apply: () => void) => {
      pendingVoiceActionRef.current = { label, apply };
      setPendingVoiceLabel(label);
      setLastCommand(`Bekreft: ${label}`);
      await engine.speak(`${label}. Bekreft? Si bekreft eller avbryt.`);
      setTimeout(() => setLastCommand(null), 4000);
    };

    if (intent.type === 'CONFIRM') {
      const pending = pendingVoiceActionRef.current;
      if (!pending) {
        setLastCommand('Ingenting å bekrefte');
        await engine.speak('Ingenting å bekrefte.');
        setTimeout(() => setLastCommand(null), 2500);
        return;
      }
      clearPending();
      try {
        pending.apply();
      } catch {}
      setLastCommand('Bekreftet');
      await engine.speak('Bekreftet.');
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (intent.type === 'CANCEL') {
      if (pendingVoiceActionRef.current) {
        clearPending();
        setLastCommand('Avbrutt');
        await engine.speak('Avbrutt.');
        setTimeout(() => setLastCommand(null), 2500);
        return;
      }
    }

    if (intent.type === 'UNDO_LAST') {
      const h = historyRef.current || [];
      const last = h[h.length - 1];
      if (!last) {
        setLastCommand('Ingenting å angre');
        await engine.speak('Ingenting å angre.');
        setTimeout(() => setLastCommand(null), 2500);
        return;
      }
      setHistory((prev) => prev.slice(0, -1));
      if (last.type === 'queenSeen') setQueenSeen(last.prev);
      if (last.type === 'queenColor') setQueenColor(last.prev);
      if (last.type === 'queenYear') setQueenYear(last.prev);
      if (last.type === 'eggsSeen') setEggsSeen(last.prev);
      if (last.type === 'honeyStores') setHoneyStores(last.prev);
      if (last.type === 'temperament') setTemperament(last.prev);
      if (last.type === 'broodEgg') setBroodEgg(last.prev);
      if (last.type === 'broodLarvae') setBroodLarvae(last.prev);
      if (last.type === 'broodYngel') setBroodYngel(last.prev);
      if (last.type === 'broodDrones') setBroodDrones(last.prev);
      if (last.type === 'broodFrames') setBroodFrames(last.prev);
      if (last.type === 'status') setStatus(last.prev);
      if (last.type === 'temperature') setTemperature(last.prev);
      if (last.type === 'weather') setWeather(last.prev);
      if (last.type === 'notes') setNotes(last.prev);
      if (last.type === 'performedActions') setPerformedActions(last.prev);
      if (last.type === 'showAllPerformedActions') setShowAllPerformedActions(last.prev);
      setLastCommand('Angret');
      await engine.speak('Angret.');
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (intent.type === 'NOTES_START') {
      setNotesActive(true);
      const stripped = rawText.replace(/^\s*notat(er)?[:\-\s]*/i, '').trim();
      if (stripped) {
        setNotes((prev) => {
          setHistory((h) => [...h, { type: 'notes', prev }]);
          return prev ? `${prev}\n${stripped}` : stripped;
        });
      }
      setLastCommand('Notater');
      await engine.speak('Notater. Si notat slutt når du er ferdig.');
      setTimeout(() => setLastCommand(null), 3500);
      return;
    }

    if (intent.type === 'NOTES_STOP') {
      setNotesActive(false);
      setLastCommand('Notat slutt');
      await engine.speak('Notat slutt.');
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (pendingVoiceActionRef.current) {
      setLastCommand(`Bekreft: ${pendingVoiceActionRef.current.label}`);
      await engine.speak('Si bekreft eller avbryt.');
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (intent.type === 'UNKNOWN') {
      if (notesActiveRef.current && rawText) {
        setNotes((prev) => {
          setHistory((h) => [...h, { type: 'notes', prev }]);
          return prev ? `${prev}\n${rawText}` : rawText;
        });
        setLastCommand('Notert');
        setTimeout(() => setLastCommand(null), 1200);
        return;
      }
      const now = Date.now();
      if (now - lastVoice2UnknownAtRef.current > 9000) {
        lastVoice2UnknownAtRef.current = now;
        setLastCommand(`Hørte: ${rawText}`);
        await engine.speak('Jeg forstod ikke. Prøv igjen.');
        setTimeout(() => setLastCommand(null), 2500);
      }
      return;
    }

    if (intent.type === 'SHOW_MORE_ACTIONS') {
      setShowAllPerformedActions((prev) => {
        setHistory((h) => [...h, { type: 'showAllPerformedActions', prev }]);
        return true;
      });
      setLastCommand('Viser flere handlinger');
      await engine.speak('Viser flere handlinger.');
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (intent.type === 'HIDE_MORE_ACTIONS') {
      setShowAllPerformedActions((prev) => {
        setHistory((h) => [...h, { type: 'showAllPerformedActions', prev }]);
        return false;
      });
      setLastCommand('Skjuler flere handlinger');
      await engine.speak('Skjuler flere handlinger.');
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (intent.type === 'RESET_ACTIONS') {
      setPerformedActions((prev) => {
        setHistory((h) => [...h, { type: 'performedActions', prev }]);
        return [];
      });
      setLastCommand('Handlinger nullstilt');
      await engine.speak('Handlinger nullstilt.');
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (intent.type === 'NEXT_HIVE') {
      await goToRelativeHiveRef.current(1, engine);
      return;
    }

    if (intent.type === 'PREV_HIVE') {
      await goToRelativeHiveRef.current(-1, engine);
      return;
    }

    if (intent.type === 'TEMPERATURE') {
      const c = Number(intent.celsius);
      if (Number.isFinite(c)) {
        setTemperature((prev) => {
          setHistory((h) => [...h, { type: 'temperature', prev }]);
          return String(Math.round(c));
        });
        setLastCommand(`Temperatur: ${Math.round(c)}°C`);
        await engine.speak(`Temperatur: ${Math.round(c)} grader.`);
        setTimeout(() => setLastCommand(null), 2500);
      }
      return;
    }

    if (intent.type === 'WEATHER') {
      const w = String(intent.weather || '').trim();
      if (w) {
        setWeather((prev) => {
          setHistory((h) => [...h, { type: 'weather', prev }]);
          return w;
        });
        setLastCommand(`Vær: ${w}`);
        await engine.speak(`Vær: ${w}.`);
        setTimeout(() => setLastCommand(null), 2500);
      }
      return;
    }

    if (intent.type === 'PERFORMED_ACTION') {
      const id = String(intent.id || '').trim();
      if (!id) return;
      const def = performedActionDefs.find((d) => d.id === id);
      const label = def?.label || id;
      const risky = new Set(['QUEEN_REPLACED', 'SPLIT_MADE', 'HIVE_SPLIT']);
      const apply = () => {
        setPerformedActions((prev) => {
          setHistory((h) => [...h, { type: 'performedActions', prev }]);
          const exists = prev.some((a) => a.id === id);
          if (!exists) return [...prev, intent.meta ? { id, meta: intent.meta } : { id }];
          if (!intent.meta) return prev;
          return prev.map((a) => (a.id === id ? { ...a, meta: { ...(a.meta || {}), ...(intent.meta || {}) } } : a));
        });
      };
      if (risky.has(id)) {
        await requestConfirm(label, apply);
        return;
      }
      apply();
      setLastCommand(label);
      await engine.speak(`${label}.`);
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (intent.type === 'QUEEN_SEEN') {
      setQueenSeen((prev) => {
        setHistory((h) => [...h, { type: 'queenSeen', prev }]);
        return 'ja';
      });
      setLastCommand('Dronning sett');
      await engine.speak('Dronning sett.');
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (intent.type === 'QUEEN_NOT_SEEN') {
      setQueenSeen((prev) => {
        setHistory((h) => [...h, { type: 'queenSeen', prev }]);
        return 'nei';
      });
      setLastCommand('Ingen dronning');
      await engine.speak('Ingen dronning.');
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (intent.type === 'QUEEN_COLOR') {
      const mapped =
        intent.color === 'hvit'
          ? 'Hvit'
          : intent.color === 'gul'
            ? 'Gul'
            : intent.color === 'rod'
              ? 'Rød'
              : intent.color === 'gronn'
                ? 'Grønn'
                : 'Blå';
      setQueenColor((prev) => {
        setHistory((h) => [...h, { type: 'queenColor', prev }]);
        return mapped;
      });
      setLastCommand(`Dronningfarge: ${mapped}`);
      await engine.speak(`Dronningfarge: ${mapped}.`);
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (intent.type === 'EGGS_SEEN') {
      setEggsSeen((prev) => {
        setHistory((h) => [...h, { type: 'eggsSeen', prev }]);
        return 'ja';
      });
      setLastCommand('Egg sett');
      await engine.speak('Egg sett.');
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (intent.type === 'EGGS_NOT_SEEN') {
      setEggsSeen((prev) => {
        setHistory((h) => [...h, { type: 'eggsSeen', prev }]);
        return 'nei';
      });
      setLastCommand('Ingen egg');
      await engine.speak('Ingen egg.');
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (intent.type === 'BROOD_EGG') {
      setBroodEgg((prev) => {
        setHistory((h) => [...h, { type: 'broodEgg', prev }]);
        return intent.amount;
      });
      setLastCommand(`Egg: ${intent.amount}`);
      await engine.speak(`Egg: ${intent.amount}.`);
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (intent.type === 'BROOD_LARVAE') {
      setBroodLarvae((prev) => {
        setHistory((h) => [...h, { type: 'broodLarvae', prev }]);
        return intent.amount;
      });
      setLastCommand(`Larver: ${intent.amount}`);
      await engine.speak(`Larver: ${intent.amount}.`);
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (intent.type === 'BROOD_YNGEL') {
      setBroodYngel((prev) => {
        setHistory((h) => [...h, { type: 'broodYngel', prev }]);
        return intent.amount;
      });
      setLastCommand(`Yngel: ${intent.amount}`);
      await engine.speak(`Yngel: ${intent.amount}.`);
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (intent.type === 'BROOD_DRONES') {
      setBroodDrones((prev) => {
        setHistory((h) => [...h, { type: 'broodDrones', prev }]);
        return intent.amount;
      });
      setLastCommand(`Droner: ${intent.amount}`);
      await engine.speak(`Droner: ${intent.amount}.`);
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (intent.type === 'HONEY_STORES') {
      const mapped = intent.level;
      setHoneyStores((prev) => {
        setHistory((h) => [...h, { type: 'honeyStores', prev }]);
        return mapped;
      });
      setLastCommand(`Honning: ${mapped}`);
      await engine.speak(`Honning: ${mapped}.`);
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (intent.type === 'TEMPERAMENT') {
      const mapped = intent.temperament;
      setTemperament((prev) => {
        setHistory((h) => [...h, { type: 'temperament', prev }]);
        return mapped;
      });
      setLastCommand(`Gemytt: ${mapped}`);
      await engine.speak(`Gemytt: ${mapped}.`);
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (intent.type === 'STATUS') {
      const next = String(intent.status || '').trim();
      const isRisky = /\bbytt\b/i.test(next) || /\bsykdom\b/i.test(next) || /\bdød\b/i.test(next);
      const apply = () => {
        setStatus((prev) => {
          setHistory((h) => [...h, { type: 'status', prev }]);
          return next || prev;
        });
      };
      if (isRisky) {
        await requestConfirm(`Status ${next}`, apply);
        return;
      }
      apply();
      setLastCommand(`Status: ${next}`);
      await engine.speak(`Status: ${next}.`);
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (intent.type === 'FEED_LOW') {
      appendNote('Lite fôr.');
      setLastCommand('Lite fôr registrert');
      await engine.speak('Lite fôr registrert.');
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (intent.type === 'FEED_GIVEN') {
      upsertPerformedAction('FEED_GIVEN', { feedType: intent.feedType });
      setLastCommand(intent.feedType === 'sukkerlake' ? 'Ga sukkerlake' : 'Gitt fôr');
      await engine.speak(intent.feedType === 'sukkerlake' ? 'Ga sukkerlake.' : 'Gitt fôr.');
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (intent.type === 'VARROA_NONE') {
      appendNote('Ingen varroa.');
      setLastCommand('Ingen varroa');
      await engine.speak('Ingen varroa registrert.');
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (intent.type === 'VARROA_SUSPECT') {
      setStatus('Varroa mistanke');
      setLastCommand('Varroa mistanke');
      await engine.speak('Varroa mistanke.');
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (intent.type === 'VARROA_TREATED') {
      upsertPerformedAction('VARROA_TREATED');
      setLastCommand('Varroa behandlet');
      await engine.speak('Varroa behandlet.');
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (intent.type === 'TAKE_PHOTO') {
      setCameraActive(true);
      setPendingCapture(true);
      setLastCommand('Tar bilde');
      await engine.speak('Tar bilde.');
      setTimeout(() => setLastCommand(null), 2500);
      return;
    }

    if (intent.type === 'SAVE_INSPECTION') {
      setLastCommand('Lagrer inspeksjon');
      await engine.speak('Lagrer inspeksjon.');
      setTimeout(() => {
        try {
          submitInspectionRef.current();
        } catch {}
      }, 50);
      setTimeout(() => setLastCommand(null), 3000);
      return;
    }
  }, [appendNote, appendSpeechLog, upsertPerformedAction]);

  const handleVoice2TextRef = useRef<(text: string) => void>(() => {});
  useEffect(() => {
    handleVoice2TextRef.current = (t: string) => {
      void handleVoice2Text(t);
    };
  }, [handleVoice2Text]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (voice2Ref.current) return;
    const engine = new Voice2Engine({
      onText: (t) => {
        try {
          handleVoice2TextRef.current(t);
        } catch {}
      },
      onState: (s) => setVoice2State(s),
      onError: () => setVoice2State('error'),
    });
    voice2Ref.current = engine;
    setVoice2Supported(engine.isSupported());
    void loadVoice2Aliases();
    return () => {
      try {
        engine.stop();
      } catch {}
    };
  }, []);
  
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
  const [zoomImageSrc, setZoomImageSrc] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  const supabase = createClient();
  const router = useRouter();

  const [apiaryHives, setApiaryHives] = useState<Array<{ id: string; hive_number: any; name: any }>>([]);
  const apiaryHivesRef = useRef<Array<{ id: string; hive_number: any; name: any }>>([]);
  useEffect(() => {
    apiaryHivesRef.current = apiaryHives;
  }, [apiaryHives]);

  useEffect(() => {
    const apiaryId = String((hive as any)?.apiary_id || '').trim();
    if (!apiaryId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await supabase
          .from('hives')
          .select('id,hive_number,name')
          .eq('apiary_id', apiaryId)
          .order('hive_number', { ascending: true });
        if (cancelled) return;
        if (res.data && Array.isArray(res.data)) {
          setApiaryHives(res.data as any);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, (hive as any)?.apiary_id]);

  const goToRelativeHive = useCallback(
    async (delta: 1 | -1, engine?: Voice2Engine) => {
      const list = apiaryHivesRef.current || [];
      const currentId = String(params.id || '').trim();
      const idx = list.findIndex((x) => String((x as any)?.id || '').trim() === currentId);
      const next = idx >= 0 ? list[idx + delta] : null;
      const nextId = String((next as any)?.id || '').trim();
      if (!nextId) {
        setLastCommand('Ingen flere bikuber');
        if (engine) await engine.speak('Ingen flere bikuber.');
        setTimeout(() => setLastCommand(null), 2500);
        return;
      }
      const label = (next as any)?.hive_number ? `Bikube ${(next as any).hive_number}` : 'Neste bikube';
      setLastCommand(label);
      if (engine) await engine.speak(label);
      setTimeout(() => {
        try {
          router.push(`/hives/${nextId}/new-inspection?autoVoice=1`);
        } catch {}
      }, 120);
      setTimeout(() => setLastCommand(null), 3000);
    },
    [params.id, router]
  );

  useEffect(() => {
    goToRelativeHiveRef.current = goToRelativeHive;
  }, [goToRelativeHive]);

  useEffect(() => {
    const shouldHold = Boolean(voice2Enabled || handsfreeReady || cameraActive);
    if (!shouldHold) return;
    const navAny = navigator as any;
    const lockApi = navAny?.wakeLock;
    if (!lockApi?.request) return;
    let lock: any = null;
    let cancelled = false;
    (async () => {
      try {
        lock = await lockApi.request('screen');
      } catch {}
    })();
    const onVis = () => {
      if (cancelled) return;
      if (document.visibilityState !== 'visible') return;
      if (lock) return;
      (async () => {
        try {
          lock = await lockApi.request('screen');
        } catch {}
      })();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      try {
        lock?.release?.();
      } catch {}
      lock = null;
    };
  }, [voice2Enabled, handsfreeReady, cameraActive]);

  type StickyKey =
    | 'queenColor'
    | 'queenYear'
    | 'broodEgg'
    | 'broodLarvae'
    | 'broodYngel'
    | 'broodDrones'
    | 'broodFrames'
    | 'honeyStores'
    | 'temperament'
    | 'status';

  const touchedRef = useRef<Record<StickyKey, boolean>>({
    queenColor: false,
    queenYear: false,
    broodEgg: false,
    broodLarvae: false,
    broodYngel: false,
    broodDrones: false,
    broodFrames: false,
    honeyStores: false,
    temperament: false,
    status: false,
  });

  const markTouched = (key: StickyKey) => {
    touchedRef.current[key] = true;
  };

  const prefillKeyRef = useRef<string>('');
  const savedSidesRef = useRef<Record<1 | 2, boolean>>({ 1: false, 2: false });

  type SideDraft = {
    queenSeen: '' | 'ja' | 'nei';
    eggsSeen: '' | 'ja' | 'nei';
    queenColor: string;
    queenYear: string;
    broodEgg: BroodAmount;
    broodLarvae: BroodAmount;
    broodYngel: BroodAmount;
    broodDrones: BroodAmount;
    broodFrames: string;
    honeyStores: string;
    temperament: string;
    notes: string;
    status: string;
    selectedImage: File | null;
    extraImages: File[] | null;
    photoCount: number;
    imagePreview: string | null;
    touched: Record<StickyKey, boolean>;
  };

  const sideDraftsRef = useRef<Record<1 | 2, SideDraft | null>>({ 1: null, 2: null });
  const prevQueenSideRef = useRef<1 | 2>(1);

  const captureSideDraft = (): SideDraft => {
    return {
      queenSeen,
      eggsSeen,
      queenColor,
      queenYear,
      broodEgg,
      broodLarvae,
      broodYngel,
      broodDrones,
      broodFrames,
      honeyStores,
      temperament,
      notes,
      status,
      selectedImage,
      extraImages,
      photoCount,
      imagePreview,
      touched: { ...touchedRef.current },
    };
  };

  const applySideDraft = (d: SideDraft) => {
    touchedRef.current = { ...d.touched };
    setQueenSeen(d.queenSeen);
    setEggsSeen(d.eggsSeen);
    setQueenColor(d.queenColor);
    setQueenYear(d.queenYear);
    setBroodEgg(d.broodEgg);
    setBroodLarvae(d.broodLarvae);
    setBroodYngel(d.broodYngel);
    setBroodDrones(d.broodDrones);
    setBroodFrames(d.broodFrames);
    setHoneyStores(d.honeyStores);
    setTemperament(d.temperament);
    setNotes(d.notes);
    setStatus(d.status);
    setSelectedImage(d.selectedImage);
    setExtraImages(d.extraImages);
    setPhotoCount(d.photoCount);
    setImagePreview(d.imagePreview);
  };

  const resetForSide = () => {
    touchedRef.current = {
      queenColor: false,
      queenYear: false,
      broodEgg: false,
      broodLarvae: false,
      broodYngel: false,
      broodDrones: false,
      broodFrames: false,
      honeyStores: false,
      temperament: false,
      status: false,
    };
    setQueenSeen('');
    setEggsSeen('');
    setQueenColor('');
    setQueenYear('');
    setBroodEgg('normal');
    setBroodLarvae('normal');
    setBroodYngel('normal');
    setBroodDrones('normal');
    setBroodFrames('');
    setHoneyStores('middels');
    setTemperament('rolig');
    setNotes('');
    setStatus('OK');
    setSelectedImage(null);
    setExtraImages(null);
    setPhotoCount(0);
    setImagePreview(null);
  };

  useEffect(() => {
    prefillKeyRef.current = '';
    savedSidesRef.current = { 1: false, 2: false };
    sideDraftsRef.current = { 1: null, 2: null };
    prevQueenSideRef.current = 1;
    touchedRef.current = {
      queenColor: false,
      queenYear: false,
      broodEgg: false,
      broodLarvae: false,
      broodYngel: false,
      broodDrones: false,
      broodFrames: false,
      honeyStores: false,
      temperament: false,
      status: false,
    };
    setQueenSeen('');
    setEggsSeen('');
    setQueenSide(1);
    setQueenSideDbSupported(null);
  }, [params.id]);

  useEffect(() => {
    const isTwoQueen = Boolean((hive as any)?.two_queen_drift);
    if (!isTwoQueen) return;
    if (prevQueenSideRef.current === queenSide) return;

    const prev = prevQueenSideRef.current;
    sideDraftsRef.current[prev] = captureSideDraft();
    prevQueenSideRef.current = queenSide;

    const nextDraft = sideDraftsRef.current[queenSide];
    if (nextDraft) {
      applySideDraft(nextDraft);
      return;
    }

    resetForSide();
  }, [
    hive,
    queenSide,
    queenSeen,
    eggsSeen,
    queenColor,
    queenYear,
    broodEgg,
    broodLarvae,
    broodYngel,
    broodDrones,
    broodFrames,
    honeyStores,
    temperament,
    notes,
    status,
    selectedImage,
    extraImages,
    photoCount,
    imagePreview,
  ]);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      setHandsfreeReady(localStorage.getItem('handsfree_setup_done') === '1');
    } catch {}
  }, []);

  useEffect(() => {
    fetchHiveAndWeather();
  }, [params.id]);

  useEffect(() => {
    loadAliases();
  }, []);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const ttsPrimedRef = useRef(false);
  const ttsUnlockedRef = useRef(false);
  const audioUnlockedRef = useRef(false);
  const gestureUnlockedRef = useRef(false);
  const ttsQueueRef = useRef<Array<{ text: string; shouldPauseMic: boolean; onDone: () => void }>>([]);
  const ttsBusyRef = useRef(false);
  const ttsBufferCacheRef = useRef<Map<string, ArrayBuffer>>(new Map());
  const ttsDecodedCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const unlockAudioSession = () => {
    try {
      if (typeof window === 'undefined') return;
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      try {
        if (ctx.state === 'suspended' && typeof ctx.resume === 'function') void ctx.resume();
      } catch {}
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      g.gain.value = 0;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.05);
    } catch {}
  };

  const unlockHtmlAudioFromGesture = () => {
    try {
      if (typeof window === 'undefined') return;
      if (audioUnlockedRef.current) return;
      const bytes = new Uint8Array(44 + 2);
      const writeStr = (offset: number, s: string) => {
        for (let i = 0; i < s.length; i += 1) bytes[offset + i] = s.charCodeAt(i);
      };
      const writeU32 = (offset: number, v: number) => {
        bytes[offset + 0] = v & 0xff;
        bytes[offset + 1] = (v >> 8) & 0xff;
        bytes[offset + 2] = (v >> 16) & 0xff;
        bytes[offset + 3] = (v >> 24) & 0xff;
      };
      const writeU16 = (offset: number, v: number) => {
        bytes[offset + 0] = v & 0xff;
        bytes[offset + 1] = (v >> 8) & 0xff;
      };

      writeStr(0, 'RIFF');
      writeU32(4, 36 + 2);
      writeStr(8, 'WAVE');
      writeStr(12, 'fmt ');
      writeU32(16, 16);
      writeU16(20, 1);
      writeU16(22, 1);
      writeU32(24, 8000);
      writeU32(28, 8000 * 2);
      writeU16(32, 2);
      writeU16(34, 16);
      writeStr(36, 'data');
      writeU32(40, 2);
      bytes[44] = 0;
      bytes[45] = 0;

      const blob = new Blob([bytes], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);
      a.volume = 0;
      (a as any).playsInline = true;
      try {
        a.setAttribute?.('playsinline', 'true');
      } catch {}
      const done = () => {
        try {
          a.pause();
        } catch {}
        try {
          URL.revokeObjectURL(url);
        } catch {}
      };
      a.onended = done;
      a.onerror = done;
      const p = a.play();
      if (p && typeof (p as any).then === 'function') {
        (p as any)
          .then(() => {
            audioUnlockedRef.current = true;
            done();
          })
          .catch(() => {
            done();
          });
      } else {
        audioUnlockedRef.current = true;
        done();
      }
    } catch {}
  };
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
      try {
        if (typeof s.getVoices === 'function') s.getVoices();
      } catch {}
      if (!shouldSpeak) return;
    } catch {}
  };

  const unlockTtsFromGesture = () => {
    try {
      if (typeof window === 'undefined') return;
      const s = (window as any).speechSynthesis as SpeechSynthesis | undefined;
      if (!s) return;
      const u = new SpeechSynthesisUtterance('.');
      u.lang = 'nb-NO';
      u.rate = 1.0;
      u.pitch = 1.0;
      u.volume = 0.0;
      u.onstart = () => {
        ttsUnlockedRef.current = true;
      };
      try {
        const voices = typeof s.getVoices === 'function' ? s.getVoices() : [];
        const nb = voices.find((v) => (v.lang || '').toLowerCase().startsWith('nb'));
        const no = voices.find((v) => (v.lang || '').toLowerCase().startsWith('no'));
        const nn = voices.find((v) => (v.lang || '').toLowerCase().includes('nor'));
        const picked = nb || no || nn;
        if (picked) u.voice = picked;
      } catch {}
      try {
        if (typeof s.resume === 'function') s.resume();
      } catch {}
      try {
        s.speak(u);
      } catch {}
    } catch {}
  };

  const speakWithServer = async (text: string, shouldPauseMic: boolean, onDone: () => void): Promise<boolean> => {
    try {
      if (typeof window === 'undefined') return false;
      const trimmed = String(text || '').trim();
      if (!trimmed) return false;
      if (ttsBusyRef.current) {
        ttsQueueRef.current.push({ text: trimmed, shouldPauseMic, onDone });
        return true;
      }
      ttsBusyRef.current = true;

      unlockAudioSession();
      const finish = () => {
        ttsBusyRef.current = false;
        onDone();
        const next = ttsQueueRef.current.shift();
        if (next) void speakWithServer(next.text, next.shouldPauseMic, next.onDone);
      };
      let bytes = ttsBufferCacheRef.current.get(trimmed) || null;
      let startedPlayback = false;

      const ctx = audioCtxRef.current;

      let finished = false;
      const safeFinish = () => {
        if (finished) return;
        finished = true;
        finish();
      };
      const hardTimer = setTimeout(() => {
        try {
          safeFinish();
        } catch {}
      }, 12000);
      const safeFinishWithTimer = () => {
        try {
          clearTimeout(hardTimer);
        } catch {}
        safeFinish();
      };

      const playWithHtmlAudio = async () => {
        if (!bytes) {
          const res = await fetch('/api/voice/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: trimmed }),
          });
          if (!res.ok) throw new Error('tts_fetch_failed');
          bytes = await res.arrayBuffer();
          ttsBufferCacheRef.current.set(trimmed, bytes);
        }
        const blob = new Blob([bytes], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const a = new Audio(url);
        a.preload = 'auto';
        (a as any).playsInline = true;
        try {
          a.setAttribute?.('playsinline', 'true');
        } catch {}
        const cleanup = () => {
          try {
            URL.revokeObjectURL(url);
          } catch {}
        };
        a.onended = () => {
          cleanup();
          safeFinishWithTimer();
        };
        a.onerror = () => {
          cleanup();
          safeFinishWithTimer();
        };
        if (shouldPauseMic) {
          try {
            pauseListening();
          } catch {}
        }
        try {
          a.currentTime = 0;
        } catch {}
        const p = a.play();
        if (p && typeof (p as any).catch === 'function') {
          await (p as any);
        }
        startedPlayback = true;
      };

      if (!ctx) {
        try {
          await playWithHtmlAudio();
        } catch {
          safeFinishWithTimer();
          return false;
        }
        return startedPlayback;
      }

      try {
        if (ctx.state === 'suspended' && typeof ctx.resume === 'function') await ctx.resume();
      } catch {}

      const decode = (buf: ArrayBuffer): Promise<AudioBuffer> => {
        return new Promise((resolve, reject) => {
          try {
            const copy = buf.slice(0);
            const maybe = (ctx as any).decodeAudioData(copy, resolve, reject);
            if (maybe && typeof (maybe as any).then === 'function') {
              (maybe as any).then(resolve).catch(reject);
            }
          } catch (e) {
            reject(e);
          }
        });
      };

      const playWithWebAudio = async () => {
        let decoded = ttsDecodedCacheRef.current.get(trimmed) || null;
        if (!decoded) {
          if (!bytes) {
            const res = await fetch('/api/voice/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: trimmed }),
            });
            if (!res.ok) throw new Error('tts_fetch_failed');
            bytes = await res.arrayBuffer();
            ttsBufferCacheRef.current.set(trimmed, bytes);
          }
          decoded = await decode(bytes);
          ttsDecodedCacheRef.current.set(trimmed, decoded);
        }

        const src = ctx.createBufferSource();
        src.buffer = decoded;
        src.connect(ctx.destination);
          src.onended = safeFinishWithTimer;
        if (shouldPauseMic) {
          try {
            pauseListening();
          } catch {}
        }
        src.start();
        startedPlayback = true;
      };

      try {
        await playWithWebAudio();
      } catch {
        try {
          await playWithHtmlAudio();
        } catch {
          safeFinishWithTimer();
          return false;
        }
      }
      return startedPlayback;
    } catch {
      try {
        ttsBusyRef.current = false;
        onDone();
      } catch {}
      return false;
    }
  };

  useEffect(() => {
    const onFirst = () => {
      if (gestureUnlockedRef.current) return;
      gestureUnlockedRef.current = true;
      primeTts(false);
      unlockAudioSession();
      unlockHtmlAudioFromGesture();
      if (!ttsUnlockedRef.current) {
        unlockTtsFromGesture();
      }
    };
    try {
      window.addEventListener('pointerdown', onFirst, { once: true, passive: true } as any);
      window.addEventListener('touchstart', onFirst, { once: true, passive: true } as any);
      window.addEventListener('mousedown', onFirst, { once: true, passive: true } as any);
    } catch {}
    return () => {
      try {
        window.removeEventListener('pointerdown', onFirst as any);
        window.removeEventListener('touchstart', onFirst as any);
        window.removeEventListener('mousedown', onFirst as any);
      } catch {}
    };
  }, []);
  const speak = (text: string, opts?: { resume?: boolean }) => {
    try {
      if (typeof window === 'undefined') return;
      const trimmed = String(text || '').trim();
      if (!trimmed) return;

      const wasListening = isListening;
      const shouldResume = Boolean(opts?.resume ?? wasListening);

      const u = new SpeechSynthesisUtterance(trimmed);
      u.lang = 'nb-NO';
      u.rate = 0.92;
      u.pitch = 1.0;
      u.volume = 1.0;

      const resume = () => {
        if (!shouldResume) return;
        setTimeout(() => {
          try {
            resumeListening();
          } catch {}
        }, 250);
      };

      const s = (window as any).speechSynthesis as SpeechSynthesis | undefined;

      if (!isOffline) {
        void (async () => {
          const ok = await speakWithServer(trimmed, shouldResume, resume);
          if (ok) return;
          if (!s) {
            resume();
            return;
          }
          const u2 = new SpeechSynthesisUtterance(trimmed);
          u2.lang = 'nb-NO';
          u2.rate = 0.92;
          u2.pitch = 1.0;
          u2.volume = 1.0;
          u2.onstart = () => {
            if (shouldResume) {
              try {
                pauseListening();
              } catch {}
            }
          };
          u2.onend = resume;
          u2.onerror = resume;
          try {
            if (typeof s.resume === 'function') s.resume();
          } catch {}
          try {
            if (s.speaking || s.pending) s.cancel();
          } catch {}
          try {
            s.speak(u2);
          } catch {
            resume();
          }
        })();
        return;
      }

      if (!s) return;
      u.onstart = () => {
        if (shouldResume) {
          try {
            pauseListening();
          } catch {}
        }
      };
      u.onend = resume;
      u.onerror = resume;
      try {
        if (typeof s.resume === 'function') s.resume();
      } catch {}
      try {
        if (s.speaking || s.pending) s.cancel();
      } catch {}
      try {
        s.speak(u);
      } catch {
        resume();
      }
    } catch {}
  };
  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  const announce = useCallback((text: string, opts?: { resume?: boolean }) => {
    const trimmed = String(text || '').trim();
    if (!trimmed) return;
    if (voice2EnabledRef.current && voice2Ref.current) {
      try {
        void voice2Ref.current.speak(trimmed);
      } catch {}
      return;
    }
    try {
      speak(trimmed, opts);
    } catch {}
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

  useEffect(() => {
    if (isOffline) return;
    if (isDemoActive) return;
    if (!hive) return;
    const isTwoQueen = Boolean((hive as any)?.two_queen_drift);
    const key = `${params.id}:${isTwoQueen ? queenSide : 0}`;
    if (prefillKeyRef.current === key) return;
    prefillKeyRef.current = key;

    const run = async () => {
      try {
        const isMissingColumn = (err: any, col: string) => {
          const code = String(err?.code || '');
          const msg = String(err?.message || err || '').toLowerCase();
          return code === '42703' || msg.includes(`column \"${col}\"`) || (msg.includes(col) && msg.includes('does not exist'));
        };

        let data: any[] | null = null;
        if (isTwoQueen) {
          const res = await supabase
            .from('inspections')
            .select('queen_color, queen_year, brood_condition, honey_stores, temperament, status, created_at, queen_side')
            .eq('hive_id', params.id)
            .eq('queen_side', queenSide)
            .order('created_at', { ascending: false })
            .limit(25);

          if (res.error && isMissingColumn(res.error, 'queen_side')) {
            setQueenSideDbSupported(false);
            const fallback = await supabase
              .from('inspections')
              .select('queen_color, queen_year, brood_condition, honey_stores, temperament, status, created_at')
              .eq('hive_id', params.id)
              .order('created_at', { ascending: false })
              .limit(25);
            data = fallback.data as any;
          } else {
            if (!res.error) setQueenSideDbSupported(true);
            data = res.data as any;
          }
        } else {
          const res = await supabase
            .from('inspections')
            .select('queen_color, queen_year, brood_condition, honey_stores, temperament, status, created_at')
            .eq('hive_id', params.id)
            .order('created_at', { ascending: false })
            .limit(25);
          data = res.data as any;
        }

        if (!data || data.length === 0) return;
        const latest: any = data[0] || {};

        const firstNonEmptyQueenColor = (data as any[]).find((r) => {
          const v = r?.queen_color;
          return typeof v === 'string' && v.trim().length > 0;
        })?.queen_color as string | undefined;

        const firstNonEmptyQueenYear = (data as any[]).find((r) => {
          const v = r?.queen_year;
          return typeof v === 'number' && Number.isFinite(v);
        })?.queen_year as number | undefined;

        if (!touchedRef.current.status && typeof latest?.status === 'string' && latest.status) {
          const raw = String(latest.status || '').trim();
          const up = raw.toUpperCase();
          const mapped =
            up === 'SVAK' ? 'Svak' :
            up === 'DØD' ? 'Død' :
            up === 'SYKDOM' ? 'Sykdom' :
            up === 'BYTT_DRONNING' ? 'Bytt Dronning' :
            up === 'MOTTATT_FOR' ? 'Mottatt fôr' :
            up === 'SKIFTET_RAMMER' ? 'Skiftet rammer' :
            up === 'SVERMING' ? 'Sverming' :
            up === 'VARROA_MISTANKE' ? 'Varroa mistanke' :
            up === 'BYTTET_VOKS' ? 'Byttet voks' :
            up === 'AKTIV' ? 'OK' :
            raw;
          setStatus(mapped);
        }
        const rawBrood = typeof latest?.brood_condition === 'string' ? String(latest.brood_condition) : '';
        if (rawBrood) {
          const low = rawBrood.toLowerCase();
          const readKV = (key: string) => {
            const m = low.match(new RegExp(`\\b${key}\\s*[:=]\\s*(lite|normal|mye)\\b`));
            return m ? (m[1] as BroodAmount) : null;
          };
          const legacy = low === 'darlig' ? ('lite' as BroodAmount) : low === 'bra' ? ('mye' as BroodAmount) : low === 'normal' ? ('normal' as BroodAmount) : null;

          const egg = readKV('egg') || legacy;
          const larver = readKV('larver') || readKV('larve') || legacy;
          const yngel = readKV('yngel') || legacy;
          const droner = readKV('droner') || readKV('drone') || legacy;
          const framesMatch = low.match(/\b(frames|rammer|bistyrke)\s*[:=]\s*(\d+(?:[.,]5)?)\b/);
          const frames = framesMatch ? String(framesMatch[2]).replace(',', '.') : '';

          if (egg && !touchedRef.current.broodEgg) setBroodEgg(egg);
          if (larver && !touchedRef.current.broodLarvae) setBroodLarvae(larver);
          if (yngel && !touchedRef.current.broodYngel) setBroodYngel(yngel);
          if (droner && !touchedRef.current.broodDrones) setBroodDrones(droner);
          if (frames && !touchedRef.current.broodFrames) setBroodFrames(frames);
        }
        if (!touchedRef.current.honeyStores && typeof latest?.honey_stores === 'string' && latest.honey_stores) {
          setHoneyStores(latest.honey_stores);
        }
        if (!touchedRef.current.temperament && typeof latest?.temperament === 'string' && latest.temperament) {
          setTemperament(latest.temperament);
        }
        if (!touchedRef.current.queenColor && typeof firstNonEmptyQueenColor === 'string' && firstNonEmptyQueenColor) {
          setQueenColor(firstNonEmptyQueenColor);
        }
        if (!touchedRef.current.queenYear && typeof firstNonEmptyQueenYear === 'number') {
          setQueenYear(String(firstNonEmptyQueenYear));
        }
      } catch {}
    };

    void run();
  }, [hive, isOffline, isDemoActive, params.id, supabase, queenSide]);


  const fetchHiveAndWeather = async () => {
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
      let didFetchWeather = false;
      let offlineParsed: any = null;
      let loadedHive: any = null;
      if (typeof window !== 'undefined') {
        const offlineData = localStorage.getItem('offline_data');
        if (offlineData) {
          offlineParsed = JSON.parse(offlineData);
          const foundHive = offlineParsed.hives?.find((h: any) => h.id === params.id);
          if (foundHive) {
            loadedHive = foundHive;
            setHive(foundHive);
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
        const isMissingColumn = (err: any, col: string) => {
          const code = String(err?.code || '');
          const msg = String(err?.message || err || '').toLowerCase();
          return code === '42703' || msg.includes(`column \"${col}\"`) || (msg.includes(col) && msg.includes('does not exist'));
        };

        let hiveRes: any = await withTimeout(
          supabase
            .from('hives')
            .select('name, hive_number, apiary_id, user_id, two_queen_drift')
            .eq('id', params.id)
            .single() as any,
          9000
        );

        if (hiveRes?.error && isMissingColumn(hiveRes.error, 'two_queen_drift')) {
          hiveRes = await withTimeout(
            supabase
              .from('hives')
              .select('name, hive_number, apiary_id, user_id')
              .eq('id', params.id)
              .single() as any,
            9000
          );
        }

        if (hiveRes?.data) {
          loadedHive = hiveRes.data;
          setHive(hiveRes.data);
        }
      }

      const parseLatLng = (raw: any): { lat: number; lon: number } | null => {
        try {
          if (!raw) return null;
          if (typeof raw === 'string') {
            const parts = raw.split(',').map((p) => p.trim());
            if (parts.length < 2) return null;
            const lat = Number(parts[0]);
            const lon = Number(parts[1]);
            if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
            return null;
          }
          return null;
        } catch {
          return null;
        }
      };

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

      const fetchWeatherFor = async (lat: number, lon: number) => {
        setWeatherLoading(true);
        try {
          didFetchWeather = true;
          setCoordinates({ lat, lng: lon });
          const response = await withTimeout(
            fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&wind_speed_unit=ms`
            ),
            8000
          );
          const weatherData = await response.json();
          if (weatherData.current) {
            setTemperature(String(weatherData.current.temperature_2m ?? ''));
            setWeather(getWeatherDescription(Number(weatherData.current.weather_code)));
          }
          const place = await fetchPlaceName(lat, lon);
          if (place) setWeatherPlace((prev) => prev || place);
        } catch {
        } finally {
          setWeatherLoading(false);
        }
      };

      if (!isOffline) {
        const apiaryId = loadedHive?.apiary_id;
        if (apiaryId) {
          try {
            const apiaryRes: any = await withTimeout(
              supabase
                .from('apiaries')
                .select('id, name, location, coordinates, latitude, longitude')
                .eq('id', apiaryId)
                .single() as any,
              9000
            );
            const a = apiaryRes?.data;
            const lat = Number(a?.latitude);
            const lon = Number(a?.longitude);
            const coords =
              Number.isFinite(lat) && Number.isFinite(lon)
                ? { lat, lon }
                : parseLatLng(a?.coordinates);
            if (coords) {
              if (a?.name) setWeatherPlace((prev) => prev || String(a.name));
              await fetchWeatherFor(coords.lat, coords.lon);
            }
          } catch {}
        }
      } else {
        const apiaryId = loadedHive?.apiary_id;
        if (apiaryId && offlineParsed?.apiaries) {
          try {
            const a = offlineParsed.apiaries.find((x: any) => x?.id === apiaryId);
            const lat = Number(a?.latitude);
            const lon = Number(a?.longitude);
            const coords =
              Number.isFinite(lat) && Number.isFinite(lon)
                ? { lat, lon }
                : parseLatLng(a?.coordinates);
            if (coords) {
              if (a?.name) setWeatherPlace((prev) => prev || String(a.name));
              await fetchWeatherFor(coords.lat, coords.lon);
            }
          } catch {}
        }
      }

      if (!didFetchWeather && !isOffline) {
        try {
          if (typeof navigator !== 'undefined' && navigator.geolocation) {
            const pos = await withTimeout(
              new Promise<GeolocationPosition>((resolve, reject) => {
                try {
                  navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: false,
                    timeout: 8000,
                    maximumAge: 5 * 60 * 1000,
                  });
                } catch (e) {
                  reject(e);
                }
              }),
              9000
            );
            await fetchWeatherFor(pos.coords.latitude, pos.coords.longitude);
          }
        } catch {}
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

  const submitInspection = async () => {
    const opId = crypto.randomUUID();
    setSubmitting(true);
    const isTwoQueen = Boolean((hive as any)?.two_queen_drift);
    let shouldUseQueenSide = isTwoQueen && queenSideDbSupported !== false;
    let shouldSplit = shouldUseQueenSide;
    const queenSeenValue = queenSeen === 'ja' ? true : queenSeen === 'nei' ? false : null;
    const eggsSeenValue = eggsSeen === 'ja' ? true : eggsSeen === 'nei' ? false : null;
    const broodConditionToSave =
      `egg:${broodEgg};larver:${broodLarvae};yngel:${broodYngel};droner:${broodDrones}` +
      (String(broodFrames || '').trim() ? `;frames:${String(broodFrames).trim().replace(',', '.')}` : '');
    const isDeadStatus =
      String(status || '').trim().toLowerCase() === 'død' ||
      String(status || '').trim().toUpperCase() === 'DØD';
    const hiveStatusToSave = isDeadStatus ? 'Død' : status;
    const voiceLogTag = buildVoiceLogTag(speechLogRef.current || []);
    const notesWithVoiceLog = [String(notes || '').trimEnd(), voiceLogTag].filter(Boolean).join('\n');

    try {
      const isMissingColumn = (err: any, col: string) => {
        const code = String(err?.code || '');
        const msg = String(err?.message || err || '').toLowerCase();
        return code === '42703' || msg.includes(`column \"${col}\"`) || (msg.includes(col) && msg.includes('does not exist'));
      };

      const allFiles: File[] = [
        ...(selectedImage ? [selectedImage] : []),
        ...(extraImages && extraImages.length > 0 ? extraImages : []),
      ];

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
          details: `Inspeksjon utført (Offline).${isTwoQueen ? ` Dronning ${queenSide}.` : ''} Status: ${status}.`,
          sharedWithMattilsynet: false, // Page doesn't have this field?
          images: allFiles.length > 0 ? allFiles.map((f) => ({ name: f.name, type: f.type, blob: f })) : undefined,
          data: {
            inspection: {
              id: opId,
              hive_id: params.id,
              inspection_date: date,
              time: time,
              ...(isTwoQueen ? { queen_side: queenSide } : {}),
              queen_seen: queenSeenValue,
              queen_color: queenColor || null,
              queen_year: queenYear ? parseInt(queenYear, 10) : null,
              eggs_seen: eggsSeenValue,
              brood_condition: broodConditionToSave,
              honey_stores: honeyStores,
              temperament: temperament,
              notes: notesWithVoiceLog,
              status: status, 
              temperature: temperature ? parseFloat(temperature) : null,
              weather: weather,
              weather_place: weatherPlace || null,
            },
            hiveUpdate: {
              status: hiveStatusToSave,
              last_inspection_date: date 
            }
          }
        });
        savedSidesRef.current[queenSide] = true;
        if (shouldSplit && !(savedSidesRef.current[1] && savedSidesRef.current[2])) {
          const nextSide: 1 | 2 = queenSide === 1 ? 2 : 1;
          setLastCommand(`Dronning ${queenSide} lagret offline`);
          announce(`Dronning ${queenSide} lagret offline. Fortsett med dronning ${nextSide}`);
          setQueenSide(nextSide);
          return;
        }
        setLastCommand('Inspeksjon lagret offline');
        announce('Inspeksjon lagret offline');
        if (!handsfreeReady) {
          alert('Inspeksjon lagret offline! Den blir sendt når du får nettdekning igjen.');
        }
        setTimeout(() => {
          try {
            const list = apiaryHivesRef.current || [];
            const currentId = String(params.id || '').trim();
            const idx = list.findIndex((x) => String((x as any)?.id || '').trim() === currentId);
            const next = idx >= 0 ? list[idx + 1] : null;
            const nextId = String((next as any)?.id || '').trim();
            if ((autoVoice === '1' || handsfreeReady) && nextId) {
              router.push(`/hives/${nextId}/new-inspection?${isDemoActive ? 'demo=1&' : ''}autoVoice=1`);
            } else {
              router.push(isDemoActive ? '/hives?demo=1' : '/hives');
            }
          } catch {
            router.push(isDemoActive ? '/hives?demo=1' : '/hives');
          }
        }, 650);
        return;
      }

      const user = await getUserWithSessionFallback(supabase);
      if (!user) {
        if (isDemoActive) {
          alert('Demo-modus krever at du er logget inn.');
          return;
        }
        await saveInspection({
          id: opId,
          hiveId: params.id,
          action: 'FULL_INSPECTION',
          details: `Inspeksjon utført (Offline).${isTwoQueen ? ` Dronning ${queenSide}.` : ''} Status: ${status}.${performedActions.length ? ` Tiltak: ${performedActions.map(performedActionLabel).join(', ')}.` : ''}`,
          sharedWithMattilsynet: false,
          images: allFiles.length > 0 ? allFiles.map((f) => ({ name: f.name, type: f.type, blob: f })) : undefined,
          data: {
            inspection: {
              id: opId,
              hive_id: params.id,
              inspection_date: date,
              time: time,
              ...(isTwoQueen ? { queen_side: queenSide } : {}),
              queen_seen: queenSeenValue,
              queen_color: queenColor || null,
              queen_year: queenYear ? parseInt(queenYear, 10) : null,
              eggs_seen: eggsSeenValue,
              brood_condition: broodConditionToSave,
              honey_stores: honeyStores,
              temperament: temperament,
              performed_actions: performedActions,
              notes: notesWithVoiceLog,
              status: status,
              temperature: temperature ? parseFloat(temperature) : null,
              weather: weather,
              weather_place: weatherPlace || null,
            },
            hiveUpdate: {
              status: hiveStatusToSave,
              last_inspection_date: date,
            },
          },
        });
        savedSidesRef.current[queenSide] = true;
        if (shouldSplit && !(savedSidesRef.current[1] && savedSidesRef.current[2])) {
          const nextSide: 1 | 2 = queenSide === 1 ? 2 : 1;
          setLastCommand(`Dronning ${queenSide} lagret offline`);
          announce(`Dronning ${queenSide} lagret offline. Fortsett med dronning ${nextSide}`);
          setQueenSide(nextSide);
          return;
        }
        setLastCommand('Inspeksjon lagret offline');
        announce('Inspeksjon lagret offline');
        if (!handsfreeReady) {
          alert('Inspeksjon lagret offline! Den blir sendt når du får nettdekning igjen.');
        }
        setTimeout(() => {
          try {
            const list = apiaryHivesRef.current || [];
            const currentId = String(params.id || '').trim();
            const idx = list.findIndex((x) => String((x as any)?.id || '').trim() === currentId);
            const next = idx >= 0 ? list[idx + 1] : null;
            const nextId = String((next as any)?.id || '').trim();
            if ((autoVoice === '1' || handsfreeReady) && nextId) {
              router.push(`/hives/${nextId}/new-inspection?${isDemoActive ? 'demo=1&' : ''}autoVoice=1`);
            } else {
              router.push(isDemoActive ? '/hives?demo=1' : '/hives');
            }
          } catch {
            router.push(isDemoActive ? '/hives?demo=1' : '/hives');
          }
        }, 650);
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
            ? `${notesWithVoiceLog}${notesWithVoiceLog ? '\n' : ''}${allPhotos
                .slice(1)
                .map((u, i) => `Bilde ${i + 2}: ${u}`)
                .join('\n')}`
            : notesWithVoiceLog;
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
              ...(shouldUseQueenSide ? { queen_side: queenSide } : {}),
              queen_seen: queenSeenValue,
              queen_color: queenColor || null,
              queen_year: queenYear ? parseInt(queenYear, 10) : null,
              eggs_seen: eggsSeenValue,
              brood_condition: broodConditionToSave,
              honey_stores: honeyStores,
              temperament: temperament,
              performed_actions: performedActions,
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
        savedSidesRef.current[queenSide] = true;
        if (shouldSplit && !(savedSidesRef.current[1] && savedSidesRef.current[2])) {
          const nextSide: 1 | 2 = queenSide === 1 ? 2 : 1;
          setLastCommand(`Dronning ${queenSide} lagret`);
        announce(`Dronning ${queenSide} lagret. Fortsett med dronning ${nextSide}`);
          setQueenSide(nextSide);
          return;
        }
        setLastCommand('Inspeksjon lagret');
      announce('Inspeksjon lagret');
        setTimeout(() => {
          router.push('/hives?demo=1');
        }, 650);
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
      const baseNotes = notesWithVoiceLog;
      const notesWithImages =
        allPhotos.length > 1
          ? `${baseNotes}${baseNotes ? '\n' : ''}${allPhotos
              .slice(1)
              .map((u, i) => `Bilde ${i + 2}: ${u}`)
              .join('\n')}`
          : baseNotes;
      const insertPayload: any = {
          id: opId,
          hive_id: params.id,
          user_id: String((hive as any)?.user_id || user.id),
          inspection_date: date,
          time: time,
          ...(shouldUseQueenSide ? { queen_side: queenSide } : {}),
          queen_seen: queenSeenValue,
          queen_color: queenColor || null,
          queen_year: queenYear ? parseInt(queenYear, 10) : null,
          eggs_seen: eggsSeenValue,
          brood_condition: broodConditionToSave,
          honey_stores: honeyStores,
          temperament: temperament,
          performed_actions: performedActions,
          notes: notesWithImages,
          status: status, 
          temperature: temperature ? parseFloat(temperature) : null,
          weather: weather,
          weather_place: weatherPlace || null,
          image_url: imageUrl
        };

      let inspectionError: any = null;
      const payloadToInsert: any = { ...insertPayload };
      for (let i = 0; i < 4; i++) {
        const res = await supabase.from('inspections').insert(payloadToInsert);
        inspectionError = res.error;
        if (!inspectionError) break;
        if (isMissingColumn(inspectionError, 'queen_side') && 'queen_side' in payloadToInsert) {
          setQueenSideDbSupported(false);
          shouldUseQueenSide = false;
          shouldSplit = false;
          try { delete payloadToInsert.queen_side; } catch {}
          continue;
        }
        if (isMissingColumn(inspectionError, 'performed_actions') && 'performed_actions' in payloadToInsert) {
          try { delete payloadToInsert.performed_actions; } catch {}
          continue;
        }
        break;
      }
      if (inspectionError) throw inspectionError;

      // 2. Update Hive Status and Last Inspection Date
      await supabase
        .from('hives')
        .update({ 
          status: hiveStatusToSave,
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
          details: `Inspeksjon utført.${isTwoQueen ? ` Dronning ${queenSide}.` : ''} Status: ${status}. Temp: ${temperature}°C.${performedActions.length ? ` Tiltak: ${performedActions.map(performedActionLabel).join(', ')}.` : ''} ${notes ? 'Notater lagt til.' : ''}`
        });

      if (logError) throw logError;
      savedSidesRef.current[queenSide] = true;
      if (shouldSplit && !(savedSidesRef.current[1] && savedSidesRef.current[2])) {
        const nextSide: 1 | 2 = queenSide === 1 ? 2 : 1;
        setLastCommand(`Dronning ${queenSide} lagret`);
        announce(`Dronning ${queenSide} lagret. Fortsett med dronning ${nextSide}`);
        setQueenSide(nextSide);
        return;
      }
      setLastCommand('Inspeksjon lagret');
      announce('Inspeksjon lagret');
      setTimeout(() => {
        try {
          const list = apiaryHivesRef.current || [];
          const currentId = String(params.id || '').trim();
          const idx = list.findIndex((x) => String((x as any)?.id || '').trim() === currentId);
          const next = idx >= 0 ? list[idx + 1] : null;
          const nextId = String((next as any)?.id || '').trim();
          if ((autoVoice === '1' || handsfreeReady) && nextId) {
            router.push(`/hives/${nextId}/new-inspection?autoVoice=1`);
          } else {
            router.push('/hives');
          }
        } catch {
          router.push('/hives');
        }
      }, 650);
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

          await saveInspection({
            id: opId,
            hiveId: params.id,
            action: 'FULL_INSPECTION',
            details: `Inspeksjon utført (Offline).${isTwoQueen ? ` Dronning ${queenSide}.` : ''} Status: ${status}.${performedActions.length ? ` Tiltak: ${performedActions.map(performedActionLabel).join(', ')}.` : ''}`,
            sharedWithMattilsynet: false,
            images: allFiles.length > 0 ? allFiles.map((f) => ({ name: f.name, type: f.type, blob: f })) : undefined,
            data: {
              inspection: {
                id: opId,
                hive_id: params.id,
                inspection_date: date,
                time: time,
                ...(isTwoQueen ? { queen_side: queenSide } : {}),
                queen_seen: queenSeenValue,
                queen_color: queenColor || null,
                queen_year: queenYear ? parseInt(queenYear, 10) : null,
                eggs_seen: eggsSeenValue,
                brood_condition: broodConditionToSave,
                honey_stores: honeyStores,
                temperament: temperament,
                performed_actions: performedActions,
                notes: notesWithVoiceLog,
                status: status,
                temperature: temperature ? parseFloat(temperature) : null,
                weather: weather,
                weather_place: weatherPlace || null,
              },
              hiveUpdate: {
                status: hiveStatusToSave,
                last_inspection_date: date,
              },
            },
          });
          savedSidesRef.current[queenSide] = true;
          if (shouldSplit && !(savedSidesRef.current[1] && savedSidesRef.current[2])) {
            const nextSide: 1 | 2 = queenSide === 1 ? 2 : 1;
            setLastCommand(`Dronning ${queenSide} lagret offline`);
            announce(`Dronning ${queenSide} lagret offline. Fortsett med dronning ${nextSide}`);
            setQueenSide(nextSide);
            return;
          }
          setLastCommand('Inspeksjon lagret offline');
          announce('Inspeksjon lagret offline');
          if (!handsfreeReady) {
            alert('Inspeksjon lagret offline! Den blir sendt når du får nettdekning igjen.');
          }
          setTimeout(() => {
            try {
              const list = apiaryHivesRef.current || [];
              const currentId = String(params.id || '').trim();
              const idx = list.findIndex((x) => String((x as any)?.id || '').trim() === currentId);
              const next = idx >= 0 ? list[idx + 1] : null;
              const nextId = String((next as any)?.id || '').trim();
              if ((autoVoice === '1' || handsfreeReady) && nextId) {
                router.push(`/hives/${nextId}/new-inspection?autoVoice=1`);
              } else {
                router.push('/hives');
              }
            } catch {
              router.push('/hives');
            }
          }, 650);
          return;
        }
      } catch {}
      setLastCommand('Feil ved lagring');
      announce('Feil ved lagring');
      if (!handsfreeReady) {
        alert('Feil ved lagring: ' + (error?.message || 'Ukjent feil'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    submitInspectionRef.current = () => {
      void submitInspection();
    };
  }, [submitInspection]);

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
                disabled={!voice2Supported}
                onClick={() => {
                  const engine = voice2Ref.current;
                  if (!engine || !voice2Supported) {
                    alert('Denne enheten støtter ikke handsfree-stemme.');
                    return;
                  }
                  if (voice2Enabled) {
                    try {
                      engine.stop();
                    } catch {}
                    setVoice2Enabled(false);
                    setHandsfreeReady(false);
                    setVoice2State('idle');
                    return;
                  }
                  setHandsfreeReady(true);
                  setVoice2Enabled(true);
                  try {
                    engine.unlockFromGesture();
                  } catch {}
                  try {
                    engine.start();
                  } catch {}
                  void engine.speak('Klar.');
                }}
                className={`px-3 py-3 rounded-full transition-all font-bold text-xs tracking-wide ${
                  !voice2Supported
                    ? 'bg-gray-100 text-gray-300'
                    : voice2Enabled
                      ? voice2State === 'error'
                        ? 'bg-red-600 text-white shadow-lg ring-2 ring-red-300'
                        : voice2State === 'speaking'
                          ? 'bg-honey-600 text-white shadow-lg ring-2 ring-honey-300'
                          : 'bg-green-600 text-white shadow-lg ring-2 ring-green-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={voice2Enabled ? 'Handsfree (ny) av' : 'Handsfree (ny) på'}
            >
              V2
            </button>
        </div>
      </header>

      <main className="p-4">
        {pendingVoiceLabel ? (
          <div className="mb-4 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-gray-900">
            <div className="font-extrabold">Venter på bekreftelse</div>
            <div className="mt-1">{pendingVoiceLabel}</div>
            <div className="mt-1 text-xs text-gray-600">Si «Bekreft» eller «Avbryt»</div>
          </div>
        ) : null}
        {/* Camera Preview (Bodycam Mode) */}
        {cameraActive && (
            <div id="field-camera" className="mb-4 relative rounded-xl overflow-hidden shadow-lg bg-black aspect-video mx-auto max-w-lg border-2 border-blue-500">
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

        <div className="sr-only" aria-live="polite">
          {lastCorrection ? `Tolkning brukt: ${lastCorrection.phrase} (${Math.round((lastCorrection.similarity || 0) * 100)}%)` : ''}
          {lastCommand ? `Oppfattet: ${lastCommand}` : ''}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
          
          {/* Date & Weather */}
          <div id="field-weather" className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
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

            {Boolean((hive as any)?.two_queen_drift) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-honey-50 border border-honey-100">
                  <span className="text-sm font-semibold text-honey-800">Todronning drift</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQueenSide(1)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        queenSide === 1 ? 'bg-honey-500 text-white' : 'bg-white text-gray-800 border border-gray-200'
                      }`}
                    >
                      Dronning 1
                    </button>
                    <button
                      type="button"
                      onClick={() => setQueenSide(2)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        queenSide === 2 ? 'bg-honey-500 text-white' : 'bg-white text-gray-800 border border-gray-200'
                      }`}
                    >
                      Dronning 2
                    </button>
                  </div>
                </div>
                {queenSideDbSupported === false && (
                  <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Databasen mangler kolonnen queen_side for todronning drift. Inspeksjonen lagres uten side 1/2 til du kjører SQL-migrasjonen i Supabase.
                  </div>
                )}
              </div>
            )}
            
            <div id="field-queenSeen" className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
              <span className="text-gray-700">Dronning sett?</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQueenSeen('')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    queenSeen === '' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  Ikke valgt
                </button>
                <button
                  type="button"
                  onClick={() => setQueenSeen('ja')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    queenSeen === 'ja' ? 'bg-honey-500 text-white' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  Ja
                </button>
                <button
                  type="button"
                  onClick={() => setQueenSeen('nei')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    queenSeen === 'nei' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  Nei
                </button>
              </div>
            </div>

            <div id="field-eggsSeen" className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
              <span className="text-gray-700">Egg sett?</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEggsSeen('')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    eggsSeen === '' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  Ikke valgt
                </button>
                <button
                  type="button"
                  onClick={() => setEggsSeen('ja')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    eggsSeen === 'ja' ? 'bg-honey-500 text-white' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  Ja
                </button>
                <button
                  type="button"
                  onClick={() => setEggsSeen('nei')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    eggsSeen === 'nei' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  Nei
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div id="field-queenColor">
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
              <div id="field-queenYear">
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
            
            <div id="field-status">
              <label className="block text-sm font-medium text-gray-700 mb-2">Kubestatus</label>
              <select 
                value={status} 
                onChange={e => {
                  markTouched('status');
                  setStatus(e.target.value);
                }}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg font-medium text-gray-900"
              >
                <option value="OK">OK</option>
                <option value="Sterk">Sterk</option>
                <option value="Svak">Svak</option>
                <option value="Byttet voks">Byttet voks</option>
                <option value="Mottatt fôr">Mottatt fôr</option>
                <option value="Skiftet rammer">Skiftet rammer</option>
                <option value="Sverming">Sverming</option>
                <option value="Bytt Dronning">Bytt Dronning</option>
                <option value="Varroa mistanke">Varroa mistanke</option>
                <option value="Sykdom">Sykdom</option>
                <option value="Død">Død</option>
              </select>
            </div>

            <div className="space-y-4">
              <div id="field-brood">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Yngelleie</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Egg</label>
                    <select
                      value={broodEgg}
                      onChange={(e) => {
                        markTouched('broodEgg');
                        setBroodEgg(e.target.value as any);
                      }}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="normal">Normal</option>
                      <option value="mye">Mye</option>
                      <option value="lite">Lite</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Larver</label>
                    <select
                      value={broodLarvae}
                      onChange={(e) => {
                        markTouched('broodLarvae');
                        setBroodLarvae(e.target.value as any);
                      }}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="normal">Normal</option>
                      <option value="mye">Mye</option>
                      <option value="lite">Lite</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Yngel</label>
                    <select
                      value={broodYngel}
                      onChange={(e) => {
                        markTouched('broodYngel');
                        setBroodYngel(e.target.value as any);
                      }}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="normal">Normal</option>
                      <option value="mye">Mye</option>
                      <option value="lite">Lite</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Droner</label>
                    <select
                      value={broodDrones}
                      onChange={(e) => {
                        markTouched('broodDrones');
                        setBroodDrones(e.target.value as any);
                      }}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="normal">Normal</option>
                      <option value="mye">Mye</option>
                      <option value="lite">Lite</option>
                    </select>
                  </div>
                </div>
              </div>

              <div id="field-broodFrames">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bistyrke (rammer med yngel)</label>
                <select
                  value={broodFrames}
                  onChange={(e) => {
                    markTouched('broodFrames');
                    setBroodFrames(e.target.value);
                  }}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Ukjent</option>
                  {Array.from({ length: 23 }, (_, i) => (i / 2).toFixed(1).replace('.0', '')).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div id="field-honeyStores">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fôr</label>
                <select 
                    value={honeyStores} 
                    onChange={e => {
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

            <div id="field-temperament">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gemytt</label>
              <select 
                value={temperament} 
                onChange={e => {
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

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Hva er utført i dag?
            </h3>
            <div className="text-xs text-gray-500">
              Valgt: {performedActions.length || 0}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {performedActionDefs
                .filter((d) => d.quick)
                .map((d) => {
                  const selected = isPerformed(d.id);
                  const recommend = d.id === 'FEED_GIVEN' && honeyStores === 'lite';
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => togglePerformedAction(d.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border font-semibold text-sm transition-colors active:scale-[0.99] ${
                        selected
                          ? 'bg-gray-900 text-white border-gray-900'
                          : recommend
                            ? 'bg-yellow-50 text-gray-900 border-yellow-300'
                            : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
            </div>

            {isPerformed('FEED_GIVEN') && (
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
                <div className="text-xs font-bold text-gray-700 uppercase">Type fôr</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'nodfor' as const, label: 'Nødfôr' },
                    { id: 'sukkerlake' as const, label: 'Sukkerlake' },
                    { id: 'annet' as const, label: 'Annet' },
                  ].map((opt) => {
                    const current = performedActions.find((a) => a.id === 'FEED_GIVEN')?.meta?.feedType;
                    const selected = current === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPerformedMeta('FEED_GIVEN', { feedType: opt.id })}
                        className={`px-3 py-2 rounded-lg border text-sm font-semibold ${
                          selected
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowAllPerformedActions((v) => !v)}
                className="text-sm font-semibold text-gray-900 underline underline-offset-2"
              >
                {showAllPerformedActions ? 'Skjul flere handlinger' : 'Vis flere handlinger'}
              </button>
              {performedActions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPerformedActions([])}
                  className="text-sm font-semibold text-gray-600 underline underline-offset-2"
                >
                  Nullstill
                </button>
              )}
            </div>

            {showAllPerformedActions && (
              <div className="space-y-3">
                {Array.from(new Set(performedActionDefs.map((d) => d.group))).map((group) => {
                  const items = performedActionDefs.filter((d) => d.group === group && !d.quick);
                  if (items.length === 0) return null;
                  return (
                    <div key={group} className="space-y-2">
                      <div className="text-xs font-bold text-gray-500 uppercase">{group}</div>
                      <div className="grid grid-cols-2 gap-2">
                        {items.map((d) => {
                          const selected = isPerformed(d.id);
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => togglePerformedAction(d.id)}
                              className={`w-full text-left px-3 py-2.5 rounded-lg border font-semibold text-sm transition-colors active:scale-[0.99] ${
                                selected
                                  ? 'bg-gray-900 text-white border-gray-900'
                                  : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                            <img
                              src={src}
                              alt="Bilde"
                              className="w-full h-full object-cover cursor-zoom-in"
                              onClick={() => {
                                setZoomImageSrc(src);
                                setZoomScale(1);
                              }}
                              onTouchEnd={() => {
                                setZoomImageSrc(src);
                                setZoomScale(1);
                              }}
                              onPointerUp={() => {
                                setZoomImageSrc(src);
                                setZoomScale(1);
                              }}
                            />
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
            id="field-save"
            type="submit"
            disabled={submitting}
            className="w-full bg-honey-500 hover:bg-honey-600 text-white font-bold py-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {submitting ? 'Lagrer...' : 'Lagre inspeksjon'}
          </button>
        </form>

        {zoomImageSrc && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <button
              type="button"
              onClick={() => setZoomImageSrc(null)}
              className="absolute inset-0 bg-black/70"
              aria-label="Lukk bilde"
            />
            <div className="relative z-10 w-full max-w-3xl bg-white rounded-xl shadow-xl overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoomScale((z) => Math.max(1, Number((z - 0.5).toFixed(1))))}
                    className="px-3 py-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 font-semibold"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomScale((z) => Math.min(4, Number((z + 0.5).toFixed(1))))}
                    className="px-3 py-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 font-semibold"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomScale(1)}
                    className="px-3 py-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 font-semibold"
                  >
                    1x
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setZoomImageSrc(null)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                  aria-label="Lukk"
                >
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>
              <div className="max-h-[80vh] overflow-auto bg-black">
                <img
                  src={zoomImageSrc}
                  alt="Bilde"
                  className="block max-w-none"
                  style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top left' }}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
