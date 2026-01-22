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
             { value: "1–4 kuber", label: "1–4 kuber" }, 
             { value: "5–9 kuber", label: "5–9 kuber" }, 
             { value: "10–24 kuber", label: "10–24 kuber" }, 
             { value: "25–49 kuber", label: "25–49 kuber" }, 
             { value: "50 kuber eller flere", label: "50 kuber eller flere" } 
           ] 
         }, 
         { 
           id: "experience_years", 
           text: "Hvor lenge har du drevet med birøkt?", 
           type: "DROPDOWN", 
           required: true, 
           options: [ 
             { value: "Mindre enn 1 år", label: "Mindre enn 1 år" }, 
             { value: "1–3 år", label: "1–3 år" }, 
             { value: "4–10 år", label: "4–10 år" }, 
             { value: "11–20 år", label: "11–20 år" }, 
             { value: "Mer enn 20 år", label: "Mer enn 20 år" } 
           ] 
         }, 
         { 
           id: "nbl_member", 
           text: "Er du medlem av Norges Birøkterlag?", 
           type: "SINGLE_CHOICE", 
           required: true, 
           options: [ 
             { value: "ja", label: "Ja" }, 
             { value: "nei", label: "Nei" } 
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
             { value: "ja", label: "Ja" }, 
             { value: "nei", label: "Nei" }, 
             { value: "usikker", label: "Usikker" } 
           ] 
         }, 
         { 
           id: "disease_types", 
           text: "Hvilke sykdommer har du erfart?", 
           type: "MULTI_CHOICE", 
           required: false, 
           visible_if: [{ question_id: "disease_last_3y", equals: ["ja", "usikker"] }], 
           options: [ 
             { value: "Varroa", label: "Varroa" }, 
             { value: "Åpen yngelråte", label: "Åpen yngelråte" }, 
             { value: "Lukket yngelråte", label: "Lukket yngelråte" }, 
             { value: "Nosema", label: "Nosema" }, 
             { value: "Kalkyngel", label: "Kalkyngel" }, 
             { value: "Stein-yngel", label: "Stein-yngel" }, 
             { value: "Trakémidd", label: "Trakémidd" }, 
             { value: "Vingedeformitetsvirus", label: "Vingedeformitetsvirus" }, 
             { value: "Amerikansk yngelråte", label: "Amerikansk yngelråte" }, 
             { value: "Europeisk yngelråte", label: "Europeisk yngelråte" }, 
             { value: "Svertesopp", label: "Svertesopp" }, 
             { value: "Ukjent sykdom", label: "Ukjent sykdom" },
             { value: "Ingen sykdom observert", label: "Ingen sykdom observert" } 
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
             { value: "Notatbok/papir", label: "Notatbok/papir" }, 
             { value: "Excel eller egne lister", label: "Excel eller egne lister" }, 
             { value: "Digital app", label: "Digital app" }, 
             { value: "Egen metode", label: "Egen metode" },
             { value: "Ingen systematisk registrering", label: "Ingen systematisk registrering" },
             { value: "Annet", label: "Annet" } 
           ] 
         }, 
         { 
           id: "weekly_documentation_time", 
           text: "Hvor mye tid bruker du på dokumentasjon per uke?", 
           type: "DROPDOWN", 
           required: true, 
           options: [ 
             { value: "Mindre enn 15 minutter", label: "Mindre enn 15 minutter" }, 
             { value: "15–30 minutter", label: "15–30 minutter" }, 
             { value: "30–60 minutter", label: "30–60 minutter" }, 
             { value: "1–2 timer", label: "1–2 timer" },
             { value: "Mer enn 2 timer", label: "Mer enn 2 timer" } 
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
            { value: "ja", label: "Ja" }, 
            { value: "ja_enkelt", label: "Ja, hvis det er enkelt å bruke" },
            { value: "kanskje", label: "Kanskje" }, 
            { value: "nei", label: "Nei" } 
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
             { value: "Inntil 500 kr per år", label: "Inntil 500 kr per år" }, 
             { value: "Inntil 1000 kr per år", label: "Inntil 1000 kr per år" }, 
             { value: "Inntil 1500 kr per år", label: "Inntil 1500 kr per år" }, 
             { value: "Avhengig av antall kuber", label: "Avhengig av antall kuber" },
             { value: "Gratis", label: "Gratis" } 
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
             { value: "ja", label: "Ja" }, 
             { value: "kanskje", label: "Kanskje" }, 
             { value: "nei", label: "Nei" } 
           ] 
         }, 
         { 
           id: "pilot_email", 
           text: "E-post for invitasjon til pilot", 
           type: "EMAIL", 
           required: false, 
           visible_if: [{ question_id: "pilot_interest", equals: ["ja", "kanskje"] }] 
         } 
       ] 
     } 
   ] 
 };