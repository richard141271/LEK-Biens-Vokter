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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const termsText = `Vilkår for bruk – LEK-Biens Vokter™
Sist oppdatert: 10.05.2026

1. Generelt
LEK-Biens Vokter™ er en digital plattform og et verktøy utviklet for registrering, organisering, læring, analyse, samhandling og videreutvikling innen blant annet birøkt, naturforvaltning, pollinering, teknologi, kunstig intelligens og tilknyttede tjenester.
Ved å opprette konto, benytte plattformen eller bruke tilknyttede tjenester, samtykker brukeren til disse vilkårene.
Plattformen eies, forvaltes og videreutvikles av LEK-Biens Vokter™ og eventuelle tilknyttede selskaper, samarbeidspartnere eller autoriserte bidragsytere.

2. Aksept av vilkår
Ved bruk av plattformen bekrefter brukeren at:
oppgitte opplysninger er korrekte
bruk skjer på eget ansvar
brukeren har rett til å laste opp innhold som bilder, tekst og data
brukeren ikke vil misbruke tjenesten eller forsøke å skade systemet
Bruk som bryter med norsk lov, god skikk, sikkerhetshensyn eller plattformens formål kan føre til begrenset tilgang, suspensjon eller permanent utestengelse.

3. Personopplysninger og personvern
Plattformen behandler personopplysninger i samsvar med gjeldende norsk lovgivning og personvernregler, inkludert personopplysningsloven og GDPR.
Opplysninger som kan behandles inkluderer blant annet:
navn og kontaktinformasjon
brukerinnhold
bilder og media
posisjonsdata
aktivitetsdata
registreringer og analyser
teknisk informasjon om enheter og bruk
Opplysninger benyttes for:
drift av plattformen
forbedring av funksjoner og brukeropplevelse
sikkerhet og feilsøking
utvikling av nye tjenester
statistikk og analyse
forskning og videreutvikling av kunstig intelligens
Sensitive personopplysninger behandles ikke uten særskilt grunnlag eller samtykke.
Brukeren kan kontakte plattformens ansvarlige for innsyn, retting eller sletting av personopplysninger der lovverket gir rett til dette.
Plattformen er under kontinuerlig utvikling, og behandling, strukturering og forbedring av tjenester, funksjoner og dataflyt kan endres over tid.

4. Bruk av data, bilder og kunstig intelligens
Ved bruk av plattformen samtykker brukeren til at opplastet innhold, registreringer, bilder, metadata, aktivitetsdata og annen relevant informasjon kan benyttes til:
forbedring av plattformen
analyse og statistikk
videreutvikling av tjenester
opplæring, testing og forbedring av KI-systemer
automatisering og optimalisering av funksjoner
forskning og utvikling
Data vil så langt det er praktisk mulig anonymiseres eller pseudonymiseres før bruk til analyse og KI-relaterte formål.
Plattformen kan benytte aggregert og anonymisert data til:
innsikt
rapporter
forskning
analysearbeid
forbedring av brukeropplevelse
utvikling av fremtidige tjenester og verktøy
Brukeren beholder eierskap til eget innhold, men gir plattformen en ikke-eksklusiv, verdensomspennende, overførbar og vederlagsfri rett til å lagre, behandle, analysere, tilpasse, videreutvikle og benytte innholdet innenfor plattformens formål og videre utvikling av tjenester, funksjoner og KI-relaterte systemer.

5. Ansvarsbegrensning
Plattformen leveres \"som den er\" uten garanti for:
kontinuerlig tilgjengelighet
feilfri drift
fullstendig datanøyaktighet
kompatibilitet med alle enheter eller tjenester
LEK-Biens Vokter™ kan ikke holdes ansvarlig for:
tap av data
indirekte tap
driftsavbrudd
økonomisk tap
feilregistreringer
brukerfeil
beslutninger tatt basert på informasjon fra plattformen
Brukeren er selv ansvarlig for å kvalitetssikre egne registreringer og vurderinger.

6. Brukerinnhold
Brukeren er fullt ansvarlig for alt innhold som lastes opp, registreres, deles eller behandles via plattformen.
Det er ikke tillatt å laste opp eller dele:
ulovlig innhold
krenkende materiale
skadelig kode
materiale som bryter andres rettigheter
villedende eller falsk informasjon
Plattformen forbeholder seg retten til å fjerne innhold eller begrense tilgang uten varsel dersom dette anses nødvendig.

7. Immaterielle rettigheter
Navn, design, konsepter, systemer, logoer, funksjoner og innhold tilhørende LEK-Biens Vokter™ er beskyttet av gjeldende lover om opphavsrett, varemerker og immaterielle rettigheter.
Innhold, struktur, systemdesign, funksjoner og materiale fra plattformen kan ikke kopieres, videreselges, distribueres eller gjenbrukes uten skriftlig tillatelse.

8. Drift, endringer og tilgjengelighet
Plattformen kan når som helst:
oppdateres
endres
videreutvikles
pauses
begrenses
avsluttes
uten forhåndsvarsel dersom dette anses nødvendig av tekniske, juridiske eller driftsmessige årsaker.
Funksjoner, innhold og tjenester kan variere mellom ulike brukere, testmiljøer og utviklingsfaser.

9. Sikkerhet
Brukeren er ansvarlig for å:
beskytte egne innloggingsopplysninger
bruke sikre passord
varsle ved mistanke om misbruk
Forsøk på hacking, misbruk, automatisert angrep, scraping eller uautorisert tilgang kan politianmeldes.

10. Tredjepartstjenester
Plattformen kan integreres med tredjepartstjenester som:
kartløsninger
betalingstjenester
KI-tjenester
analyseverktøy
skylagring
sensorer og eksterne systemer
LEK-Biens Vokter™ er ikke ansvarlig for forhold, feil, datatap, sikkerhetsbrudd eller driftsproblemer knyttet til tredjepartsleverandører eller eksterne tjenester.

11. Endringer i vilkår
Vilkårene kan oppdateres ved behov.
Videre bruk av plattformen etter oppdateringer anses som aksept av gjeldende vilkår.

12. Lovvalg og jurisdiksjon
Vilkårene reguleres av norsk lov.
Eventuelle tvister søkes løst i minnelighet. Dersom dette ikke lykkes, behandles saken etter norsk jurisdiksjon.

13. Aldersgrense
Plattformen er i utgangspunktet beregnet for personer over 13 år.
Brukere under 13 år skal kun benytte plattformen med samtykke fra foresatte eller ansvarlig verge dersom dette kreves etter gjeldende lovverk.
Plattformen kan når som helst be om bekreftelse på alder eller samtykke.

14. Testmiljø, studentutvikling og eksperimentelle moduler
Plattformen kan inneholde:
testfunksjoner
eksperimentelle løsninger
beta-funksjoner
moduler under utvikling
studentprosjekter
tredjepartsintegrasjoner
Slike funksjoner kan:
inneholde feil
endres uten varsel
fjernes midlertidig eller permanent
gi uforutsigbare resultater
ha begrenset støtte eller tilgjengelighet
LEK-Biens Vokter™ forbeholder seg retten til å:
deaktivere moduler
slette testdata
begrense tilgang
endre funksjonalitet
fjerne eksperimentelle løsninger
uten forhåndsvarsel dersom dette anses nødvendig.

15. Utvikler-, modul- og bidragsvilkår
Kode, moduler, konsepter, integrasjoner, funksjoner, design, arbeidsflyt, dokumentasjon og annet materiale utviklet for eller tilknyttet plattformen kan helt eller delvis tilfalle LEK-Biens Vokter™ dersom ikke annet er uttrykkelig skriftlig avtalt.
Ved bidrag til plattformen samtykker utviklere, studenter og samarbeidspartnere til at:
løsninger kan videreutvikles
kode kan endres eller fjernes
funksjoner kan integreres i plattformen
bidrag kan benyttes videre av plattformen
moduler kan omstruktureres, flyttes eller slettes
LEK-Biens Vokter™ står fritt til å:
godkjenne eller avslå bidrag
endre arkitektur
reorganisere moduler
videreutvikle løsninger uavhengig av opprinnelig bidragsyter

16. Kunstig intelligens og automatiserte funksjoner
Plattformen kan benytte kunstig intelligens, automatiserte analyser og maskinlæring i forbindelse med:
registreringer
analyser
forslag
automatisering
beslutningsstøtte
bildeanalyse
læringssystemer
optimalisering
KI-generert informasjon kan inneholde feil, mangler eller unøyaktigheter og skal ikke regnes som profesjonell rådgivning, medisinsk vurdering, juridisk rådgivning eller annen faglig garanti.
Brukeren er selv ansvarlig for å kvalitetssikre informasjon og vurderinger.

17. Bilder, media og brukerinnhold
Ved opplasting eller deling av bilder, video, lyd, tekst eller annet innhold samtykker brukeren til at materialet kan benyttes av LEK-Biens Vokter™ i forbindelse med:
drift av plattformen
analyse
statistikk
forbedring av tjenester
opplæring og utvikling av KI-systemer
presentasjoner
dokumentasjon
forskning
markedsføring av plattformen
Der det er praktisk, teknisk og juridisk mulig vil data anonymiseres eller pseudonymiseres.
Brukeren bekrefter samtidig at vedkommende har nødvendige rettigheter til å laste opp innholdet.

18. Backup, lagring og datatap
Selv om plattformen arbeider for stabil drift og sikker lagring, gis ingen garanti mot:
datatap
korrupte filer
tap av registreringer
utilgjengelige tjenester
tekniske feil
Brukeren er selv ansvarlig for å:
ta egne sikkerhetskopier ved behov
eksportere viktige data
lagre kritisk informasjon eksternt
LEK-Biens Vokter™ kan ikke holdes ansvarlig for tap av data eller konsekvenser som følge av tekniske problemer, utviklingsarbeid eller feil hos tredjepartsleverandører.
Plattformen kan sende:
varsler
driftsmeldinger
sikkerhetsinformasjon
oppdateringer
systemmeldinger
relevant informasjon knyttet til tjenesten
via e-post, push-varsler, SMS eller andre kommunikasjonskanaler knyttet til brukerens konto eller registrerte kontaktinformasjon.

19. Feature testing og beta-funksjoner
Deler av plattformen kan til enhver tid være under:
testing
utvikling
optimalisering
eksperimentering
Funksjoner kan:
endres uten varsel
flyttes
deaktiveres
fjernes
erstattes
Bruk av beta- og testfunksjoner skjer på eget ansvar.
LEK-Biens Vokter™ forbeholder seg retten til å suspendere, begrense eller avslutte brukerkontoer ved:
misbruk av plattformen
sikkerhetsrisiko
forsøk på uautorisert tilgang
brudd på vilkårene
ulovlig aktivitet
aktivitet som anses skadelig for plattformen, brukerne eller tilknyttede tjenester
Slike tiltak kan gjennomføres midlertidig eller permanent uten forhåndsvarsel dersom dette anses nødvendig.

20. Kontakt
Spørsmål knyttet til vilkår, personvern eller bruk av plattformen kan rettes til plattformens ansvarlige kontaktperson eller virksomhet.`;

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
    if (!acceptedTerms) {
      setError('Du må godta vilkår for å registrere deg');
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

            {termsOpen && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[70]">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-200">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                    <div className="font-semibold text-gray-900">Vilkår for bruk</div>
                    <button
                      type="button"
                      onClick={() => setTermsOpen(false)}
                      className="p-2 rounded-lg hover:bg-gray-100"
                      aria-label="Lukk"
                    >
                      <ArrowLeft className="w-5 h-5 rotate-180 text-gray-600" />
                    </button>
                  </div>
                  <div className="p-5 max-h-[70vh] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-sans">
                      {termsText}
                    </pre>
                  </div>
                  <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setTermsOpen(false)}
                      className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold"
                    >
                      Lukk
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAcceptedTerms(true);
                        setTermsOpen(false);
                      }}
                      className="px-4 py-2 rounded-lg bg-honey-500 hover:bg-honey-600 text-white font-semibold"
                    >
                      Godta vilkår
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 w-5 h-5 text-honey-600 rounded focus:ring-honey-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">
                  Jeg godtar{' '}
                  <button
                    type="button"
                    onClick={() => setTermsOpen(true)}
                    className="text-honey-700 font-semibold hover:underline"
                  >
                    vilkår for bruk
                  </button>
                  .
                </span>
              </label>
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
