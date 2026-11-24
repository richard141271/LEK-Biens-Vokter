# MASTER_SYSTEM_INVENTORY

> **Prosjekt:** LEK-Biens Vokter™
> **Dokument:** Full systemoversikt (hovedinventar)
> **Audit-type:** READ-ONLY teknisk kartlegging
> **Dato:** 2026-11-24
> **Metode:** Fase 1–6 (filinventar → modulregister → dybdeanalyse → krysskontroll → systemanalyse → fullstendighetskontroll)
> **Datagrunnlag:** faktisk kodebase på `/Users/jornsmackbookpro/trae_projects/LEK-Biens Vokter` + lesing av databaseskjema (read-only)

Dette dokumentet er inngangsporten til MASTER AUDIT-pakken. Det gir et faktabasert bilde av hva som er bygget, hvor det ligger, og hvilken modenhet det har. Alle konklusjoner spores til konkrete filbaner i de øvrige MASTER_*.md-dokumentene.

---

## 1. Hva systemet er

LEK-Biens Vokter™ er en multi-tenant webapplikasjon (PWA) for birøktere, myndigheter (Mattilsynet), franchisetakere, grunneiere og aksjonærer. Den dekker:

- **Kjernedrift (birøkter):** bigårder, bikuber, inspeksjoner, oppgaver, offline-inspeksjon.
- **Helse/regelverk:** sykdomsregistrering, sykdomsveileder, Mattilsynet-portal, varroa-verktøy.
- **Kommunikasjon:** møtenotater (OpenAI), mail-modul (KIAS).
- **Handel:** butikk, honningbørs (honey-exchange), MLM/kommisjon, HonnyCoin.
- **Selskapsstruktur:** franchise, medgründer (founder), grunneier-portal, aksjeplattform.
- **Stemme:** stemmeinspeksjon (V1 + V2), ordtrening.

Kilde: `src/app/**`, `src/components/**`, `src/lib/**`, `src/db/**`, `supabase/migrations/**`.

---

## 2. Teknologistabel (verifisert)

| Lag | Teknologi | Kilde |
|---|---|---|
| Frontend | Next.js 14.2.3 (App Router), React 18, TypeScript (strict), Tailwind CSS | `package.json`, `tsconfig.json`, `tailwind.config.ts` |
| Backend | Next.js Route Handlers (`src/app/api/**`), Server Actions (`src/app/actions/**`) | `src/app/api`, `src/app/actions` |
| Database | PostgreSQL 17 (Supabase self-hosted) | `infra/source/docker-compose.yml` |
| Auth | Supabase GoTrue, `@supabase/ssr` | `src/utils/supabase/*`, `middleware.ts` |
| API-lag | PostgREST, Realtime, Storage, imgproxy, postgres-meta, Supavisor, Envoy, Caddy | `infra/source/*` |
| PWA | `next-pwa` v5.6.0 + Workbox + IndexedDB | `next.config.js`, `src/context/OfflineContext.tsx`, `src/utils/offline-storage.ts` |
| AI/ML | OpenAI (Whisper-1, gpt-4o-mini, gpt-4o-mini-tts), Roboflow | `src/app/api/meeting-notes/*`, `src/app/api/voice/tts/route.ts`, `src/app/api/varroa/infer/route.ts` |
| Kart | Leaflet + OpenStreetMap | `src/components/Map.tsx`, `IncidentMap.tsx`, `MattilsynetMap.tsx` |
| PDF | Puppeteer + `@sparticuz/chromium` (server), jsPDF (klient) | `src/app/api/**/pdf/route.tsx`, `src/utils/*pdf*` |
| Hosting | Hetzner Cloud (Helsinki) — selvhostet Supabase; Vercel for appen | `infra/source/*`, `debug-admin-profile-jwt.md` |

---

## 3. Overordnede tall (Fase 1)

| Kategori | Antall | Merknad |
|---|---|---|
| App-ruter (`page.tsx`) | ~140+ | App Router, inkl. nested ruter |
| API-ruter (`route.ts`/`route.tsx`) | ~70 | `src/app/api/**` |
| Server Actions | 13 filer | `src/app/actions/**` |
| React-komponenter | 26 | `src/components/**` |
| DB-migrasjoner (nye) | ~46 | `supabase/migrations/**` |
| DB-migrasjoner (eldre) | ~80 | `src/db/migrations/**` + rot-`.sql` |
| SQL-skjemafiler | 4 | `src/db/*.sql` (mlm, honey_exchange, honnycoin, apply_mlm_complete) |
| Tabeller i `public` | 75 base-tabeller + 4 views | Schema-dump |
| RLS-policyer (`public`) | 181 | Schema-dump |
| Triggere (`public`) | 13 (+ auth/storage) | Schema-dump |
| Funksjoner (`public`) | 29 | Schema-dump |
| Enums (`public`) | 16 | Schema-dump |
| Automatiske tester | 0 | Se MASTER_TEST_AND_QUALITY_REPORT.md |

---

## 4. Implementasjonsstatus – overordnet (oppsummert)

Klassifisering: **IMPLEMENTERT** / **DELVIS** / **IKKE IMPLEMENTERT** / **IKKE VERIFISERT** / **FEIL-UFERDIG**.

| Område | Status | Hovedgrunn (sporbarhet) |
|---|---|---|
| Multi-tenant routing (subdomener) | IMPLEMENTERT | `middleware.ts`, `src/middleware.ts` |
| Auth + roller (admin/beekeeper/mattilsynet) | IMPLEMENTERT | `src/app/actions/auth.ts`, `profiles.role`, RLS |
| Konto-tilgang (delegering) | IMPLEMENTERT | `account_access`, `src/app/api/access/**` |
| Bigårder/kuber/inspeksjoner | IMPLEMENTERT | `src/app/apiaries/**`, `src/app/hives/**`, `src/components/InspectionModal.tsx` |
| To parallelle inspeksjonsflyter | DELVIS (duplisert) | `hive_logs` vs `inspections` |
| Offline-inspeksjon + synk | IMPLEMENTERT | `src/utils/offline-storage.ts`, `OfflineContext.tsx` |
| Helse/sykdomsregistrering | IMPLEMENTERT | `src/app/actions/sickness.ts`, `SicknessRegistrationModal.tsx` |
| "AI-diagnose" (helse) | IKKE IMPLEMENTERT (mock) | `src/app/dashboard/smittevern/ai-diagnose/page.tsx` |
| Mattilsynet-portal | IMPLEMENTERT (med mock geo) | `src/app/dashboard/mattilsynet/**`, `src/app/api/mattilsynet/**` |
| VarroaScan (Roboflow-proxy) | DELVIS | `src/app/api/varroa/infer/route.ts` (krever nøkkel), demo=mock |
| Stemmeinspeksjon V1/V2 | IMPLEMENTERT (regelbasert) | `src/voice2/**`, `src/utils/voice-*.ts` |
| TTS (OpenAI) | IMPLEMENTERT | `src/app/api/voice/tts/route.ts` |
| Møtenotater (Whisper + GPT) | IMPLEMENTERT | `src/app/api/meeting-notes/**` |
| Butikk | DELVIS (mock checkout) | `src/app/shop/**`, `src/context/CartContext.tsx` |
| Honningbørs | DELVIS | `src/app/honey-exchange/**`, `src/db/honey_exchange_schema.sql` |
| MLM/kommisjon | DELVIS (kun SQL-trigger) | `process_mlm_sales_commission` (DB) |
| HonnyCoin / wallet | DELVIS | `wallet_transactions`, `src/app/wallet/page.tsx` |
| Abonnement/betaling | IKKE IMPLEMENTERT (rammeverk) | `src/lib/subscriptions.ts`, `supabase/migrations/20260627_subscription_architecture.sql` |
| Aksjeplattform | IMPLEMENTERT | `src/app/aksjer/**`, `stock_*`-tabeller/RPC |
| Franchise | IMPLEMENTERT | `src/app/dashboard/franchise/**`, `franchise_*`-tabeller |
| Medgründer (founder) | IMPLEMENTERT | `src/app/dashboard/founder/**`, `founder_*`-tabeller |
| Grunneier-portal | IMPLEMENTERT | `src/app/grunneier/page.tsx`, `src/app/api/grunneier/**` |
| Signering (e-sign) | IMPLEMENTERT | `src/app/sign/**`, `src/app/api/signing/**`, `sign_requests` |
| KIAS mail-modul | IMPLEMENTERT | `src/services/mail/**`, `src/app/actions/mail.ts` |
| War Room (community) | IMPLEMENTERT | `src/app/actions/war-room*.ts`, `warroom_*`-tabeller |
| Feedback | IMPLEMENTERT | `src/app/api/feedback/**`, `feedback_reports`, `feedback_votes` |
| Survey | IMPLEMENTERT | `src/app/survey/**`, `survey_responses` |
| PWA/offline | IMPLEMENTERT | `next.config.js`, `public/sw.js`, `public/offline.html` |

---

## 5. Avgrensninger og forbehold

- **Prod-flytting:** Produksjonsappen peker fortsatt mot gammelt Supabase Cloud; staging kjører self-hosted på Hetzner. Dette er en **driftsstatus**, ikke kodefeil. Se MASTER_GAP_ANALYSIS.md.
- **Hemmeligheter:** Ingen API-nøkler, passord eller tokens er gjengitt i denne pakken. Kun variabelnavn og hvor de brukes.
- **IKKE VERIFISERT-punkter** er eksplisitt merket i respektive dokumenter (f.eks. `x-forwarded-host`-overskriving bak proxy, rate limiting, CSRF).
- **Kodeeksistens ≠ fungerende funksjon:** Der kode finnes men ikke kan bekreftes testet, er status satt til DELVIS eller IKKE VERIFISERT.

---

## 6. Dokumentkart (pakken)

| Fil | Innhold |
|---|---|
| MASTER_SYSTEM_INVENTORY.md | Dette dokumentet – overordnet oversikt |
| MASTER_PROJECT_STRUCTURE.md | Full fil-/mappestruktur (Fase 1) |
| MASTER_SYSTEM_ARCHITECTURE.md | Teknisk arkitektur + systemkart |
| MASTER_MODULE_REGISTER.md | Modul-for-modul register (Fase 2) |
| MASTER_DATABASE_MAP.md | Database-audit |
| MASTER_AI_AGENT_MAP.md | AI/agent-arkitektur |
| MASTER_INTEGRATION_MAP.md | Eksterne integrasjoner + infra |
| MASTER_TEST_AND_QUALITY_REPORT.md | Test, kvalitet, sikkerhet |
| MASTER_GAP_ANALYSIS.md | Gap-analyse |
| MASTER_AUDIT_SUMMARY.md | Sluttrapport + fullstendighetskontroll |
