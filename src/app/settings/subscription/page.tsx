'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BadgeCheck, Crown, Sparkles } from 'lucide-react';
import { createClient, getUserWithSessionFallback } from '@/utils/supabase/client';
import {
  getFeatureAccess,
  getFeaturesForPlan,
  getPlanBadgeLabel,
  getPlanLabel,
  getProfileSubscriptionState,
  PLAN_DETAILS,
  SUBSCRIPTION_FEATURE_CONFIG,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlan,
} from '@/lib/subscriptions';

export default function SubscriptionSettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const user = await getUserWithSessionFallback(supabase);
        if (!user) {
          router.push('/login');
          return;
        }

        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (isMounted) setProfile(data || {});
      } catch (e: any) {
        if (isMounted) setError(String(e?.message || 'Kunne ikke hente abonnement'));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load().catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  const subscription = getProfileSubscriptionState(profile);
  const activePlan = subscription.plan;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 border-b border-gray-200 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/settings" className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mitt abonnement</h1>
          <p className="text-xs text-gray-500">Arkitektur og planoversikt for kommende abonnementer</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {loading ? <div className="p-6 text-center text-gray-600">Laster...</div> : null}
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4">{error}</div>
        ) : null}

        {!loading && !error ? (
          <>
            <div className="bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white rounded-3xl shadow-xl p-6">
              <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-black text-honey-300 bg-white/10 px-3 py-1 rounded-full mb-3">
                    <Crown className="w-3.5 h-3.5" />
                    Aktiv plan: {getPlanLabel(activePlan)}
                  </div>
                  <h2 className="text-2xl font-black">Abonnementsarkitekturen er klar, men betaling er ikke aktivert.</h2>
                  <p className="text-sm text-gray-200 mt-3 max-w-xl">
                    Alle brukere ligger forelopig pa <span className="font-black">PRO</span>, slik at funksjoner
                    fortsatt er tilgjengelige under utvikling og pilotperiode.
                  </p>
                </div>

                <div className="bg-white/10 border border-white/15 rounded-2xl p-4 min-w-[240px]">
                  <div className="text-xs uppercase tracking-[0.18em] text-gray-300 font-black">Status akkurat na</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-300">Lagret plan</span>
                      <span className="font-black">{activePlan}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-300">Pilotbruker</span>
                      <span className="font-black">{subscription.isPilotUser ? 'Ja' : 'Nei'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-300">Betaling</span>
                      <span className="font-black">Ikke aktiv</span>
                    </div>
                  </div>
                </div>
              </div>

              {subscription.isPilotUser ? (
                <div className="mt-5 bg-honey-400/15 border border-honey-300/20 rounded-2xl p-4 text-sm text-honey-50">
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="w-5 h-5 mt-0.5 text-honey-300 shrink-0" />
                    <div>
                      <div className="font-black text-honey-200">Pilotbruker</div>
                      <div className="mt-1">
                        Du deltar i pilotperioden og har midlertidig tilgang til alle funksjoner.
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {SUBSCRIPTION_PLANS.map((plan) => {
                const isActive = plan === activePlan;
                const planFeatures = getFeaturesForPlan(plan as SubscriptionPlan);
                return (
                  <div
                    key={plan}
                    className={`rounded-3xl border p-5 shadow-sm ${
                      isActive ? 'border-honey-300 bg-honey-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-gray-500 font-black">{plan}</div>
                        <h3 className="text-xl font-black text-gray-900 mt-1">{PLAN_DETAILS[plan].label}</h3>
                      </div>
                      <span
                        className={`text-[11px] font-black px-3 py-1 rounded-full border ${
                          isActive
                            ? 'bg-honey-100 text-honey-800 border-honey-300'
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                      >
                        {isActive ? 'Aktiv na' : 'Kommer'}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mt-3">{PLAN_DETAILS[plan].shortDescription}</p>
                    <p className="text-xs text-gray-500 mt-2">{PLAN_DETAILS[plan].longDescription}</p>

                    <div className="mt-4 space-y-2">
                      {planFeatures.map((feature) => (
                        <div key={feature.key} className="text-sm text-gray-700 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-honey-600 shrink-0" />
                          <span>{feature.title}</span>
                        </div>
                      ))}
                      {planFeatures.length === 0 ? (
                        <div className="text-sm text-gray-500">Grunnfunksjoner og oppstart.</div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-start justify-between gap-4 flex-col md:flex-row md:items-center">
                <div>
                  <h2 className="text-lg font-black text-gray-900">Funksjonsstyring</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Merkingen under viser fremtidig planplassering. Ingen funksjoner lases faktisk enda.
                  </p>
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  Alle brukere har fortsatt midlertidig tilgang under pilot.
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                {SUBSCRIPTION_FEATURE_CONFIG.map((feature) => {
                  const includedNow = getFeatureAccess(profile, feature.key);
                  return (
                    <div key={feature.key} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-black text-gray-900">{feature.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                        </div>
                        <span
                          className={`shrink-0 text-[11px] font-black px-3 py-1 rounded-full border ${
                            feature.minPlan === 'PRO'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : feature.minPlan === 'PREMIUM'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {getPlanBadgeLabel(feature.minPlan)}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                        <span className="font-medium text-gray-500">Flagg: {feature.key}</span>
                        <span
                          className={`font-black px-2.5 py-1 rounded-full ${
                            includedNow ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {includedNow ? 'Tilgjengelig i pilot' : 'Kommer senere'}
                        </span>
                      </div>

                      {feature.comingSoon ? (
                        <div className="mt-3 text-xs text-gray-500">Merket som fremtidig modul og ikke aktivert enda.</div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
