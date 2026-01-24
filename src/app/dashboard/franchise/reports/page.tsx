'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Send, ClipboardList, Calendar, DollarSign, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FranchiseUnit {
  id: string;
  name: string;
}

export default function WeeklyReportPage() {
  const [unit, setUnit] = useState<FranchiseUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Form state
  const [formData, setFormData] = useState({
    salesAmount: '',
    newCustomers: '',
    inventoryStatus: 'good',
    highlights: '',
    challenges: '',
    plannedActivities: ''
  });

  const currentWeek = getWeekNumber(new Date());
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchMyUnit();
  }, []);

  const fetchMyUnit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('franchise_units')
        .select('id, name')
        .eq('owner_id', user.id)
        .single();

      if (data) {
        setUnit(data);
      }
    } catch (error) {
      console.error('Error fetching unit:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unit) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('franchise_weekly_reports')
        .insert({
          franchise_id: unit.id,
          week: currentWeek,
          year: currentYear,
          data: formData,
          submitted_by: user?.id,
          status: 'submitted'
        });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/franchise');
      }, 2000);
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Det oppstod en feil ved innsending av rapporten.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to get ISO week number
  function getWeekNumber(d: Date) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Laster...</div>;
  }

  if (!unit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ingen enhet funnet</h2>
          <p className="text-gray-500 mb-6">Du må være registrert som eier av en franchise-enhet for å levere rapporter.</p>
          <Link href="/dashboard/franchise" className="text-blue-600 hover:underline">
            Tilbake til oversikten
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Rapport mottatt!</h2>
          <p className="text-gray-500 mb-6">Takk for din ukesrapport for uke {currentWeek}.</p>
          <p className="text-sm text-gray-400">Du blir videresendt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
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
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Ukentlig Rapport</h1>
                  <p className="text-xs text-gray-500">Uke {currentWeek}, {currentYear}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Card: Key Metrics */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-gray-700">Nøkkeltall</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Omsetning denne uken (kr)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="0"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  value={formData.salesAmount}
                  onChange={(e) => setFormData({...formData, salesAmount: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nye kunder / Leads
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="0"
                    className="w-full pl-10 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    value={formData.newCustomers}
                    onChange={(e) => setFormData({...formData, newCustomers: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Status & Inventory */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-gray-700">Lager & Drift</h3>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Hvordan er lagerstatusen?
              </label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, inventoryStatus: 'good'})}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    formData.inventoryStatus === 'good' 
                      ? 'border-green-500 bg-green-50 text-green-700' 
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <span className="block text-2xl mb-1">🟢</span>
                  <span className="text-sm font-medium">God</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, inventoryStatus: 'low'})}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    formData.inventoryStatus === 'low' 
                      ? 'border-yellow-500 bg-yellow-50 text-yellow-700' 
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <span className="block text-2xl mb-1">🟡</span>
                  <span className="text-sm font-medium">Lav</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, inventoryStatus: 'critical'})}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    formData.inventoryStatus === 'critical' 
                      ? 'border-red-500 bg-red-50 text-red-700' 
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <span className="block text-2xl mb-1">🔴</span>
                  <span className="text-sm font-medium">Kritisk</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card: Qualitative Feedback */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-gray-700">Oppsummering</h3>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ukens høydepunkter / Suksesshistorier
                </label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="F.eks. Fikk innpass hos ny butikk, godt salg på stand..."
                  value={formData.highlights}
                  onChange={(e) => setFormData({...formData, highlights: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Utfordringer / Behov for bistand
                </label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Noe vi kan hjelpe med?"
                  value={formData.challenges}
                  onChange={(e) => setFormData({...formData, challenges: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Planer for neste uke
                </label>
                <textarea
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Hva er fokusområdene?"
                  value={formData.plannedActivities}
                  onChange={(e) => setFormData({...formData, plannedActivities: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={submitting}
              className={`flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all ${
                submitting ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5'
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sender inn...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send inn rapport
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MessageSquare(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
