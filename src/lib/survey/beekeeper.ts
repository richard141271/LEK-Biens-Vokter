import { Survey } from "./types";

export const BeekeeperSurvey: Survey = {
  id: "LEK_BIENS_VOKTER_2_0_BIRØKTER",
  version: "1.0.0",
  type: "BEEKEEPER",
  title: "Behovsanalyse – Birøkter",
  estimated_minutes: 7,
  sections: [
    {
      id: "bk_profile",
      title: "Om deg som birøkter",
      order: 1,
      questions: [
        {
          id: "bk_hives_count",
          text: "Hvor mange kuber har du?",
          type: "DROPDOWN",
          required: true,
          options: [
            { value: "1_4", label: "1–4 kuber" },
            { value: "5_10", label: "5–10 kuber" },
            { value: "11_30", label: "11–30 kuber" },
            { value: "30_plus", label: "Over 30 kuber" }
          ]
        },
        {
          id: "bk_experience_years",
          text: "Hvor lenge har du drevet med birøkt?",
          type: "DROPDOWN",
          required: true,
          options: [
            { value: "0_1", label: "Under 1 år" },
            { value: "1_3", label: "1–3 år" },
            { value: "3_10", label: "3–10 år" },
            { value: "10_plus", label: "Over 10 år" }
          ]
        }
      ]
    },
    {
      id: "bk_disease",
      title: "Erfaring med sykdom",
      order: 2,
      questions: [
        {
          id: "bk_disease_last_3y",
          text: "Har du opplevd sykdom i kubene de siste 3 årene?",
          type: "SINGLE_CHOICE",
          required: true,
          options: [
            { value: "yes", label: "Ja" },
            { value: "no", label: "Nei" },
            { value: "unsure", label: "Usikker" }
          ]
        },
        {
          id: "bk_disease_types",
          text: "Hvilke sykdommer har du erfart?",
          type: "MULTI_CHOICE",
          required: false,
          visible_if: [
            { question_id: "bk_disease_last_3y", equals: "yes" }
          ],
          options: [
            { value: "varroa", label: "Varroa" },
            { value: "open_brood", label: "Åpen yngelråte" },
            { value: "closed_brood", label: "Lukket yngelråte" },
            { value: "nosema", label: "Nosema" },
            { value: "chalkbrood", label: "Kalkyngel" },
            { value: "stonebrood", label: "Steinyngel" }
          ]
        }
      ]
    },
    {
      id: "bk_main",
      title: "Hovedspørsmål",
      order: 5,
      questions: [
        {
          id: "bk_use_system",
          text: "Ville du brukt et digitalt verktøy som hjelper å oppdage smitte tidlig?",
          type: "SINGLE_CHOICE",
          required: true,
          options: [
            { value: "yes", label: "Ja" },
            { value: "yes_simple", label: "Ja, hvis det er enkelt å bruke" },
            { value: "unsure", label: "Usikker" },
            { value: "no", label: "Nei" }
          ]
        }
      ]
    },
    {
      id: "bk_pilot",
      title: "Pilotprogram",
      order: 8,
      questions: [
        {
          id: "bk_pilot_interest",
          text: "Ønsker du å delta i pilotprogram?",
          type: "SINGLE_CHOICE",
          required: true,
          options: [
            { value: "yes", label: "Ja" },
            { value: "maybe", label: "Kanskje" },
            { value: "no", label: "Nei" }
          ]
        },
        {
          id: "bk_pilot_email",
          text: "E-post for invitasjon til pilot",
          type: "EMAIL",
          required: false,
          visible_if: [
            { question_id: "bk_pilot_interest", equals: "yes" }
          ]
        }
      ]
    }
  ]
};
