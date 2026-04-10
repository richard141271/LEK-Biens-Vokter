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
            recognition.lang = 'no-NO';
            recognition.interimResults = false;
            
            recognition.onresult = (event: any) => {
                const last = event.results.length - 1;
                const text = event.results[last][0].transcript;
                onResultRef.current(text);
            };

            const scheduleRestart = (delayMs: number) => {
              try {
                if (!keepAliveRef.current) return;
                if (pausedRef.current) return;
                if (restartTimerRef.current) return;
                restartTimerRef.current = setTimeout(() => {
                  restartTimerRef.current = null;
                  if (!keepAliveRef.current || pausedRef.current) return;
                  const now = Date.now();
                  if (now - lastStartAtRef.current < 250) return;
                  lastStartAtRef.current = now;
                  try {
                    recognition.start();
                    setIsListening(true);
                  } catch {}
                }, delayMs);
              } catch {}
            };

            recognition.onend = () => {
                setIsListening(false);
                scheduleRestart(220);
            };

            recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
                const err = String(event?.error || '').toLowerCase();
                if (err === 'not-allowed' || err === 'service-not-allowed') return;
                scheduleRestart(err === 'no-speech' || err === 'audio-capture' ? 700 : 400);
            };

            recognitionRef.current = recognition;
        }
    }

    return () => {
      keepAliveRef.current = false;
      pausedRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
      try {
        const r = recognitionRef.current;
        if (r) {
          r.onresult = null;
          r.onerror = null;
          r.onend = null;
          r.stop();
        }
      } catch {}
      recognitionRef.current = null;
    };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
        try {
            if (restartTimerRef.current) {
              clearTimeout(restartTimerRef.current);
              restartTimerRef.current = null;
            }
            keepAliveRef.current = true;
            pausedRef.current = false;
            recognitionRef.current.start();
            setIsListening(true);
            lastStartAtRef.current = Date.now();
        } catch (e) {
            keepAliveRef.current = true;
            pausedRef.current = false;
        }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
        if (restartTimerRef.current) {
          clearTimeout(restartTimerRef.current);
          restartTimerRef.current = null;
        }
        recognitionRef.current.stop();
        setIsListening(false);
        keepAliveRef.current = false;
        pausedRef.current = false;
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
        recognitionRef.current.stop();
        setIsListening(false);
        keepAliveRef.current = true;
        pausedRef.current = true;
      } catch (e) {
        console.error("Could not pause recognition", e);
      }
    }
  }, [isListening]);

  const resumeListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        if (restartTimerRef.current) {
          clearTimeout(restartTimerRef.current);
          restartTimerRef.current = null;
        }
        keepAliveRef.current = true;
        recognitionRef.current.start();
        setIsListening(true);
        pausedRef.current = false;
        lastStartAtRef.current = Date.now();
      } catch (e) {
        keepAliveRef.current = true;
        pausedRef.current = false;
      }
    }
  }, []);

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
