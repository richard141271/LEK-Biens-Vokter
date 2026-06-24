export const SUBSCRIPTION_PLANS = ['FREE', 'PLUS', 'PREMIUM', 'PRO'] as const;

export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

export const SUBSCRIPTION_FEATURES = [
  'unlimited_inspections',
  'advanced_reports',
  'ai_assistant',
  'disease_ai',
  'multi_user',
  'future_mattilsyn',
] as const;

export type SubscriptionFeature = (typeof SUBSCRIPTION_FEATURES)[number];

export type SubscriptionFeatureConfig = {
  key: SubscriptionFeature;
  title: string;
  description: string;
  minPlan: SubscriptionPlan;
  comingSoon?: boolean;
};

export const PLAN_ORDER: Record<SubscriptionPlan, number> = {
  FREE: 0,
  PLUS: 1,
  PREMIUM: 2,
  PRO: 3,
};

export const PLAN_DETAILS: Record<
  SubscriptionPlan,
  { label: string; shortDescription: string; longDescription: string }
> = {
  FREE: {
    label: 'Free',
    shortDescription: 'For oppstart og enkel oversikt.',
    longDescription: 'Grunnnivå for brukere som vil komme i gang med birøkt og de viktigste kjernefunksjonene.',
  },
  PLUS: {
    label: 'Plus',
    shortDescription: 'For aktiv drift og mer bruk i hverdagen.',
    longDescription: 'Utvider hverdagsbruk med flere inspeksjoner og bedre flyt for brukere med jevn aktivitet.',
  },
  PREMIUM: {
    label: 'Premium',
    shortDescription: 'For avansert oppfolging og samarbeid.',
    longDescription: 'Samler mer avanserte verktoy, rapporter og KI-stotte for brukere som vil mer.',
  },
  PRO: {
    label: 'Pro',
    shortDescription: 'For full tilgang og fremtidige spesialmoduler.',
    longDescription: 'Topplanen for pilotperioden med bredest funksjonsdekning og plass til nye profesjonelle moduler.',
  },
};

export const SUBSCRIPTION_FEATURE_CONFIG: SubscriptionFeatureConfig[] = [
  {
    key: 'unlimited_inspections',
    title: 'Ubegrensede inspeksjoner',
    description: 'For brukere som registrerer mye og vil slippe kunstige volumgrenser senere.',
    minPlan: 'PLUS',
  },
  {
    key: 'advanced_reports',
    title: 'Avanserte rapporter',
    description: 'Dypere historikk, innsikt og sammenstillinger for videre oppfolging.',
    minPlan: 'PREMIUM',
  },
  {
    key: 'ai_assistant',
    title: 'AI-assistent',
    description: 'Mer avansert veiledning og anbefalinger i arbeidsflyten.',
    minPlan: 'PREMIUM',
  },
  {
    key: 'disease_ai',
    title: 'Sykdoms-AI',
    description: 'Mer avansert KI-stotte for sykdomsvurdering og beslutningshjelp.',
    minPlan: 'PRO',
  },
  {
    key: 'multi_user',
    title: 'Flere brukere',
    description: 'Stotte for deling, samarbeid og flere roller rundt samme drift.',
    minPlan: 'PREMIUM',
  },
  {
    key: 'future_mattilsyn',
    title: 'Mattilsyn-integrasjon',
    description: 'Plassholder for fremtidig myndighets- og rapporteringsintegrasjon.',
    minPlan: 'PRO',
    comingSoon: true,
  },
];

type ProfileLike = {
  plan?: unknown;
  is_pilot_user?: unknown;
  feature_overrides?: unknown;
} | null | undefined;

export function normalizeSubscriptionPlan(value: unknown): SubscriptionPlan {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  if (SUBSCRIPTION_PLANS.includes(normalized as SubscriptionPlan)) {
    return normalized as SubscriptionPlan;
  }
  return 'PRO';
}

export function getPlanLabel(plan: SubscriptionPlan) {
  return PLAN_DETAILS[plan].label;
}

export function getPlanBadgeLabel(plan: SubscriptionPlan) {
  if (plan === 'PRO') return 'Pro-funksjon';
  if (plan === 'PREMIUM') return 'Premium-funksjon';
  if (plan === 'PLUS') return 'Plus-funksjon';
  return 'Free';
}

export function getProfileSubscriptionState(profile: ProfileLike) {
  const plan = normalizeSubscriptionPlan(profile?.plan);
  const isPilotUser = typeof profile?.is_pilot_user === 'boolean' ? profile.is_pilot_user : true;
  const featureOverrides: Partial<Record<SubscriptionFeature, boolean>> = {};
  const rawOverrides = profile?.feature_overrides;

  if (rawOverrides && typeof rawOverrides === 'object' && !Array.isArray(rawOverrides)) {
    for (const featureKey of SUBSCRIPTION_FEATURES) {
      const overrideValue = (rawOverrides as Record<string, unknown>)[featureKey];
      if (typeof overrideValue === 'boolean') {
        featureOverrides[featureKey] = overrideValue;
      }
    }
  }

  return {
    plan,
    isPilotUser,
    featureOverrides,
  };
}

export function isFeatureIncludedInPlan(feature: SubscriptionFeature, plan: SubscriptionPlan) {
  const config = SUBSCRIPTION_FEATURE_CONFIG.find((item) => item.key === feature);
  if (!config) return false;
  return PLAN_ORDER[plan] >= PLAN_ORDER[config.minPlan];
}

export function getFeatureAccess(profile: ProfileLike, feature: SubscriptionFeature) {
  const state = getProfileSubscriptionState(profile);
  const override = state.featureOverrides[feature];
  if (typeof override === 'boolean') return override;
  return isFeatureIncludedInPlan(feature, state.plan);
}

export function getFeaturesForPlan(plan: SubscriptionPlan) {
  return SUBSCRIPTION_FEATURE_CONFIG.filter((feature) => isFeatureIncludedInPlan(feature.key, plan));
}
