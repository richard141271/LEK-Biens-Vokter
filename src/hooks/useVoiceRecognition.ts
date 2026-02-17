import { useState, useRef, useEffect, useCallback } from 'react';

export function useVoiceRecognition(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);
  const keepAliveRef = useRef(false);
  const pausedRef = useRef(false);

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

            recognition.onend = () => {
                setIsListening(false);
                // Auto-restart if we intended to keep listening (prevents random stop on iOS)
                if (keepAliveRef.current) {
                  try {
                    recognition.start();
                    setIsListening(true);
                  } catch (e) {
                    // Swallow restart errors silently; will try again on next user action
                  }
                }
            };

            recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
                // Some errors are transient; attempt restart if keepAlive is requested
                if (keepAliveRef.current) {
                  setTimeout(() => {
                    try {
                      recognition.start();
                      setIsListening(true);
                    } catch (e) {}
                  }, 500);
                }
            };

            recognitionRef.current = recognition;
        }
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
        try {
            recognitionRef.current.start();
            setIsListening(true);
            keepAliveRef.current = true;
            pausedRef.current = false;
        } catch (e) {
            console.error("Could not start recognition", e);
        }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
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
        recognitionRef.current.stop();
        setIsListening(false);
        // keepAliveRef remains true; mark paused to allow resume explicitly
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
        // Ensure we intend to keep listening and not toggled off by user
        keepAliveRef.current = true;
        recognitionRef.current.start();
        setIsListening(true);
        pausedRef.current = false;
      } catch (e) {
        console.error("Could not resume recognition", e);
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
