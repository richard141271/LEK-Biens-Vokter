# MASTER_GAP_ANALYSIS

> **Prosjekt:** LEK-Biens Vokter™
> **Dokument:** Gap-analyse (implementasjon vs. plan/dokumentasjon)
> **Audit-type:** READ-ONLY
> **Dato:** 2026-11-24

---

## 1. Metode

Sammenligner faktisk implementasjon (kode/DB) mot tilgjengelig dokumentasjon (`LOCKED_FEATURES.md`, `SECURITY_REVIEW.md`, `debug-admin-profile-jwt.md`, migrasjoner) og de funksjoner som fremstår som planlagt (jf. agent-navn, mock-flater, "kommer snart").

---

## 2. Planlagte/forventede funksjoner som mangler eller er ufullstendige

| Område | Forventet | Faktisk | Gap |
|---|---|---|---|
| **AI-agentene** (MASTER, ARKITEKT, DEVELOPMENT, DATABASE, QA MASTER, SECURITY, DEVOPS, BIRØKTER) | Autonome agenter | Eksisterer ikke i kode | IKKE IMPLEMENTERT |
| **AURORA** | AI-assistent | Verktøyetikett + regelbasert task-forslag | DELVIS (ikke LLM) |
| **Helse "AI-diagnose"** | Bildebasert sykdomsdiagnose | Hardkodet mock (setTimeout) | IKKE IMPLEMENTERT |
| **VarroaScan i UI** | Reell deteksjon | `inferMock()` (tilfeldig); Roboflow kun i API-proxy | DELVIS |
| **Butikk/checkout** | Full ordrebehandling | Mock checkout; kurv i localStorage; ordrer ikke persistert i normal flyt | DELVIS |
| **Abonnement/betaling** | Betaling i appen | `subscriptions.ts` = rammeverk; migrasjon finnes; ingen betalingsflyt/Stripe | IKKE IMPLEMENTERT |
| **MLM/kommisjon i app** | App-drevet kommisjonslogikk | Kun DB-trigger `process_mlm_sales_commission`; ingen app-kode skriver `commissions` | DELVIS |
| **HonnyCoin/wallet** | Full valutaøkonomi | `wallet_transactions` + enkel side | DELVIS |
| **Nasjonalt smittekart** | Reelt kart | Markert "Kommer snart" / mock-koordinater | IKKE IMPLEMENTERT |
| **Mattilsynet geo** | Reell geokoding | Mock GEO_CACHE + tilfeldig fallback | DELVIS |
| **Nabovarsel** | Geo-filtrert varsling | Varsler ALLE brukere (pilot) | DELVIS |
| **Prod-migrering (Supabase Cloud → Hetzner)** | Fullført | Prod-app peker fortsatt mot Cloud; staging på Hetzner | PÅGÅR / IKKE FULLFØRT |

---

## 3. Arkitekturavvik

1. **To inspeksjonsmodeller:** `hive_logs` (InspectionModal) og `inspections` (`hives/[id]/new-inspection`) skrives parallelt → duplisert sannhet.
2. **`lek_core`-speiling enveis:** app → core via `auth_user_id`, ingen synk tilbake.
3. **To stemme-systemer (V1/V2):** V1 synes erstattet av V2, men begge finnes i kode.
4. **To migrasjonsspor:** `src/db/migrations` + `supabase/migrations` uten verifisert entydig kjøringsrekkefølge.
5. **Død kode:** `DomeneshopMailService` ikke koblet til provider-valget.
6. **Service-role-bredde:** `createAdminClient` brukes på ~94 steder → tilgangskontroll hviler på riktig rolle-logikk i hver rute/action.

---

## 4. Manglende integrasjoner

| Integrasjon | Status |
|---|---|
| Betaling (Stripe/Vipps) | Ikke implementert (kun tekst) |
| Reelle myndighets-API-er (Mattilsynet) | Ikke implementert (alt internt) |
| E-post-geokoding i Mattilsynet | Mock |
| Rate limiting / CSRF eksplisitt | IKKE VERIFISERT |

---

## 5. Dokumentasjon som mangler/er utdatert

- Ingen samlet arkitektur-/moduldokumentasjon fantes før denne audit-pakken.
- `SECURITY_REVIEW.md` er fra 2025-12-31 (pilot) og dekker ikke nyere moduler (signering, aksjer, franchise, voice2).
- `debug-admin-profile-jwt.md` er åpen og bør lukkes.
- Ingen testdokumentasjon (fordi det ikke finnes tester).
- `Treningsapp`-mappe: innhold **IKKE VERIFISERT**.

---

## 6. Sikkerhets-/datagaps

- **6 tabeller uten RLS** (`case_attachments`, `case_updates`, `cases`, `companies`, `stock_settings`, `users`) bryter prosjektregel.
- **Kritisk:** eksponert debug-side (`src/app/debug/supabase-test/page.tsx`).
- **Høy:** ikke-timing-safe danger-passord (`src/app/aksjer/actions.ts`).

---

## 7. Mulige konflikter og avhengigheter

| Konflikt | Konsekvens |
|---|---|
| Dupliserte inspeksjonsdata | Ulike sider kan vise ulike tall |
| `JWT_JWKS`-mangel | Admin-profilhenting feiler (blokkerende for admin-flyt) |
| Prod peker mot Cloud, staging mot Hetzner | Miljødrift ≠ kode-paritet i praksis (jf. prosjektmål) |
| Mock-flater presentert som «AI» | Kan gi feil forventning til sluttbruker/kunde |

---

## 8. Prioritert gap-liste (anbefalt rekkefølge for MASTER BLUEPRINT)

1. **Sikkerhet:** lukk eksponert debug-side; timing-safe danger-passord; `JWT_JWKS` til PostgREST; RLS på 6 tabeller.
2. **Dataintegritet:** konsolider inspeksjonsmodellene.
3. **Prod-migrering:** fullfør overgang til Hetzner for prod (fallback beholdes).
4. **Reell funksjonalitet:** beslutning om AI-diagnose/varroa-UI skal bygges eller fjernes som "AI".
5. **Betaling:** velg og implementer betalingsløsning (abonnement/butikk).
6. **Kvalitet:** innfør testrammeverk og gjør lint til reell sperre.
7. **Opprydding:** fjern død kode, to systemer → ett, samle migrasjonsspor.

---

> **Merk:** Denne gap-analysen starter **ikke** MASTER BLUEPRINT-fasen. Den peker kun på avvik og venter på godkjenning.
