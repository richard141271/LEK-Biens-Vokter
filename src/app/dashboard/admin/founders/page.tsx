'use client';

import { useEffect, useState } from 'react';
import { getAllFoundersData } from '@/app/actions/founder';
import { Shield, ChevronDown, ChevronUp, History, Target, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';
import Link from 'next/link';

export default function AdminFoundersPage() {
    const [founders, setFounders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            const res = await getAllFoundersData();
            if ('founders' in res) {
                setFounders(res.founders || []);
            } else {
                console.error(res.error);
            }
            setLoading(false);
        };
        loadData();
    }, []);

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Laster gründerdata...</div>;

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <header className="bg-white border-b border-gray-200 py-6 px-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/admin" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <Shield className="w-6 h-6 text-amber-600" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Gründer-oppfølging</h1>
                            <p className="text-gray-500 text-sm">Oversikt over avtaler, roller og loggføring</p>
                        </div>
                    </div>
                    <Link 
                        href="/dashboard/founder/community"
                        className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-900 rounded-lg hover:bg-amber-200 font-medium text-sm transition-colors"
                    >
                        <MessageSquare className="w-4 h-4" />
                        War Room
                    </Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 pb-24">
                <div className="space-y-4">
                    {founders.map((founder) => (
                        <div key={founder.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm transition-all hover:shadow-md">
                            {/* Header */}
                            <div 
                                className="p-6 flex flex-col md:flex-row md:items-center justify-between cursor-pointer bg-gray-50/50 hover:bg-gray-50 gap-4"
                                onClick={() => setExpandedId(expandedId === founder.id ? null : founder.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 ${
                                        founder.status === 'active' ? 'bg-green-500' : 
                                        founder.status === 'exited' ? 'bg-red-400' : 'bg-amber-400'
                                    }`}>
                                        {founder.profiles?.full_name?.[0] || '?'}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{founder.profiles?.full_name || 'Ukjent navn'}</h3>
                                        <div className="flex flex-wrap items-center gap-2 text-sm">
                                            <span className="text-gray-500">{founder.profiles?.email}</span>
                                            <span className="hidden md:inline w-1 h-1 rounded-full bg-gray-300" />
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                founder.status === 'active' ? 'bg-green-100 text-green-700' :
                                                founder.status === 'exited' ? 'bg-red-100 text-red-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {founder.status === 'active' ? 'Signert' : 
                                                 founder.status === 'exited' ? 'Avsluttet' : 'Leser/Utkast'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                                    <div className="text-left md:text-right">
                                        <div className="text-xs text-gray-500 uppercase tracking-wide">Rolle</div>
                                        <div className="font-medium text-gray-900 text-sm">{founder.role_choice}</div>
                                    </div>
                                    <div className="text-left md:text-right">
                                        <div className="text-xs text-gray-500 uppercase tracking-wide">Sist aktiv</div>
                                        <div className="font-medium text-gray-900 text-sm">
                                            {founder.logs?.[0] ? formatDistanceToNow(new Date(founder.logs[0].created_at), { addSuffix: true, locale: nb }) : 'Ingen logger'}
                                        </div>
                                    </div>
                                    {expandedId === founder.id ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {expandedId === founder.id && (
                                <div className="border-t border-gray-200 bg-white p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-top-2 duration-200">
                                    {/* Ambitions */}
                                    <div className="space-y-4">
                                        <h4 className="font-bold text-gray-900 flex items-center gap-2 border-b pb-2">
                                            <Target className="w-4 h-4 text-blue-500" />
                                            Ambisjoner & Mål
                                        </h4>
                                        {founder.ambitions ? (
                                            <div className="space-y-4 text-sm">
                                                <div>
                                                    <strong className="block text-gray-500 text-xs uppercase mb-1">Bidrag</strong>
                                                    <p className="text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100">{founder.ambitions.contribution}</p>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <strong className="block text-gray-500 text-xs uppercase mb-1">Mål 30 dager</strong>
                                                        <p className="text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100">{founder.ambitions.goal_30_days}</p>
                                                    </div>
                                                    <div>
                                                        <strong className="block text-gray-500 text-xs uppercase mb-1">Mål 1 år</strong>
                                                        <p className="text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100">{founder.ambitions.goal_1_year}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <strong className="block text-gray-500 text-xs uppercase mb-1">5 års visjon</strong>
                                                    <p className="text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100">{founder.ambitions.goal_5_years}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 italic text-sm">Ingen ambisjoner registrert ennå.</p>
                                        )}
                                    </div>

                                    {/* Logs */}
                                    <div className="space-y-4">
                                        <h4 className="font-bold text-gray-900 flex items-center gap-2 border-b pb-2">
                                            <History className="w-4 h-4 text-purple-500" />
                                            Loggføring ({founder.logs.length})
                                        </h4>
                                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                            {founder.logs.length > 0 ? founder.logs.map((log: any) => (
                                                <div key={log.id} className="bg-gray-50 rounded-lg p-4 text-sm border border-gray-100 relative pl-6">
                                                    <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${
                                                        log.status_color === 'green' ? 'bg-green-500' :
                                                        log.status_color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                                                    }`} />
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-xs text-gray-400 font-mono">
                                                            {new Date(log.created_at).toLocaleString('nb-NO')}
                                                        </span>
                                                    </div>
                                                    <p className="font-medium text-gray-900 mb-2 whitespace-pre-wrap">{log.did_since_last}</p>
                                                    {(log.plans_now || log.ideas) && (
                                                        <div className="bg-white/50 p-3 rounded-lg mt-2 space-y-2 border border-gray-100/50">
                                                            {log.plans_now && (
                                                                <div className="text-gray-600 text-xs">
                                                                    <span className="font-bold block text-gray-500 uppercase text-[10px] mb-0.5">Planer</span> 
                                                                    {log.plans_now}
                                                                </div>
                                                            )}
                                                            {log.ideas && (
                                                                <div className="text-gray-600 text-xs">
                                                                    <span className="font-bold block text-gray-500 uppercase text-[10px] mb-0.5">Ideer</span> 
                                                                    {log.ideas}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )) : (
                                                <p className="text-gray-500 italic text-sm">Ingen logger registrert ennå.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {founders.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">Ingen gründere funnet i systemet.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}