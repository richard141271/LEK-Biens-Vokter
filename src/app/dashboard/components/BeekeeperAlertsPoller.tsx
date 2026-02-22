'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { AlertTriangle, X } from 'lucide-react';
import Link from 'next/link';

export default function BeekeeperAlertsPoller() {
  const [newAlert, setNewAlert] = useState<any | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const supabase = createClient();

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
      
      // Urgent alarm sound (Loud 0.7 volume)
      const now = ctx.currentTime;
      
      // Three rapid beeps
      // Beep 1
      osc.frequency.setValueAtTime(880, now); // A5
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.7, now + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);

      // Beep 2
      osc.frequency.setValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0, now + 0.15);
      gain.gain.linearRampToValueAtTime(0.7, now + 0.2);
      gain.gain.linearRampToValueAtTime(0, now + 0.25);

      // Beep 3 (Longer)
      osc.frequency.setValueAtTime(880, now + 0.3);
      gain.gain.setValueAtTime(0, now + 0.3);
      gain.gain.linearRampToValueAtTime(0.7, now + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      
      osc.start(now);
      osc.stop(now + 0.8);
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  };

  const cleanAlertText = (text: string) => {
    if (!text) return '';
    // Remove image URLs
    let cleaned = text.replace(/Bilder: https?:\/\/\S+/g, '');
    cleaned = cleaned.replace(/https?:\/\/\S+/g, '');
    // Remove AI analysis part
    cleaned = cleaned.replace(/\[AI Analyse][\s\S]*$/, ''); // Remove from [AI Analyse] to end
    return cleaned.trim();
  };

  useEffect(() => {
    // Load last seen alert from localStorage
    const savedId = localStorage.getItem('beekeeper_last_alert_id');
    
    const checkAlerts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch recent UNRESOLVED neighbor alerts (SYKDOM)
        const { data: alerts } = await supabase
          .from('hive_logs')
          .select('*')
          .eq('action', 'SYKDOM')
          .eq('user_id', user.id) // Only alerts for me (created as neighbor alerts)
          .order('created_at', { ascending: false })
          .limit(1);

        if (alerts && alerts.length > 0) {
          const latest = alerts[0];
          
          // Skip if resolved (handled in memory since we might have nulls in DB)
          if (latest.admin_status === 'resolved') return;

          const currentStored = localStorage.getItem('beekeeper_last_alert_id');
          
          if (latest.id !== currentStored) {
              // NEW ALERT!
              console.log("New beekeeper alert detected:", latest.id);
              setNewAlert(latest);
              localStorage.setItem('beekeeper_last_alert_id', latest.id);
              
              // Trigger sound immediately
              playSound();
          }
        }
      } catch (e) {
        console.error("Error polling alerts:", e);
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

  if (!newAlert) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border-4 border-red-600 ring-4 ring-red-600/30 animate-in zoom-in-95 duration-200">
        <div className="bg-red-600 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full animate-bounce">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold">SMITTEVARSEL!</h2>
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
          <h3 className="text-lg font-bold text-gray-900 mb-2">Varsel om smitte i ditt område</h3>
          <p className="text-gray-600 mb-4">
            Det er oppdaget smitte i nærheten av dine bigårder. Sjekk kubene dine snarest!
          </p>
          
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-6 shadow-inner">
            <p className="text-red-800 text-sm font-medium break-words">
                {cleanAlertText(newAlert.details)}
            </p>
            <p className="text-xs text-red-500 mt-2 font-medium">
                Mottatt: {new Date(newAlert.created_at).toLocaleString('nb-NO')}
            </p>
          </div>

          <button 
            onClick={() => setNewAlert(null)}
            className="w-full py-3 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg"
          >
            Jeg forstår - Lukk varsel
          </button>
        </div>
      </div>
    </div>
  );
}
