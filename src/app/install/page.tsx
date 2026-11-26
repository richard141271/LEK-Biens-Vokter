import Link from 'next/link'
import { headers } from 'next/headers'

export default function InstallPage() {
  const userAgent = (headers().get('user-agent') || '').toLowerCase()
  const isAndroid = userAgent.includes('android')
  const isSamsungBrowser = userAgent.includes('samsungbrowser')
  const isIOS = /iphone|ipad|ipod/.test(userAgent)

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <section className="mx-auto max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-lg sm:p-8">
        <Link href="/" className="text-sm font-medium text-orange-600 hover:underline">
          ← Tilbake
        </Link>

        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          Legg Biens Vokter på startskjermen
        </h1>
        <p className="mt-3 text-gray-700">
          Følg trinnene for nettleseren på telefonen. Da får du et app-ikon på startskjermen.
        </p>

        {isAndroid ? (
          isSamsungBrowser ? (
            <>
              <p className="mt-5 rounded-lg bg-orange-50 p-4 text-sm text-orange-950">
                Menyen på bildet med «Del» og «Ny fane» er hurtigmenyen. Lukk den med X først.
              </p>
              <ol className="mt-5 list-decimal space-y-4 pl-5 text-gray-800">
                <li>Rull helt opp på siden så nettleserens adressefelt vises.</li>
                <li>Trykk de tre prikkene ved adressefeltet øverst til høyre. Hvis du ikke ser dem, åpne nettleserens hovedmeny med tre streker nederst til høyre.</li>
                <li>Velg <strong>Legg til på startskjerm</strong> eller <strong>Legg til side på</strong>, deretter <strong>Startskjerm</strong>.</li>
                <li>Trykk <strong>Legg til</strong>.</li>
              </ol>
            </>
          ) : (
            <ol className="mt-6 list-decimal space-y-4 pl-5 text-gray-800">
              <li>I Chrome trykker du de tre prikkene øverst til høyre.</li>
              <li>Velg <strong>Legg til på startskjermen</strong> eller <strong>Installer app</strong>.</li>
              <li>Trykk <strong>Legg til</strong> eller <strong>Installer</strong> for å bekrefte.</li>
            </ol>
          )
        ) : isIOS ? (
          <ol className="mt-6 list-decimal space-y-4 pl-5 text-gray-800">
            <li>Åpne siden i Safari.</li>
            <li>Trykk på dele-knappen.</li>
            <li>Velg <strong>Legg til på Hjem-skjerm</strong>, og trykk <strong>Legg til</strong>.</li>
          </ol>
        ) : (
          <div className="mt-6 space-y-4 text-gray-800">
            <p><strong>Android:</strong> Åpne nettlesermenyen og velg «Installer app» eller «Legg til på startskjermen».</p>
            <p><strong>iPhone/iPad:</strong> Åpne siden i Safari, trykk Del og velg «Legg til på Hjem-skjerm».</p>
            <p><strong>Datamaskin:</strong> Se etter «Installer app» i nettlesermenyen eller ved adressefeltet.</p>
          </div>
        )}

        {isAndroid && !isSamsungBrowser && (
          <p className="mt-6 rounded-lg bg-orange-50 p-4 text-sm text-orange-950">
            Ser du ikke valget? Kontroller at siden er åpen direkte i Chrome, ikke inne i en annen app.
          </p>
        )}
      </section>
    </main>
  )
}
