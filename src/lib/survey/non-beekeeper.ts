import { Survey } from "./types";

const COUNTIES_OPTIONS = [
  { value: "Agder", label: "Agder" },
  { value: "Akershus", label: "Akershus" },
  { value: "Buskerud", label: "Buskerud" },
  { value: "Finnmark", label: "Finnmark" },
  { value: "Innlandet", label: "Innlandet" },
  { value: "Møre og Romsdal", label: "Møre og Romsdal" },
  { value: "Nordland", label: "Nordland" },
  { value: "Rogaland", label: "Rogaland" },
  { value: "Telemark", label: "Telemark" },
  { value: "Troms", label: "Troms" },
  { value: "Trøndelag", label: "Trøndelag" },
  { value: "Vestfold", label: "Vestfold" },
  { value: "Vestland", label: "Vestland" },
  { value: "Østfold", label: "Østfold" },
];

export const NonBeekeeperSurvey: Survey = {
  id: "LEK_BIENS_VOKTER_2_0_IKKE_BIRØKTER",
  version: "1.0.0",
  type: "NON_BEEKEEPER",
  title: "Markedsanalyse – Ikke birøkter",
  estimated_minutes: 5,
  sections: [
    {
      id: "nb_about",
      title: "Om deg",
      description: "Litt om ditt forhold til honning og bier.",
      order: 1,
      questions: [
        {
          id: "nb_eats_honey",
          text: "Spiser du mye honning?",
          type: "SINGLE_CHOICE",
          required: true,
          options: [
            { value: "ja", label: "Ja" },
            { value: "nei", label: "Nei" },
            { value: "vet_ikke", label: "Vet ikke" }
          ]
        },
        {
          id: "nb_rental_interest",
          text: "Hvis du kunne leie en bikube og ha den i din egen hage, der en erfaren birøkter tar seg av alt stell – ville du vurdert dette?",
          type: "SINGLE_CHOICE",
          required: true,
          options: [
            { value: "ja", label: "Ja" },
            { value: "kanskje", label: "Kanskje" },
            { value: "nei", label: "Nei" }
          ]
        },
        {
          id: "nb_rental_price",
          text: "Hva ville vært akseptabel pris per måned for å leie en bikube inkludert stell fra erfaren birøkter?",
          type: "DROPDOWN",
          required: false,
          visible_if: [
            { question_id: "nb_rental_interest", equals: ["ja", "kanskje"] }
          ],
          options: [
            { value: "199", label: "Inntil 199 kr per måned" },
            { value: "299", label: "Inntil 299 kr per måned" },
            { value: "399", label: "Inntil 399 kr per måned" },
            { value: "599", label: "Inntil 599 kr per måned" },
            { value: "999", label: "Inntil 999 kr per måned" },
            { value: "1000_plus", label: "Over 1000 kr per måned" },
            { value: "free", label: "Kun hvis det er gratis" }
          ]
        },
        {
          id: "nb_pollinator_importance",
          text: "Synes du det er viktig å ta vare på pollinatorer som bier?",
          type: "SINGLE_CHOICE",
          required: true,
          options: [
            { value: "ja", label: "Ja" },
            { value: "nei", label: "Nei" },
            { value: "vet_ikke", label: "Vet ikke" }
          ]
        },
        {
          id: "nb_county",
          text: "Hvilket fylke bor du i?",
          type: "DROPDOWN",
          required: true,
          options: COUNTIES_OPTIONS
        }
      ]
    },
    {
      id: "nb_disease",
      title: "Erfaring med biesykdommer",
      description: "Dine tanker om sykdom og smittevern.",
      order: 2,
      questions: [
        {
          id: "nb_digital_tool_interest",
          text: "Hvis det fantes et digitalt verktøy som gjorde birøktere i stand til å oppdage smitte tidlig – synes du de burde bruke dette?",
          type: "SINGLE_CHOICE",
          required: true,
          options: [
            { value: "Ja", label: "Ja" },
            { value: "Ja, hvis det er enkelt å bruke", label: "Ja, hvis det er enkelt å bruke" },
            { value: "Usikker", label: "Usikker" },
            { value: "Nei", label: "Nei" }
          ]
        },
        {
          id: "nb_disease_awareness",
          text: "Har du opplevd eller hørt om biesykdommer de siste 3 årene?",
          type: "SINGLE_CHOICE",
          required: true,
          options: [
            { value: "ja", label: "Ja" },
            { value: "nei", label: "Nei" },
            { value: "usikker", label: "Usikker" }
          ]
        },
        {
          id: "nb_disease_types",
          text: "Hvilke sykdommer har du hørt om?",
          type: "MULTI_CHOICE",
          required: false,
          visible_if: [
            { question_id: "nb_disease_awareness", equals: ["ja", "usikker"] }
          ],
          options: [
            { value: "varroa", label: "Varroa" },
            { value: "open_brood", label: "Åpen yngelråte" },
            { value: "closed_brood", label: "Lukket yngelråte" },
            { value: "nosema", label: "Nosema" },
            { value: "chalkbrood", label: "Kalkyngel" },
            { value: "stonebrood", label: "Steinyngel" },
            { value: "tracheal_mite", label: "Trakémidd" },
            { value: "deformed_wing", label: "Vingedeformitetsvirus" },
            { value: "american_foulbrood", label: "Amerikansk yngelråte" },
            { value: "european_foulbrood", label: "Europeisk yngelråte" },
            { value: "black_mold", label: "Svartesopp" },
            { value: "unknown", label: "Ukjent sykdom" }
          ]
        }
      ]
    },
    {
      id: "nb_open",
      title: "Åpne spørsmål",
      description: "Del dine tanker med oss.",
      order: 3,
      questions: [
        {
          id: "nb_knowledge",
          text: "Hva vet du om birøkt i dag?",
          type: "TEXT",
          required: false
        },
        {
          id: "nb_considered_starting",
          text: "Har du noen gang vurdert å starte med bier?",
          type: "TEXT",
          required: false
        }
      ]
    },
    {
      id: "nb_pilot",
      title: "Pilotprogram for leie av bikuber",
      description: "Mulighet for å teste konseptet.",
      order: 4,
      questions: [
        {
          id: "nb_pilot_interest",
          text: "Ønsker du å få mulighet til å teste leie av bikuber til sterkt reduserte priser før lansering?",
          type: "SINGLE_CHOICE",
          required: true,
          options: [
            { value: "ja", label: "Ja" },
            { value: "kanskje", label: "Kanskje" },
            { value: "nei", label: "Nei" }
          ]
        },
        {
          id: "nb_pilot_email",
          text: "E-post for invitasjon til pilot",
          type: "EMAIL",
          required: false,
          visible_if: [
            { question_id: "nb_pilot_interest", equals: ["ja", "kanskje"] }
          ]
        }
      ]
    }
  ]
};
