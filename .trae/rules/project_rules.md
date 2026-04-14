## Arbeidsflyt

- Når en leveranse er ferdig (lint + build grønt), skal endringene alltid committes og pushes til GitHub (origin/staging) før svaret avsluttes.
- Det skal aldri merges/pushes til origin/main uten at brukeren ber spesifikt om det.
- Når brukeren ber om å «merge til main», skal resultatet være at origin/main og origin/staging peker på nøyaktig samme commit (100% like).
  - Standard: fast-forward av main til staging (ingen merge-commit).
  - Hvis main har diverget: bruk force-with-lease for å sette main lik staging, men bare når brukeren eksplisitt ber om det.
