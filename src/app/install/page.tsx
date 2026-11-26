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
          <ol className="mt-6 list-decimal space-y-4 pl-5 text-gray-800">
            <li>Åpne nettlesermenyen med de tre prikkene.</li>
            {isSamsungBrowser ? (
              <li>Velg <strong>Legg til side på</strong>, og deretter <strong>Startskjerm</strong>.</li>
            ) : (
              <li>Velg <strong>Installer app</strong> eller <strong>Legg til på startskjermen</strong>.</li>
            )}
            <li>Bekreft ved å trykke <strong>Legg til</strong> eller <strong>Installer</strong>.</li>
          </ol>
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

        {isAndroid && (
          <p className="mt-6 rounded-lg bg-orange-50 p-4 text-sm text-orange-950">
            Finner du ikke valget? Åpne siden direkte i Chrome eller Samsung Internet, og åpne menyen på nytt.
          </p>
        )}
      </section>
    </main>
  )
}
