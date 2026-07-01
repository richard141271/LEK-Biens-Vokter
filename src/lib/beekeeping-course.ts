export type BeekeepingCourseModule = {
  slug: string;
  title: string;
  description: string;
  knowledgeSlugs: string[];
};

export const beekeepingCourseModules: BeekeepingCourseModule[] = [
  {
    slug: 'dronning-og-egg',
    title: 'Dronning og Egg',
    description: 'Grunnforstaelse av dronningsituasjon, eggfunn og hva som krever rask ny kontroll.',
    knowledgeSlugs: [
      'queen_seen_yes',
      'queen_seen_no',
      'queen_unknown',
      'queen_missing',
      'eggs_seen_yes',
      'eggs_seen_no',
      'egg_lite',
      'egg_mye',
    ],
  },
  {
    slug: 'yngel-og-bistyrke',
    title: 'Yngel og Bistyrke',
    description: 'Hvordan larver, yngel, droner og bistyrke brukes til a lese utvikling og kapasitet i kuben.',
    knowledgeSlugs: [
      'larver_lite',
      'larver_normal',
      'yngel_lite',
      'yngel_normal',
      'droner_mye',
      'bistyrke_3_4',
      'bistyrke_7_8',
      'bistyrke_9_plus',
    ],
  },
  {
    slug: 'for-og-tiltak',
    title: 'For og Tiltak',
    description: 'Praktisk oppfolging av forstatus, stotteforing og vanlige inngrep i inspeksjonsarbeidet.',
    knowledgeSlugs: [
      'for_tomt',
      'for_lite',
      'for_middels',
      'gitt_for',
      'for_type_nodfor',
      'for_type_sukkerlake',
      'satt_pa_skattekasse',
      'laget_avlegger',
    ],
  },
  {
    slug: 'sykdom-og-varsler',
    title: 'Sykdom og Varsler',
    description: 'Kursmodul for sykdomstegn, deformerte vinger, varroa og biologiske regler som Aurora kan forklare.',
    knowledgeSlugs: [
      'deformerte_vinger',
      'varroa_mistanke',
      'sykdom',
      'rule_varroa_med_deformerte_vinger',
      'rule_queen_not_seen_but_eggs_seen',
      'rule_for_lite_host_prioritet_hoy',
    ],
  },
];

export const beekeepingCourseKnowledgeSlugs = beekeepingCourseModules.flatMap((module) => module.knowledgeSlugs);
