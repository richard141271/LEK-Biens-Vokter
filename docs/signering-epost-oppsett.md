# LEK-Signering: oppsett for e-post

LEK-Signering sender e-post direkte fra appen når servermiljøet har SMTP konfigurert.

## Hvordan det virker

- Brukeren trykker `Send via e-post` i signeringssaken.
- Serverruten sender e-post via `getMailService(...)`.
- Når avsender fullfører signeringen, sendes det automatisk en e-post til mottaker med lenke til ferdig dokument.

## Miljøvariabler

Minstekrav:

```env
SMTP_HOST=smtp.dittdomene.no
SMTP_PORT=587
SMTP_USER=no-reply@lekbie.no
SMTP_PASS=superhemmeligpassord
SMTP_FROM=no-reply@lekbie.no
SMTP_SECURE=false
```

Valgfritt:

```env
MAIL_PROVIDER=nodemailer
```

For Domeneshop kan disse også brukes:

```env
DOMENESHOP_SMTP_HOST=smtp.domeneshop.no
DOMENESHOP_SMTP_USER=no-reply@lekbie.no
DOMENESHOP_SMTP_PASS=superhemmeligpassord
SMTP_FROM=no-reply@lekbie.no
```

## Anbefalt oppsett

- Opprett `no-reply@lekbie.no` eller `signering@lekbie.no`.
- Bruk den samme adressen som `SMTP_FROM`.
- Sett opp SPF og DKIM på domenet, slik at e-post ikke havner i søppelpost.
- Hvis leverandøren støtter det, bruk `587` med TLS.

## Hva som allerede er klart i appen

- Signeringslenke kan sendes fra appen.
- Ferdig signert lenke kan sendes automatisk fra appen.
- Offentlige signeringslenker krever ikke konto.

## Hvis e-post ikke kommer frem

- Sjekk at `SMTP_FROM` er en ekte e-postadresse.
- Sjekk at `SMTP_USER` og `SMTP_PASS` stemmer.
- Sjekk SPF/DKIM.
- Test med en ekstern mottaker som Gmail og se i søppelpost.

