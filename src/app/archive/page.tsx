'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Archive, Calendar, ArrowLeft, Download, CheckCircle2 } from 'lucide-react';
import { normalizeSignRequestRecord } from '@/lib/signing';

type ArchivedSignRequest = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  sender_signed_at: string | null;
  recipient_signature_name: string | null;
  sender_signature_name: string | null;
  pdf_path: string;
  completed_pdf_path: string | null;
  download_url?: string | null;
};

export default function ArchivePage() {
  const router = useRouter();
  const [hives, setHives] = useState<any[]>([]);
  const [signRequests, setSignRequests] = useState<ArchivedSignRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const supabase = createClient();

  useEffect(() => {
    fetchArchiveData();
  }, []);

  const fetchArchiveData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: hiveData, error: hiveError }, { data: signingData, error: signingError }] = await Promise.all([
      supabase
        .from('hives')
        .select('*, apiaries(name)')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false }),
      supabase
        .from('sign_requests')
        .select('id, title, status, created_at, sender_signed_at, recipient_signed_at, recipient_signature_name, sender_signature_name, pdf_path, completed_pdf_path')
        .eq('created_by_user_id', user.id)
        .order('updated_at', { ascending: false }),
    ]);

    if (hiveError) {
      console.error('Error fetching hives:', hiveError);
    } else {
      const archived = (hiveData || []).filter(h => 
        h.active === false || 
        ['SOLGT', 'DESTRUERT', 'SYKDOM', 'DØD'].includes(h.status)
      );
      setHives(archived);
    }

    if (signingError) {
      console.error('Error fetching sign requests:', signingError);
    } else {
      const requests = (Array.isArray(signingData) ? signingData : [])
        .map((item) => normalizeSignRequestRecord(item as any))
        .filter((item) => item.status === 'COMPLETED');
      const withUrls = await Promise.all(
        requests.map(async (item) => {
          const path = item.completed_pdf_path || item.pdf_path;
          if (!path) return { ...item, download_url: null };
          const { data } = await supabase.storage.from('sign-documents').createSignedUrl(path, 60 * 15);
          return { ...item, download_url: data?.signedUrl || null };
        })
      );
      setSignRequests(withUrls);
    }
    setLoading(false);
  };

  const filteredHives = hives.filter(hive => {
    const term = searchTerm.toLowerCase();
    const name = hive.name?.toLowerCase() || '';
    const number = hive.hive_number?.toLowerCase() || '';
    const status = hive.status?.toLowerCase() || '';
    
    // Standard text search
    if (name.includes(term) || number.includes(term) || status.includes(term)) return true;
    
    // Numeric loose match (e.g. "002" matches "2", "2" matches "002")
    // Remove leading zeros and non-digit characters for comparison
    const cleanTerm = term.replace(/\D/g, '').replace(/^0+/, '');
    const cleanNum = number.replace(/\D/g, '').replace(/^0+/, '');
    
    if (cleanTerm && cleanNum && cleanTerm === cleanNum) return true;
    
    return false;
  });

  const filteredSignRequests = signRequests.filter((item) => {
    const term = searchTerm.toLowerCase();
    const title = item.title?.toLowerCase() || '';
    const status = item.status?.toLowerCase() || '';
    const signedName = item.recipient_signature_name?.toLowerCase() || '';
    return title.includes(term) || status.includes(term) || signedName.includes(term);
  });

  const getStatusBadge = (status: string, reason: string) => {
    if (status === 'SOLGT') {
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold border border-green-200">SOLGT</span>;
    }
    if (status === 'DESTRUERT') {
        if (reason === 'SYKDOM') {
            return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold border border-red-200">SYKDOM</span>;
        }
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-bold border border-gray-200">DESTRUERT</span>;
    }
    return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs border border-gray-200">{status || 'ARKIVERT'}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
            <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
                <Archive className="w-6 h-6" />
            </div>
            <div>
                <h1 className="text-xl font-bold text-gray-900">Arkiv & Historikk</h1>
                <p className="text-sm text-gray-500">Oversikt over arkiverte avtaler og inaktive kuber</p>
            </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Søk i arkivet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-honey-500 focus:border-transparent outline-none transition-all"
          />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Laster arkiv...</div>
        ) : filteredHives.length === 0 && filteredSignRequests.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Archive className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Arkivet er tomt</h3>
            <p className="text-gray-500">Ingen inaktive kuber funnet.</p>
          </div>
        ) : (
          <>
            {filteredSignRequests.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-black uppercase tracking-wide text-gray-500 px-1">Ferdig signerte avtaler</div>
                {filteredSignRequests.map((item) => (
                  <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <div>
                        <h3 className="font-bold text-gray-900 break-words">{item.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Signert {item.sender_signed_at ? new Date(item.sender_signed_at).toLocaleDateString() : '-'}
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold border border-green-200 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        FULLFØRT
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Mottaker: {item.recipient_signature_name || '-'} • Avsender: {item.sender_signature_name || '-'}
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm text-gray-600 mt-3 pt-3 border-t border-gray-50">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>Opprettet {new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/signering/${item.id}`} className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50">
                          Åpne
                        </Link>
                        {item.download_url ? (
                          <a
                            href={item.download_url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-2 rounded-lg bg-gray-900 text-white font-bold inline-flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Last ned PDF
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredHives.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-black uppercase tracking-wide text-gray-500 px-1">Arkiverte kuber</div>
                {filteredHives.map((hive) => (
                  <Link 
                    key={hive.id} 
                    href={`/hives/${hive.id}`}
                    className="block bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-honey-300 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-gray-900">{hive.name}</h3>
                        <p className="text-xs text-gray-500">#{hive.hive_number}</p>
                      </div>
                      {getStatusBadge(hive.status, hive.archive_reason)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-3 pt-3 border-t border-gray-50">
                      <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{new Date(hive.updated_at).toLocaleDateString()}</span>
                      </div>
                      {hive.apiaries && (
                          <div className="flex items-center gap-1.5">
                              <Archive className="w-4 h-4 text-gray-400" />
                              <span>Var i: {hive.apiaries.name}</span>
                          </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
