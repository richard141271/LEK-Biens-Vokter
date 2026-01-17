'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { Loader2, Mail, Calendar } from 'lucide-react';

type PilotInterest = {
  id: string;
  email: string;
  interested: boolean;
  created_at: string;
};

export default function PilotInterestPage() {
  const supabase = createClient();
  const [interests, setInterests] = useState<PilotInterest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInterests = async () => {
      const { data, error } = await supabase
        .from('pilot_interest')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pilot interests:', error);
      } else {
        setInterests(data || []);
      }
      setLoading(false);
    };

    fetchInterests();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-honey-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pilot-interesser</h1>
            <p className="text-gray-500">
              Oversikt over brukere som ønsker å delta i pilotprogrammet
            </p>
          </div>
          <div className="text-sm text-gray-500">
            Totalt: {interests.length}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">E-post</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Dato registrert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {interests.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                      Ingen interesserte registrert ennå.
                    </td>
                  </tr>
                ) : (
                  interests.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <a
                          href={`mailto:${item.email}`}
                          className="hover:text-honey-600 hover:underline"
                        >
                          {item.email}
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        {item.interested ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Interessert
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Ikke interessert
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(item.created_at).toLocaleString('nb-NO')}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
