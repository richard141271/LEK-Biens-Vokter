'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { 
  ArrowLeft, 
  Box, 
  CheckCircle, 
  Heart, 
  Shield, 
  Leaf, 
  AlertCircle,
  ChevronRight,
  FileText,
  PenTool,
  Coins
} from 'lucide-react';

// --- CONTRACT TEXT CONSTANT ---
const CONTRACT_TEXT = `
LEIEAVTALE – LEK-HONNING™️ / LEIE AV BIKUBE

Denne avtalen inngås mellom:

Utleier:
AI Innovate AS® / LEK-Honning™️
Org.nr: 935 460 387
Adresse: Rascheprangen 1, 1767 Halden
Daglig leder AI-identitet: Aurora
Representert av: Jørn Thoresen

Leietaker (bruker/gruppe):
Navn: [LEIETAKER_NAVN]
Representerer (klasse/lag/familie osv.): [LEIETAKER_NAVN] (Privat)
Adresse: [LEIETAKER_ADRESSE]
Telefon: [LEIETAKER_TLF]
E-post: [LEIETAKER_EPOST]

1. Avtalens formål
Leietaker får disponere [ANTALL] stk LEK-sertifisert bikube med bifolk for læring, observasjon og eventuelle sesongoppgaver, i et trygt og strukturert LEK-opplegg.

2. Leieperiode
Startdato: [DAGENS DATO]
Sluttdato: [SESONG SLUTT]
(Leieavtalen fornyes automatisk om den ikke sies opp. Den må sies opp minimum 3 mnd før innvintring. Innvintring skjer normalt i midten av Oktober. Man binder seg til minimum en sesong av gangen, grunnet kompleksiteten i å flytte en bikube som er i drift)

3. Inkludert i leien (kryss av)
[x] Full kube med bifolk + tavler
[x] Oppstartsfôr 2–3 kg
[x] Deltakelse i honningslynging
[x] Honning-tapping og etikett-opplæring
[x] Salg på Honningbørsen med rapport
[x] LEK-sertifisering etter fullført sesong (kun for barn)
[x] Forsikring inkludert i perioden

4. Ansvar og sikkerhet
- Utleier har ansvar for at kuben er sertifisert, trygg og sykdomskontrollert ved utlevering
- Leietaker har ansvar for forsvarlig bruk og å følge sikkerhetsinstrukser
- Barn/medlemmer skal ikke åpne kube uten tilsyn av godkjent, Sertifisert LEK-birøkter
- Ved skade på utstyr som skyldes uforsvarlig bruk, kan erstatning kreves
- Ved sykdomstegn skal dette rapporteres umiddelbart i LEK-appen

5. Honning og inntektsfordeling
Hvis honningproduksjon og salg er del av leien, fordeles inntekten slik:
Leietaker betaler en fast lav pris for kjøp av honning fra leide kuber, og har forkjøpsrett til ALL honning i de leide kubene. Honningprisen blir beregnet hvert år ved sesongens slutt, og offentliggjøres på LEK-Honning™️ sine nettsider, og i appen.
Alle salg skal dokumenteres og gjennomføres i appen

6. Allergi og helse
Leietaker bekrefter at gruppen har sjekket allergier:
[x] Ingen kjent allergi (bekreftet ved signering)
Utleier anbefaler at Epipen eller førstehjelpsplan finnes i gruppen, men det er ikke krav fra utleier

7. Databruk og innhold i app
Leietaker godkjenner at:
Observasjonsbilder og kubelogger kan brukes i anonymisert form i LEK-systemet
Ingen persondata publiseres uten samtykke
[x] Godkjent

Tilleggsnotat:
"AI Innovate er ikke bare et selskap – det er et kunstverk i seg selv." – Dette er et verdibasert LEK-opplæringsprogram, ikke økonomisk rådgivning.

Angrerett og Avbestilling:
Da det er levende dyr, som klargjøres spesielt til hver enkelt leietaker, er det INGEN angrefrist på bestilling av bikube. Skulle man angre seg, vil det derimot bli krevd et ekstra gebyr på ca. 3000 for den ekstra kostnaden birøkteren får, ved å måtte enten drifte kuben selv, eller sette jobben bort til andre som kan ta seg av dem.
`;

const OWNERSHIP_COSTS = [
  { item: 'Startpakke halvkasser (3110)', price: 3500 },
  { item: 'Bifolk (bier + dronning)', price: 4500 },
  { item: 'Byggevoks (4033/4027 + lister)', price: 1000 },
  { item: 'Ekstra rammer + voks-buffer', price: 1500 },
  { item: 'Birøkterkurs (Halden Birøkterlag)', price: 4500 },
  { item: 'Diverse kurs-småting', price: 1000 },
  { item: 'Beskyttelsesutstyr (drakt+slør+hansker)', price: 2000 },
  { item: 'Røykpuster + røykmateriale', price: 800 },
  { item: 'Kubeverktøy + skrape + børste', price: 800 },
  { item: 'Billigste håndslynge (3000)', price: 6900 },
];

const HIDDEN_COSTS = [
  { item: 'Ekstra magasin, dronningbur, fôr, småutstyr', price: 2000 },
  { item: 'Glass og etiketter til egen honning', price: 600 },
  { item: 'Transport, ekstra medisiner, logistikk', price: 1000 },
];

export default function RentHivePage() {
  const router = useRouter();
  const supabase = createClient();
  
  // State
  const [user, setUser] = useState<any>(null);
  const [hiveCount, setHiveCount] = useState(2);
  const [step, setStep] = useState<'info' | 'details' | 'contract' | 'success'>('info');
  const [loading, setLoading] = useState(false);
  const [showCostComparison, setShowCostComparison] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    signature: ''
  });

  // Fetch User
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        // Pre-fill email if available
        setFormData(prev => ({...prev, email: user.email || ''}));
      }
    };
    getUser();
  }, [supabase]);

  // Pricing Logic (Monthly)
  const calculateMonthlyPrice = (count: number) => {
    if (count === 1) return 350;
    if (count === 2) return 299; // Total for 2 hives (cheaper than 1!)
    // 3+ hives: 299 base + 100 per extra hive
    return 299 + ((count - 2) * 100);
  };

  const monthlyPrice = calculateMonthlyPrice(hiveCount);
  const pricePerHive = Math.round(monthlyPrice / hiveCount);

  // Handlers
  const handleStartOrder = () => {
    if (!user) {
      // Redirect to login or show warning
      router.push('/login?next=/lei-en-kube');
      return;
    }
    setStep('details');
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('contract');
  };

  const handleSignAndPay = async () => {
    if (!formData.signature) return;
    setLoading(true);

    try {
      // 1. Create Rental Record
      // We store the monthly price as 'total_price' for now, but added a note about billing frequency
      const { error } = await supabase
        .from('rentals')
        .insert({
          user_id: user.id,
          hive_count: hiveCount,
          total_price: monthlyPrice, // Storing monthly price
          status: 'active', 
          contact_name: formData.name,
          contact_address: formData.address,
          contact_phone: formData.phone,
          contact_email: formData.email,
          contract_signed: true,
          contract_signed_at: new Date().toISOString(),
          signature_text: formData.signature,
          notes: `Bestilt via LEK-app. Månedspris: ${monthlyPrice} kr.`
        });

      if (error) throw error;

      // 2. Success
      setStep('success');
    } catch (err) {
      console.error('Error creating rental:', err);
      alert('Noe gikk galt. Prøv igjen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      {/* Header */}
      <div className="bg-honey-500 text-white pt-8 pb-16 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <button 
            onClick={() => step === 'info' ? router.push('/honey-exchange') : setStep('info')}
            className="mb-6 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {step === 'info' ? 'Tilbake til Portal' : 'Avbryt bestilling'}
          </button>
          
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
              <Box className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">LEI EN KUBE</h1>
              <p className="text-honey-100 text-lg">
                Ditt eget bidrag til naturen – vi gjør jobben!
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-20">
        
        {step === 'info' && (
          <div className="space-y-8">
            
            {/* Intro Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-honey-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">SLIK FUNGERER DET</h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Enkelt å komme i gang, trygt å gjennomføre. Opplegget kan skaleres opp eller ned etter behov. 
                Dere velger selv hvor involverte dere ønsker å være – resten hjelper vi dere med å strukturere.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <div className="flex gap-4">
                  <div className="bg-honey-100 p-3 rounded-xl h-fit">
                    <Heart className="w-6 h-6 text-honey-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">1. Interesse & plan</h3>
                    <p className="text-sm text-gray-600">
                      Dere tar kontakt og forteller hvem dere er. Sammen ser vi på hva som passer for dere.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="bg-blue-100 p-3 rounded-xl h-fit">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">2. Oppstart & intro</h3>
                    <p className="text-sm text-gray-600">
                      Vi går gjennom sikkerhet og utstyr. Dere får utdelt roller og oppgaver etter nivå.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="bg-green-100 p-3 rounded-xl h-fit">
                    <Leaf className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">3. Sesong & oppgaver</h3>
                    <p className="text-sm text-gray-600">
                      Følg kubene gjennom sesongen med observasjon og enkle registreringer.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="bg-amber-100 p-3 rounded-xl h-fit">
                    <Box className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">4. Honning & økonomi</h3>
                    <p className="text-sm text-gray-600">
                      Slynging, tapping og etikettering. Se hele verdikjeden fra blomst til ferdig produkt!
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Persona Table */}
              <div className="border-t border-gray-100 pt-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Hvem passer dette for?</h3>
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                      <tr>
                        <th className="p-4">Brukertype</th>
                        <th className="p-4 hidden md:table-cell">Motiv</th>
                        <th className="p-4 hidden md:table-cell">Hva de får</th>
                        <th className="p-4">Hva de kjøper</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr className="bg-white">
                        <td className="p-4 font-bold text-honey-700">
                          LEK Familie / Klasse / Lag
                        </td>
                        <td className="p-4 text-gray-600 hidden md:table-cell">Moro for barn + læring</td>
                        <td className="p-4 text-gray-600 hidden md:table-cell">Roller, trygg flyt, verdikjede-innsikt</td>
                        <td className="p-4 text-gray-600">
                          <span className="font-medium text-gray-900">200 kr/kg</span> honning i glass til jul, gaver, egen bruk
                        </td>
                      </tr>
                      <tr className="bg-gray-50/50">
                        <td className="p-4 font-bold text-green-700">
                          Honning-hage-investor
                        </td>
                        <td className="p-4 text-gray-600 hidden md:table-cell">Tjene penger, minimal innsats</td>
                        <td className="p-4 text-gray-600 hidden md:table-cell">4–20+ kuber, lokal birøkter følger alt</td>
                        <td className="p-4 text-gray-600">
                          20 kg bøtter, glass, etiketter, MLM/boder etter ønske
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Honey Profit / Volume Incentive Section */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 border border-amber-100 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-24 bg-honey-400/10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-white p-3 rounded-xl shadow-sm">
                    <Coins className="w-6 h-6 text-honey-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Slik tjener du på å ha biene i hagen</h2>
                </div>

                <div className="prose prose-honey max-w-none mb-8">
                  <p className="text-lg text-gray-700 leading-relaxed">
                    Når du leier kuber, får du <strong className="text-honey-700">førsterett på å kjøpe honning fra egne kuber</strong> – til sterkt redusert pris (kun 200 kr/kg). 
                    Markedspris for ferdig tappet honning er gjerne 260–300+ kr/kg.
                  </p>
                  
                  {/* Honey Resale Value Table */}
                  <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden my-6 not-prose">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-amber-100/50 text-gray-700 font-bold border-b border-amber-100">
                        <tr>
                          <th className="p-3">Honningtype</th>
                          <th className="p-3 hidden sm:table-cell">Ordinær pris</th>
                          <th className="p-3">Din pris</th>
                          <th className="p-3 font-extrabold text-green-700">Potensiell verdi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr>
                          <td className="p-3 font-medium">Rå honning i bøtte (20 kg)</td>
                          <td className="p-3 text-gray-500 hidden sm:table-cell">260 kr/kg</td>
                          <td className="p-3 font-bold text-honey-700">200 kr/kg</td>
                          <td className="p-3 text-green-700">260–700 kr/kg</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-medium">Ferdig tappet glass</td>
                          <td className="p-3 text-gray-500 hidden sm:table-cell">320–450 kr/kg</td>
                          <td className="p-3 font-bold text-honey-700">200 kr/kg</td>
                          <td className="p-3 text-green-700">260–700 kr/kg</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-medium">Premium småglass</td>
                          <td className="p-3 text-gray-500 hidden sm:table-cell">450–700 kr/kg</td>
                          <td className="p-3 font-bold text-honey-700">200 kr/kg</td>
                          <td className="p-3 text-green-700">450–900 kr/kg</td>
                        </tr>
                        <tr className="bg-amber-50/30">
                          <td className="p-3 font-medium">Sjeldne sorter (lyng, skog)</td>
                          <td className="p-3 text-gray-500 hidden sm:table-cell">600–900 kr/kg</td>
                          <td className="p-3 font-bold text-honey-700">200 kr/kg</td>
                          <td className="p-3 text-green-700 font-bold">600–1200 kr/kg</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="p-3 bg-gray-50 text-xs text-gray-500 italic text-center">
                      * Pris avhenger av smak, type, sjeldenhet og sesong.
                    </div>
                  </div>

                  <p className="text-gray-600">
                    Jo flere kuber du har på samme lokasjon, jo mer honning produseres, og jo mer kan du tjene på videresalg. 
                    Du velger selv om du vil ha honningen i bøtter for egen tapping, eller ferdig på glass med etikett (mot et tillegg).
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 bg-amber-100/50 text-sm font-bold text-gray-700 border-b border-amber-100">
                    <div className="p-4">Antall kuber</div>
                    <div className="p-4">Månedspris</div>
                    <div className="p-4">Hvorfor velge dette?</div>
                  </div>
                  
                  <div className="divide-y divide-gray-100 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 hover:bg-gray-50 transition-colors">
                      <div className="p-4 font-medium text-gray-900">1 kube</div>
                      <div className="p-4 text-gray-600">350 kr</div>
                      <div className="p-4 text-gray-500">Startkostnad for tilsyn alene</div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 bg-green-50/50 hover:bg-green-50 transition-colors">
                      <div className="p-4 font-bold text-gray-900 flex items-center gap-2">
                        2 kuber <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">Populært</span>
                      </div>
                      <div className="p-4 font-bold text-green-700">299 kr</div>
                      <div className="p-4 text-green-800 font-medium">No-brainer – billigere enn 1!</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 hover:bg-honey-50 transition-colors border-l-4 border-honey-400">
                      <div className="p-4 font-bold text-gray-900 flex items-center gap-2">
                        4 kuber <span className="bg-honey-100 text-honey-800 text-xs px-2 py-0.5 rounded-full">Anbefalt start</span>
                      </div>
                      <div className="p-4 font-bold text-honey-700">499 kr</div>
                      <div className="p-4 text-gray-700">Nå begynner det å bli lønnsomt i drift</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 hover:bg-gray-50 transition-colors">
                      <div className="p-4 font-medium text-gray-900">6 kuber</div>
                      <div className="p-4 text-gray-600">699 kr</div>
                      <div className="p-4 text-gray-600">Optimal balanse for læring og inntjening</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 hover:bg-gray-50 transition-colors">
                      <div className="p-4 font-medium text-gray-900">10+ kuber</div>
                      <div className="p-4 text-gray-600">Kontakt oss</div>
                      <div className="p-4 text-gray-600">Honning-hage-investor</div>
                    </div>
                  </div>
                </div>

                {/* 4-6+ Hives Incentive Block */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-honey-200">
                  <h3 className="text-lg font-bold text-honey-800 mb-3 flex items-center gap-2">
                    <Box className="w-5 h-5" />
                    Med 4–6 kuber i hagen kan du:
                  </h3>
                  
                  {/* Honning-rettighets-trigger */}
                  <div className="mb-4 bg-honey-50 p-3 rounded-lg border border-honey-100 text-sm text-honey-900 italic font-medium">
                    «Har du 4 kuber eller fler, får du fortrinn på mer av honningen fra dine kuber når sesongen er god.»
                  </div>

                  <ul className="space-y-2 text-sm text-gray-700 mb-4">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      Sikre nok honning til slynging, salg og læring gjennom hele verdikjeden
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <span className="font-bold text-honey-700">Få første rett på honning fra dine egne kuber</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      Kjøpe den til redusert pris: 200 kr/kg
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      Selge den videre selv i ønsket emballasje for 260–700+ kr/kg
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      Tjene mer – jo flere kuber du har samlet på én lokasjon
                    </li>
                  </ul>
                  <div className="text-sm font-medium text-center text-gray-500 italic">
                    "2 kuber er en start. 4–6+ er en mulighet. 10+ er en investering."
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing & Ordering */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
              <div className="p-8 bg-gray-900 text-white">
                <h2 className="text-2xl font-bold mb-2">Velg antall kuber</h2>
                <p className="text-gray-400">Tilpass etter ditt behov. 2 kuber anbefales for best læring og stabilitet.</p>
              </div>
              
              <div className="p-8">
                <div className="mb-8">
                  <div className="flex justify-between items-end mb-4">
                    <span className="text-gray-600 font-medium">Antall kuber: {hiveCount}</span>
                    <div className="text-right">
                      <span className="text-3xl font-bold text-honey-600">{monthlyPrice} kr <span className="text-sm text-gray-400 font-normal">/ mnd</span></span>
                      {hiveCount > 1 && (
                        <div className="text-xs text-gray-500">({pricePerHive} kr per kube)</div>
                      )}
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={hiveCount} 
                    onChange={(e) => setHiveCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-honey-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span>1</span>
                    <span>5</span>
                    <span>10</span>
                  </div>
                </div>

                {/* Price Explanation Logic */}
                {hiveCount === 1 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                    <div className="flex gap-3 mb-2">
                      <AlertCircle className="w-5 h-5 text-orange-600 shrink-0" />
                      <p className="text-sm font-bold text-orange-800">
                        Hvorfor koster 1 kube mer enn 2?
                      </p>
                    </div>
                    <p className="text-sm text-orange-800 mb-3 leading-relaxed">
                      En birøkter må kjøre ut til én lokasjon uansett om det er 1 eller 2 kuber. 
                      Kostnaden ligger i tid og transport – ikke i selve kuben. 
                      Derfor er 2-kube-leie det mest lokasjons-effektive, tryggeste og mest økonomiske valget for deg som vil starte med bier hjemme.
                    </p>
                    <div className="bg-white/50 p-2 rounded text-sm text-orange-900 font-medium text-center">
                      💰 Tips: Velg 2 kuber – billigere enn 1!
                    </div>
                  </div>
                )}
                
                {hiveCount >= 2 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex gap-3 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                      <p className="text-sm font-bold text-green-800">
                        Hva sparer du med LEK-leie?
                      </p>
                    </div>
                    <p className="text-sm text-green-800 leading-relaxed">
                      Du får tilgang til kuber, bifolk, sesong-flyt, veiledning og oppfølging til en pris som gjør at du kan ha flere kuber i mange år for samme sum som én kube koster å kjøpe alene.
                    </p>
                  </div>
                )}

                <button 
                  onClick={handleStartOrder}
                  className="w-full bg-honey-500 hover:bg-honey-600 text-white font-bold py-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] flex flex-col items-center justify-center gap-1"
                >
                  <span className="flex items-center gap-2 text-lg">
                    {hiveCount === 1 ? 'Gå for 2 kuber (Anbefalt)' : `Bestill ${hiveCount} kuber – Signer digitalt`}
                    <ChevronRight className="w-5 h-5" />
                  </span>
                  <span className="text-xs font-normal opacity-90">
                    Vi matcher deg med nærmeste LEK-birøkter
                  </span>
                </button>
                <p className="text-center text-xs text-gray-500 mt-4">
                  Ingen betaling i dag. Du signerer avtale digitalt i neste steg.
                </p>
              </div>

              {/* Cost Comparison Toggle */}
              <div className="border-t border-gray-100 p-4 bg-gray-50">
                <button 
                  onClick={() => setShowCostComparison(!showCostComparison)}
                  className="w-full flex items-center justify-between text-gray-600 hover:text-gray-900 text-sm font-medium py-2"
                >
                  <span className="flex items-center gap-2">
                    <Coins className="w-4 h-4" />
                    Hva koster det å eie selv vs. leie?
                  </span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${showCostComparison ? 'rotate-90' : ''}`} />
                </button>
                
                {showCostComparison && (
                  <div className="mt-4 animate-in slide-in-from-top-2">
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      {/* Eie Selv Section */}
                      <div className="bg-gray-900 text-white p-4 text-center">
                        <h4 className="font-bold">Alternativ 1 – Eie egen bikube</h4>
                        <p className="text-xs text-gray-400">Realistisk kostnad første år (Markedspriser 2025)</p>
                      </div>
                      
                      <div className="p-4 space-y-2 text-sm">
                        {OWNERSHIP_COSTS.map((cost, idx) => (
                          <div key={idx} className="flex justify-between border-b border-gray-50 last:border-0 py-1">
                            <span className="text-gray-600">{cost.item}</span>
                            <span className="font-medium">{cost.price.toLocaleString()} kr</span>
                          </div>
                        ))}
                        
                        <div className="mt-4 pt-4 border-t border-dashed border-gray-300">
                          <p className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-orange-500" />
                            Tillegg nesten alle kjøper første år:
                          </p>
                          {HIDDEN_COSTS.map((cost, idx) => (
                            <div key={`hidden-${idx}`} className="flex justify-between py-1 text-gray-500 italic">
                              <span>{cost.item}</span>
                              <span>{cost.price.toLocaleString()} kr</span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-4 flex justify-between font-bold text-lg border-t-2 border-gray-900 mt-4">
                          <span>TOTALT FØRSTE ÅR</span>
                          <span className="text-red-600">≈ 26 500 kr</span>
                        </div>
                        <p className="text-xs text-center text-gray-500 mt-2">
                          🔎 Mange blir overrasket. Bier er rimelig i drift – men dyrt å starte.
                        </p>
                      </div>

                      {/* LEK-leie Section */}
                      <div className="bg-honey-100 p-4 border-t border-honey-200">
                        <div className="text-center mb-4">
                          <h4 className="font-bold text-honey-900">Alternativ 2 – LEK-kube-leie</h4>
                          <p className="text-xs text-honey-700">Lokasjons-effektivt og Birøkter-fulgt</p>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="grid grid-cols-2 gap-4 text-sm mb-4 border-b border-gray-100 pb-4">
                            <div>
                              <p className="text-gray-500 text-xs">Kostnad første 12 mnd (Eie)</p>
                              <p className="font-bold text-red-600 text-lg">26 500 kr</p>
                              <p className="text-xs text-gray-400">1 kube i 1 år</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">Hva koster LEK-kube-leie?</p>
                              <p className="font-bold text-green-600 text-lg">3 588 kr / år</p>
                              <p className="text-xs text-gray-400">299 kr/mnd for 2 kuber</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-3 bg-green-50 p-3 rounded-lg">
                            <Leaf className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-green-800">
                              <p className="font-bold mb-1">Direkte verdi-sammenligning</p>
                              <p className="leading-relaxed">
                                For samme sum som det koster å starte med 1 kube selv i 1 år, kan du leie 2 LEK-kuber i ca. 7 år.
                              </p>
                              <p className="mt-2 text-xs opacity-80 font-medium">
                                Inkludert struktur, sesong-flyt, lokal oppfølging og digital LEK-kubelogging.
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-4 p-3 border-l-4 border-honey-400 bg-honey-50 text-sm text-honey-900">
                            <p className="font-bold">🎯 Konklusjon:</p>
                            <p className="leading-relaxed opacity-90">
                              Du starter rimeligere, lærer tryggere, og får mer ut av verdikjeden med 2 kuber fra dag én – uten å gå på nybegynner-smellen med manglende utstyr eller glemt voks-buffer ved høsting.
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2 text-sm">
                          <div className="flex justify-between items-center bg-white/50 p-2 rounded">
                            <span>1 kube</span>
                            <span className="font-mono">350 kr/mnd</span>
                            <span className="text-xs text-gray-500">Høy logistikk-kostnad</span>
                          </div>
                          <div className="flex justify-between items-center bg-white p-2 rounded border border-green-200 shadow-sm">
                            <span className="font-bold">2 kuber</span>
                            <span className="font-mono font-bold text-green-600">299 kr/mnd</span>
                            <span className="text-xs text-green-700 font-bold">Beste start! ✅</span>
                          </div>
                          <div className="flex justify-between items-center bg-white/50 p-2 rounded">
                            <span>3+ kuber</span>
                            <span className="font-mono">+100 kr/stk</span>
                            <span className="text-xs text-gray-500">Skaleringseffekt</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-honey-100 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Dine opplysninger</h2>
            <form onSubmit={handleDetailsSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Navn / Kontaktperson</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-honey-500"
                  placeholder="Ola Nordmann"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse for utplassering</label>
                <input 
                  required
                  type="text" 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-honey-500"
                  placeholder="Gateadresse 1, 1234 Sted"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input 
                    required
                    type="tel" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-honey-500"
                    placeholder="99 88 77 66"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
                  <input 
                    required
                    type="email" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-honey-500"
                    placeholder="ola@eksempel.no"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-honey-500 hover:bg-honey-600 text-white font-bold py-4 rounded-xl mt-4 transition-colors"
              >
                Gå til signering
              </button>
            </form>
          </div>
        )}

        {step === 'contract' && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-honey-100 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-8 h-8 text-honey-600" />
              <h2 className="text-2xl font-bold text-gray-900">Signer leieavtale</h2>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 h-96 overflow-y-auto mb-8 text-sm leading-relaxed whitespace-pre-line font-mono">
              {CONTRACT_TEXT
                .replace(/\[LEIETAKER_NAVN\]/g, formData.name || '___________')
                .replace('[LEIETAKER_ADRESSE]', formData.address || '___________')
                .replace('[LEIETAKER_TLF]', formData.phone || '___________')
                .replace('[LEIETAKER_EPOST]', formData.email || '___________')
                .replace('[ANTALL]', hiveCount.toString())
                .replace('[DAGENS DATO]', new Date().toLocaleDateString('no-NO'))
                .replace('[SESONG SLUTT]', 'Oktober ' + new Date().getFullYear())
              }
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-lg border border-blue-100">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-bold mb-1">Ingen angrefrist</p>
                  <p>Ved å signere bekrefter jeg at jeg forstår at det ikke er angrefrist på bestilling av levende dyr, og at avbestilling medfører et gebyr på 3.000 kr.</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Signer med ditt navn (Digital Signatur)</label>
                <div className="relative">
                  <PenTool className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  <input 
                    type="text" 
                    value={formData.signature}
                    onChange={e => setFormData({...formData, signature: e.target.value})}
                    placeholder="Skriv ditt fulle navn her"
                    className="w-full pl-10 p-3 border-2 border-gray-300 rounded-lg focus:border-honey-500 focus:ring-0 font-handwriting text-xl"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Ved å skrive navnet ditt ovenfor signerer du avtalen digitalt.
                </p>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Månedspris:</p>
                  <p className="text-2xl font-bold text-gray-900">{monthlyPrice} kr</p>
                </div>
                <button 
                  onClick={handleSignAndPay}
                  disabled={!formData.signature || loading}
                  className={`bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2
                    ${(!formData.signature || loading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700 hover:scale-105'}
                  `}
                >
                  {loading ? 'Behandler...' : 'Signer & Bestill'}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="bg-white rounded-2xl shadow-xl p-12 border border-green-100 text-center animate-in zoom-in-95">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Gratulerer!</h2>
            <p className="text-lg text-gray-600 mb-8 max-w-lg mx-auto">
              Din bestilling av {hiveCount} bikuber er mottatt og avtalen er signert.
              <br/><br/>
              En LEK-sertifisert birøkter i ditt nærområde vil snart ta kontakt for å avtale levering.
            </p>
            
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => router.push('/dashboard')}
                className="bg-honey-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-honey-600 transition-colors"
              >
                Gå til Min Side
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
