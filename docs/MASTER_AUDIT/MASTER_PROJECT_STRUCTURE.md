# MASTER_PROJECT_STRUCTURE

> **Prosjekt:** LEK-Biens Vokter™
> **Dokument:** Fullstendig fil- og mapperegister (Fase 1)
> **Audit-type:** READ-ONLY
> **Dato:** 2026-11-24

Dette dokumentet er den komplette trestrukturen over prosjektet slik det faktisk ser ut. Alle stier er relative til prosjektroten `/Users/jornsmackbookpro/trae_projects/LEK-Biens Vokter/`.

---

## 1. Rotnivå

```
LEK-Biens Vokter/
├── .trae/rules/project_rules.md        # Workspace-regler (arbeidsflyt, git-policy)
├── .env.local.example                  # Eksempel på miljøvariabler (2 stk)
├── .eslintrc.json                      # ESLint-konfig
├── .gitignore
├── 3d_produksjon/                      # STL/SCAD-filer (såpeformer, sokkel) – ikke kode
├── docs/
│   ├── signering-epost-oppsett.md      # Resend/SMTP-oppsett for signering
│   └── MASTER_AUDIT/                   # ← denne leveransepakken
├── infra/
│   └── source/                         # Offisiell Supabase self-hosted Docker Compose-stack
├── public/                             # Statiske assets, PWA-filer, bilder
├── scripts/                            # check-tables.ts, debug-data.ts, inspect-templates.ts
├── src/                                # All applikasjonskildekode
├── supabase/migrations/                # Nyere daterte DB-migrasjoner
├── check-tables.ts                     # Rot-script (DB-sjekk)
├── check_schema.js                     # Rot-script (skjema-sjekk)
├── debug-admin-profile-jwt.md          # [ÅPEN] Feilsporing admin-JWT
├── download_images.sh                  # Shell-script for bilde-nedlasting
├── fix_mattilsynet_permissions.sql     # RLS/rettighetsfix for Mattilsynet
├── LOCKED_FEATURES.md                  # Låste funksjoner (skal ikke endres)
├── middleware.ts                       # Rot-middleware (host-routing) – untracked i git
├── next-env.d.ts                       # Next.js type-defs (generert)
├── next.config.js                      # PWA-konfig + redirects + externals
├── package.json                        # Navn: birokter-revolusjonen v1.0.0
├── package-lock.json
├── postcss.config.js
├── SECURITY_REVIEW.md                  # Pilot-sikkerhetsgjennomgang
├── supabase_schema_*.sql (10 filer)    # Eldre skjemafiler (profiles, inspections, updates v2–v6, add_image_url, fix_inspections_v2)
├── tailwind.config.ts
└── tsconfig.json
```

**Eldre rot-SQL (10):** `supabase_schema_profiles.sql`, `supabase_schema_inspections.sql`, `supabase_schema_add_image_url.sql`, `supabase_schema_fix_inspections_v2.sql`, `supabase_schema_updates.sql`, `supabase_schema_updates_profiles.sql`, `supabase_schema_update_v2.sql` … `v6.sql`.

**Merk (git-status):** `infra/`, `src/middleware.ts` og `debug-admin-profile-jwt.md` er untracked.

---

## 2. src/ – applikasjonskildekode

```
src/
├── app/                    # Next.js App Router (sider + API + server actions)
├── components/             # 26 React-komponenter
├── context/                # React context (PWA, Offline, Cart)
├── db/                     # SQL-skjema + migrasjoner (eldre serie)
├── hooks/                  # useSigningAttention, useVoiceRecognition
├── lib/                    # toolbox, subscriptions, signing, signing-receipt, survey/
├── scripts/                # seed-test-data, check_columns
├── services/mail/          # Mail-tjenester (resend, nodemailer, domeneshop, mock)
├── sql/                    # 00_kias_mail.sql
├── types/                  # supabase, shop, honey-exchange
├── utils/                  # varroascan, geo, offline-storage, pdf-templates, voice-*, supabase/
└── voice2/                 # Stemme V2 (engine, parse, alias-store, types)
```

### 2.1 src/app/actions/ – Server Actions (13)

```
actions/
├── auth.ts
├── founder-community.ts
├── founder.ts
├── franchise.ts
├── mail.ts                # KIAS mail (LOCKED)
├── mattilsynet.ts
├── profile.ts
├── shop.ts
├── sickness.ts
├── user-management.ts
├── war-room-cases.ts
├── war-room-resolve.ts
└── war-room.ts
```

### 2.2 src/app/api/ – Route Handlers (~70 ruter)

```
api/
├── access/{accept,invite,leave,list,revoke,update}/route.ts
├── admin/
│   ├── breakglass/reset-password/route.ts
│   ├── feedback/route.ts
│   ├── franchise/report/[id]/pdf/route.tsx
│   ├── grunneier/agreements/route.ts
│   ├── nuke/route.ts
│   ├── pilot-interest/{route.ts,[id]/route.ts}
│   ├── report/pdf/route.tsx
│   ├── stats/route.ts
│   ├── survey-responses/{route.ts,[id]/route.ts}
│   ├── temadag/cleanup/route.ts
│   └── voice/{aliases/route.ts, aliases/personal/route.ts, failures/route.ts}
├── aksjer/
│   ├── orders/[id]/receipt/pdf/route.ts
│   └── shareholders/pdf/route.ts
├── company/magic-login/route.ts
├── company-by-slug/[slug]/route.ts
├── create-order/route.ts
├── debug/deep-user-check/route.ts
├── demo/{session/{start,reset}/route.ts, write/{apiary,hives,inspection}/route.ts}
├── feedback/{priority-vote,vote}/route.ts
├── founder/agreement/pdf/route.tsx
├── franchise/report/[id]/pdf/route.tsx
├── grunneier/{agreement,contact,invite,logout,password,request-link,session,signup,validate}/route.ts
├── inspections/repair-owner/route.ts
├── lek-core/{create-apiary,create-hive}/route.ts
├── mattilsynet/{alerts, incident/[id], registry}/route.ts
├── meeting-notes/{audio-url, process, summarize}/route.ts
├── scan/resolve/route.ts
├── signing/
│   ├── route.ts
│   ├── [id]/{route.ts, cancel, generate-receipt, send-completed-email, send-email, sender-sign}/route.ts
│   ├── demo/route.ts
│   └── token/[token]/{route.ts, completed, sign}/route.ts
├── survey/submit/route.ts
├── test-email/route.ts
├── test-lek-core/route.ts
├── varroa/infer/route.ts
├── voice/{aliases,log,tts}/route.ts
└── voice2/aliases/route.ts
```

### 2.3 src/app/ – Sider (utvalg, strukturert)

```
app/
├── (rot): layout.tsx, page.tsx, globals.css, error.tsx, global-error.tsx
├── about/
├── admin/{page.tsx, breakglass/page.tsx, voice/page.tsx}
├── aksjer/
│   ├── page.tsx, layout.tsx, actions.ts
│   ├── admin/{page.tsx, print/, shareholders/[id]/, orders/[id]/, DangerInitResetForm.tsx}
│   ├── buy/{page.tsx, ui.tsx}, dashboard/, forgot-password/, orders/[id]/, profile/,
│   ├── reset-password/, sell/, signin/, signup/, transactions/
├── apiaries/{page.tsx, new/, [id]/{page.tsx, edit/}}
├── archive/
├── auth/callback/route.ts
├── dashboard/
│   ├── page.tsx
│   ├── admin/{page.tsx, layout.tsx, community/, debug/, email/[userId]/, feedback/, founders/,
│   │          franchise/[id]/, franchise/reports/, grunneier/, meeting-notes/, pages/[slug]/,
│   │          pilot-interesser/, professional-report/, shop/[id]/, shop/new/, survey-results-v2/,
│   │          temadag/, users/, varroascan/, voice/}
│   ├── beekeeper/{checklist/, rentals/}
│   ├── components/BeekeeperAlertsPoller.tsx
│   ├── founder/{page.tsx, FounderClient.tsx, community/}
│   ├── franchise/{page.tsx, branding/, contact/, faq/, manual/, recipes/, reports/new/,
│   │             training/, agreements/{shareholder,license}/}
│   ├── mail/, missions/
│   ├── mattilsynet/{page.tsx, layout.tsx, alert/[id]/, alerts/, map/, registry/, reports/, components/AlertsPoller.tsx}
│   └── smittevern/{page.tsx, ai-diagnose/, sykdommer/[slug]/, varroa/, veileder/}
│   └── Treningsapp             # mappe (innhold ikke verifisert)
├── debug/supabase-test/page.tsx   # ⚠ se MASTER_TEST_AND_QUALITY_REPORT.md
├── feedback/, franchise/, grunneier/
├── hives/{page.tsx, [id]/{page.tsx, new-inspection/}}
├── honey-exchange/{page.tsx, sell/, resell/, transactions/, [id]/}
├── info/{biens-vokter, honningborsen, partnernettverk}/
├── kids-beekeeper/, lei-en-kube/, login/, mattilsynet/, network/, missions/{page.tsx,[id]/}
├── offline/, referater/{page.tsx,[id]/,new/}, register/, scan/, settings/{page.tsx, subscription/, contacts/,
│   access/{page.tsx, accept/}}
├── shop/{page.tsx, checkout/{page.tsx, success/}}
├── sign/{[token]/, ferdig/[token]/}
├── signering/{page.tsx, ny/, [id]/}
├── signin/, survey/{page.tsx, form/, thanks/}, tools/{voice, word-training, labels, driftsmateriell, bikubekort}/
└── wallet/
```

### 2.4 src/components/ (26)

Header.tsx, AdminNav.tsx, MainLayout.tsx, DesktopNav.tsx, BottomNav.tsx, WordTraining.tsx, Map.tsx, DemoModeBanner.tsx, WeatherWidget.tsx, WarRoomDashboard.tsx, WarRoomChat.tsx, VoiceAssistant.tsx, TermsConsentModal.tsx, SicknessRegistrationModal.tsx, InstallPrompt.tsx, InspectionModal.tsx, IncidentMap.tsx, MattilsynetMap.tsx, ErrorBoundary.tsx, mail/MessageDetail.tsx, shop/{ProductForm,CartSidebar}.tsx, survey/{NonBeekeeperSurvey,DynamicSurvey,BeekeeperSurvey}.tsx.

### 2.5 src/lib, src/services, src/utils, src/hooks, src/voice2, src/context, src/types

```
lib/         toolbox.ts, subscriptions.ts, signing.ts, signing-receipt.ts, survey/{types,beekeeper,non-beekeeper}.ts
services/mail/ index.ts, resend-mail-service.ts, nodemailer-mail-service.ts, domeneshop-mail-service.ts,
               mock-mail-service.ts, types.ts
utils/       varroascan.ts, geo.ts, offline-storage.ts, pdf-template.tsx, hive-labels-pdf.ts,
             franchise-report-pdf-template.ts, founder-agreement-pdf-template.ts,
             voice-parser.ts, voice-alias.ts, voice-diagnostics.ts, shop-constants.ts,
             supabase/{client,server,admin}.ts
hooks/       useSigningAttention.ts, useVoiceRecognition.ts
voice2/      engine.ts, parse.ts, alias-store.ts, types.ts
context/     PWAContext.tsx, OfflineContext.tsx, CartContext.tsx
types/       supabase.ts, shop.ts, honey-exchange.ts
```

### 2.6 src/db/ – SQL

```
db/
├── migrations/    ~80 filer: 02–88 + switch_to_soft_delete.sql
│                  (emner: profiles/roller, rentals, shop, mail, voice, war room, founder,
│                   franchise, grunneier, stock, lek_core, demo, account_access, honeycomb-priser)
├── mlm_schema.sql
├── honey_exchange_schema.sql
├── honnycoin_schema.sql
└── apply_mlm_complete.sql
```

---

## 3. supabase/migrations/ – nyere daterte migrasjoner

```
20240101_init_roles.sql
20240120_add_survey_columns.sql
20240123_{add_email_signature, add_mail_attachments, create_mail_bucket, rebuild_survey_schema}.sql
20240124_{create_franchise_portal, create_franchise_extras, add_training_progress, seed_franchise_data,
          fix_admin_permissions, fix_recursion}.sql
20260204_{founder_module, fix_relationships, fix_franchise_rls, fix_ambitions_unique, fix_admin_rls,
          auto_member_number, founder_policies_fix}.sql
20260205_{founder_followup, war_room_2_0, war_room_moderation, war_room_resolved}.sql
20260218_war_room_cases.sql
20260220_add_case_paused_status.sql
20260319_security_advisor_fixes.sql
20260405_stock_platform.sql
20260407_stock_shareholder_no.sql
20260415_fix_stock_handle_new_user_rls.sql
20260515_{apiary_contacts_special_terms_signatures, inspections_queen_side, fix_number_decimals}.sql
20260614_sign_requests_receipt_pdf.sql
20260615_user_tools.sql
20260616_inspections_performed_actions.sql
20260617_voice2_aliases.sql
20260621_feedback_reports.sql
20260622_apiary_log_tasks_calendar.sql
20260623_{feedback_priority_category, backfill_priority_votes_rank}.sql
20260624_sign_requests.sql
20260625_backfill_sign_request_statuses.sql
20260626_sign_requests_completed_email_status.sql
20260627_subscription_architecture.sql
```

---

## 4. public/ – statiske filer

```
public/
├── manifest.json, sw.js, workbox-960b675a.js, fallback-27jiaHKNV8YTu0dukNR1O.js
├── offline.html, icon.png, icon-192.png, icon-512.png, logo.png
├── images/{logos/, sykdommer/}
├── varroa-samples/  (varroa-demo-1..5.jpg)
├── BARNA/, BILDER/, KLÆR/, Temadag plakater/   # foto/presentasjonsmateriale
└── IMG_*.JPG/png (enkelte rot-filer)
```

---

## 5. infra/source/ – Supabase self-hosted stack

```
infra/source/
├── docker-compose.yml (+ .envoy, .kong, .caddy, .nginx, .logs, .s3, .rustfs, .pg15, .pg17, .pgbouncer)
├── run.sh, setup.sh, reset.sh, update.sh, upgrades.json, versions.md, CONFIG.md, README.md
├── .env.example, .pinned-ref, CHANGELOG.md
├── volumes/
│   ├── api/{envoy/, kong-entrypoint.sh, kong.yml}
│   ├── db/{init/data.sql, _supabase.sql, jwt.sql, logs.sql, pooler.sql, realtime.sql, roles.sql, webhooks.sql}
│   ├── functions/{main/index.ts, hello/index.ts, deno.jsonc}
│   ├── logs/vector.yml, pooler/pooler.exs
│   └── proxy/caddy/Caddyfile
├── utils/{add-new-auth-keys.sh, db-passwd.sh, generate-keys.sh, reassign-owner.sh,
│          rotate-new-api-keys.sh, upgrade-pg17.sh}
├── tests/ (10 shell-tester: systemressurser, postgresql, postgrest, auth, storage, realtime,
│          edge-runtime, postgres-meta, studio, api-gotrue)
└── dev/docker-compose.dev.yml, dev/data.sql
```

---

## 6. Konfigurasjonsfiler (innhold)

| Fil | Nøkkelinnhold |
|---|---|
| `package.json` | name `birokter-revolusjonen` v1.0.0; scripts dev/build/start/lint/postinstall; deps: next 14.2.3, react 18, @supabase/ssr ^0.3.0, @supabase/supabase-js ^2.39.0, next-pwa ^5.6.0, puppeteer, leaflet, jspdf, qrcode, nodemailer ^8.0.0, html5-qrcode, heic2any, date-fns, lucide-react |
| `tsconfig.json` | `strict: true`, paths `@/* → ./src/*`, target ES2017, moduleResolution bundler |
| `.eslintrc.json` | extends `next/core-web-vitals`; 3 regler av: `react-hooks/exhaustive-deps`, `@next/next/no-img-element`, `jsx-a11y/alt-text` |
| `next.config.js` | PWA (dest public, register false, fallback /offline.html), runtime-caching, headers for sw.js, redirect `/mattillsynet → /mattilsynet`, `serverComponentsExternalPackages: ['puppeteer','@sparticuz/chromium']` |
| `middleware.ts` | Host-routing (admin/mattilsynet/aksjer/staging), demo-gating, beskyttede prefikser, auth-redirect |
| `.env.local.example` | Kun `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

---

## 7. Dokumentasjonsfiler (eksisterende, før audit)

| Fil | Formål |
|---|---|
| `LOCKED_FEATURES.md` | Låste funksjoner: `src/app/page.tsx`, PDF-reporting, KIAS Mail, "General Core" |
| `SECURITY_REVIEW.md` | Pilot-sikkerhetsgjennomgang (2025-12-31), RBAC + RLS |
| `debug-admin-profile-jwt.md` | [ÅPEN] admin-login JWT-feil (ES256 vs HS256) |
| `docs/signering-epost-oppsett.md` | Resend/SMTP-oppsett |
| `infra/source/README.md` | Offisiell Supabase self-hosted-dokumentasjon |

---

## 8. Fase 1 – kontrolliste (komplett)

- [x] Alle mapper og undermapper kartlagt (rot, src, infra, public, docs, scripts, supabase)
- [x] Alle kildekodefiler kartlagt (sider, API, actions, komponenter, lib/utils/hooks/context/types)
- [x] Konfigurasjonsfiler kartlagt og lest
- [x] Dokumentasjonsfiler kartlagt og lest
- [x] Databasefiler og migrasjoner kartlagt (src/db + supabase/migrations + rot-SQL)
- [x] API-er kartlagt (~70 ruter)
- [x] Edge Functions kartlagt (kun i `infra/source/volumes/functions/`: `main`, `hello` – plattform-standard, ikke app-spesifikke)
- [x] Testfiler kartlagt (ingen app-tester; 10 infra-shell-tester)
- [x] Avhengigheter kartlagt (`package.json`)

**Ikke undersøkt/utelatt med begrunnelse:**
- `3d_produksjon/` – CAD/STL-filer, ikke programvarekode. Innhold listet, ikke analysert.
- `public/BARNA/`, `public/KLÆR/`, `public/BILDER/`, `public/Temadag plakater/` – bildemateriell, innhold ikke analysert.
- `src/app/dashboard/Treningsapp` – mappe uten `.tsx`-utvidelse funnet i glob; innhold **IKKE VERIFISERT**.
