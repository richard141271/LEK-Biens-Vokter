import { useState, useRef, useEffect, useCallback } from 'react';

export function useVoiceRecognition(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);
  const keepAliveRef = useRef(false);
  const pausedRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStartAtRef = useRef<number>(0);
  const startingRef = useRef(false);
  const listeningRef = useRef(false);
  const lastStopAtRef = useRef<number>(0);
  const backoffMsRef = useRef<number>(220);
  const safeStartRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const { webkitSpeechRecognition, SpeechRecognition } = window as any;
        const SpeechRecognitionConstructor = SpeechRecognition || webkitSpeechRecognition;
        
        if (SpeechRecognitionConstructor) {
            setIsSupported(true);
            const recognition = new SpeechRecognitionConstructor();
            recognition.continuous = true;
            recognition.lang = 'nb-NO';
            recognition.interimResults = false;
            recognition.maxAlternatives = 5;
            
            recognition.onresult = (event: any) => {
                const last = event.results.length - 1;
                const pickBest = (r: any) => {
                  try {
                    const candidates: { transcript: string; confidence: number }[] = [];
                    const len = typeof r?.length === 'number' ? r.length : 0;
                    for (let i = 0; i < len; i++) {
                      const tr = String(r?.[i]?.transcript || '').trim();
                      if (!tr) continue;
                      const confidence = typeof r?.[i]?.confidence === 'number' ? r[i].confidence : 0;
                      candidates.push({ transcript: tr, confidence });
                    }
                    if (candidates.length === 0) return String(r?.[0]?.transcript || '').trim();
                    const normalize = (s: string) =>
                      s
                        .toLowerCase()
                        .replace(/[^a-z0-9æøå\s]/gi, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    const keywords = [
                      'dronning',
                      'farge',
                      'årgang',
                      'ar',
                      'gul',
                      'hvit',
                      'rød',
                      'rod',
                      'grønn',
                      'gronn',
                      'blå',
                      'bla',
                      'egg',
                      'stift',
                      'yngel',
                      'honning',
                      'fôr',
                      'for',
                      'mat',
                      'varroa',
                      'midd',
                      'temperament',
                      'gemytt',
                      'status',
                      'svak',
                      'død',
                      'sykdom',
                      'sverming',
                      'bytt',
                      'voks',
                      'bilde',
                      'foto',
                      'knips',
                      'lagre',
                      'inspeksjon',
                      'kube',
                      'bigård',
                    ];
                    const score = (t: string, c: number) => {
                      const n = normalize(t);
                      let hits = 0;
                      for (const k of keywords) {
                        if (n.includes(k)) hits += 1;
                      }
                      const hasDigits = /\d/.test(n) ? 1 : 0;
                      const lengthBoost = Math.min(n.length / 40, 1);
                      return c * 2 + hits * 0.6 + hasDigits * 0.4 + lengthBoost * 0.4;
                    };
                    let best = candidates[0];
                    let bestScore = score(best.transcript, best.confidence);
                    for (let i = 1; i < candidates.length; i++) {
                      const cand = candidates[i];
                      const s = score(cand.transcript, cand.confidence);
                      if (s > bestScore) {
                        best = cand;
                        bestScore = s;
                      }
                    }
                    return best.transcript;
                  } catch {
                    return String(r?.[0]?.transcript || '').trim();
                  }
                };
                const text = pickBest(event.results[last]);
                onResultRef.current(text);
            };

            const scheduleRestart = (delayMs: number) => {
              try {
                if (!keepAliveRef.current) return;
                if (pausedRef.current) return;
                if (restartTimerRef.current) return;
                if (startingRef.current) return;
                const finalDelay = Math.max(delayMs, backoffMsRef.current, Date.now() - lastStopAtRef.current < 300 ? 300 : 0);
                restartTimerRef.current = setTimeout(() => {
                  restartTimerRef.current = null;
                  if (!keepAliveRef.current || pausedRef.current) return;
                  if (startingRef.current) return;
                  try {
                    safeStartRef.current?.();
                  } catch {
                    startingRef.current = false;
                  }
                }, finalDelay);
              } catch {}
            };

            safeStartRef.current = () => {
              if (!keepAliveRef.current) return;
              if (pausedRef.current) return;
              if (startingRef.current) return;
              if (listeningRef.current) return;
              if (restartTimerRef.current) return;
              if (Date.now() - lastStopAtRef.current < 300) {
                scheduleRestart(320);
                return;
              }

              try {
                startingRef.current = true;
                lastStartAtRef.current = Date.now();
                recognition.start();
              } catch {
                startingRef.current = false;
                scheduleRestart(650);
              }
            };

            recognition.onstart = () => {
              startingRef.current = false;
              listeningRef.current = true;
              setIsListening(true);
            };

            recognition.onend = () => {
                startingRef.current = false;
                listeningRef.current = false;
                setIsListening(false);
                const sinceStart = Date.now() - lastStartAtRef.current;
                if (keepAliveRef.current && !pausedRef.current) {
                  if (sinceStart > 0 && sinceStart < 900) {
                    backoffMsRef.current = Math.min(Math.max(backoffMsRef.current * 1.6, 400), 2200);
                  } else {
                    backoffMsRef.current = 220;
                  }
                }
                scheduleRestart(220);
            };

            recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                startingRef.current = false;
                listeningRef.current = false;
                setIsListening(false);
                const err = String(event?.error || '').toLowerCase();
                if (err === 'not-allowed' || err === 'service-not-allowed') return;
                if (err === 'aborted') return;
                if (err === 'no-speech' || err === 'audio-capture') {
                  backoffMsRef.current = Math.min(Math.max(backoffMsRef.current * 1.4, 800), 2600);
                  scheduleRestart(900);
                  return;
                }
                if (err === 'network') {
                  backoffMsRef.current = Math.min(Math.max(backoffMsRef.current * 1.4, 800), 2600);
                  scheduleRestart(1000);
                  return;
                }
                scheduleRestart(450);
            };

            recognitionRef.current = recognition;
        }
    }

    return () => {
      keepAliveRef.current = false;
      pausedRef.current = false;
      listeningRef.current = false;
      startingRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
      try {
        const r = recognitionRef.current;
        if (r) {
          r.onresult = null;
          r.onerror = null;
          r.onend = null;
          r.onstart = null;
          r.stop();
        }
      } catch {}
      recognitionRef.current = null;
      safeStartRef.current = null;
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    keepAliveRef.current = true;
    pausedRef.current = false;
    backoffMsRef.current = 220;
    safeStartRef.current?.();
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
        if (restartTimerRef.current) {
          clearTimeout(restartTimerRef.current);
          restartTimerRef.current = null;
        }
        keepAliveRef.current = false;
        pausedRef.current = false;
        startingRef.current = false;
        listeningRef.current = false;
        lastStopAtRef.current = Date.now();
        setIsListening(false);
        try {
          if (typeof recognitionRef.current.abort === 'function') recognitionRef.current.abort();
        } catch {}
        try {
          recognitionRef.current.stop();
        } catch {}
    }
  }, []);

  // Temporarily stop without clearing keepAlive, so auto-restart is allowed
  const pauseListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        if (restartTimerRef.current) {
          clearTimeout(restartTimerRef.current);
          restartTimerRef.current = null;
        }
        keepAliveRef.current = true;
        pausedRef.current = true;
        startingRef.current = false;
        listeningRef.current = false;
        lastStopAtRef.current = Date.now();
        setIsListening(false);
        try {
          if (typeof recognitionRef.current.abort === 'function') recognitionRef.current.abort();
        } catch {}
        try {
          recognitionRef.current.stop();
        } catch {}
      } catch (e) {
        console.error("Could not pause recognition", e);
      }
    }
  }, [isListening]);

  const resumeListening = useCallback(() => {
    if (!recognitionRef.current) return;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    keepAliveRef.current = true;
    pausedRef.current = false;
    safeStartRef.current?.();
  }, [isListening]);

  const toggleListening = useCallback(() => {
      // If we are effectively listening (state is true), stop.
      // But we check ref to be sure.
      if (isListening) {
          stopListening();
      } else {
          startListening();
      }
  }, [isListening, startListening, stopListening]);

  return { isListening, startListening, stopListening, pauseListening, resumeListening, toggleListening, isSupported };
}
