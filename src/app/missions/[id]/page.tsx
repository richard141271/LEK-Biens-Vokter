'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Box, CheckCircle, MapPin, Truck, AlertCircle, User, Phone, Mail } from 'lucide-react';

export default function MissionDetailsPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const router = useRouter();
  const [mission, setMission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<any>({});
  const [signature, setSignature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMission();
  }, [params.id]);

  const fetchMission = async () => {
    const { data, error } = await supabase
      .from('rentals')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching mission:', error);
    } else {
      setMission(data);
      if (data.delivery_checklist) {
        setChecklist(data.delivery_checklist);
      }
    }
    setLoading(false);
  };

  const PACKING_LIST = [
    { id: 'hives', label: 'Bikuber (Bunnbrett, Yngelrom, Skattekasse, Tak)', count: (mission?.hive_count || 0) },
    { id: 'bees', label: 'Bifolk (Rammer med bier og dronning)', count: (mission?.hive_count || 0) },
    { id: 'food', label: 'Startfôr (2-3 kg)', count: (mission?.hive_count || 0) },
    { id: 'stand', label: 'Kubekrakker / Underlag', count: (mission?.hive_count || 0) },
    { id: 'suit', label: 'Birøkterdress (hvis bestilt)', count: 'Sjekk ordre' },
  ];

  const DELIVERY_CHECKLIST = [
    { id: 'location_check', label: 'Lokasjon sjekket (le, solforhold, trygg avstand)' },
    { id: 'setup', label: 'Kuber plassert i vater på stabilt underlag' },
    { id: 'flight_path', label: 'Flyåpning vender riktig vei (ikke mot gangvei/uteplass)' },
    { id: 'bees_active', label: 'Flyhull åpnet og bier i aktivitet' },
    { id: 'info_given', label: 'Sikkerhetsinstruks gitt til leietaker' },
    { id: 'contact_exchanged', label: 'Kontaktinfo utvekslet med leietaker' },
  ];

  const handleCheck = (id: string) => {
    setChecklist((prev: any) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const isAllChecked = DELIVERY_CHECKLIST.every(item => checklist[item.id]);

  const handleCompleteDelivery = async () => {
    if (!isAllChecked || !signature) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('rentals')
        .update({
          delivery_status: 'delivered',
          delivered_at: new Date().toISOString(),
          delivery_checklist: checklist,
          notes: mission.notes + `\n\nLevert av birøkter (Signert: ${signature})`
        })
        .eq('id', params.id);

      if (error) throw error;

      router.push('/missions');
    } catch (err) {
      console.error('Error completing delivery:', err);
      alert('Kunne ikke fullføre levering. Prøv igjen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Laster oppdrag...</div>;
  if (!mission) return <div className="p-8 text-center">Oppdrag ikke funnet</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-honey-500 text-white pt-8 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <button 
            onClick={() => router.push('/missions')}
            className="mb-6 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Tilbake til oversikt
          </button>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">Leveringsoppdrag</h1>
              <div className="flex items-center gap-2 text-honey-100">
                <MapPin className="w-4 h-4" />
                {mission.contact_address}
              </div>
            </div>
            <div className="bg-white/20 p-2 rounded-lg text-center min-w-[80px]">
              <div className="text-2xl font-bold">{mission.hive_count}</div>
              <div className="text-xs uppercase tracking-wider">Kuber</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-8 space-y-6">
        
        {/* Contact Info Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-honey-600" />
            Kontaktinfo Leietaker
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Navn</p>
              <p className="font-medium">{mission.contact_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Adresse</p>
              <p className="font-medium">{mission.contact_address}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Telefon</p>
              <a href={`tel:${mission.contact_phone}`} className="font-medium text-honey-600 flex items-center gap-2 hover:underline">
                <Phone className="w-4 h-4" />
                {mission.contact_phone}
              </a>
            </div>
            <div>
              <p className="text-sm text-gray-500">E-post</p>
              <a href={`mailto:${mission.contact_email}`} className="font-medium text-honey-600 flex items-center gap-2 hover:underline">
                <Mail className="w-4 h-4" />
                {mission.contact_email}
              </a>
            </div>
          </div>
        </div>

        {/* Packing List */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Box className="w-5 h-5 text-honey-600" />
            Pakkeliste (Skal med fra lager)
          </h2>
          <div className="space-y-3">
            {PACKING_LIST.map((item) => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="font-medium text-gray-700">{item.label}</span>
                <span className="bg-gray-900 text-white px-3 py-1 rounded-full text-sm font-bold">
                  {typeof item.count === 'number' ? `${item.count} stk` : item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Checklist */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5 text-honey-600" />
            Sjekkliste ved levering
          </h2>
          <div className="space-y-4">
            {DELIVERY_CHECKLIST.map((item) => (
              <label key={item.id} className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors
                  ${checklist[item.id] ? 'bg-green-500 border-green-500' : 'border-gray-300 bg-white'}
                `}>
                  {checklist[item.id] && <CheckCircle className="w-4 h-4 text-white" />}
                </div>
                <input 
                  type="checkbox" 
                  checked={checklist[item.id] || false}
                  onChange={() => handleCheck(item.id)}
                  className="hidden"
                />
                <span className={`text-sm ${checklist[item.id] ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                  {item.label}
                </span>
              </label>
            ))}
          </div>

          {/* Signature & Complete */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Signer for utført levering (Birøkter)</label>
              <input 
                type="text" 
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Skriv ditt navn"
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-honey-500 focus:ring-0 font-handwriting text-xl"
              />
            </div>

            <button 
              onClick={handleCompleteDelivery}
              disabled={!isAllChecked || !signature || isSubmitting}
              className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2
                ${(!isAllChecked || !signature || isSubmitting) 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-green-600 text-white hover:bg-green-700 hover:scale-[1.02]'}
              `}
            >
              {isSubmitting ? 'Lagrer...' : 'Fullfør Levering & Godkjenn'}
              {!isSubmitting && <CheckCircle className="w-5 h-5" />}
            </button>
            
            {!isAllChecked && (
              <p className="text-center text-xs text-red-500 mt-2 flex items-center justify-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Alle punkter må sjekkes ut før godkjenning
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
