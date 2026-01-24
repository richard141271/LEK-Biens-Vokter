'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { 
  ArrowLeft,
  BookOpen, 
  FileSignature, 
  GraduationCap, 
  ChefHat, 
  Palette, 
  ClipboardList, 
  HelpCircle, 
  MessageSquare,
  Building,
  ArrowRight,
  Lock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface FranchiseUnit {
  id: string;
  name: string;
  status: string;
}

export default function FranchiseDashboard() {
  const [unit, setUnit] = useState<FranchiseUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchMyUnit();
  }, []);

  const fetchMyUnit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch the unit owned by this user
      const { data, error } = await supabase
        .from('franchise_units')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (data) {
        setUnit(data);
      } else {
        // If not found, check if admin (admins might want to see a preview or list)
        // For now, just show null state
      }
    } catch (error) {
      console.error('Error fetching unit:', error);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      title: 'Driftsmanual',
      description: 'Din guide til daglig drift og standarder.',
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'hover:border-blue-500',
      href: '/dashboard/franchise/manual',
      status: 'active'
    },
    {
      title: 'Lisensavtale',
      description: 'Se og signer din franchiseavtale.',
      icon: FileSignature,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'hover:border-purple-500',
      href: '/dashboard/franchise/agreements/license',
      status: 'pending' // pending signature
    },
    {
      title: 'Aksjonæravtale',
      description: 'Juridiske dokumenter for eierskap.',
      icon: FileSignature,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'hover:border-indigo-500',
      href: '/dashboard/franchise/agreements/shareholder',
      status: 'signed'
    },
    {
      title: 'Salgsopplæring',
      description: 'Videokurs og salgsteknikk.',
      icon: GraduationCap,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'hover:border-green-500',
      href: '/dashboard/franchise/training',
      progress: 45 // percent
    },
    {
      title: 'Oppskrifter',
      description: 'Hemmelige oppskrifter og produksjonsmetoder.',
      icon: ChefHat,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'hover:border-orange-500',
      href: '/dashboard/franchise/recipes',
      restricted: true
    },
    {
      title: 'Profilmanual',
      description: 'Logoer, farger og merkevarebygging.',
      icon: Palette,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      borderColor: 'hover:border-pink-500',
      href: '/dashboard/franchise/branding',
      status: 'active'
    },
    {
      title: 'Ukentlig rapport',
      description: 'Send inn statusrapport for uken.',
      icon: ClipboardList,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'hover:border-yellow-500',
      href: '/dashboard/franchise/reports',
      actionRequired: true
    },
    {
      title: 'FAQ',
      description: 'Ofte stilte spørsmål og svar.',
      icon: HelpCircle,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'hover:border-teal-500',
      href: '/dashboard/franchise/faq',
      status: 'active'
    },
    {
      title: 'Kontakt systemeier',
      description: 'Send melding til administrasjonen.',
      icon: MessageSquare,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'hover:border-gray-500',
      href: '/dashboard/franchise/contact',
      status: 'active'
    }
  ];

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Laster din enhet...</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Building className="w-5 h-5 text-yellow-600" />
                  Min LEK-enhet
                </h1>
                <p className="text-xs text-gray-500">{unit ? unit.name : 'Ingen enhet tilknyttet'}</p>
              </div>
            </div>
            {unit && (
                <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        unit.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                        {unit.status === 'active' ? 'Drift godkjent' : unit.status}
                    </span>
                </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!unit ? (
            <div className="text-center py-12">
                <div className="bg-yellow-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-yellow-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Ingen franchise-enhet funnet</h2>
                <p className="text-gray-500 max-w-md mx-auto mb-6">
                    Det ser ut til at din bruker ikke er koblet til en LEK-enhet ennå. Kontakt systemadministrator hvis dette er feil.
                </p>
                <Link href="/dashboard/franchise/contact" className="text-yellow-600 font-medium hover:underline">
                    Kontakt support
                </Link>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card, index) => (
                    <Link key={index} href={card.href} className="group">
                        <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-200 ${card.borderColor} hover:shadow-md transition-all h-full relative overflow-hidden`}>
                            {card.actionRequired && (
                                <div className="absolute top-4 right-4 animate-pulse">
                                    <span className="flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </span>
                                </div>
                            )}
                            
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 rounded-lg ${card.bgColor} ${card.color} group-hover:scale-110 transition-transform`}>
                                    <card.icon className="w-6 h-6" />
                                </div>
                                {card.restricted && (
                                    <Lock className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                                )}
                            </div>
                            
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{card.title}</h3>
                            <p className="text-sm text-gray-500 mb-4">{card.description}</p>
                            
                            {card.progress !== undefined && (
                                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${card.progress}%` }}></div>
                                </div>
                            )}
                            
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-400 mt-auto pt-2">
                                {card.status === 'pending' && <span className="text-orange-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Må signeres</span>}
                                {card.status === 'signed' && <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Signert</span>}
                                {card.progress !== undefined && <span className="text-gray-500">{card.progress}% fullført</span>}
                                {card.actionRequired && <span className="text-red-600 font-bold">Handling kreves</span>}
                                {!card.status && !card.progress && !card.actionRequired && <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">Gå til <ArrowRight className="w-3 h-3" /></span>}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        )}
      </main>
    </div>
  );
}
