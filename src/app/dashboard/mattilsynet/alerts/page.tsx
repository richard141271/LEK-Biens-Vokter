'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllAlerts } from '@/app/actions/mattilsynet';
import { ArrowLeft, Bell, CheckCircle, AlertTriangle, Search, Filter } from 'lucide-react';

export default function MattilsynetAlertsPage() {
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [filteredAlerts, setFilteredAlerts] = useState<any[]>([]);
    const [filter, setFilter] = useState('active'); // active, resolved, all
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchAlerts();
    }, []);

    useEffect(() => {
        let result = alerts;

        // Filter by status
        if (filter === 'active') {
            result = result.filter(a => !a.admin_status || a.admin_status !== 'resolved');
        } else if (filter === 'resolved') {
            result = result.filter(a => a.admin_status === 'resolved');
        }

        // Filter by search
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(a => 
                a.details?.toLowerCase().includes(q) ||
                a.reporter?.full_name?.toLowerCase().includes(q) ||
                a.hives?.apiaries?.name?.toLowerCase().includes(q)
            );
        }

        setFilteredAlerts(result);
    }, [alerts, filter, search]);

    async function fetchAlerts() {
        setLoading(true);
        const result = await getAllAlerts();
        if (result.alerts) {
            setAlerts(result.alerts);
        }
        setLoading(false);
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4 mb-4">
                        <Link href="/dashboard/mattilsynet" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </Link>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Bell className="w-6 h-6 text-red-600" />
                            Sykdomsvarsler
                        </h1>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setFilter('active')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'active' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                Aktive
                            </button>
                            <button 
                                onClick={() => setFilter('resolved')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                Løste
                            </button>
                            <button 
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                Alle
                            </button>
                        </div>
                        
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Søk i varsler..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto p-4">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                ) : filteredAlerts.length > 0 ? (
                    <div className="space-y-4">
                        {filteredAlerts.map(alert => (
                            <Link key={alert.id} href={`/dashboard/mattilsynet/alert/${alert.id}`}>
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3">
                                            {alert.admin_status === 'resolved' ? (
                                                <div className="p-2 bg-green-100 rounded-full">
                                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                                </div>
                                            ) : (
                                                <div className="p-2 bg-red-100 rounded-full animate-pulse">
                                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                    {alert.details?.split('Sykdom: ')[1]?.split(',')[0] || 'Ukjent sykdom'}
                                                </h3>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(alert.created_at).toLocaleDateString('no-NO', { 
                                                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${alert.admin_status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {alert.admin_status === 'resolved' ? 'Løst' : 'Aktiv'}
                                        </span>
                                    </div>
                                    
                                    <div className="ml-12">
                                        <p className="text-sm text-gray-600 mb-2">{alert.details}</p>
                                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <span className="font-semibold">Bigård:</span> {alert.hives?.apiaries?.name || 'Ukjent'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className="font-semibold">Rapportert av:</span> {alert.reporter?.full_name || 'Ukjent'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-500">Ingen varsler funnet med valgt filter.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
