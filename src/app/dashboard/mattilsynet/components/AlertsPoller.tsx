'use client';

import { useEffect, useState, useRef } from 'react';
import { getMattilsynetDashboardData } from '@/app/actions/mattilsynet';
import { AlertTriangle, X, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';

export default function AlertsPoller() {
  const [lastAlertId, setLastAlertId] = useState<string | null>(null);
  const [newAlert, setNewAlert] = useState<any | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Audio Context lazily
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        audioContextRef.current = new AudioContext();
      }
    }
    return audioContextRef.current;
  };

  const playSound = async () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      // Try to resume if suspended (browser policy)
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      // Urgent alarm sound
      const now = ctx.currentTime;
      
      // Three rapid beeps
      // Beep 1
      osc.frequency.setValueAtTime(880, now); // A5
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);

      // Beep 2
      osc.frequency.setValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0, now + 0.15);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.2);
      gain.gain.linearRampToValueAtTime(0, now + 0.25);

      // Beep 3 (Longer)
      osc.frequency.setValueAtTime(880, now + 0.3);
      gain.gain.setValueAtTime(0, now + 0.3);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      
      osc.start(now);
      osc.stop(now + 0.8);
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  };

  useEffect(() => {
    // Load last seen alert from localStorage to persist across reloads
    const savedId = localStorage.getItem('mattilsynet_last_alert_id');
    if (savedId) {
        setLastAlertId(savedId);
    }

    const checkAlerts = async () => {
      const data = await getMattilsynetDashboardData();
      if (data?.alerts && data.alerts.length > 0) {
        const latest = data.alerts[0];
        
        // Check against localStorage to be sure (state might be stale in closure if not careful, 
        // though we re-read in the loop implicitly via the stored check below if we used a ref, 
        // but here we rely on the closure. 
        // Actually, setInterval captures the closure. We need to be careful.)
        
        // Better: Read localStorage directly inside the check
        const currentStored = localStorage.getItem('mattilsynet_last_alert_id');
        
        if (latest.id !== currentStored) {
            // NEW ALERT!
            console.log("New alert detected:", latest.id);
            setNewAlert(latest);
            setLastAlertId(latest.id);
            localStorage.setItem('mattilsynet_last_alert_id', latest.id);
            
            // Trigger sound immediately
            playSound();
        }
      }
    };

    // Check immediately
    checkAlerts();

    // Poll every 10 seconds
    const pollTimer = setInterval(checkAlerts, 10000);
    
    // Cleanup
    return () => {
        clearInterval(pollTimer);
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
    };
  }, []);

  // Sound Loop Effect
  useEffect(() => {
    if (newAlert) {
        // Start sound loop (every 3 seconds for urgency)
        intervalRef.current = setInterval(playSound, 3000);
    } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [newAlert]);

  if (!newAlert) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border-4 border-red-600 ring-4 ring-red-600/30 animate-in zoom-in-95 duration-200">
        <div className="bg-red-600 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full animate-bounce">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold">ALARM: SMITTE OPPDAGET!</h2>
          </div>
          <button 
            onClick={() => setNewAlert(null)} 
            className="p-1 hover:bg-red-700 rounded transition-colors"
            aria-label="Lukk"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Ny hendelse krever handling</h3>
          <p className="text-gray-600 mb-4">
            En ny smittehendelse er nettopp registrert. Beredskapsrommet er aktivert.
          </p>
          
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-6 shadow-inner">
            <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-500">Sykdom/Mistanke:</span>
                <span className="font-bold text-red-700">{newAlert.details?.split('Sykdom: ')[1]?.split(',')[0] || 'Ukjent'}</span>
            </div>
            <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-500">Bigård:</span>
                <span className="font-bold text-gray-900">{newAlert.hives?.apiaries?.name || 'Ukjent'}</span>
            </div>
            <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-500">Lokasjon:</span>
                <span className="font-bold text-gray-900">{newAlert.hives?.apiaries?.location || 'Ukjent'}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-sm text-gray-500">Tidspunkt:</span>
                <span className="font-bold text-gray-900">{newAlert.created_at ? new Date(newAlert.created_at).toLocaleTimeString('no-NO') : 'Nå'}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
                onClick={() => setNewAlert(null)}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
            >
                Lukk Varsel
            </button>
            <Link 
                href={`/dashboard/mattilsynet/alert/${newAlert.id}`}
                onClick={() => setNewAlert(null)}
                className="flex-1 py-3 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors text-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
                Gå til Beredskapsrom
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
