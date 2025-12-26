'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, TrendingUp, ShieldCheck, Copy, CheckCircle, AlertCircle, ChevronRight, DollarSign } from 'lucide-react';

type NetworkStats = {
  level1: number;
  level2: number;
  level3: number;
  earnings: number;
  salesCommission: number;
  referralCode: string;
};

export default function NetworkPage() {
  const [loading, setLoading] = useState(true);
  const [agreementSigned, setAgreementSigned] = useState(false);
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      setUserProfile(profile);
      if (profile.mlm_agreement_signed_at) {
        setAgreementSigned(true);
        fetchNetworkStats(user.id);
      } else {
        setLoading(false); // Stop loading to show agreement
      }
    }
  };

  const fetchNetworkStats = async (userId: string) => {
    try {
      // Fetch the projection view we created
      const { data: projection } = await supabase
        .from('view_mlm_monthly_projection')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Fetch accumulated sales commissions
      const { data: commissions } = await supabase
        .from('commissions')
        .select('amount')
        .eq('beneficiary_id', userId)
        .eq('type', 'sales_commission');

      const totalSalesCommission = commissions?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

      setStats({
        level1: projection?.level_1_count || 0,
        level2: projection?.level_2_count || 0,
        level3: projection?.level_3_count || 0,
        earnings: projection?.estimated_monthly_earnings || 0,
        salesCommission: totalSalesCommission,
        referralCode: userProfile?.referral_code || '---'
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const signAgreement = async () => {
    const { error } = await supabase
      .from('profiles')
      .update({ mlm_agreement_signed_at: new Date().toISOString() })
      .eq('id', userProfile.id);

    if (!error) {
      setAgreementSigned(true);
      fetchNetworkStats(userProfile.id);
    } else {
      console.error('Sign agreement error:', error);
      alert(`Kunne ikke signere avtalen. Feilmelding: ${error.message} (Kode: ${error.code || 'ukjent'})`);
    }
  };

  const copyCode = () => {
    if (userProfile?.referral_code) {
      navigator.clipboard.writeText(userProfile.referral_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-honey-500"></div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // VIEW: AGREEMENT (Gatekeeper)
  // ----------------------------------------------------------------------
  if (!agreementSigned) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-honey-500 p-6 text-white">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-8 h-8" />
              Frilanser & Partneravtale
            </h1>
          </div>
          <div className="p-8 space-y-6">
            <div className="prose prose-sm text-gray-600 max-h-96 overflow-y-auto bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-bold text-gray-900">1. Innledning</h3>
              <p>
                Denne avtalen regulerer forholdet mellom LEK-Biens Vokter (heretter "Selskapet") og deg som selvstendig partner/frilanser.
              </p>
              
              <h3 className="font-bold text-gray-900">2. Kompensasjonsplan</h3>
              <p>
                Du har rett til provisjon basert på salg og medlemskap i ditt nettverk ned til 3. ledd.
                <br/>- Nivå 1: 50 NOK/mnd pr aktivt medlem
                <br/>- Nivå 2: 30 NOK/mnd pr aktivt medlem
                <br/>- Nivå 3: 10 NOK/mnd pr aktivt medlem
                <br/>+ 1% provisjon av all vareomsetning i disse tre leddene.
              </p>

              <h3 className="font-bold text-gray-900">3. Selvstendig Næringsdrivende</h3>
              <p>
                Du opptrer som selvstendig oppdragstaker. Du er selv ansvarlig for å rapportere inntekt og betale skatt i henhold til norsk lov.
                Selskapet foretar ingen skattetrekk med mindre pålagt ved lov.
              </p>

              <h3 className="font-bold text-gray-900">4. Etiske Retningslinjer</h3>
              <p>
                Partneren forplikter seg til å opptre profesjonelt og ikke gi villedende informasjon om produktene eller inntjeningsmulighetene.
              </p>
            </div>

            <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <AlertCircle className="w-6 h-6 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                Ved å gå videre bekrefter du at du har lest og forstått vilkårene, og at du opererer som en selvstendig aktør (frilanser).
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Avbryt
              </button>
              <button 
                onClick={signAgreement}
                className="flex-1 bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg flex items-center justify-center gap-2"
              >
                Signer og Gå til Nettverk
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // VIEW: DASHBOARD
  // ----------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white pt-8 pb-24 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-honey-500/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <button 
            onClick={() => router.push('/dashboard')}
            className="mb-6 flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Tilbake til Oversikt
          </button>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Users className="w-8 h-8 text-honey-400" />
                Mitt Partnernettverk
              </h1>
              <p className="text-gray-400">
                Bygg din bikube og tjen passiv inntekt.
              </p>
            </div>
            
            {/* Referral Code Card */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl flex flex-col gap-2 min-w-[250px]">
              <span className="text-xs font-bold uppercase text-honey-400 tracking-wider">Din Vervekode</span>
              <button 
                onClick={copyCode}
                className="flex items-center justify-between gap-4 bg-black/30 p-3 rounded-lg hover:bg-black/50 transition-colors group"
              >
                <span className="font-mono text-xl font-bold tracking-widest text-white">
                  {userProfile?.referral_code || '...'}
                </span>
                {copied ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-400 group-hover:text-white" />
                )}
              </button>
              <span className="text-[10px] text-gray-500">Trykk for å kopiere</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-20 space-y-6">
        
        {/* Earnings Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-green-500">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-bold uppercase">Estimert månedsinntekt</p>
                        <h2 className="text-3xl font-black text-gray-900">
                            {stats?.earnings.toLocaleString()} NOK
                        </h2>
                    </div>
                </div>
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                    Basert på aktivt medlemskap i ditt nettverk. Utbetales månedlig.
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-honey-500">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-honey-100 flex items-center justify-center text-honey-600">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-bold uppercase">Salgsbonus (1%)</p>
                        <h2 className="text-3xl font-black text-gray-900">
                            {stats?.salesCommission.toLocaleString()} NOK
                        </h2>
                    </div>
                </div>
                 <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                    1% av all omsetning i dine 3 ledd. Oppdateres fortløpende.
                </div>
            </div>
        </div>

        {/* Network Tree Visualization */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-900">Din Bikube (Struktur)</h3>
                <span className="bg-honey-100 text-honey-800 px-3 py-1 rounded-full text-xs font-bold">
                    {(stats?.level1 || 0) + (stats?.level2 || 0) + (stats?.level3 || 0)} Totalt
                </span>
            </div>
            
            <div className="p-8">
                {/* Level 1 */}
                <div className="relative pl-8 pb-8 border-l-2 border-honey-200 last:border-0">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-honey-500 ring-4 ring-white"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-bold text-gray-900 text-lg">Nivå 1 (Dine rekrutter)</h4>
                            <p className="text-gray-500 text-sm">Du tjener 50 NOK/mnd pr person</p>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-bold text-gray-900">{stats?.level1}</span>
                            <span className="block text-xs text-gray-400 font-bold uppercase">Personer</span>
                        </div>
                    </div>
                    <div className="mt-4 bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                        <strong>Potensiale:</strong> {stats?.level1 || 0} x 50 = <strong>{(stats?.level1 || 0) * 50} NOK/mnd</strong>
                    </div>
                </div>

                {/* Level 2 */}
                <div className="relative pl-8 pb-8 border-l-2 border-honey-200 last:border-0">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-honey-300 ring-4 ring-white"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-bold text-gray-900 text-lg">Nivå 2</h4>
                            <p className="text-gray-500 text-sm">Du tjener 30 NOK/mnd pr person</p>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-bold text-gray-900">{stats?.level2}</span>
                            <span className="block text-xs text-gray-400 font-bold uppercase">Personer</span>
                        </div>
                    </div>
                    <div className="mt-4 bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                        <strong>Potensiale:</strong> {stats?.level2 || 0} x 30 = <strong>{(stats?.level2 || 0) * 30} NOK/mnd</strong>
                    </div>
                </div>

                {/* Level 3 */}
                <div className="relative pl-8">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-honey-100 ring-4 ring-white"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-bold text-gray-900 text-lg">Nivå 3</h4>
                            <p className="text-gray-500 text-sm">Du tjener 10 NOK/mnd pr person</p>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-bold text-gray-900">{stats?.level3}</span>
                            <span className="block text-xs text-gray-400 font-bold uppercase">Personer</span>
                        </div>
                    </div>
                    <div className="mt-4 bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                        <strong>Potensiale:</strong> {stats?.level3 || 0} x 10 = <strong>{(stats?.level3 || 0) * 10} NOK/mnd</strong>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}
