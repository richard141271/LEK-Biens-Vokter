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

export const BeekeeperSurvey: Survey = { 
   id: "LEK_BIENS_VOKTER_BIRØKTER", 
   version: "1.0.0", 
   type: "BEEKEEPER", 
   title: "Behovsanalyse – Birøkter", 
   estimated_minutes: 7, 
 
   sections: [ 
     { 
       id: "profile", 
       title: "Om deg som birøkter", 
       order: 1, 
       questions: [ 
         { 
           id: "hives_count", 
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
           id: "experience_years", 
           text: "Hvor lenge har du drevet med birøkt?", 
           type: "DROPDOWN", 
           required: true, 
           options: [ 
             { value: "1_3", label: "1–3 år" }, 
             { value: "3_10", label: "3–10 år" }, 
             { value: "10_plus", label: "Over 10 år" } 
           ] 
         }, 
         { 
           id: "nbl_member", 
           text: "Er du medlem av Norges Birøkterlag?", 
           type: "SINGLE_CHOICE", 
           required: true, 
           options: [ 
             { value: "yes", label: "Ja" }, 
             { value: "no", label: "Nei" } 
           ] 
         }, 
         { 
           id: "county", 
           text: "Hvilket fylke driver du i?", 
           type: "DROPDOWN", 
           required: true,
           options: COUNTIES_OPTIONS
         } 
       ] 
     }, 
 
     { 
       id: "disease", 
       title: "Erfaring med sykdom", 
       order: 2, 
       questions: [ 
         { 
           id: "disease_last_3y", 
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
           id: "disease_types", 
           text: "Hvilke sykdommer har du erfart?", 
           type: "MULTI_CHOICE", 
           required: false, 
           visible_if: [{ question_id: "disease_last_3y", equals: "yes" }], 
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
       id: "work_method", 
       title: "Dagens arbeidsmetoder", 
       order: 3, 
       questions: [ 
         { 
           id: "inspection_logging", 
           text: "Hvordan registrerer du inspeksjoner i dag?", 
           type: "DROPDOWN", 
           required: true, 
           options: [ 
             { value: "none", label: "Ingen systematisk registrering" }, 
             { value: "paper", label: "Papir / notater" }, 
             { value: "excel", label: "Excel / regneark" }, 
             { value: "app", label: "Digital løsning / app" } 
           ] 
         }, 
         { 
           id: "weekly_documentation_time", 
           text: "Hvor mye tid bruker du på dokumentasjon per uke?", 
           type: "DROPDOWN", 
           required: true, 
           options: [ 
             { value: "0_15", label: "0–15 minutter" }, 
             { value: "15_30", label: "15–30 minutter" }, 
             { value: "30_60", label: "30–60 minutter" }, 
             { value: "60_plus", label: "Over 1 time" } 
           ] 
         } 
       ] 
     }, 
 
     { 
       id: "value", 
       title: "Verdi av et digitalt system", 
       order: 4, 
       questions: [ 
         { 
           id: "value_automatic_alert", 
           text: "Automatisk smittevarsling", 
           type: "SCALE_1_5", 
           required: true 
         }, 
         { 
           id: "value_nearby_alert", 
           text: "Varsling til nærliggende bigårder", 
           type: "SCALE_1_5", 
           required: true 
         }, 
         { 
           id: "value_reporting", 
           text: "Enkel rapportering til Mattilsynet", 
           type: "SCALE_1_5", 
           required: true 
         }, 
         { 
           id: "value_overview", 
           text: "Bedre oversikt over egen bigård", 
           type: "SCALE_1_5", 
           required: true 
         } 
       ] 
     }, 
 
     { 
       id: "main", 
       title: "Hovedspørsmål", 
       order: 5, 
       questions: [ 
         { 
           id: "would_use_system", 
           text: "Ville du brukt et slikt system?", 
           type: "SINGLE_CHOICE", 
           required: true, 
           options: [ 
             { value: "yes", label: "Ja" }, 
             { value: "yes_simple", label: "Ja, hvis det er enkelt å bruke" }, 
             { value: "unsure", label: "Vet ikke" }, 
             { value: "no", label: "Nei" } 
           ] 
         } 
       ] 
     }, 
 
     { 
       id: "pricing", 
       title: "Pris og betalingsvilje", 
       order: 6, 
       questions: [ 
         { 
           id: "acceptable_price", 
           text: "Hva ville vært akseptabel pris per år?", 
           type: "DROPDOWN", 
           required: true, 
           options: [ 
             { value: "500", label: "Inntil 500 kr" }, 
             { value: "1000", label: "Inntil 1000 kr" }, 
             { value: "2000", label: "Inntil 2000 kr" }, 
             { value: "3000", label: "Over 2000 kr" } 
           ] 
         } 
       ] 
     },
     { 
       id: "open", 
       title: "Åpne spørsmål", 
       order: 7, 
       questions: [ 
         { 
           id: "biggest_challenge", 
           text: "Hva er din største utfordring som birøkter i dag?", 
           type: "TEXT", 
           required: false 
         }, 
         { 
           id: "desired_features", 
           text: "Hvilke funksjoner ønsker du deg mest i en slik app?", 
           type: "TEXT", 
           required: false 
         } 
       ] 
     }, 
 
     { 
       id: "pilot", 
       title: "Pilotprogram", 
       order: 8, 
       questions: [ 
         { 
           id: "pilot_interest", 
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
           id: "pilot_email", 
           text: "E-post for invitasjon til pilot", 
           type: "EMAIL", 
           required: false, 
           visible_if: [{ question_id: "pilot_interest", equals: ["yes", "maybe"] }] 
         } 
       ] 
     } 
   ] 
 };