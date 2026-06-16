export type ToolboxCategory = 'active' | 'extra' | 'premium';

export type ToolboxTool = {
  id: string;
  name: string;
  description: string;
  category: ToolboxCategory;
  showOnDashboard: boolean;
  defaultEnabled: boolean;
  directHref?: string;
  locked?: boolean;
};

export const TOOLBOX_TOOLS: ToolboxTool[] = [
  {
    id: 'aurora',
    name: '🐝 Aurora Birøkterassistent',
    description: 'Gir forslag og oppfølging basert på inspeksjoner.',
    category: 'active',
    showOnDashboard: true,
    defaultEnabled: true,
    directHref: '/dashboard',
  },
  {
    id: 'varroascan',
    name: '📷 LEK-VarroaScan™',
    description: 'Analyserer innsendte bilder av varroamidd.',
    category: 'active',
    showOnDashboard: true,
    defaultEnabled: true,
    directHref: '/dashboard',
  },
  {
    id: 'health_ai',
    name: '🩺 Helse & AI',
    description: 'Smittevern, rapportering og KI-støtte.',
    category: 'active',
    showOnDashboard: true,
    defaultEnabled: true,
    directHref: '/dashboard/smittevern',
  },
  {
    id: 'disease_guide',
    name: '📖 Sykdomsveileder',
    description: 'Oppslagsverk for sykdommer og tiltak.',
    category: 'active',
    showOnDashboard: true,
    defaultEnabled: true,
    directHref: '/dashboard/smittevern/veileder',
  },
  {
    id: 'offline',
    name: '📶 Offline-modus',
    description: 'Last ned data lokalt og bruk appen uten nett.',
    category: 'active',
    showOnDashboard: true,
    defaultEnabled: true,
    directHref: '/dashboard',
  },
  {
    id: 'apiary_tasks',
    name: '📝 Bigårdsoppgaver',
    description: 'Oversikt over åpne oppgaver per bigård.',
    category: 'active',
    showOnDashboard: true,
    defaultEnabled: true,
    directHref: '/dashboard',
  },
  {
    id: 'voice_inspection_beta',
    name: '🎤 Stemmeinspeksjon (Beta)',
    description: 'Stemmefunksjoner og forbedringer av tale under inspeksjon.',
    category: 'extra',
    showOnDashboard: false,
    defaultEnabled: false,
    directHref: '/tools/voice',
  },
  {
    id: 'word_training',
    name: '📚 Ordtrening',
    description: 'Tren stemmegjenkjenningen med ord og setninger fra inspeksjonen.',
    category: 'extra',
    showOnDashboard: false,
    defaultEnabled: false,
    directHref: '/tools/word-training',
  },
  {
    id: 'labels_print',
    name: '🏷️ Etiketter & Utskrift',
    description: 'Lag etiketter til honning og utskrifter.',
    category: 'extra',
    showOnDashboard: false,
    defaultEnabled: false,
    directHref: '/tools/labels',
  },
  {
    id: 'operations_material',
    name: '📦 Driftsmateriell',
    description: 'Skilt, utskrifter og praktiske ressurser.',
    category: 'extra',
    showOnDashboard: false,
    defaultEnabled: false,
    directHref: '/tools/driftsmateriell',
  },
  {
    id: 'hive_cards_qr',
    name: '🔲 Bikubekort & QR',
    description: 'Stamkort og merking (for alle kuber).',
    category: 'extra',
    showOnDashboard: false,
    defaultEnabled: false,
    directHref: '/settings?print=bikube',
  },
  {
    id: 'aurora_pro',
    name: '🔒 Aurora Pro',
    description: 'Premiumfunksjoner for avansert oppfølging.',
    category: 'premium',
    showOnDashboard: false,
    defaultEnabled: false,
    locked: true,
  },
  {
    id: 'premium_auto_image',
    name: '🔒 Automatisk bildeanalyse',
    description: 'Automatisk tolkning av bilder og funn.',
    category: 'premium',
    showOnDashboard: false,
    defaultEnabled: false,
    locked: true,
  },
  {
    id: 'premium_queen_analysis',
    name: '🔒 Dronninganalyse',
    description: 'Støtte for merking og vurdering av dronning.',
    category: 'premium',
    showOnDashboard: false,
    defaultEnabled: false,
    locked: true,
  },
  {
    id: 'premium_breeding_assistant',
    name: '🔒 Avlsassistent',
    description: 'Planlegging og støtte for avl.',
    category: 'premium',
    showOnDashboard: false,
    defaultEnabled: false,
    locked: true,
  },
  {
    id: 'premium_predictive_risk',
    name: '🔒 Prediktiv kuberisiko',
    description: 'Varsler risiko før den oppstår (premium).',
    category: 'premium',
    showOnDashboard: false,
    defaultEnabled: false,
    locked: true,
  },
];

export function getToolById(toolId: string) {
  return TOOLBOX_TOOLS.find((t) => t.id === toolId);
}

export function getDefaultToolEnabled(toolId: string) {
  return getToolById(toolId)?.defaultEnabled ?? false;
}
