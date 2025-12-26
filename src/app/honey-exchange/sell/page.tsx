'use client';

import { createClient } from '@/utils/supabase/client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, AlertCircle, MapPin } from 'lucide-react';
import { HoneyType } from '@/types/honey-exchange';

const HONEY_TYPES: HoneyType[] = ['Lynghonning', 'Sommerhonning', 'Raps', 'Bringebær', 'Skogshonning', 'Annet'];

export default function SellHoneyPage() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    honey_type: 'Sommerhonning',
    amount_kg: '',
    price_per_kg: '',
    moisture_percentage: '',
    production_year: new Date().getFullYear().toString(),
    location: '',
    description: ''
  });

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      
      // Fetch profile for location
      const { data: profile } = await supabase
        .from('profiles')
        .select('city')
        .eq('id', user.id)
        .single();
        
      if (profile?.city) {
        setFormData(prev => ({ ...prev, location: profile.city }));
      }
    };
    getUser();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (Number(formData.amount_kg) < 20) {
        throw new Error('Minimum salgsvolum er 20 kg');
      }
      if (Number(formData.price_per_kg) < 70) {
        throw new Error('Minstepris er satt til 70 kr/kg');
      }

      const { error } = await supabase
        .from('honey_listings')
        .insert({
          seller_id: user.id,
          honey_type: formData.honey_type,
          amount_kg: Number(formData.amount_kg),
          price_per_kg: Number(formData.price_per_kg),
          moisture_percentage: Number(formData.moisture_percentage),
          production_year: Number(formData.production_year),
          location: formData.location,
          description: formData.description,
          status: 'active'
        });

      if (error) throw error;

      alert('Honning lagt ut for salg!');
      router.push('/honey-exchange');
    } catch (error: any) {
      console.error('Error listing honey:', error);
      // Fallback for demo if table doesn't exist
      if (error.message?.includes('relation "honey_listings" does not exist')) {
        alert('DEMO MODUS: Listing registrert (men ikke lagret i DB fordi tabell mangler).');
        router.push('/honey-exchange');
      } else {
        alert('Feil: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Avbryt
          </button>
          <h1 className="font-bold text-lg">Selg Honning</h1>
          <div className="w-20" /> {/* Spacer */}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Main Info */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
            <h2 className="font-bold text-gray-900 text-lg border-b pb-2">Om Honningen</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Honningtype</label>
                <select
                  name="honey_type"
                  value={formData.honey_type}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none bg-white"
                >
                  {HONEY_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Årstall</label>
                <input
                  type="number"
                  name="production_year"
                  value={formData.production_year}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fuktprosent (%)</label>
                <input
                  type="number"
                  step="0.1"
                  name="moisture_percentage"
                  value={formData.moisture_percentage}
                  onChange={handleChange}
                  placeholder="F.eks 17.5"
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Beskrivelse</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Beskriv smak, konsistens, emballasje..."
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none"
              />
            </div>
          </div>

          {/* Pricing & Logistics */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
            <h2 className="font-bold text-gray-900 text-lg border-b pb-2">Pris & Logistikk</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mengde (kg)</label>
                <input
                  type="number"
                  name="amount_kg"
                  value={formData.amount_kg}
                  onChange={handleChange}
                  placeholder="Min 20 kg"
                  required
                  min="20"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">Minimum 20 kg</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pris pr kg (kr)</label>
                <input
                  type="number"
                  name="price_per_kg"
                  value={formData.price_per_kg}
                  onChange={handleChange}
                  placeholder="Min 70 kr"
                  required
                  min="70"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">Minstepris 70 kr</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Henteadresse / Lagersted</label>
              <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-3 focus-within:ring-2 focus-within:ring-honey-500 bg-gray-50">
                <MapPin className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Hvor befinner honningen seg?"
                  required
                  className="flex-1 bg-transparent outline-none"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          {formData.amount_kg && formData.price_per_kg && (
            <div className="bg-honey-50 p-4 rounded-xl flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-honey-700 uppercase">Estimert salgssum</p>
                    <p className="text-2xl font-bold text-honey-900">
                        {(Number(formData.amount_kg) * Number(formData.price_per_kg)).toLocaleString()},-
                    </p>
                </div>
                <div className="text-right text-xs text-honey-600">
                    <p>+ Plattformavgift kommer i tillegg for kjøper</p>
                </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            {loading ? 'Publiserer...' : 'Publiser på Børsen'}
            {!loading && <Check className="w-5 h-5" />}
          </button>

        </form>
      </main>
    </div>
  );
}
