# MASTER_INTEGRATION_MAP

> **Prosjekt:** LEK-Biens Vokter™
> **Dokument:** Integrasjons- og infrastrukturkart
> **Audit-type:** READ-ONLY
> **Dato:** 2026-11-24

---

## 1. Eksterne tjenester

| Tjeneste | Brukt? | Filer | Env-variabler | Formål |
|---|---|---|---|---|
| OpenAI (Whisper/GPT/TTS) | Ja | `src/app/api/meeting-notes/{process,summarize}/route.ts`, `src/app/api/voice/tts/route.ts` | `OPENAI_API_KEY` | Transkripsjon, sammendrag, talesyntese |
| Roboflow | Ja | `src/app/api/varroa/infer/route.ts` | `ROBOFLOW_API_KEY` (+ aliaser) | Varroa-deteksjon |
| Resend | Ja | `src/services/mail/resend-mail-service.ts` | `RESEND_API_KEY`, `RESEND_FROM` | E-post |
| Nodemailer/SMTP | Ja | `src/services/mail/nodemailer-mail-service.ts` | `SMTP_HOST/PORT/SECURE/USER/PASS/FROM` | E-post |
| Domeneshop SMTP | Delvis (død kode) | `src/services/mail/domeneshop-mail-service.ts` | `DOMENESHOP_SMTP_*` (fallback `SMTP_*`) | E-post |
| Leaflet + OSM | Ja | `src/components/{Map,IncidentMap,MattilsynetMap}.tsx` | – | Kart |
| Puppeteer/Chromium | Ja | `src/app/api/**/pdf/route.tsx` | – | PDF (server) |
| qrcode | Ja | `src/utils/hive-labels-pdf.ts`, `apiaries`, `settings` | – | QR-generering |
| html5-qrcode | Ja | `src/app/scan/page.tsx` | – | QR-skanning |
| jsPDF | Ja | `src/utils/hive-labels-pdf.ts`, `src/app/lei-en-kube/page.tsx` | – | PDF (klient) |
| heic2any | Ja | `src/components/SicknessRegistrationModal.tsx` | – | HEIC→JPEG |
| Open-Meteo | Ja | `src/components/WeatherWidget.tsx` | – (nøkkelfri) | Vær |
| Nominatim (OSM) | Ja | `src/components/WeatherWidget.tsx` | – | Reverse geokoding |
| **Stripe** | **Nei** | Kun tekst i `src/app/lei-en-kube/page.tsx` | – | **IKKE IMPLEMENTERT** |

---

## 2. Integrasjonskart

```mermaid
graph TB
  App[LEK-Biens Vokter]
  App -->|Whisper/GPT/TTS| OAI[OpenAI]
  App -->|bilde-inferens| RF[Roboflow]
  App -->|e-post primær| RES[Resend]
  App -->|e-post fallback| SMTP[SMTP/Nodemailer]
  App -->|kart-tiles| OSM[OpenStreetMap/Leaflet]
  App -->|vær + geokoding| OM[Open-Meteo / Nominatim]
  App -->|server-PDF| PP[Puppeteer/Chromium]
  App -->|klient-PDF/QR| LIB[jsPDF + qrcode]
  App -->|varroa-UI ekstern| VRS[VarroaScan (eksternt system)]
  App -->|DB/auth/storage/realtime| SB[Supabase self-hosted]
```

---

## 3. Mail-systemet

**Arkitektur:** Strategi-mønster med felles interface + flere providers.

**Provider-valg (`src/services/mail/index.ts`):**
1. Resend hvis `RESEND_API_KEY` er satt.
2. Mock hvis `MAIL_PROVIDER=mock`.
3. Nodemailer hvis `MAIL_PROVIDER ∈ {smtp, nodemailer, domeneshop}`.
4. Nodemailer hvis `SMTP_USER` og `SMTP_PASS` er satt.
5. Mock som fallback.

| Provider | Fil | Merknad |
|---|---|---|
| Resend | `resend-mail-service.ts` | Lagrer kopi i Supabase |
| Nodemailer | `nodemailer-mail-service.ts` | Generisk SMTP (standard Gmail) |
| Domeneshop | `domeneshop-mail-service.ts` | **Død kode** – ikke koblet i `index.ts` |
| Mock | `mock-mail-service.ts` | Lagrer i `mail_messages`; alltid fallback + brukes til lesing |

Relatert: `src/app/actions/mail.ts`, `src/app/api/test-email/route.ts`, `src/sql/00_kias_mail.sql`.

---

## 4. PWA / offline

- **`next.config.js`:** `next-pwa` v5.6.0; `dest: public`, `register: false`, `skipWaiting: true`, `disable` avhengig av `NEXT_PUBLIC_PWA === 'true'`, `navigateFallback: /offline.html`, denyList `/api/*`, `/_next/*`, `/_vercel/*`; 12 runtime-cache-regler; headers for `sw.js`/`workbox-*`/`fallback-*`/`manifest.json`.
- **`public/`:** `sw.js`, `workbox-960b675a.js`, `fallback-27jiaHKNV8YTu0dukNR1O.js`, `manifest.json` (display standalone, theme `#f59e0b`), `offline.html`, `icon-192.png`, `icon-512.png`.
- **Kontekst:** `src/context/PWAContext.tsx` (install/standalone/plattform), `src/context/OfflineContext.tsx` (SW-registrering, online/offline, synk).
- **Lagring:** `src/utils/offline-storage.ts` – IndexedDB `BeekeeperOfflineDB` v2 (inspections + bilde-Blobs).
- **UI:** `src/components/InstallPrompt.tsx`, `src/app/offline/page.tsx`.

---

## 5. Infrastruktur (infra/source – Supabase self-hosted)

**Kjernetjenester (`docker-compose.yml`):** Studio, Envoy (API-GW), Auth (GoTrue), REST (PostgREST), Realtime, Storage, imgproxy, postgres-meta, Edge Functions (Deno), PostgreSQL 17, Supavisor (pooler).

**Override-stacker:** `docker-compose.kong.yml` (alternativ GW), `.caddy.yml`/`.nginx.yml` (TLS-proxy), `.logs.yml` (Logflare/Vector), `.s3.yml` (MinIO), `.rustfs.yml`, `.pg15.yml`, `.pg17.yml`, `.pgbouncer.yml`.

**Caddy** (`volumes/proxy/caddy/Caddyfile`): ruter `/auth/v1/*`, `/rest/v1/*`, `/graphql/v1`, `/realtime/v1/*`, `/storage/v1/*`, `/functions/v1/*`, `/mcp`, `/sso/*` → `api-gw:8000`; øvrig → Studio (basic auth); fjerner `Server`-header.

**Env-kategorier (navn, ikke verdier):** DB-/JWT-/nøkkel-hemmeligheter (POSTGRES_PASSWORD, JWT_SECRET, JWT_KEYS, JWT_JWKS, ANON_KEY, SERVICE_ROLE_KEY …), URL-er, pooler, Studio, Auth-SMTP, Storage/S3, API (PGRST_DB_SCHEMAS …), imgproxy, TLS, logging.

**Prosjektrot `.env.local.example`:** kun `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## 6. Infrastruktur – driftsoversikt (utenfor repo)

| Element | Verdi |
|---|---|
| Host | Hetzner Cloud, Helsinki |
| Server | CPX32 (4 vCPU, 8 GB RAM, 80 GB SSD) |
| SSH | nøkkel `lek_infra` til `root@37.27.216.67` |
| Åpne porter | 22, 80, 443 (5433/6544/8100 stengt eksternt) |
| Offsite backup | Hetzner Storage Box BX11 (Falkenstein) |
| App-hosting | Vercel (preview/prod) |

**Miljø:** staging = self-hosted Supabase (api-staging.lekbie.no); prod-app peker fortsatt mot gammelt Supabase Cloud inntil DNS-omkobling.

---

## 7. Diverse integrasjoner

- **PDF (server):** `signing/*`, `franchise/report/*`, `founder/agreement/*`, `aksjer/shareholders`, `aksjer/orders/[id]/receipt`, `admin/report`, `admin/franchise/report` – Puppeteer + `@sparticuz/chromium`.
- **PDF (klient):** `hive-labels-pdf.ts` (QR-etiketter), `lei-en-kube` (avtale) – jsPDF.
- **QR:** generering (`qrcode`) + skanning (`html5-qrcode`) + server-validering (`src/app/api/scan/resolve/route.ts`); format `/hives/{id}`, `/apiaries/{id}`.
- **Kart/geo:** Leaflet + OSM tiles, `src/utils/geo.ts` (Haversine).
- **Vær:** Open-Meteo + Nominatim, fallback posisjon Halden (59.12, 11.38).

---

## 8. Ikke verifisert

- Om reverse proxy overskriver `x-forwarded-host` før appen (påvirker signerings-URL-sikkerhet).
- OpenStreetMap-tiles bruksvilkår for kommersiell bruk.
- Om Stripe er planlagt integrert (kun tekst funnet).
- Faktisk kjørt migrasjonsserie mot prod (src/db vs supabase/migrations).
