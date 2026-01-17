import Link from "next/link";

export default function SurveyLandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-honey-50 to-white pb-16">
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block py-1 px-3 rounded-full bg-honey-100 text-honey-700 text-sm font-bold mb-4">
            Behovsanalyse
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
            LEK-Biens Vokter™️ 2.0 – Nasjonalt smittevernverktøy for birøkt
          </h1>
          <p className="text-lg text-gray-700 mb-6">
            Hjelp oss å stoppe bisykdommer før de sprer seg.
          </p>
          <p className="text-sm text-gray-500 mb-8 max-w-xl mx-auto">
            Vi utvikler neste generasjon digitale verktøy for smittevern i norsk
            birøkt. Dine erfaringer og innspill er avgjørende for at løsningen
            skal treffe hverdagen til ekte birøktere.
          </p>

          <div className="mt-4 mb-10">
            <Link
              href="/survey/form"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full text-lg font-bold bg-honey-500 text-white shadow-lg hover:bg-honey-600 hover:shadow-xl transition-all"
            >
              DELTA I UNDERSØKELSEN
            </Link>
            <p className="mt-4 text-xs text-gray-500">
              Undersøkelsen er anonym og tar ca. 5–7 minutter å svare på.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-honey-100 px-6 py-6 text-left space-y-4">
            <h2 className="text-lg font-bold text-gray-900">
              Hvorfor gjennomfører vi denne behovsanalysen?
            </h2>
            <p className="text-sm text-gray-600">
              Vi ønsker å forstå hvordan birøktere over hele landet jobber med
              forebygging, oppdagelse og håndtering av sykdom i bigården. Ved å
              samle innsikt kan vi prioritere funksjoner som faktisk gjør en
              forskjell i felt.
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Bedre forståelse av dagens rutiner og verktøy</li>
              <li>Innsikt i hvor skoen trykker mest i hverdagen</li>
              <li>Vurdering av nytteverdien av digitale smittevernverktøy</li>
            </ul>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100 mt-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">
                  Anonymitet
                </p>
                <p className="text-sm text-gray-600">
                  Undersøkelsen er anonym. Vi spør kun om e-post dersom du
                  frivillig ønsker å delta i et pilotprogram.
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">
                  Tidsbruk
                </p>
                <p className="text-sm text-gray-600">
                  Det tar vanligvis mellom 5 og 7 minutter å fullføre alle
                  spørsmålene.
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">
                  Målgruppe
                </p>
                <p className="text-sm text-gray-600">
                  Alle birøktere – både hobby og næring – er velkomne til å
                  delta, uansett erfaringsnivå.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 pb-16">
        <h2 className="text-xl font-bold text-gray-900 mb-4">FAQ</h2>
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Må jeg være registrert bruker for å svare?
            </h3>
            <p className="text-sm text-gray-600">
              Nei. Denne behovsanalysen er åpen for alle birøktere, uavhengig
              av om du bruker LEK-Biens Vokter i dag eller ikke.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Samler dere inn personopplysninger?
            </h3>
            <p className="text-sm text-gray-600">
              Selve undersøkelsen er anonym. Vi ber kun om e-post dersom du
              ønsker å bli kontaktet for et pilotprogram. Denne e-posten lagres
              separat fra svarene.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Kan svarene mine påvirke enkeltbigårder eller tilsyn?
            </h3>
            <p className="text-sm text-gray-600">
              Nei. Undersøkelsen brukes kun til å forstå behov og prioritere
              funksjoner i verktøyet. Den brukes ikke til tilsyn, kontroll eller
              oppfølging av enkeltbirøktere.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Hva skjer etter at jeg har svart?
            </h3>
            <p className="text-sm text-gray-600">
              Svarene analyseres samlet. Resultatene brukes til å forme
              LEK-Biens Vokter™️ 2.0, og til å vurdere behovet for pilotprosjekter
              i ulike deler av landet.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

