'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bell, Bug, CheckCircle2, Flame, Lightbulb, Loader2, MessageSquare, Star, X, Archive } from 'lucide-react';

type AdminTab = 'inbox' | 'critical' | 'wish' | 'priorities' | 'archive';

type FeedbackReport = {
  id: string;
  created_at: string;
  user_id: string;
  user_name: string | null;
  type: 'bug' | 'wish' | 'feedback' | 'vote';
  category?: string | null;
  title: string;
  description: string;
  image_urls: string[] | null;
  auto_screenshot_url: string | null;
  app_version: string | null;
  device_info: any;
  route: string | null;
  status: 'NY' | 'UNDER_ARBEID' | 'LØST' | 'IGNORERT';
  admin_comment: string | null;
  priority: 'LAV' | 'NORMAL' | 'KRITISK';
  duplicate_count: number;
};

const tabMeta: Array<{ key: AdminTab; label: string; icon: any }> = [
  { key: 'inbox', label: '📥 Innboks', icon: MessageSquare },
  { key: 'critical', label: '🔥 Kritiske', icon: Flame },
  { key: 'wish', label: '💡 Ønsker', icon: Lightbulb },
  { key: 'priorities', label: '🗳 Prioriteringer', icon: CheckCircle2 },
  { key: 'archive', label: '📦 Arkiv', icon: Archive },
];

const typeBadge = (t: FeedbackReport['type']) => {
  if (t === 'bug') return { label: '🐞 Feil', cls: 'bg-red-50 text-red-700 border-red-200', Icon: Bug };
  if (t === 'wish') return { label: '💡 Ønske', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', Icon: Lightbulb };
  if (t === 'vote') return { label: '🗳 Prioritering', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2 };
  return { label: '⭐ Tilbakemelding', cls: 'bg-gray-50 text-gray-700 border-gray-200', Icon: Star };
};

const statusBadge = (s: FeedbackReport['status']) => {
  if (s === 'NY') return { label: 'Ny', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (s === 'UNDER_ARBEID') return { label: 'Under arbeid', cls: 'bg-yellow-50 text-yellow-800 border-yellow-200' };
  if (s === 'LØST') return { label: 'Løst', cls: 'bg-green-50 text-green-700 border-green-200' };
  return { label: 'Ignorert', cls: 'bg-gray-100 text-gray-700 border-gray-200' };
};

export default function AdminFeedbackPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('inbox');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<FeedbackReport[]>([]);
  const [counts, setCounts] = useState<{ new: number; inbox: number; critical: number; wish: number; priorities: number; archive: number }>({
    new: 0,
    inbox: 0,
    critical: 0,
    wish: 0,
    priorities: 0,
    archive: 0,
  });
  const [selected, setSelected] = useState<FeedbackReport | null>(null);
  const [selectedPriorityGroup, setSelectedPriorityGroup] = useState<{ feature: string; reports: FeedbackReport[] } | null>(null);
  const [editStatus, setEditStatus] = useState<FeedbackReport['status']>('NY');
  const [editPriority, setEditPriority] = useState<FeedbackReport['priority']>('NORMAL');
  const [editComment, setEditComment] = useState<string>('');

  const newCount = counts.new || 0;

  const matchesTab = (r: FeedbackReport, tab: AdminTab) => {
    const isArchived = r.status === 'LØST' || r.status === 'IGNORERT';
    if (tab === 'archive') return isArchived;
    if (tab === 'priorities') return r.type === 'vote' && r.category === 'PRIORITERING';
    if (tab === 'wish') return r.type === 'wish' && !isArchived;
    if (tab === 'critical') return !isArchived && (r.priority === 'KRITISK' || (r.duplicate_count || 0) >= 3);
    return !isArchived;
  };

  const fetchReports = async (tab: AdminTab) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/feedback?tab=${encodeURIComponent(tab)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Kunne ikke hente tilbakemeldinger');
      setReports(Array.isArray(data?.reports) ? data.reports : []);
      if (data?.counts) setCounts(data.counts);
    } catch (e: any) {
      setError(e?.message || 'Kunne ikke hente tilbakemeldinger');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!selected) return;
    setEditStatus(selected.status);
    setEditPriority(selected.priority);
    setEditComment(selected.admin_comment || '');
  }, [selected]);

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: selected.id,
          status: editStatus,
          priority: editPriority,
          adminComment: editComment,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Kunne ikke lagre');
      if (data?.counts) setCounts(data.counts);
      const updated: FeedbackReport = {
        ...selected,
        status: editStatus,
        priority: editPriority,
        admin_comment: editComment,
      };

      setReports((prev) => {
        const next = prev.map((r) => (r.id === selected.id ? updated : r));
        return matchesTab(updated, activeTab) ? next : next.filter((r) => r.id !== selected.id);
      });

      setSelected(null);
    } catch (e: any) {
      alert(e?.message || 'Kunne ikke lagre');
    } finally {
      setSaving(false);
    }
  };

  const headerText = useMemo(() => {
    const meta = tabMeta.find((t) => t.key === activeTab);
    return meta ? meta.label : 'Tilbakemeldinger';
  }, [activeTab]);

  const groupedPriorities = useMemo(() => {
    const groups = new Map<string, FeedbackReport[]>();
    for (const report of reports) {
      const feature =
        String(report?.device_info?.priorityFeature || '').trim() ||
        String(report.title || '').replace(/^Prioritering:\s*/i, '').trim() ||
        'Ukjent';
      const existing = groups.get(feature) || [];
      existing.push(report);
      groups.set(feature, existing);
    }

    return Array.from(groups.entries())
      .map(([feature, items]) => ({
        feature,
        count: items.length,
        reports: items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.feature.localeCompare(b.feature, 'no');
      });
  }, [reports]);

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/admin" className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-700" />
                <h1 className="text-2xl font-black text-gray-900">💬 Tilbakemeldinger</h1>
              </div>
              <div className="text-sm text-gray-600 mt-1">Snakk med utviklerne – raskt, enkelt, menneskelig.</div>
            </div>
          </div>
          <div className="relative">
            <div className="p-2 rounded-xl bg-white border border-gray-200 shadow-sm text-gray-800">
              <Bell className="w-5 h-5" />
            </div>
            {newCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {newCount}
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-2 flex flex-wrap gap-2 mb-6">
            {tabMeta.map((t) => {
            const isActive = t.key === activeTab;
            const count =
              t.key === 'inbox'
                ? counts.inbox
                : t.key === 'critical'
                  ? counts.critical
                  : t.key === 'wish'
                    ? counts.wish
                    : t.key === 'priorities'
                      ? counts.priorities
                      : counts.archive;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2 rounded-xl font-black text-sm flex items-center gap-2 transition-colors ${
                  isActive ? 'bg-purple-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-white border border-gray-200'}`}>
                  {count || 0}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-black text-gray-900">{headerText}</div>
          <button
            type="button"
            onClick={() => fetchReports(activeTab)}
            className="text-sm font-black px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50"
          >
            Oppdater
          </button>
        </div>

        {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-2xl p-4 font-bold">{error}</div>}

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
            <div className="font-bold text-gray-700">Laster...</div>
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-gray-600">
            <div className="font-black text-gray-900 mb-1">Tomt her</div>
            <div className="text-sm">Ingen tilbakemeldinger i denne fanen akkurat nå.</div>
          </div>
        ) : activeTab === 'priorities' ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {groupedPriorities.map((group, index) => (
              <button
                key={group.feature}
                type="button"
                onClick={() => setSelectedPriorityGroup({ feature: group.feature, reports: group.reports })}
                className={`w-full px-5 py-4 text-left hover:bg-gray-50 transition-colors ${
                  index !== groupedPriorities.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-black text-gray-900 break-words">{group.feature}</div>
                    <div className="text-sm text-gray-500 mt-1">Klikk for å se de individuelle stemmene</div>
                  </div>
                  <div className="shrink-0 text-lg font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                    {group.count}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {reports.map((r) => {
              const tb = typeBadge(r.type);
              const sb = statusBadge(r.status);
              const firstImage = (r.image_urls && r.image_urls[0]) || r.auto_screenshot_url || '';
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelected(r)}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 text-left hover:border-purple-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className={`inline-flex items-center gap-2 text-xs font-black px-2 py-1 rounded-full border ${tb.cls}`}>
                        <tb.Icon className="w-4 h-4" />
                        {tb.label}
                      </div>
                      <div className="font-black text-gray-900 mt-2 break-words">{r.title}</div>
                      <div className="text-sm text-gray-600 mt-1 line-clamp-2 break-words">{r.description}</div>
                    </div>
                    {firstImage ? (
                      <img
                        src={firstImage}
                        alt=""
                        className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-200 shrink-0 flex items-center justify-center text-gray-400">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <div className={`text-[11px] font-black px-2 py-1 rounded-full border ${sb.cls}`}>{sb.label}</div>
                    <div className="text-[11px] font-bold text-gray-700 bg-gray-50 border border-gray-200 px-2 py-1 rounded-full">
                      {r.priority}
                    </div>
                    {r.duplicate_count > 0 && (
                      <div className="text-[11px] font-black text-purple-700 bg-purple-50 border border-purple-200 px-2 py-1 rounded-full">
                        👍 {r.duplicate_count}
                      </div>
                    )}
                    <div className="text-[11px] text-gray-500">
                      {r.user_name || r.user_id?.slice(0, 8)} • {new Date(r.created_at).toLocaleString('no-NO')}
                    </div>
                    {r.route ? <div className="text-[11px] text-gray-500 break-all">{r.route}</div> : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedPriorityGroup && (
        <div className="fixed inset-0 z-[190] bg-black/50 flex items-end md:items-center justify-center p-3">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="font-black text-gray-900">{selectedPriorityGroup.feature}</div>
                <div className="text-sm text-gray-500 mt-1">{selectedPriorityGroup.reports.length} stemmer registrert</div>
              </div>
              <button type="button" onClick={() => setSelectedPriorityGroup(null)} className="p-2 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-[75vh] overflow-auto">
              {selectedPriorityGroup.reports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => {
                    setSelectedPriorityGroup(null);
                    setSelected(report);
                  }}
                  className="w-full text-left rounded-2xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/40 p-4 transition-colors"
                >
                  <div className="font-bold text-gray-900">{report.user_name || report.user_id?.slice(0, 8) || 'Anonym'}</div>
                  <div className="text-sm text-gray-600 mt-1">{new Date(report.created_at).toLocaleString('no-NO')}</div>
                  <div className="text-sm text-gray-500 mt-2 line-clamp-2">{report.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-end md:items-center justify-center p-3">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="font-black text-gray-900">Detaljer</div>
              <button type="button" onClick={() => setSelected(null)} className="p-2 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-[75vh] overflow-auto">
              <div>
                <div className="font-black text-gray-900 text-lg break-words">{selected.title}</div>
                <div className="text-sm text-gray-600 mt-1 break-words whitespace-pre-wrap">{selected.description}</div>
              </div>

              {(selected.image_urls?.length || selected.auto_screenshot_url) && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {(selected.image_urls || []).map((u) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer">
                      <img src={u} alt="" className="w-full h-28 rounded-xl object-cover border border-gray-200" />
                    </a>
                  ))}
                  {selected.auto_screenshot_url && (
                    <a href={selected.auto_screenshot_url} target="_blank" rel="noreferrer">
                      <img
                        src={selected.auto_screenshot_url}
                        alt=""
                        className="w-full h-28 rounded-xl object-cover border border-gray-200"
                      />
                    </a>
                  )}
                </div>
              )}

              <div className="grid md:grid-cols-3 gap-2">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="text-xs font-black text-gray-500 uppercase">Bruker</div>
                  <div className="text-sm font-bold text-gray-900 mt-1">{selected.user_name || selected.user_id}</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="text-xs font-black text-gray-500 uppercase">Tid</div>
                  <div className="text-sm font-bold text-gray-900 mt-1">{new Date(selected.created_at).toLocaleString('no-NO')}</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="text-xs font-black text-gray-500 uppercase">Side</div>
                  <div className="text-sm font-bold text-gray-900 mt-1 break-all">{selected.route || '-'}</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-2">
                <div>
                  <div className="text-xs font-black text-gray-500 uppercase mb-1">Status</div>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white"
                  >
                    <option value="NY">Ny</option>
                    <option value="UNDER_ARBEID">Under arbeid</option>
                    <option value="LØST">Løst</option>
                    <option value="IGNORERT">Ignorert</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs font-black text-gray-500 uppercase mb-1">Prioritet</div>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white"
                  >
                    <option value="LAV">Lav</option>
                    <option value="NORMAL">Normal</option>
                    <option value="KRITISK">Kritisk</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="text-xs font-black text-gray-500 uppercase mb-1">Intern kommentar</div>
                <textarea
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  rows={5}
                  className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm"
                  placeholder="Skriv kort: hva er planen, hvem tar den, evt. link til commit..."
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 font-black px-4 py-3 rounded-xl"
              >
                Lukk
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="flex-1 bg-gray-900 hover:bg-black text-white font-black px-4 py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Lagre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
