'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { signup } from '@/app/actions/auth';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Laster registreringsskjema...</div>}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const submitLockRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    address: '',
    postalCode: '',
    city: '',
    region: '',
    phoneNumber: '',
    referralCode: '',
  });

  const next = searchParams.get('next');
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : '/login';

  // Check for referral code and role in URL
  useEffect(() => {
    const ref = searchParams.get('ref');
    
    if (ref) {
      setFormData(prev => ({ ...prev, referralCode: ref }));
    }
  }, [searchParams]);

  // Check if already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const next = searchParams.get('next');
        router.push(next || '/dashboard');
      }
    };
    checkUser();
  }, []);

  // Auto-fetch City/Region based on Postal Code
  useEffect(() => {
    const fetchCityAndRegion = async () => {
      if (formData.postalCode.length === 4) {
        try {
          const geoRes = await fetch(`https://ws.geonorge.no/kommuneinfo/v1/postnummer/${formData.postalCode}`);
          if (geoRes.ok) {
            const data = await geoRes.json().catch(() => null);
            const city = String(data?.poststed || '').trim();
            const region = String(data?.fylkesnavn || '').trim();
            if (city || region) {
              setFormData((prev) => ({
                ...prev,
                city: city || prev.city,
                region: region || prev.region,
              }));
              return;
            }
          }
        } catch {}

        try {
          const response = await fetch(
            `https://api.bring.com/shippingguide/api/postalCode.json?clientUrl=lek-biensvokter&pnr=${formData.postalCode}`
          );
          if (response.ok) {
            const data = await response.json().catch(() => null);
            if (data?.valid) {
              const city = String(data?.result || '').trim();
              if (city) setFormData((prev) => ({ ...prev, city }));
            }
          }
        } catch {}
      } else {
        if (formData.region) setFormData((prev) => ({ ...prev, region: '' }));
      }
    };

    const timeoutId = setTimeout(fetchCityAndRegion, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.postalCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.fullName || !formData.address || !formData.postalCode || !formData.city || !formData.phoneNumber) {
        setError('Vennligst fyll ut alle obligatoriske felt (merket med *)');
        return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passordene er ikke like');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Passordet må være minst 6 tegn');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current) return;
    setError(null);
    setLoading(true);
    submitLockRef.current = true;

    if (!validateForm()) {
      setLoading(false);
      submitLockRef.current = false;
      return;
    }

    try {
      // Use Server Action for registration
      const result = await signup({
        ...formData,
        role: 'beekeeper'
      });

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.success) {
        const normalizedEmail = formData.email.trim().toLowerCase();
        const signInRes = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: formData.password,
        });

        if (signInRes.error) {
          window.location.href = loginHref;
          return;
        }

        // Use hard navigation to ensure clean state
        const next = searchParams.get('next');
        window.location.href = next || '/dashboard';
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'En ukjent feil oppstod');
    } finally {
      setLoading(false);
      submitLockRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-honey-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center text-honey-600 hover:text-honey-700 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Tilbake til forsiden
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Registrer deg</h1>
          <p className="mt-2 text-gray-600">Opprett din brukerprofil for å komme i gang</p>
        </div>

        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-honey-100">
          <form onSubmit={handleSubmit} className="p-8 space-y-8">

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {/* Section 1: Basic Info & Login */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">1. Personalia & Innlogging (Obligatorisk)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fullt Navn *</label>
                  <input
                    required
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    autoComplete="name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-transparent outline-none transition-all"
                    placeholder="Ola Nordmann"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-post *</label>
                  <input
                    required
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-transparent outline-none transition-all"
                    placeholder="ola@eksempel.no"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefonnummer *</label>
                  <input
                    required
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    autoComplete="tel"
                    inputMode="tel"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-transparent outline-none transition-all"
                    placeholder="900 00 000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Passord *</label>
                  <input
                    required
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-transparent outline-none transition-all"
                    placeholder="Minst 6 tegn"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bekreft Passord *</label>
                  <input
                    required
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-transparent outline-none transition-all"
                    placeholder="Gjenta passord"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse *</label>
                  <input
                    required
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    autoComplete="street-address"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-transparent outline-none transition-all"
                    placeholder="Gateveien 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postnummer *</label>
                  <input
                    required
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    autoComplete="postal-code"
                    inputMode="numeric"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-transparent outline-none transition-all"
                    placeholder="0001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Poststed *</label>
                  <input
                    required
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    autoComplete="address-level2"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-transparent outline-none transition-all"
                    placeholder="Oslo"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fylke</label>
                  <input
                    name="region"
                    value={formData.region}
                    readOnly
                    autoComplete="address-level1"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 outline-none"
                    placeholder="Fylles automatisk basert på postnummer"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-honey-500 hover:bg-honey-600 text-white font-bold py-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
              >
                {loading ? 'Registrerer...' : 'Fullfør Registrering'}
              </button>
            </div>
            
            <p className="text-center text-sm text-gray-500">
              Har du allerede bruker? <Link href={loginHref} className="text-honey-600 font-medium hover:underline">Logg inn her</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
