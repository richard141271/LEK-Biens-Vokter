'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp, Search } from 'lucide-react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    try {
      const { data, error } = await supabase
        .from('franchise_faqs')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (data) {
        setFaqs(data);
      }
    } catch (error) {
      console.error('Error fetching FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(search.toLowerCase()) || 
    faq.answer.toLowerCase().includes(search.toLowerCase()) ||
    faq.category.toLowerCase().includes(search.toLowerCase())
  );

  const groupedFaqs = filteredFaqs.reduce((acc, faq) => {
    if (!acc[faq.category]) acc[faq.category] = [];
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, FAQ[]>);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard/franchise"
                className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">FAQ</h1>
                  <p className="text-xs text-gray-500">Ofte stilte spørsmål</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Søk i spørsmål..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Laster spørsmål...</div>
        ) : Object.keys(groupedFaqs).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedFaqs).map(([category, items]) => (
              <div key={category}>
                <h2 className="text-lg font-bold text-gray-900 mb-4 capitalize">{category}</h2>
                <div className="space-y-3">
                  {items.map((faq) => (
                    <div 
                      key={faq.id}
                      className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all"
                    >
                      <button
                        onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                        className="w-full flex items-center justify-between p-4 text-left"
                      >
                        <span className="font-medium text-gray-800">{faq.question}</span>
                        {openId === faq.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      
                      {openId === faq.id && (
                        <div className="px-4 pb-4 pt-0 text-gray-600 border-t border-gray-50 mt-2 bg-gray-50/50">
                          <div className="pt-4">{faq.answer}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Ingen spørsmål funnet</h3>
            <p className="text-gray-500">Prøv et annet søkeord.</p>
          </div>
        )}

        <div className="mt-12 bg-teal-50 rounded-xl p-6 text-center border border-teal-100">
          <h3 className="font-bold text-teal-900 mb-2">Fant du ikke svar?</h3>
          <p className="text-teal-700 mb-4 text-sm">Send oss en melding direkte, så hjelper vi deg.</p>
          <Link 
            href="/dashboard/franchise/contact"
            className="inline-block px-6 py-2 bg-white text-teal-700 font-medium rounded-lg border border-teal-200 hover:bg-teal-50 transition-colors shadow-sm"
          >
            Kontakt systemeier
          </Link>
        </div>
      </div>
    </div>
  );
}
