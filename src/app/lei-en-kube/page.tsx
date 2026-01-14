'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { jsPDF } from 'jspdf';
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
  Coins,
  CreditCard,
  Lock,
  X,
  Info,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { getDistanceFromLatLonInM } from '@/utils/geo';

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

3. Pris og Betaling
Leiepris: [PRIS_MND] kr per måned (faktureres sesongvis forskudd: [PRIS_TOTAL] kr).

4. Inkludert i leien (kryss av)
[x] Full kube med bifolk + tavler
[x] Oppstartsfôr 2–3 kg
[x] Deltakelse i honningslynging
[x] Honning-tapping og etikett-opplæring
[x] Salg på Honningbørsen med rapport
[x] LEK-sertifisering etter fullført sesong (kun for barn)
[x] Forsikring inkludert i perioden

5. Ansvar og sikkerhet
- Utleier har ansvar for at kuben er sertifisert, trygg og sykdomskontrollert ved utlevering
- Leietaker har ansvar for forsvarlig bruk og å følge sikkerhetsinstrukser
- Barn/medlemmer skal ikke åpne kube uten tilsyn av godkjent, Sertifisert LEK-birøkter
- Ved skade på utstyr som skyldes uforsvarlig bruk, kan erstatning kreves
- Ved sykdomstegn skal dette rapporteres umiddelbart i LEK-appen

6. Honning og inntektsfordeling
Hvis honningproduksjon og salg er del av leien, fordeles inntekten slik:
Leietaker betaler en fast lav pris for kjøp av honning fra leide kuber, og har forkjøpsrett til ALL honning i de leide kubene. Honningprisen blir beregnet hvert år ved sesongens slutt, og offentliggjøres på LEK-Honning™️ sine nettsider, og i appen.
Alle salg skal dokumenteres og gjennomføres i appen

7. Allergi og helse
Leietaker bekrefter at gruppen har sjekket allergier:
[x] Ingen kjent allergi (bekreftet ved signering)
Utleier anbefaler at Epipen eller førstehjelpsplan finnes i gruppen, men det er ikke krav fra utleier

8. Databruk og innhold i app
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
  { item: 'Startkube halvkasser (varenr 3110)', price: 3500 },
  { item: 'Bifolk (bier + dronning)', price: 4500 },
  { item: 'Byggevoks + bivei-lister', price: 1000 },
  { item: 'Ekstra rammer + voks til utskift ved høsting', price: 1500 },
  { item: 'Beskyttelsesutstyr (drakt + hansker + slør)', price: 2000 },
  { item: 'Røykpuster + røykmateriale', price: 800 },
  { item: 'Kubeverktøy + skrape + børste', price: 800 },
  { item: 'Fôringsutstyr + oppstartsfôr', price: 500 },
  { item: 'Birøkterkurs (Halden Birøkterlag)', price: 4500 },
  { item: 'Diverse småting', price: 1000 },
  { item: 'Billigste håndslynge m/sil (varenr 3000)', price: 6900 },
  { item: 'Glass og etiketter til tapping', price: 600 },
  { item: 'Transport/ekstra medisiner/logistikk', price: 1000 },
  { item: 'Ekstra magasin, dronningbur, tavler, småutstyr', price: 2000 },
];

const TOTAL_OWNERSHIP_COST = OWNERSHIP_COSTS.reduce((sum, item) => sum + item.price, 0);

const HIDDEN_COSTS: { item: string; price: number }[] = [];

export default function RentHivePage() {
  const router = useRouter();
  const supabase = createClient();
  
  // State
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null); // Store actual profile separately
  const [hiveCount, setHiveCount] = useState(2);
  const [step, setStep] = useState<'info' | 'details' | 'contract' | 'payment' | 'success'>('info');
  const [loading, setLoading] = useState(false);
  const [showCostComparison, setShowCostComparison] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    address: '',
    phone: '',
    email: '',
    signature: ''
  });

  // Fetch User & Profile
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        try {
          // Fetch profile data
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileData) {
            setProfile(profileData); // Save persistent profile data
            const fullAddress = [
              profileData.address,
              profileData.postal_code,
              profileData.city
            ].filter(Boolean).join(', ');

            setFormData(prev => ({
              ...prev,
              email: user.email || '',
              name: profileData.full_name || prev.name,
              address: fullAddress || prev.address,
              phone: profileData.phone_number || prev.phone,
              organization: prev.organization // Keep existing if any
            }));
          } else {
             setFormData(prev => ({...prev, email: user.email || ''}));
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
          setFormData(prev => ({...prev, email: user.email || ''}));
        }
      }
    };
    getUser();
  }, [supabase]);

  // Pricing Logic (Annual)
  const calculateAnnualPrice = (count: number) => {
    let monthly = 0;
    if (count === 1) monthly = 350;
    else if (count === 2) monthly = 299; 
    // 3+ hives: 299 base + 100 per extra hive above 2
    else monthly = 299 + ((count - 2) * 100);
    
    return monthly * 12;
  };

  const annualPrice = calculateAnnualPrice(hiveCount);
  const pricePerHive = Math.round(annualPrice / hiveCount);

  // Helper for Season End Date
  const getSeasonEndDate = () => {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11 (July is 6)
    // If we are in July (6) or later, the season extends to next year
    if (currentMonth >= 6) { 
       return `Oktober ${now.getFullYear() + 1}`;
    }
    return `Oktober ${now.getFullYear()}`;
  };

  // Handlers
  const scrollToOrder = (count: number) => {
    setHiveCount(count);
    document.getElementById('bestilling')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStartOrder = () => {
    if (!user) {
      // Redirect to register with correct role and return url
      router.push('/register?role=tenant&next=/lei-en-kube');
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
    setStep('payment');
  };

  const handleProcessPayment = async () => {
    setLoading(true);

    try {
      // 1. Geocode User Address (Pilot Simulation)
      let userCoords = { lat: 59.91, lng: 10.75 }; // Default Oslo
      const addr = formData.address.toLowerCase();
      
      if (addr.includes('halden')) userCoords = { lat: 59.12, lng: 11.38 };
      else if (addr.includes('sarpsborg')) userCoords = { lat: 59.28, lng: 11.11 };
      else if (addr.includes('fredrikstad')) userCoords = { lat: 59.21, lng: 10.93 };
      else if (addr.includes('moss')) userCoords = { lat: 59.43, lng: 10.66 };

      // 2. Find Nearest Beekeeper
      // Fetch all profiles that want to be beekeepers
      const { data: potentialBeekeepers } = await supabase
        .from('profiles')
        .select('*')
        .eq('wants_to_be_beekeeper', true);

      let nearestBeekeeperId = null;
      let minDistance = Infinity;

      if (potentialBeekeepers && potentialBeekeepers.length > 0) {
        potentialBeekeepers.forEach(bk => {
          // If beekeeper has no coords, skip (or mock)
          if (!bk.latitude || !bk.longitude) return;

          const dist = getDistanceFromLatLonInM(
            userCoords.lat, 
            userCoords.lng, 
            bk.latitude, 
            bk.longitude
          );

          if (dist < minDistance) {
            minDistance = dist;
            nearestBeekeeperId = bk.id;
          }
        });
      }

      // If no beekeeper found with coords, maybe pick the first one just for pilot flow?
      if (!nearestBeekeeperId && potentialBeekeepers && potentialBeekeepers.length > 0) {
        nearestBeekeeperId = potentialBeekeepers[0].id; // Fallback
        minDistance = 0; // Unknown
      }

      // 3. Create Rental Record (Linked to Apiary will happen later)
      // Note: We omit apiary_id here. It will be NULL in the database, 
      // and omitting it prevents errors if the column is missing in the schema cache.
      const rentalData = {
        user_id: user.id,
        // apiary_id: null, // Removed to avoid "column not found" error if migration hasn't run
        hive_count: hiveCount,
        total_price: annualPrice,
        status: 'active', 
        contact_name: formData.name,
        // contact_organization: formData.organization, // Keep commented out for safety
        contact_address: formData.address,
        contact_phone: formData.phone,
        contact_email: formData.email,
        contract_signed: true,
        contract_signed_at: new Date().toISOString(),
        signature_text: formData.signature,
        notes: `Bestilt via LEK-app. Årspris: ${annualPrice} kr. Org: ${formData.organization || 'Ingen'}`,
        assigned_beekeeper_id: nearestBeekeeperId || null, 
        distance_to_beekeeper: (minDistance === Infinity || minDistance === undefined) ? null : minDistance
      };

      const { error } = await supabase
        .from('rentals')
        .insert(rentalData);

      if (error) {
        console.error('Supabase rental insert error details:', error);
        throw new Error(error.message || 'Kunne ikke opprette leieavtale i databasen');
      }

      // Simulate payment processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 4. Success
      setStep('success');
    } catch (err: any) {
      console.error('Error creating rental:', err);
      // Show specific error message if available, otherwise generic
      alert(`Beklager, noe gikk galt under bestillingen. Feilmelding: ${err.message || 'Ukjent feil'}. Prøv igjen eller ta kontakt.`);
    } finally {
      setLoading(false);
    }
  };

  const generateReceiptPDF = () => {
    const doc = new jsPDF();
    const receiptId = Math.floor(Math.random() * 100000);
    const date = new Date().toLocaleDateString('no-NO');
    
    // Header
    doc.setFontSize(22);
    doc.text("LEK-HONNING KVITTERING", 20, 30);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Kvittering #${receiptId}`, 150, 30);
    
    // Info
    doc.setTextColor(0);
    doc.text(`Dato: ${date}`, 20, 50);
    doc.text(`Kunde: ${formData.name}`, 20, 60);
    doc.text(`Adresse: ${formData.address}`, 20, 70);
    doc.text(`E-post: ${formData.email}`, 20, 80);

    // Line
    doc.setDrawColor(200);
    doc.line(20, 90, 190, 90);

    // Items
    doc.setFontSize(14);
    doc.text("Beskrivelse", 20, 105);
    doc.text("Beløp", 160, 105);
    
    doc.setFontSize(12);
    doc.text(`Leie av ${hiveCount} kuber (År)`, 20, 120);
    doc.text(`${Math.round(annualPrice * 0.8)} kr`, 160, 120);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`MVA (25%)`, 20, 130);
    doc.text(`${Math.round(annualPrice * 0.2)} kr`, 160, 130);
    
    // Total
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(20, 140, 190, 140);
    
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("TOTALT BELASTET", 20, 155);
    doc.text(`${annualPrice} kr`, 160, 155);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Betalt med kort **** **** **** 4242", 20, 165);
    
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Takk for at du velger LEK-Honning", 105, 280, { align: "center" });
    doc.text("Org.nr: 935 460 387 | Rascheprangen 1, 1767 Halden", 105, 285, { align: "center" });

    doc.save(`kvittering_lek_honning_${receiptId}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      {/* User Indicator to prevent session confusion */}
      {user && (
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-2 flex justify-between items-center">
            <div className="flex items-center gap-2 text-xs text-gray-600">
               <UserIcon className="w-3 h-3" />
               <span>Logget inn som: <strong className="text-gray-900">{profile?.full_name || user.email}</strong> ({user.email})</span>
            </div>
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/login';
              }}
              className="text-[10px] text-red-600 hover:text-red-700 flex items-center gap-1 font-bold uppercase tracking-wider bg-red-50 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-3 h-3" />
              Logg ut
            </button>
          </div>
        </div>
      )}

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
              <h1 className="text-4xl font-bold mb-2">LEI EN BIKUBE</h1>
              <p className="text-honey-100 text-lg max-w-xl">
                Har du hørt at det er kult å ha egne bier? Det stemmer! <br/>
                Få din egen, kortreiste honning og bidra til naturen – vi tar oss av alt arbeidet.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-20">
        
        {step === 'info' && (
          <div className="space-y-8">

            {/* Pricing & Ordering - Slider Version */}
            <div id="bestilling" className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
              <div className="p-8 bg-gray-900 text-white">
                <h2 className="text-2xl font-bold mb-2">Velg antall kuber</h2>
                <p className="text-gray-400">Tilpass etter ditt behov. 2 kuber anbefales for best læring og stabilitet.</p>
              </div>
              
              <div className="p-8">
                <div className="mb-8">
                  <div className="flex justify-between items-end mb-4">
                    <span className="text-gray-600 font-medium">Antall kuber: {hiveCount}</span>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-4xl font-bold text-honey-600">
                        {Math.round(annualPrice / 12)},- 
                        <span className="text-base text-gray-500 font-normal ml-1">pr mnd</span>
                      </span>
                      <span className="text-xs text-gray-400 font-medium">faktureres årlig</span>
                      {hiveCount > 1 && (
                        <div className="text-xs text-gray-500 mt-1">({pricePerHive} kr per kube / år)</div>
                      )}
                      <div className="text-xs text-gray-500 mt-0.5">Totalt pr år: {annualPrice},-</div>
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
                  Ved å gå videre godtar du våre vilkår. Du signerer avtale digitalt i neste steg.
                </p>
              </div>

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
                        
                        {HIDDEN_COSTS.length > 0 && (
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
                        )}

                        <div className="pt-4 flex justify-between font-bold text-lg border-t-2 border-gray-900 mt-4">
                          <span>TOTALT FØRSTE ÅR</span>
                          <span className="text-red-600">≈ {TOTAL_OWNERSHIP_COST.toLocaleString()} kr</span>
                        </div>
                        <p className="text-xs text-center text-gray-500 mt-2">
                          🔎 Mange blir overrasket. Bier er rimelig i drift – men dyrt å starte.
                        </p>
                      </div>

                      <div className="bg-honey-100 p-4 border-t border-honey-200">
                        <div className="text-center mb-4">
                          <h4 className="font-bold text-honey-900">Alternativ 2 – LEK-kube-leie</h4>
                          <p className="text-xs text-honey-700">Lokasjons-effektivt og Birøkter-fulgt</p>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="grid grid-cols-2 gap-4 text-sm mb-4 border-b border-gray-100 pb-4">
                            <div>
                              <p className="text-gray-500 text-xs">Kostnad første 12 mnd (Eie)</p>
                              <p className="font-bold text-red-600 text-lg">{TOTAL_OWNERSHIP_COST.toLocaleString()} kr</p>
                              <p className="text-xs text-gray-400">1 kube i 1 år</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">Hva koster LEK-kube-leie?</p>
                              <p className="font-bold text-green-600 text-lg">3 588 kr / år</p>
                              <p className="text-xs text-gray-400">2 kuber, driftet for deg</p>
                            </div>
                          </div>

                          <div className="space-y-2 text-xs text-gray-700">
                            <p className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              Ingen startinvestering i utstyr, slynger, kurs eller lager
                            </p>
                            <p className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              Du kan skalere opp/ned uten å sitte igjen med utstyr
                            </p>
                            <p className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              Perfekt for familier, skoler og små investorer som vil teste først
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

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

            {/* --- NY SAMMENLIGNING: Eie vs Leie --- */}
            <div className="py-8 font-sans">
              <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">🐝 Start med bier i egen hage</h2>
              <p className="text-gray-600 mb-8 text-lg">Ærlig sammenligning: Eie selv vs. LEK-kube-leie</p>
              
              {/* Alternativ 1: Eie selv */}
              <div className="mb-12 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100">
                  <h3 className="font-bold text-lg text-gray-900">💰 Alternativ 1 – Eie 1 bikube selv (Norge, realistisk første år)</h3>
                </div>
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50/50 text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-3">Post</th>
                      <th className="p-3 text-right">Pris (NOK inkl. mva)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {OWNERSHIP_COSTS.map((cost, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="p-3 text-gray-700">{cost.item}</td>
                        <td className="p-3 text-right font-medium text-gray-900">{cost.price.toLocaleString()} kr</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-bold text-gray-900 border-t-2 border-gray-200">
                      <td className="p-3">Total første år</td>
                      <td className="p-3 text-right">≈ {TOTAL_OWNERSHIP_COST.toLocaleString()} kr</td>
                    </tr>
                  </tbody>
                </table>
                <div className="p-4 bg-gray-50 text-sm text-gray-600 border-t border-gray-100">
                  <p className="mb-2"><strong className="text-gray-900">+ Arbeid:</strong> Du må slynge, røre, tappe og vaske selv. Ca 40–80 timer første år.</p>
                  <p><strong className="text-gray-900">+ Risiko:</strong> Dør biene om vinteren? Du må kjøpe nye (4500 kr).</p>
                </div>
              </div>

              {/* Alternativ 2: LEK-leie */}
              <div className="mb-12 bg-white rounded-xl shadow-sm border border-honey-200 overflow-hidden">
                <div className="p-4 bg-honey-50 border-b border-honey-100">
                  <h3 className="font-bold text-lg text-honey-900">🧡 Alternativ 2 – LEK-kube-leie (Vi gjør jobben, du får kosen)</h3>
                  <p className="text-sm text-honey-700">Startprisen er per lokasjon. Flere kuber = lavere pris per kube = mer honning.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-honey-100/50 text-gray-700 font-bold border-b border-honey-100">
                      <tr>
                        <th className="p-3">Antall kuber</th>
                        <th className="p-3">Pris/mnd</th>
                        <th className="p-3 hidden sm:table-cell">Pris/år</th>
                        <th className="p-3">Honningfortrinn inkludert</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr className="hover:bg-honey-50/30 transition-colors">
                        <td className="p-3 font-medium">1 kube</td>
                        <td className="p-3 text-gray-600">350 kr</td>
                        <td className="p-3 text-gray-400 hidden sm:table-cell">4 200 kr</td>
                        <td className="p-3 text-gray-500">Ingen fortrinn</td>
                        <td className="p-3 text-right">
                          <button onClick={() => scrollToOrder(1)} className="text-honey-600 font-bold hover:underline text-xs">Velg</button>
                        </td>
                      </tr>
                      <tr className="bg-green-50/50 hover:bg-green-50 transition-colors border-l-4 border-green-400">
                        <td className="p-3 font-bold text-gray-900">2 kuber <span className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded ml-1">Start</span></td>
                        <td className="p-3 font-bold text-green-700">299 kr</td>
                        <td className="p-3 text-green-700 font-medium hidden sm:table-cell">3 588 kr</td>
                        <td className="p-3 text-gray-700">Begrenset uttak</td>
                        <td className="p-3 text-right">
                           <button onClick={() => scrollToOrder(2)} className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-green-700 shadow-sm">Velg</button>
                        </td>
                      </tr>
                      <tr className="hover:bg-honey-50/30 transition-colors">
                        <td className="p-3 font-medium">3 kuber</td>
                        <td className="p-3 text-gray-600">399 kr</td>
                        <td className="p-3 text-gray-400 hidden sm:table-cell">4 788 kr</td>
                        <td className="p-3 text-gray-500">-</td>
                        <td className="p-3 text-right">
                          <button onClick={() => scrollToOrder(3)} className="text-honey-600 font-bold hover:underline text-xs">Velg</button>
                        </td>
                      </tr>
                      <tr className="bg-honey-50/50 hover:bg-honey-100/50 transition-colors border-l-4 border-honey-400">
                        <td className="p-3 font-bold text-gray-900">4 kuber <span className="bg-honey-100 text-honey-800 text-xs px-1.5 py-0.5 rounded ml-1">Anbefalt</span></td>
                        <td className="p-3 font-bold text-honey-700">499 kr</td>
                        <td className="p-3 text-honey-700 font-medium hidden sm:table-cell">5 988 kr</td>
                        <td className="p-3 text-gray-900 font-medium">
                          Nok honning til verdikjede + fortrinn på 80 kg/år
                          <button onClick={() => setIsPremiumModalOpen(true)} className="block mt-1 text-xs text-honey-600 underline hover:text-honey-800 flex items-center gap-1">
                            <Info className="w-3 h-3" /> Hva er Premium?
                          </button>
                        </td>
                         <td className="p-3 text-right">
                           <button onClick={() => scrollToOrder(4)} className="bg-honey-500 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-honey-600 shadow-sm">Velg</button>
                        </td>
                      </tr>
                      <tr className="hover:bg-honey-50/30 transition-colors">
                        <td className="p-3 font-medium">5 kuber</td>
                        <td className="p-3 text-gray-600">599 kr</td>
                        <td className="p-3 text-gray-400 hidden sm:table-cell">7 188 kr</td>
                        <td className="p-3 text-gray-500">-</td>
                        <td className="p-3 text-right">
                          <button onClick={() => scrollToOrder(5)} className="text-honey-600 font-bold hover:underline text-xs">Velg</button>
                        </td>
                      </tr>
                      <tr className="bg-amber-50/50 hover:bg-amber-50 transition-colors border-l-4 border-amber-400">
                        <td className="p-3 font-bold text-gray-900">6 kuber <span className="bg-amber-100 text-amber-800 text-xs px-1.5 py-0.5 rounded ml-1">Optimal</span></td>
                        <td className="p-3 font-bold text-amber-700">699 kr</td>
                        <td className="p-3 text-amber-700 font-medium hidden sm:table-cell">8 388 kr</td>
                        <td className="p-3 text-gray-900 font-medium">Optimal drift + fortrinn på 120 kg/år</td>
                        <td className="p-3 text-right">
                           <button onClick={() => scrollToOrder(6)} className="bg-amber-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-amber-700 shadow-sm">Velg</button>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">10-20+ kuber</td>
                        <td className="p-3 text-gray-600">Skalerer</td>
                        <td className="p-3 text-gray-400 hidden sm:table-cell">Kontakt oss</td>
                        <td className="p-3 text-gray-900 font-bold">Stor bulk-rett på honning (Hage-investor)</td>
                        <td className="p-3 text-right">
                          <button onClick={() => scrollToOrder(10)} className="text-gray-400 font-bold hover:underline text-xs">Kontakt</button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Slik tjener du på honning */}
              <div className="mb-12 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                 <div className="flex items-center gap-3 mb-6">
                  <div className="bg-honey-100 p-3 rounded-xl shadow-sm">
                    <Coins className="w-6 h-6 text-honey-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Slik tjener du på å ha biene i hagen</h2>
                </div>
                
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Når du leier kuber, får du <strong className="text-honey-700">førsterett på å kjøpe honning fra egne kuber</strong> – til sterkt redusert pris (kun 200 kr/kg). 
                  Du kan selge den videre for 260–700 kr/kg (eller mer for premium).
                </p>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Hvorfor premium koster mer */}
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                        <h4 className="font-bold text-gray-900 mb-3">Hvorfor høyere pris på 1 kube / premium?</h4>
                        <ul className="space-y-3 text-sm text-gray-700">
                            <li><strong className="text-gray-900">Logistikk:</strong> Birøkteren må kjøre ut til én adresse uansett. Separat slynging krever egen prosess.</li>
                            <li><strong className="text-gray-900">Premium (Lyng/Skog):</strong> Må høstes og slynges separat. Kan ikke blandes. Derfor er innkjøpsprisen høyere (400 kr/kg), men videresalgsverdien er også dobbel (800+ kr/kg).</li>
                        </ul>
                    </div>

                    {/* Fortjeneste tabell */}
                    <div className="bg-green-50 rounded-xl border border-green-100 overflow-hidden">
                        <div className="p-3 bg-green-100 border-b border-green-200">
                            <h4 className="font-bold text-green-900 text-sm">Din fortjeneste (eksempler)</h4>
                        </div>
                        <table className="w-full text-sm text-left">
                            <tbody className="divide-y divide-green-200">
                                <tr>
                                    <td className="p-3 text-gray-700">20 kg sommerhonning</td>
                                    <td className="p-3 text-right font-bold text-green-700">+ 4 000 kr</td>
                                </tr>
                                <tr>
                                    <td className="p-3 text-gray-700">20 kg premium (lyng)</td>
                                    <td className="p-3 text-right font-bold text-green-700">+ 8 000 kr</td>
                                </tr>
                                <tr>
                                    <td className="p-3 text-gray-700">20 kg småglass (marked)</td>
                                    <td className="p-3 text-right font-bold text-green-700">+ 12 000 kr</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
              </div>

              {/* Oppsummeringstablå */}
              <div className="bg-gray-900 rounded-xl shadow-lg overflow-hidden text-white">
                 <div className="p-6 border-b border-gray-800">
                    <h3 className="text-xl font-bold">Oppsummering: Verdi for deg</h3>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="bg-gray-800 text-gray-100 font-bold border-b border-gray-700">
                            <tr>
                                <th className="p-4">Faktor</th>
                                <th className="p-4 w-1/3">Eie selv (1-2 kuber)</th>
                                <th className="p-4 w-1/3 text-honey-400">LEK-leie (4 kuber)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            <tr>
                                <td className="p-4 font-medium text-white">Investering år 1</td>
                                <td className="p-4 text-red-300">≈ {TOTAL_OWNERSHIP_COST.toLocaleString()} kr (høy risiko)</td>
                                <td className="p-4 text-green-400">0 kr (kun leie)</td>
                            </tr>
                             <tr>
                                <td className="p-4 font-medium text-white">Arbeidstimer</td>
                                <td className="p-4">40–80 timer (tunge løft)</td>
                                <td className="p-4 text-honey-400">0 timer (bare kos)</td>
                            </tr>
                             <tr>
                                <td className="p-4 font-medium text-white">Honning-garanti</td>
                                <td className="p-4">Ingen (biene kan dø)</td>
                                <td className="p-4 text-honey-400">Opsjon på kjøp (stabilt)</td>
                            </tr>
                             <tr>
                                <td className="p-4 font-medium text-white">Vinter-risiko</td>
                                <td className="p-4 text-red-300">Du tar tapet (4500 kr/kube)</td>
                                <td className="p-4 text-green-400">Vi tar risikoen</td>
                            </tr>
                        </tbody>
                    </table>
                 </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Representerer (Valgfritt)</label>
                <input 
                  type="text" 
                  value={formData.organization}
                  onChange={e => setFormData({...formData, organization: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 focus:border-honey-500"
                  placeholder="Familien Hansen / 7. Klasse Halden Skole / IL Idrett"
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
                .replace('[SESONG SLUTT]', getSeasonEndDate())
                .replace('Representerer (klasse/lag/familie osv.): [LEIETAKER_NAVN] (Privat)', `Representerer: ${formData.organization || formData.name + ' (Privat)'}`)
                .replace('[PRIS_MND]', Math.round(annualPrice / 12).toString())
                .replace('[PRIS_TOTAL]', annualPrice.toString())
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
                  <p className="text-sm text-gray-500">Årspris (Sesong):</p>
                  <p className="text-2xl font-bold text-gray-900">{annualPrice} kr</p>
                </div>
                <button 
                  onClick={handleSignAndPay}
                  disabled={!formData.signature}
                  className={`bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2
                    ${!formData.signature ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700 hover:scale-105'}
                  `}
                >
                  Gå til betaling
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'payment' && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-honey-100 animate-in fade-in slide-in-from-right-4 max-w-lg mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <CreditCard className="w-8 h-8 text-honey-600" />
              <h2 className="text-2xl font-bold text-gray-900">Betaling</h2>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
                <span className="text-gray-600">Produkt</span>
                <span className="font-medium text-gray-900">Leie av {hiveCount} kuber</span>
              </div>
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
                <span className="text-gray-600">Periode</span>
                <span className="font-medium text-gray-900">Per år (Sesong til {getSeasonEndDate()})</span>
              </div>
              <div className="flex justify-between items-center text-lg font-bold">
                <span className="text-gray-900">Å betale nå</span>
                <span className="text-honey-600">{annualPrice} kr</span>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleProcessPayment}
                disabled={loading}
                className="w-full bg-[#FF5B24] text-white p-4 rounded-xl font-bold flex items-center justify-between hover:bg-[#E5400A] transition-colors group"
              >
                <span className="flex items-center gap-3">
                  <span className="bg-white/20 p-1.5 rounded text-xs font-mono">Vipps</span>
                  <span>Betal med Vipps</span>
                </span>
                {loading ? <span className="animate-spin">⌛</span> : <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              </button>

              <button
                onClick={handleProcessPayment}
                disabled={loading}
                className="w-full bg-gray-900 text-white p-4 rounded-xl font-bold flex items-center justify-between hover:bg-black transition-colors group"
              >
                <span className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5" />
                  <span>Kortbetaling</span>
                </span>
                {loading ? <span className="animate-spin">⌛</span> : <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              </button>
            </div>

            <div className="mt-6 text-center flex items-center justify-center gap-2 text-xs text-gray-400">
              <Lock className="w-3 h-3" />
              Sikker betaling via Stripe / Vipps
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-green-100 text-center animate-in zoom-in-95 max-w-xl mx-auto relative overflow-hidden">
            {/* Kvittering "Tear" effect top */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-gray-200 to-gray-300"></div>
            
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Betaling gjennomført!</h2>
            <p className="text-gray-500 mb-8">Takk for at du leier kuber hos oss.</p>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-left mb-8 font-mono text-sm relative shadow-inner">
                <div className="flex justify-between mb-4 border-b border-gray-200 pb-2">
                    <span className="font-bold text-gray-900">LEK-HONNING™ KVITTERING</span>
                    <span className="text-gray-500">#{Math.floor(Math.random() * 100000)}</span>
                </div>
                
                <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Dato:</span>
                        <span className="text-gray-900">{new Date().toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Kunde:</span>
                        <span className="text-gray-900">{formData.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Adresse:</span>
                        <span className="text-gray-900 truncate max-w-[200px]">{formData.address}</span>
                    </div>
                </div>

                <div className="border-t border-dashed border-gray-300 my-4"></div>
                
                <div className="space-y-2 mb-4">
                    <div className="flex justify-between font-bold text-gray-700 border-b border-gray-200 pb-1">
                        <span>Beskrivelse</span>
                        <span>Beløp</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-900">Leie av {hiveCount} kuber (År)</span>
                        <span className="text-gray-900">{Math.round(annualPrice * 0.8)} kr</span>
                    </div>
                    <div className="flex justify-between text-gray-500 text-xs">
                        <span>MVA (25%)</span>
                        <span>{Math.round(annualPrice * 0.2)} kr</span>
                    </div>
                </div>

                <div className="border-t border-gray-900 my-4"></div>
                
                <div className="flex justify-between font-bold text-lg">
                    <span>TOTALT BELASTET</span>
                    <span>{annualPrice} kr</span>
                </div>
                <div className="mt-2 text-center text-xs text-gray-400">
                    Betalt med kort **** **** **** 4242
                </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-8">
              En LEK-sertifisert birøkter i ditt nærområde vil snart ta kontakt for å avtale levering. 
              Du finner kopi av avtalen under «Min Leieavtale» på Min Side.
            </p>
            
            <div className="flex justify-center gap-4 flex-wrap">
              <button 
                onClick={generateReceiptPDF}
                className="bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Last ned Kvittering
              </button>

              <button 
                onClick={async () => {
                  const { data: { user: currentUser } } = await supabase.auth.getUser();
                  if (currentUser && currentUser.id === user?.id) {
                     window.location.href = '/dashboard';
                  } else {
                     router.push('/login?next=/dashboard');
                  }
                }}
                className="bg-honey-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-honey-600 transition-colors shadow-lg"
              >
                Gå til Min Side
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Premium Info Modal */}
      {isPremiumModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative overflow-hidden">
             {/* Header Image / Pattern */}
             <div className="h-32 bg-gradient-to-br from-amber-500 to-orange-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="absolute bottom-0 left-0 p-6 text-white">
                    <h3 className="text-2xl font-bold">Premium Honning? 🍯</h3>
                    <p className="opacity-90 text-sm">Hvorfor det lønner seg med 4+ kuber</p>
                </div>
                <button 
                  onClick={() => setIsPremiumModalOpen(false)}
                  className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white rounded-full p-2 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
             </div>

             <div className="p-8 space-y-6">
                <div>
                    <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <Leaf className="w-5 h-5 text-green-600" />
                        Sommerhonning (Standard)
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        Den vanlige honningen biene lager av bringebær, kløver og hageblomster. 
                        Deilig, mild og lys. Selges typisk for <strong>200–250 kr/kg</strong>.
                    </p>
                </div>

                <div className="border-t border-gray-100"></div>

                <div>
                    <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <Coins className="w-5 h-5 text-amber-600" />
                        Lyng- og Skogshonning (Premium)
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        Kommer sent på sesongen. Krever at biene fraktes til heia/skogen. 
                        Mørkere, kraftigere smak og veldig ettertraktet.
                        Selges ofte for <strong>400–800 kr/kg</strong>!
                    </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm text-amber-900 font-bold mb-1">
                        Hvorfor 4 kuber er "Anbefalt"?
                    </p>
                    <p className="text-xs text-amber-800 leading-relaxed mb-3">
                        Med 4 kuber får du nok volum til at vi kan slynge din honning separat. 
                        Du får da DIN EGEN unike "Single Estate" honning med ditt navn på, som kan selges som eksklusiv vare. 
                        Mindre volum må ofte blandes med andre (Standard).
                    </p>
                    
                    <div className="bg-white/60 rounded-lg p-3 text-xs border border-amber-100">
                        <p className="font-bold text-amber-900 mb-1">💰 Din merverdi (Eksempel ved 20 kg salg):</p>
                        <div className="flex justify-between mb-1">
                            <span>Sommerhonning (Standard):</span>
                            <span className="font-mono">4.000 kr</span>
                        </div>
                        <div className="flex justify-between font-bold text-green-700 border-t border-amber-200 pt-1">
                            <span>Din Premium Honning:</span>
                            <span className="font-mono">8.000 kr</span>
                        </div>
                        <p className="text-right text-[10px] text-green-600 mt-1 italic">
                            + 100% verdiøkning med eget navn!
                        </p>
                    </div>
                </div>

                <button 
                  onClick={() => {
                    setIsPremiumModalOpen(false);
                    scrollToOrder(4);
                  }}
                  className="w-full bg-honey-600 text-white font-bold py-3 rounded-xl hover:bg-honey-700 transition-colors shadow-lg transform hover:scale-[1.02]"
                >
                  Jeg går for 4 kuber! 🍯
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
