'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { ArrowLeft, BookOpen, FileText, Download, Clock } from 'lucide-react';

interface FranchiseDocument {
  id: string;
  title: string;
  description: string;
  content_url: string;
  version: string;
  updated_at: string;
  category: string;
}

export default function ManualPage() {
  const [documents, setDocuments] = useState<FranchiseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<FranchiseDocument | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchManuals();
  }, []);

  const fetchManuals = async () => {
    try {
      const { data, error } = await supabase
        .from('franchise_documents')
        .select('*')
        .eq('type', 'manual')
        .eq('is_active', true)
        .order('title', { ascending: true });

      if (error) throw error;

      if (data) {
        setDocuments(data);
        if (data.length > 0) {
          setSelectedDoc(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching manuals:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard/franchise"
                className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Driftsmanual</h1>
                  <p className="text-xs text-gray-500">LEK-Biens Vokter Standard</p>
                </div>
              </div>
            </div>
            
            {selectedDoc && (
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full">
                  <Clock className="w-3 h-3" />
                  <span>Oppdatert: {new Date(selectedDoc.updated_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
                  <span>v{selectedDoc.version}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Chapter List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-gray-700">Innholdsfortegnelse</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {loading ? (
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
                  </div>
                ) : documents.length > 0 ? (
                  documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                        selectedDoc?.id === doc.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <FileText className={`w-5 h-5 mt-0.5 ${selectedDoc?.id === doc.id ? 'text-blue-600' : 'text-gray-400'}`} />
                      <div>
                        <p className={`text-sm font-medium ${selectedDoc?.id === doc.id ? 'text-blue-900' : 'text-gray-700'}`}>
                          {doc.title}
                        </p>
                        {doc.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {doc.description}
                          </p>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>Ingen kapitler funnet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content - Document Viewer */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[600px] flex flex-col">
              {selectedDoc ? (
                <>
                  <div className="p-6 border-b border-gray-200 flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedDoc.title}</h2>
                      <p className="text-gray-600 mt-1">{selectedDoc.description}</p>
                    </div>
                    {selectedDoc.content_url && (
                      <a 
                        href={selectedDoc.content_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Last ned PDF
                      </a>
                    )}
                  </div>
                  
                  <div className="flex-1 bg-gray-50 p-6">
                    {/* 
                      Here we would normally render the PDF or content. 
                      For MVP, if content_url is a PDF, we use an object/iframe.
                      If it's just text/dummy, we show a placeholder.
                    */}
                    {selectedDoc.content_url?.endsWith('.pdf') ? (
                      <object
                        data={selectedDoc.content_url}
                        type="application/pdf"
                        className="w-full h-full min-h-[800px] rounded-lg border border-gray-200 bg-white"
                      >
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                          <p className="text-gray-500 mb-4">Kunne ikke vise PDF direkte.</p>
                          <a 
                            href={selectedDoc.content_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline font-medium"
                          >
                            Last ned filen her
                          </a>
                        </div>
                      </object>
                    ) : (
                      <div className="bg-white p-12 rounded-lg border border-gray-200 shadow-sm text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FileText className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Innhold kommer snart</h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                          Dette kapittelet er under utarbeidelse. Last ned filen hvis tilgjengelig, eller sjekk tilbake senere.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                    <BookOpen className="w-10 h-10 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Velkommen til Driftsmanualen</h3>
                  <p className="text-gray-500 max-w-lg">
                    Her finner du all informasjon du trenger for å drive din LEK-enhet. 
                    Velg et kapittel fra menyen til venstre for å begynne.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
