'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  CheckSquare, 
  Box, 
  Truck, 
  ClipboardCheck, 
  Camera, 
  AlertTriangle, 
  Droplets,
  CheckCircle,
  Save,
  Share2
} from 'lucide-react';

export default function BeekeeperChecklistPage() {
  const router = useRouter();
  
  // State for checklist items
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'prep' | 'location' | 'health' | 'honey' | 'finish'>('prep');

  const toggleCheck = (id: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const isChecked = (id: string) => !!checkedItems[id];

  const calculateProgress = () => {
    const total = Object.keys(checklistData).reduce((acc, sectionKey) => {
      const section = checklistData[sectionKey as keyof typeof checklistData];
      let count = section.items.length;
      // Include premiumItems in count if they exist
      if ('premiumItems' in section && section.premiumItems) {
        count += section.premiumItems.length;
      }
      return acc + count;
    }, 0);
    
    const completed = Object.keys(checkedItems).filter(k => checkedItems[k]).length;
    
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  // Checklist Data Structure
  const checklistData = {
    prep: {
      title: 'A. Før du drar ut',
      icon: <Box className="w-5 h-5" />,
      description: 'Pakking og forberedelse',
      items: [
        { id: 'prep_1', text: 'Sjekk bestilling i LEK-appen' },
        { id: 'prep_2', text: 'Bekreft antall kuber og type (standard eller premium)' },
        { id: 'prep_3', text: 'Se om leietaker har valgt bulk eller glasslevering' },
        { id: 'prep_4', text: 'Registrer lokasjon i appen og aktiver LEK-Kube-ID' },
        { id: 'prep_5', text: 'Pakk utstyr iht. antall bestilte kuber' },
      ],
      equipment: [
        { item: 'Kubeverktøy', amount: '1 stk' },
        { item: 'Røykpuster + røykmateriale', amount: '1 stk + 1 refill' },
        { item: 'Bidrakt + hansker + slør (til deg)', amount: '1 sett' },
        { item: 'Barneslør + hansker (ved LEK-opplegg med barn)', amount: '3 sett' },
        { item: 'Fôringskar / fôringsposer', amount: '1 per lokasjon' },
        { item: 'Sukkerlake/fondant startfôr', amount: '2–5 kg' },
        { item: 'Varroabrett', amount: '1 per kube' },
        { item: 'Sil og tappeutstyr (hvis honning skal tas ut)', amount: '1 sett' },
      ]
    },
    location: {
      title: 'B. På lokasjonen',
      icon: <Truck className="w-5 h-5" />,
      description: 'Utlevering og montering',
      items: [
        { id: 'loc_1', text: 'Plasser kube på stabilt og trygt underlag' },
        { id: 'loc_2', text: 'Monter bunnbrett' },
        { id: 'loc_3', text: 'Sett inn yngelrom med halvammer + voks' },
        { id: 'loc_4', text: 'Monter dronninggitter' },
        { id: 'loc_5', text: 'Plasser skattekasser/magasiner (antall etter bestilling)' },
        { id: 'loc_6', text: 'Legg inn varroabrett i hver kube' },
        { id: 'loc_7', text: 'Gi startfôr til bifolket' },
        { id: 'loc_8', text: 'Ta 3 bilder av kuben (bunn – midt – topp) og last opp i LEK-loggen', icon: <Camera className="w-4 h-4 ml-2 inline text-blue-500" /> },
      ],
      note: 'Alle kuber skal merkes og registreres digitalt i appen før du drar videre.'
    },
    health: {
      title: 'C. Sykdom & Status',
      icon: <AlertTriangle className="w-5 h-5" />,
      description: 'Dronning og bifolk-status',
      items: [
        { id: 'health_1', text: 'Er dronning observert i bifolket? (Registrer i app)' },
        { id: 'health_2', text: 'Tegn til sykdom eller urolig bifolk? (Meld fra i app)' },
        { id: 'health_3', text: 'Varroanivå ved oppstart målt? (Registrer i app)' },
      ]
    },
    honey: {
      title: 'D. Honninguttak',
      icon: <Droplets className="w-5 h-5" />,
      description: 'Dersom leietaker har bestilt honningrett',
      items: [
        { id: 'honey_std_1', text: 'Ta ut honningrammer' },
        { id: 'honey_std_2', text: 'Slynge 20–120 kg samlet på lokasjon' },
        { id: 'honey_std_3', text: 'Tapp i 20 kg bøtter (200 kr/kg for leier ved standard bulk)' },
        { id: 'honey_std_4', text: 'Registrer mengde og batch i børsmodulen' },
      ],
      premiumItems: [
        { id: 'honey_prem_1', text: 'Planlegg separat utrykning i kalender-modulen' },
        { id: 'honey_prem_2', text: 'Slyng KUN denne honningen alene' },
        { id: 'honey_prem_3', text: 'Lever i 20 kg bøtter eller glass etter avtale' },
        { id: 'honey_prem_4', text: 'Pris for leier: 400 kr/kg' },
        { id: 'honey_prem_5', text: 'Ta 3 bilder og dokumenter premiumbatch i LEK-loggen' },
      ],
      note: 'Premiumhonning må merkes tydelig i børsen som "Egen LEK-Kube-Premium Batch – ikke blandet"'
    },
    finish: {
      title: 'E. Etterarbeid',
      icon: <ClipboardCheck className="w-5 h-5" />,
      description: 'Digital levering',
      items: [
        { id: 'fin_1', text: 'Lever sesonglogg i appen' },
        { id: 'fin_2', text: 'Lever salgstall og honningmengde i børsmodulen' },
        { id: 'fin_3', text: 'Bekreft at lokasjonen har fått ansvarlig birøkter tilknyttet' },
      ]
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-2">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">LEK-Birøkter Checklist</h1>
              <p className="text-xs text-gray-500">Modul 1.4 – Oppstart, tilsyn og uttak</p>
            </div>
            <div className="ml-auto text-right">
              <span className="text-2xl font-bold text-honey-600">{calculateProgress()}%</span>
              <p className="text-[10px] text-gray-400">Fullført</p>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {Object.entries(checklistData).map(([key, data]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                  ${activeTab === key 
                    ? 'bg-honey-100 text-honey-800 border border-honey-200' 
                    : 'bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100'}`}
              >
                {data.icon}
                {data.title.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        
        {/* Active Section Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <div className="p-6 bg-honey-50 border-b border-honey-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white rounded-xl shadow-sm text-honey-600">
                {checklistData[activeTab].icon}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{checklistData[activeTab].title}</h2>
                <p className="text-honey-700">{checklistData[activeTab].description}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            
            {/* Equipment List (Only for Prep) */}
            {activeTab === 'prep' && checklistData.prep.equipment && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-6">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Truck className="w-4 h-4" /> Utstyr du MÅ ha med
                </h3>
                <div className="space-y-2">
                  {checklistData.prep.equipment.map((eq, idx) => (
                    <div key={idx} className="flex justify-between text-sm border-b border-gray-200 last:border-0 pb-2 last:pb-0">
                      <span className="text-gray-700">{eq.item}</span>
                      <span className="font-mono font-bold text-gray-900">{eq.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main Items */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Sjekkliste</h3>
              {checklistData[activeTab].items.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer group
                    ${isChecked(item.id) 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-white border-gray-200 hover:border-honey-300 hover:shadow-sm'}`}
                >
                  <div className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors
                    ${isChecked(item.id)
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 group-hover:border-honey-400'}`}
                  >
                    {isChecked(item.id) && <CheckSquare className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isChecked(item.id) ? 'text-green-800 line-through opacity-70' : 'text-gray-900'}`}>
                      {item.text}
                    </p>
                    {/* @ts-ignore - icon property exists on some items */}
                    {item.icon && <div className="mt-1">{item.icon}</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Premium Items (Only for Honey) */}
            {activeTab === 'honey' && checklistData.honey.premiumItems && (
              <div className="mt-8 pt-6 border-t border-dashed border-gray-300">
                <h3 className="font-bold text-honey-800 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Premium Honninguttak (Egen utrykning)
                </h3>
                <div className="space-y-3">
                  {checklistData.honey.premiumItems.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => toggleCheck(item.id)}
                      className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer group
                        ${isChecked(item.id) 
                          ? 'bg-amber-50 border-amber-200' 
                          : 'bg-white border-gray-200 hover:border-amber-300 hover:shadow-sm'}`}
                    >
                      <div className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors
                        ${isChecked(item.id)
                          ? 'bg-amber-500 border-amber-500 text-white'
                          : 'border-gray-300 group-hover:border-amber-400'}`}
                      >
                        {isChecked(item.id) && <CheckSquare className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${isChecked(item.id) ? 'text-amber-900 line-through opacity-70' : 'text-gray-900'}`}>
                          {item.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {/* @ts-ignore */}
            {checklistData[activeTab].note && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800 italic flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                {/* @ts-ignore */}
                {checklistData[activeTab].note}
              </div>
            )}

          </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center pt-8">
           <button className="flex items-center gap-2 text-gray-500 hover:text-gray-900">
             <Share2 className="w-5 h-5" />
             <span className="text-sm font-medium">Del liste</span>
           </button>
           
           <button className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-transform active:scale-95 flex items-center gap-2 shadow-lg">
             <Save className="w-5 h-5" />
             Lagre Progresjon
           </button>
        </div>

      </div>
    </div>
  );
}