'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function TermsConsentModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const checkConsent = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check user_metadata instead of profiles table to avoid schema migration
        if (!user.user_metadata?.has_accepted_terms) {
          setIsOpen(true);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    checkConsent();
  }, [supabase.auth]);

  const handleAccept = async () => {
    if (!checked) return;
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      data: {
        has_accepted_terms: true,
        terms_accepted_at: new Date().toISOString()
      }
    });

    if (!error) {
      setIsOpen(false);
      router.refresh();
    } else {
      console.error('Failed to accept terms:', error);
      alert('Noe gikk galt. Prøv igjen.');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 md:p-8 animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">🐝</div>
          <h2 className="text-2xl font-bold text-gray-900">LEK er et forskningsverktøy for birøktere</h2>
        </div>

        <div className="space-y-4 text-gray-600 mb-8 leading-relaxed text-sm md:text-base">
          <p>
            For å kunne utvikle løsninger som oppdager biesykdom tidlig og gir bedre støtte i bigården, bruker LEK bilder og inspeksjonsdata som du selv legger inn i appen.
          </p>
          <p>
            Bildene lagres i dine inspeksjoner, og kan i tillegg brukes anonymt til å lære opp kunstig intelligens som skal hjelpe alle birøktere.
          </p>
          <p>
            Dette betyr at bildene ikke knyttes til navn eller adresse, men brukes kun i faglig sammenheng for å forbedre appen og sykdomsforståelse.
          </p>
          <p className="font-medium text-gray-900">
            For å bruke LEK må du samtykke til dette.
          </p>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              className="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <span className="text-sm text-blue-900 leading-tight">
              Jeg forstår og samtykker til at bilder og inspeksjonsdata jeg legger inn kan brukes anonymt til forskning og opplæring av KI i LEK.
            </span>
          </label>
        </div>

        <button
          onClick={handleAccept}
          disabled={!checked || loading}
          className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
            checked && !loading
              ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {loading ? 'Lagrer...' : 'Fortsett til appen'}
        </button>
      </div>
    </div>
  );
}
