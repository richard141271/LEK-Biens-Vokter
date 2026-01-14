# Sikkerhetsgjennomgang - LEK-Biens Vokter (Pilot)

**Dato:** 2025-12-31  
**Revisjon:** 1.0  
**Signert:** Pilot-nettverk-ingeniør (Simulert)

Denne rapporten oppsummerer sikkerhetstiltakene implementert i pilotversjonen av "LEK-Biens Vokter" for å sikre trygg datahåndtering, personvern og integritet i smittevarslingen.

## 1. Autentisering og Tilgangskontroll
- **Supabase Auth:** Applikasjonen bruker Supabase sin innebygde autentiseringsløsning som håndterer kryptering av passord, sesjonshåndtering og sikre JWT-tokens.
- **Rollebasert Tilgang (RBAC):**
    - `beekeeper`: Har kun tilgang til å lese/redigere egne bigårder og kuber.
    - `tenant`: Kan kun se leieavtaler og bigårder de eier eller er tildelt.
    - `mattilsynet` / `admin`: Har utvidede leserettigheter for å overvåke smitte, men kan ikke endre private data utenom status på saker.
    - `inspector`: Begrenset tilgang til å se inspeksjoner.

## 2. Datasikkerhet (Row Level Security - RLS)
Alle databasetabeller er beskyttet med strenge RLS-regler som håndheves direkte i databasen (PostgreSQL). Dette forhindrer uautorisert tilgang selv om frontend-koden skulle feile.

- **Profiler (`profiles`):** Brukere kan kun se og redigere sin egen profil. Admin kan se alle.
- **Bigårder (`apiaries`) & Kuber (`hives`):** Kun eier eller tildelt birøkter (via `managed_by`) har skrivetilgang.
- **Sykdomslogger (`hive_logs`):** 
    - Alle autentiserte brukere kan *opprette* en logg.
    - Kun eier, tildelt birøkter og Mattilsynet kan *lese* detaljerte logger.
    - Sensitive data eksponeres ikke via åpne API-er.

## 3. Manipulering av Smittevarsler
For å hindre falske alarmer eller manipulering:
- **Sporbarhet:** Alle sykdomsrapporter logges med autentisert `user_id` og tidsstempel.
- **Integritet:** Kun Mattilsynet-rollen har rettigheter til å endre `admin_status` på en sak til "resolved". Vanlige brukere kan ikke slette eller endre innsendte rapporter.
- **Validering:** Opplasting av bilder kreves for sykdomsrapportering, noe som gir bevisgrunnlag.

## 4. Personvern i Pilot
- Posisjonsdata (GPS) lagres kun for bigårder og er nødvendig for smittevarsling.
- Kontaktinfo vises kun til relevante parter (f.eks. mellom birøkter og leietaker i en aktiv avtale).
- Ingen sensitive helsedata om personer lagres, kun om bier.

## 5. Konklusjon
Pilot-løsningen vurderes som **sikker for testing** i begrenset omfang. Grunnleggende mekanismer for å hindre datalekkasje og misbruk er på plass gjennom RLS og Supabase Auth.

---
*Anbefalte tiltak for neste fase (Produksjon):*
- *Implementere 2-faktor autentisering (2FA).*
- *Kjøre periodisk penetrasjonstest av API-endepunkter.*
- *End-to-end kryptering av sensitive meldinger hvis chat innføres.*
