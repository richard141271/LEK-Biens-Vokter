'use client';

import { useEffect, useState, useRef } from 'react';
import { getMattilsynetDashboardData } from '@/app/actions/mattilsynet';
import { AlertTriangle, X } from 'lucide-react';
import Link from 'next/link';

export default function AlertsPoller() {
  const [lastAlertId, setLastAlertId] = useState<string | null>(null);
  const [newAlert, setNewAlert] = useState<any | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const playSound = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        // Gentle two-tone "ding-dong" effect
        const now = ctx.currentTime;
        
        // First tone
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.2);
        
        // Second tone
        osc.frequency.setValueAtTime(600, now + 0.3);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.6);
        
        // Volume envelope
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        
        osc.start(now);
        osc.stop(now + 0.8);
    } catch (e) {
        console.error("Audio playback failed", e);
    }
  };

  useEffect(() => {
    const checkAlerts = async () => {
      const data = await getMattilsynetDashboardData();
      if (data?.alerts && data.alerts.length > 0) {
        const latest = data.alerts[0];
        
        // Initialize lastAlertId on first run without triggering
        setLastAlertId(prev => {
            if (prev === null) return latest.id;
            if (prev !== latest.id) {
                // New alert!
                setNewAlert(latest);
                return latest.id;
            }
            return prev;
        });
      }
    };

    // Check immediately
    checkAlerts();

    // Poll every 10 seconds
    const pollTimer = setInterval(checkAlerts, 10000);
    return () => clearInterval(pollTimer);
  }, []);

  useEffect(() => {
    if (newAlert) {
        // Start sound loop
        playSound(); // Play immediately
        intervalRef.current = setInterval(playSound, 5000);
    } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [newAlert]);

  if (!newAlert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border-4 border-red-500 ring-4 ring-red-500/30">
        <div className="bg-red-600 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full animate-bounce">
                <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold">NYTT VARSEL MOTTATT!</h2>
          </div>
          <button onClick={() => setNewAlert(null)} className="p-1 hover:bg-red-700 rounded transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Smittehendelse oppdaget</h3>
          <p className="text-gray-600 mb-4">
            En ny smittehendelse er registrert og krever din oppmerksomhet.
          </p>
          
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-6">
            <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-500">Bigård:</span>
                <span className="font-bold text-gray-900">{newAlert.hives?.apiaries?.name || 'Ukjent'}</span>
            </div>
            <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-500">Rapportert av:</span>
                <span className="font-bold text-gray-900">{newAlert.reporter?.full_name || 'Ukjent'}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-sm text-gray-500">Tidspunkt:</span>
                <span className="font-bold text-gray-900">{newAlert.created_at ? new Date(newAlert.created_at).toLocaleString('no-NO') : 'Nå'}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
                onClick={() => setNewAlert(null)}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
            >
                Lukk
            </button>
            <Link 
                href={`/dashboard/mattilsynet/alert/${newAlert.id}`}
                onClick={() => setNewAlert(null)}
                className="flex-1 py-3 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors text-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
                Åpne Hendelse
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
