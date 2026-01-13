'use client';

import Link from 'next/link';
import NextImage from 'next/image';
import { ArrowLeft, AlertTriangle, Bug, ShieldCheck, CheckCircle, XCircle } from 'lucide-react';

type DiseaseKey = 'varroa' | 'lukket-yngelrate' | 'apen-yngelrate' | 'kalkyngel' | 'nosema' | 'frisk-kube';

const DISEASES: Record<DiseaseKey, {
  title: string;
  severityLabel: string;
  severityColor: string;
  icon: 'bug' | 'alert' | 'shield';
  short: string;
  see: string[];
  actions: string[];
  meldepliktig?: boolean;
  image?: string;
}> = {
  varroa: {
    title: 'Varroa (midd)',
    severityLabel: 'Høy',
    severityColor: 'red',
    icon: 'bug',
    short: 'Varroa er en parasitt som svekker biene og sprer virus.',
    see: ['Små rødbrune midd', 'Deformerte vinger', 'Svakt bifolk'],
    actions: ['Utfør varroakontroll', 'Start godkjent behandling'],
    image: '/images/sykdommer/varroa.png'
  },
  'lukket-yngelrate': {
    title: 'Lukket yngelråte (Amerikansk)',
    severityLabel: 'Kritisk – meldepliktig',
    severityColor: 'red',
    icon: 'alert',
    short: 'Alvorlig bakteriesykdom i yngel.',
    see: ['Ujevnt yngelbilde', 'Brun, seig masse i celler', 'Sterk lukt'],
    actions: ['Isoler kuben', 'Meld til Mattilsynet'],
    meldepliktig: true,
    image: '/images/sykdommer/lukket_yngelrate.png'
  },
  'apen-yngelrate': {
    title: 'Åpen yngelråte (Europeisk)',
    severityLabel: 'Middels–høy',
    severityColor: 'orange',
    icon: 'alert',
    short: 'Bakteriesykdom som rammer åpen yngel.',
    see: ['Død yngel i åpne celler', 'Gulgrå masse', 'Sur lukt'],
    actions: ['Følg med', 'Forbedre forhold i kuben'],
    image: '/images/sykdommer/apen_yngelrate.png'
  },
  kalkyngel: {
    title: 'Kalkyngel',
    severityLabel: 'Lav–middels',
    severityColor: 'yellow',
    icon: 'bug',
    short: 'Soppinfeksjon som gir mumifisert yngel.',
    see: ['Hvite/grå klumper', 'Død yngel på bunnbrett'],
    actions: ['Bedre ventilasjon', 'Bytt dronning ved behov'],
    image: '/images/sykdommer/kalkyngel.png'
  },
  nosema: {
    title: 'Nosema',
    severityLabel: 'Middels',
    severityColor: 'yellow',
    icon: 'bug',
    short: 'Tarmsykdom som svekker biene.',
    see: ['Diaré', 'Slappe bier', 'Dårlig vårutvikling'],
    actions: ['God hygiene', 'Forny gamle rammer'],
    image: '/images/sykdommer/nosema.png'
  },
  'frisk-kube': {
    title: 'Frisk kube (referanse)',
    severityLabel: 'Grønn',
    severityColor: 'green',
    icon: 'shield',
    short: 'Referanse for frisk kube.',
    see: ['Jevnt yngelbilde', 'Rolige bier', 'God aktivitet'],
    actions: [],
    image: '/images/sykdommer/frisk_kube.jpg'
  }
};

export default function DiseaseShortPage({ params }: { params: { slug: DiseaseKey } }) {
  const key = params.slug;
  const d = DISEASES[key];

  if (!d) {
    return (
      <div className="p-6">
        <Link href="/dashboard/smittevern/veileder" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Tilbake til veileder
        </Link>
        <p className="mt-4 text-sm text-gray-600">Sykdom ikke funnet.</p>
      </div>
    );
  }

  const IconEl = d.icon === 'bug' ? <Bug className="w-6 h-6" /> : d.icon === 'alert' ? <AlertTriangle className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />;
  const headerBg =
    d.severityColor === 'red' ? 'bg-red-50 border-red-100' :
    d.severityColor === 'orange' ? 'bg-orange-50 border-orange-100' :
    d.severityColor === 'yellow' ? 'bg-yellow-50 border-yellow-100' :
    'bg-green-50 border-green-100';

  return (
    <div className="space-y-6 p-6 pb-20">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/smittevern/veileder" className="p-2 bg-white rounded-full shadow-sm border border-gray-200 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">{d.title}</h1>
      </div>

      <section className={`rounded-xl shadow-sm border ${headerBg} overflow-hidden`}>
        <div className="md:flex md:flex-row-reverse">
          {d.image && (
            <div 
              className="relative w-full h-48 sm:h-64 md:h-auto md:w-1/2 bg-gray-100 cursor-pointer group"
              onClick={() => setIsImageModalOpen(true)}
            >
              <NextImage
                src={d.image}
                alt={d.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
              </div>
            </div>
          )}
          
          <div className="flex-1 flex flex-col">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-gray-900">
                <div className="p-2 rounded-lg bg-white/60">
                  {IconEl}
                </div>
                <div>
                  <div className="text-sm">{d.short}</div>
                  <div className="text-xs mt-1">
                    Alvorlighet: <span className="font-bold">{d.severityLabel}</span>
                    {d.meldepliktig && <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-600 text-white text-[11px]">MELDEPLIKTIG <AlertTriangle className="w-3 h-3" /></span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5 bg-white flex-1">
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2">Se etter</h3>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  {d.see.map((s) => <li key={s}>{s}</li>)}
                </ul>
              </div>

              {d.actions.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" /> Hva gjør jeg nå?
                  </h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-6">
                    {d.actions.map((a) => <li key={a}>{a}</li>)}
                  </ul>
                </div>
              )}

              {key === 'lukket-yngelrate' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
                      <XCircle className="w-4 h-4" /> Ikke gjør
                    </h4>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-6">
                      <li>Flytt rammer</li>
                      <li>Del kuber</li>
                      <li>Forsøk egen “behandling”</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="text-sm text-gray-500">
        <Link href="/dashboard/smittevern/ai-diagnose" className="text-blue-600 hover:underline">Bruk AI-diagnose</Link> eller <Link href="/dashboard/smittevern/veileder" className="text-blue-600 hover:underline">tilbake til Sykdomsveileder</Link>.
      </div>

      {/* Image Modal */}
      {isImageModalOpen && d.image && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setIsImageModalOpen(false)}>
          <button 
            onClick={() => setIsImageModalOpen(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative w-full h-full max-w-5xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <NextImage
              src={d.image}
              alt={d.title}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>
        </div>
      )}
    </div>
  );
}

