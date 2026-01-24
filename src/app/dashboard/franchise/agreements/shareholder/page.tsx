'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { ArrowLeft, FileSignature, CheckCircle, Download, ShieldCheck } from 'lucide-react';

interface FranchiseDocument {
  id: string;
  title: string;
  description: string;
  content_url: string;
  version: string;
  updated_at: string;
}

interface Signature {
  id: string;
  signed_at: string;
  status: string;
}

export default function ShareholderAgreementPage() {
  const [document, setDocument] = useState<FranchiseDocument | null>(null);
  const [signature, setSignature] = useState<Signature | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchDocumentAndSignature();
  }, []);

  const fetchDocumentAndSignature = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: docData, error: docError } = await supabase
        .from('franchise_documents')
        .select('*')
        .eq('type', 'agreement')
        .eq('category', 'shareholder')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (docData) {
        setDocument(docData);

        const { data: sigData, error: sigError } = await supabase
          .from('franchise_signatures')
          .select('*')
          .eq('document_id', docData.id)
          .eq('user_id', user.id)
          .single();

        if (sigData) {
          setSignature(sigData);
        }
      }
    } catch (error) {
      console.error('Error fetching agreement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!document || !agreed) return;

    setSigning(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('franchise_signatures')
        .insert({
          document_id: document.id,
          user_id: user.id,
          status: 'signed',
          signature_data: 'Digital Signature via Portal'
        })
        .select()
        .single();

      if (error) throw error;

      setSignature(data);
    } catch (error) {
      console.error('Error signing document:', error);
      alert('Kunne ikke signere dokumentet. Prøv igjen.');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Laster avtale...</div>;
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-md w-full text-center">
          <ShieldCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ingen avtale funnet</h2>
          <p className="text-gray-500 mb-6">Det ligger ingen aksjonæravtale klar for signering.</p>
          <Link href="/dashboard/franchise" className="text-blue-600 hover:underline">
            Tilbake til oversikten
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard/franchise"
                className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FileSignature className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Aksjonæravtale</h1>
                  <p className="text-xs text-gray-500">Versjon {document.version}</p>
                </div>
              </div>
            </div>
            
            {signature ? (
              <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-200">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-bold">Signert {new Date(signature.signed_at).toLocaleDateString()}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full border border-indigo-200">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                </span>
                <span className="text-sm font-bold">Klar til signering</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="p-8 border-b border-gray-200">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">{document.title}</h2>
            <p className="text-gray-600 text-center max-w-2xl mx-auto mb-8">{document.description}</p>
            
            <div className="prose prose-sm max-w-none bg-gray-50 p-8 rounded-lg border border-gray-200 h-[500px] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">1. Selskapet</h3>
              <p className="mb-4">
                Denne aksjonæravtalen gjelder for eierskap i [Selskapsnavn], heretter kalt Selskapet.
              </p>
              
              <h3 className="text-lg font-bold mb-4">2. Formål</h3>
              <p className="mb-4">
                Formålet med avtalen er å regulere forholdet mellom aksjonærene og sikre stabil drift og utvikling.
              </p>

              <h3 className="text-lg font-bold mb-4">3. Forkjøpsrett</h3>
              <p className="mb-4">
                Ved salg av aksjer har øvrige aksjonærer forkjøpsrett i henhold til aksjeloven.
              </p>

              <p className="italic text-gray-500 mt-8 text-center">
                [... Dette er en forenklet visning. Last ned fullstendig PDF for alle detaljer ...]
              </p>
            </div>
          </div>
        </div>

        {!signature && (
          <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Aksept av vilkår</h3>
            
            <div className="flex items-start gap-4 mb-6">
              <div className="flex items-center h-5">
                <input
                  id="agree"
                  type="checkbox"
                  className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
              </div>
              <label htmlFor="agree" className="text-sm text-gray-700">
                Jeg bekrefter at jeg har lest og forstått aksjonæravtalen.
              </label>
            </div>

            <button
              onClick={handleSign}
              disabled={!agreed || signing}
              className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all shadow-md ${
                agreed 
                  ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5' 
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {signing ? 'Signerer...' : 'Signer Aksjonæravtale'}
            </button>
          </div>
        )}

        {signature && (
          <div className="bg-green-50 p-6 rounded-xl border border-green-200 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileSignature className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-green-900 mb-2">Avtalen er signert</h3>
            <p className="text-green-700 mb-4">
              Signert digitalt den {new Date(signature.signed_at).toLocaleString()}
            </p>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-green-200 rounded-lg text-green-700 hover:bg-green-50 transition-colors text-sm font-medium">
              <Download className="w-4 h-4" />
              Last ned signert kopi (PDF)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
