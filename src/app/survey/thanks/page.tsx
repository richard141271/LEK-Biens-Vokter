import Link from "next/link";

export default function SurveyThanksPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-honey-50 to-white">
      <div className="max-w-2xl mx-auto px-4 pt-32 pb-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-honey-500 text-white mb-6">
          <span className="text-2xl">🐝</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Takk for at du bidrar til bedre smittevern for norske bier!
        </h1>
        <p className="text-sm text-gray-600 mb-8 max-w-xl mx-auto">
          Svarene dine er med på å forme LEK-Biens Vokter™️ 2.0 og gjør det
          mulig å utvikle løsninger som faktisk fungerer i bigården.
        </p>
        <Link
          href="/survey"
          className="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-semibold bg-honey-500 text-white hover:bg-honey-600 shadow-md"
        >
          Tilbake til landingssiden
        </Link>
      </div>
    </main>
  );
}

