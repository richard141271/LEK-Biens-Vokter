'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Loader2, Mail, Calendar } from 'lucide-react';

type PilotInterest = {
  id: string;
  email: string;
  interested: boolean;
  created_at: string;
};

export default function PilotInterestPage() {
  const [interests, setInterests] = useState<PilotInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInterests = async () => {
      try {
        const res = await fetch('/api/admin/pilot-interest');
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          const message =
            data?.error || 'Kunne ikke hente pilot-interesser.';
          throw new Error(message);
        }

        const data = await res.json();
        setInterests(data.interests || []);
      } catch (e: any) {
        console.error('Feil ved henting av pilot-interesser:', e);
        setError(
          e?.message || 'Kunne ikke hente pilot-interesser.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInterests();
  }, []);

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
        <div className="flex items-center justify-between mb-2">
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

        <div className="mb-6">
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <span className="mr-2">←</span>
            Tilbake til Systemadministrasjon
          </Link>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

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
