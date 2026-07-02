## Aurora Product Flow

Aurora er en ekte produktflyt i `LEK-Biens Vokter`, ikke en separat testadapter.

### Startpunkt

- Birøkteren starter i en ekte kubeinspeksjon på `hives/[id]/new-inspection`.
- Aurora viser biologiske motstrider i skjemaet mens brukeren fyller inn.
- Aurora viser også en forhåndsvisning av hvilke oppfølginger som vil bli opprettet når inspeksjonen lagres.

### Analyse

- Analyse trigges av faktisk inspeksjonsdata og notater.
- Ved lagring brukes `buildAuroraSuggestionsForInspection()` til å bygge ekte forslag.
- Forslagene lagres i `aurora_suggestions`.

### Resultat

- Etter lagring sendes brukeren tilbake til riktig bigård.
- Bigårdssiden viser Aurora-forslag med tittel, begrunnelse, råd og valg for å opprette oppgave eller ignorere.
- `/aurora` viser en samlet oversikt over åpne Aurora-forslag for innlogget bruker.

### Scenarioer

- `lite mat`: Aurora foreslår støttefôring. Hvis også forrige inspeksjon viste lite fôr, løftes alvorlighetsgraden.
- `deformerte vinger`: Aurora foreslår oppfølging av deformerte vinger og mulig varroabelastning basert på notater.
- `dronning ikke sett`: Aurora tolker funnet med nyanser.
  - Hvis egg er sett: mild oppfølging ved neste inspeksjon.
  - Hvis verken dronning eller egg er sett: tydelig oppfølging for å avklare dronningsituasjonen.
  - Hvis bare dronningen ikke er observert: informativ oppfølging uten å overtolke.
- `egg observert`: Aurora bruker dette som biologisk motvekt mot dronningtap og nedjusterer anbefalingene når det er rimelig.
- `sverming`: Aurora foreslår oppfølging av svermingstegn. I sterk kube med tydelig trykk løftes hastverket.
