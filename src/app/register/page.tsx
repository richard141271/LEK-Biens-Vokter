'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<'beekeeper' | 'tenant'>('beekeeper');

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    address: '',
    postalCode: '',
    city: '',
    phoneNumber: '',
    referralCode: '',
    isNorgesBirokterlagMember: false,
    memberNumber: '',
    localAssociation: '',
    isLekHonningMember: false,
    interests: [] as string[],
    beekeepingType: 'hobby', // 'hobby' or 'business'
    companyName: '',
    orgNumber: '',
    companyBankAccount: '',
    companyAddress: '',
    privateBankAccount: ''
  });

  const next = searchParams.get('next');
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : '/login';

  // Check for referral code and role in URL
  useEffect(() => {
    const ref = searchParams.get('ref');
    const roleParam = searchParams.get('role');
    
    if (ref) {
      setFormData(prev => ({ ...prev, referralCode: ref }));
    }
    
    if (roleParam === 'beekeeper' || roleParam === 'tenant') {
      setRole(roleParam);
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

  // Auto-fetch City based on Postal Code
  useEffect(() => {
    const fetchCity = async () => {
      if (formData.postalCode.length === 4) {
        try {
          const response = await fetch(`https://api.bring.com/shippingguide/api/postalCode.json?clientUrl=lek-biensvokter&pnr=${formData.postalCode}`);
          if (response.ok) {
            const data = await response.json();
            if (data.valid) {
              setFormData(prev => ({ ...prev, city: data.result }));
            }
          }
        } catch (err) {
          console.error('Failed to fetch city', err);
        }
      }
    };

    const timeoutId = setTimeout(fetchCity, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [formData.postalCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleInterestChange = (interest: string) => {
    setFormData(prev => {
      const interests = prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest];
      return { ...prev, interests };
    });
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
    setError(null);
    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      // Use Server Action for registration
      const result = await signup({
        ...formData,
        role // Add role to the data
      });

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.success) {
        // Use hard navigation to ensure clean state
        const next = searchParams.get('next');
        window.location.href = next || '/dashboard';
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'En ukjent feil oppstod');
    } finally {
      setLoading(false);
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
            
            {/* Account Type Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-8">
              <button
                type="button"
                onClick={() => setRole('beekeeper')}
                className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                  role === 'beekeeper' 
                    ? 'bg-white text-orange-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Jeg er Birøkter
              </button>
              <button
                type="button"
                onClick={() => setRole('tenant')}
                className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                  role === 'tenant' 
                    ? 'bg-white text-green-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Jeg vil Leie Kube
              </button>
            </div>

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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-transparent outline-none transition-all"
                    placeholder="Ola Nordmann"
                  />
                </div>

                {/* Referral Code */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-honey-700 mb-1 flex items-center gap-2">
                    Har du en vervekode?
                    <span className="text-xs font-normal text-gray-500">(Valgfritt)</span>
                  </label>
                  <input
                    type="text"
                    name="referralCode"
                    value={(formData as any).referralCode || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, referralCode: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-2 border border-honey-200 bg-honey-50/50 rounded-lg focus:ring-honey-500 focus:border-honey-500 placeholder-gray-400 font-mono tracking-wider"
                    placeholder="ABC12345"
                    maxLength={8}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Bruk koden fra den som inviterte deg for å koble deg til nettverket.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-post *</label>
                  <input
                    required
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-transparent outline-none transition-all"
                    placeholder="Oslo"
                  />
                </div>
              </div>
            </div>

            {role === 'beekeeper' && (
              <>
                {/* Section 2: Membership & Interests (Optional) */}
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">2. Medlemskap & Interesser (Frivillig)</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <input
                        type="checkbox"
                        id="nbk"
                        name="isNorgesBirokterlagMember"
                        checked={formData.isNorgesBirokterlagMember}
                        onChange={handleCheckboxChange}
                        className="mt-1 w-5 h-5 text-honey-600 rounded focus:ring-honey-500 border-gray-300"
                      />
                      <div className="flex-1">
                        <label htmlFor="nbk" className="font-medium text-gray-900 block">Medlem i Norges Birøkterlag</label>
                        {formData.isNorgesBirokterlagMember && (
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                            <input
                              name="memberNumber"
                              value={formData.memberNumber}
                              onChange={handleChange}
                              placeholder="Medlemsnummer"
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-honey-500 outline-none"
                            />
                            <input
                              name="localAssociation"
                              value={formData.localAssociation}
                              onChange={handleChange}
                              placeholder="Lokallag"
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-honey-500 outline-none"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      <input
                        type="checkbox"
                        id="lek"
                        name="isLekHonningMember"
                        checked={formData.isLekHonningMember}
                        onChange={handleCheckboxChange}
                        className="w-5 h-5 text-honey-600 rounded focus:ring-honey-500 border-gray-300"
                      />
                      <label htmlFor="lek" className="font-medium text-gray-900">Medlem i LEK Honning</label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hva er du interessert i?</label>
                    <div className="flex flex-wrap gap-3">
                      {['Salg', 'Rekruttering', 'Kurs', 'Samarbeid'].map((interest) => (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => handleInterestChange(interest)}
                          className={`px-4 py-2 rounded-full border transition-all ${
                            formData.interests.includes(interest)
                              ? 'bg-honey-100 border-honey-500 text-honey-700 font-medium'
                              : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {interest} {formData.interests.includes(interest) && '✓'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Section 3: Economy & Business (Optional) */}
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">3. Økonomi & Driftstype (Frivillig)</h2>
                  
                  <div className="flex gap-6 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="beekeepingType"
                        value="hobby"
                        checked={formData.beekeepingType === 'hobby'}
                        onChange={handleChange}
                        className="w-5 h-5 text-honey-600 focus:ring-honey-500 border-gray-300"
                      />
                      <span className="font-medium text-gray-900">Hobbybirøkt</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="beekeepingType"
                        value="business"
                        checked={formData.beekeepingType === 'business'}
                        onChange={handleChange}
                        className="w-5 h-5 text-honey-600 focus:ring-honey-500 border-gray-300"
                      />
                      <span className="font-medium text-gray-900">Næringsbirøkt</span>
                    </label>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Privat Kontonummer (For utbetalinger)</label>
                      <input
                        name="privateBankAccount"
                        value={formData.privateBankAccount}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-transparent outline-none"
                        placeholder="1234.56.78903"
                      />
                    </div>

                    {formData.beekeepingType === 'business' && (
                      <div className="bg-honey-50 p-6 rounded-xl border border-honey-100 space-y-4 animate-in fade-in">
                        <h3 className="font-medium text-honey-900">Firmaopplysninger</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Firmanavn</label>
                            <input
                              name="companyName"
                              value={formData.companyName}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-honey-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Organisasjonsnummer</label>
                            <input
                              name="orgNumber"
                              value={formData.orgNumber}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-honey-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Firma Kontonummer</label>
                            <input
                              name="companyBankAccount"
                              value={formData.companyBankAccount}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-honey-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Firmaadresse</label>
                            <input
                              name="companyAddress"
                              value={formData.companyAddress}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-honey-500 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

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
