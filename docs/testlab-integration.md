# LEK-TestLab™ integrasjon (LEK-Biens Vokter™️)

Dette repoet bygger ikke et nytt testsystem.

LEK-TestLab™ er kvalitetssystemet. Denne integrasjonen leverer et maskinlesbart manifest som TestLab kan konsumere for å:

- oppdage nye features
- koble features til nødvendige tester
- koble arbeidsflyter (User Journeys) til tester
- flagge manglende testdekning

## Manifest

- Fil: `testlab/lek-biens-vokter.manifest.json`
- Innhold:
  - `features[]` med `id`, `name`, `kind`, `paths`, `tests`, `required`
  - `userJourneys[]` med `id`, `name`, `tests`, `required`

## Definition of Done (DoD)

En feature regnes ikke som ferdig før:

- funksjonaliteten virker
- build er grønn
- staging fungerer
- feature er registrert i TestLab-manifestet
- nødvendige tester og/eller user journeys er oppdatert i TestLab
- hvis ingen tester er nødvendig: dette må begrunnes eksplisitt via `testJustification`

## Lokale kommandoer

- `npm run testlab:validate`
  - validerer at manifestet er konsistent og at required-features ikke er "testløse"
- `npm run testlab:assess`
  - viser hvilke features manifestet mener er påvirket av endringer i git-diff
- `npm run verify`
  - lint + build + testlab-manifest-validering

## Prinsipp: AKB er eneste faglige sannhetskilde

Når kursmoduler eller Aurora trenger faglig innhold:

- bruk `slug` og hent fra `aurora_knowledge`
- ikke kopier fagtekst inn i egne filer hvis den allerede finnes i AKB

