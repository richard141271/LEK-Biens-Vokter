'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Download, FileText, Calendar, Plus } from 'lucide-react';

interface WeeklyReport {
  id: string;
  week: number;
  year: number;
  submitted_at: string;
  status: string;
}

export default function FranchiseReportsPage() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First get the user's franchise unit(s)
      const { data: units } = await supabase
        .from('franchise_units')
        .select('id')
        .eq('owner_id', user.id);

      if (!units || units.length === 0) {
        setLoading(false);
        return;
      }

      const unitIds = units.map(u => u.id);

      const { data, error } = await supabase
        .from('franchise_weekly_reports')
        .select(`
          id,
          week,
          year,
          submitted_at,
          status
        `)
        .in('franchise_id', unitIds)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setReports(data as any);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = (reportId: string) => {
    window.open(`/api/franchise/report/${reportId}/pdf`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
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
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Mine Rapporter</h1>
                  <p className="text-xs text-gray-500">Oversikt over innsendte ukesrapporter</p>
                </div>
              </div>
            </div>
            <Link
                href="/dashboard/franchise/reports/new"
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
                <Plus className="w-4 h-4" />
                Ny Rapport
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Report List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-medium">
                  <th className="px-6 py-4">Uke / År</th>
                  <th className="px-6 py-4">Levert</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Handling</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Laster rapporter...</td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                            <p>Ingen rapporter funnet.</p>
                            <Link href="/dashboard/franchise/reports/new" className="text-indigo-600 hover:underline">
                                Lever din første rapport nå
                            </Link>
                        </div>
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">Uke {report.week}</span>
                          <span className="text-gray-500">{report.year}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(report.submitted_at).toLocaleDateString('no-NO')}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Levert
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => downloadPdf(report.id)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Last ned PDF
                        </button>
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
