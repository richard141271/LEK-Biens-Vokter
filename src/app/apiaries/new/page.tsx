'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MapPin, Warehouse, Store, Truck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewApiaryPage() {
  const [name, setName] = useState('');
  const [type, setType] = useState('bigård');
  const [locationStr, setLocationStr] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState(''); // New: Car Reg Number
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const types = [
    { id: 'bigård', label: 'Bigård', icon: MapPin },
    { id: 'lager', label: 'Lager', icon: Warehouse },
    { id: 'butikk', label: 'Butikk', icon: Store },
    { id: 'bil', label: 'Bil', icon: Truck },
    { id: 'oppstart', label: 'Oppstart', icon: Store }, // Added 'Oppstart'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Hent brukeren
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Du må være logget inn');

      // 2. Generer ID basert på type (Hver type har sin egen nummerserie)
      const { count } = await supabase
        .from('apiaries')
        .select('*', { count: 'exact', head: true })
        .eq('type', type); // Filter by type to get independent counts
      
      const nextNum = (count || 0) + 1;
      let prefix = 'BG'; // Default Bigård
      
      if (type === 'bil') prefix = 'BIL';
      if (type === 'lager') prefix = 'LG';
      if (type === 'butikk') prefix = 'BUT';
      if (type === 'oppstart') prefix = 'START';

      const apiaryNumber = `${prefix}-${nextNum.toString().padStart(3, '0')}`;

      // 3. Lagre i databasen
      const { error } = await supabase.from('apiaries').insert({
        user_id: user.id,
        name,
        type,
        location: locationStr,
        apiary_number: apiaryNumber,
        registration_number: type === 'bil' ? registrationNumber : null, // Only for cars
      });

      if (error) throw error;

      router.push('/dashboard');
    } catch (error: any) {
      alert('Feil ved lagring: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <Link href="/dashboard" className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Registrer ny lokasjon</h1>
      </header>

      <main className="max-w-md mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Navn */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">Navn på lokasjon</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="F.eks. Hjemmebigården"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none"
              required
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 px-1">Type lokasjon</label>
            <div className="grid grid-cols-2 gap-3">
              {types.map((t) => {
                const Icon = t.icon;
                const isSelected = type === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                      isSelected 
                        ? 'border-honey-500 bg-honey-50 text-honey-700' 
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-8 h-8 mb-2 ${isSelected ? 'text-honey-600' : 'text-gray-400'}`} />
                    <span className="font-medium">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bilnummer (Conditional) */}
          {type === 'bil' && (
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Registreringsnummer (Bilskilt)</label>
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                placeholder="AB 12345"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none font-mono uppercase"
                required={type === 'bil'}
              />
            </div>
          )}

          {/* Lokasjon */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">Adresse / Beskrivelse</label>
            <textarea
              value={locationStr}
              onChange={(e) => setLocationStr(e.target.value)}
              placeholder="Hvor er dette?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none h-24 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-honey-500 hover:bg-honey-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-honey-500/30 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Lagrer...' : 'Opprett lokasjon'}
          </button>
        </form>
      </main>
    </div>
  );
}
