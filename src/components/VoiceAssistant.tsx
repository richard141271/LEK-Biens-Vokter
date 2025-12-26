'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

// Types for Web Speech API
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

interface VoiceAssistantProps {
  onCommand: (command: string, args?: any) => void;
  apiaries: { id: string; name: string }[];
}

export default function VoiceAssistant({ onCommand, apiaries }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [step, setStep] = useState<'idle' | 'awaiting_location'>('idle');
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
      const SpeechRecognitionConstructor = SpeechRecognition || webkitSpeechRecognition;

      if (SpeechRecognitionConstructor) {
        const recognition = new SpeechRecognitionConstructor();
        recognition.continuous = false;
        recognition.lang = 'no-NO';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript.toLowerCase();
          handleVoiceInput(text);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
          setFeedback('Kunne ikke oppfatte hva du sa.');
        };

        recognitionRef.current = recognition;
      }

      synthRef.current = window.speechSynthesis;
    }
  }, [step, apiaries]); // Re-bind if dependencies change significantly, though mostly stable

  const speak = (text: string) => {
    if (synthRef.current) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'no-NO';
      synthRef.current.speak(utterance);
    }
    setFeedback(text);
  };

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setFeedback('Lytter...');
      } catch (e) {
        console.error('Already started', e);
      }
    } else {
        alert('Nettleseren din støtter ikke stemmestyring.');
    }
  };

  const handleVoiceInput = (text: string) => {
    console.log('Heard:', text);

    if (step === 'idle') {
      if (text.includes('ny kube') || text.includes('registrer kube')) {
        setStep('awaiting_location');
        speak('Hvor vil du ha kuben?');
        // Automatically restart listening after speaking (needs a small delay usually)
        setTimeout(startListening, 2000); 
      } else {
        speak('Jeg forstod ikke. Prøv "Ny kube".');
      }
    } else if (step === 'awaiting_location') {
      // Fuzzy match apiary name
      const foundApiary = apiaries.find(a => text.includes(a.name.toLowerCase()));
      
      if (foundApiary) {
        speak(`Oppretter kube på ${foundApiary.name}.`);
        onCommand('create_hive', { apiaryId: foundApiary.id });
        setStep('idle');
      } else {
        speak('Fant ikke den lokasjonen. Prøv igjen, eller si avbryt.');
        if (text.includes('avbryt')) {
            setStep('idle');
            speak('Avbrutt.');
        } else {
            setTimeout(startListening, 2000);
        }
      }
    }
  };

  if (!recognitionRef.current) return null;

  return (
    <div className="fixed bottom-24 left-6 z-50">
      <button
        onClick={startListening}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 ${
          isListening 
            ? 'bg-red-500 text-white animate-pulse' 
            : 'bg-honey-500 text-white'
        }`}
      >
        {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
      </button>
      
      {feedback && (
        <div className="absolute left-16 bottom-2 bg-white px-4 py-2 rounded-lg shadow-md whitespace-nowrap text-sm font-medium text-gray-700 animate-fade-in-up">
          {feedback}
        </div>
      )}
    </div>
  );
}
