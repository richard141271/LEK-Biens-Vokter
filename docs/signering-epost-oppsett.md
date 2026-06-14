# LEK-Signering: oppsett for e-post

LEK-Signering sender e-post direkte fra appen via Resend.

## Hvordan det virker

- Brukeren trykker `Send via e-post` i signeringssaken.
- Serverruten sender e-post via `getMailService(...)`.
- Når avsender fullfører signeringen, sendes det automatisk en e-post til mottaker med lenke til ferdig dokument.

## Miljøvariabler

Minstekrav:

```env
MAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM=post@leksystem.no
SMTP_FROM=post@leksystem.no
```

Samme oppsett brukes i både staging og production, men med egne miljøvariabler per miljø. Du kan bruke samme avsenderadresse i begge.

Anbefalt:

```env
MAIL_PROVIDER=resend
RESEND_FROM=post@leksystem.no
SMTP_FROM=post@leksystem.no
```

For staging:

```env
MAIL_PROVIDER=resend
RESEND_API_KEY=re_staging_xxxxxxxxx
RESEND_FROM=post@leksystem.no
SMTP_FROM=post@leksystem.no
```

For production:

```env
MAIL_PROVIDER=resend
RESEND_API_KEY=re_prod_xxxxxxxxx
RESEND_FROM=post@leksystem.no
SMTP_FROM=post@leksystem.no
```

## Oppsett hos Resend

- Legg til og verifiser domenet `leksystem.no` hos Resend.
- Opprett avsender `post@leksystem.no`.
- Legg inn DNS-postene Resend ber om for SPF/DKIM.
- Legg inn `RESEND_API_KEY` i både staging og production.

## Anbefalt oppsett

- Bruk `post@leksystem.no` som fast avsenderadresse.
- Bruk samme `RESEND_FROM` og `SMTP_FROM`.
- Bruk egne API-nøkler for staging og production hvis du vil skille miljøene.
- Verifiser domenet fullt ut før du tester utsending i production.

## Hva som allerede er klart i appen

- Signeringslenke kan sendes fra appen.
- Ferdig signert lenke kan sendes automatisk fra appen.
- Offentlige signeringslenker krever ikke konto.
- Intern mail-lagring i systemet beholdes, selv om utsending går via Resend.

## Hvis e-post ikke kommer frem

- Sjekk at `RESEND_API_KEY` er satt i riktig miljø.
- Sjekk at domenet `leksystem.no` er verifisert hos Resend.
- Sjekk at `post@leksystem.no` er tillatt som avsender.
- Sjekk SPF/DKIM.
- Test med en ekstern mottaker som Gmail og se i søppelpost.
