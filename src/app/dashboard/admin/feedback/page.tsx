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

type InboxItem =
  | { kind: 'report'; report: FeedbackReport }
  | {
      kind: 'priority-group';
      feature: string;
      reports: FeedbackReport[];
      latest: FeedbackReport;
      priority: FeedbackReport['priority'];
      status: FeedbackReport['status'];
      count: number;
    };

type PriorityGroupSelection = {
  feature: string;
  reports: FeedbackReport[];
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

const getPriorityFeature = (report: FeedbackReport) =>
  String(report?.device_info?.priorityFeature || '').trim() ||
  String(report.title || '').replace(/^Prioritering:\s*/i, '').trim() ||
  'Ukjent';

const priorityWeight: Record<FeedbackReport['priority'], number> = {
  KRITISK: 3,
  NORMAL: 2,
  LAV: 1,
};

const statusWeight: Record<FeedbackReport['status'], number> = {
  UNDER_ARBEID: 4,
  NY: 3,
  LØST: 2,
  IGNORERT: 1,
};

const sortReportsByNewest = (reports: FeedbackReport[]) =>
  [...reports].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

const getGroupPriority = (reports: FeedbackReport[]) =>
  [...reports].sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority])[0]?.priority || 'LAV';

const getGroupStatus = (reports: FeedbackReport[]) =>
  [...reports].sort((a, b) => statusWeight[b.status] - statusWeight[a.status])[0]?.status || 'NY';

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
  const [selectedPriorityGroup, setSelectedPriorityGroup] = useState<PriorityGroupSelection | null>(null);
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

  useEffect(() => {
    if (!selectedPriorityGroup) return;
    const sortedReports = sortReportsByNewest(selectedPriorityGroup.reports);
    const latestComment = sortedReports.find((report) => report.admin_comment?.trim())?.admin_comment || '';
    setEditStatus(getGroupStatus(selectedPriorityGroup.reports));
    setEditPriority(getGroupPriority(selectedPriorityGroup.reports));
    setEditComment(latestComment);
  }, [selectedPriorityGroup]);

  const save = async () => {
    if (!selected && !selectedPriorityGroup) return;
    setSaving(true);
    try {
      const targetIds = selectedPriorityGroup
        ? selectedPriorityGroup.reports.map((report) => report.id)
        : selected
          ? [selected.id]
          : [];
      const res = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...(targetIds.length === 1 ? { id: targetIds[0] } : { ids: targetIds }),
          status: editStatus,
          priority: editPriority,
          adminComment: editComment,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Kunne ikke lagre');
      if (data?.counts) setCounts(data.counts);
      const targetIdSet = new Set(targetIds);

      setReports((prev) => {
        const next = prev.map((report) =>
          targetIdSet.has(report.id)
            ? {
                ...report,
                status: editStatus,
                priority: editPriority,
                admin_comment: editComment,
              }
            : report,
        );

        if (selectedPriorityGroup) {
          return next.filter((report) => !targetIdSet.has(report.id) || matchesTab(report, activeTab));
        }

        const updated = next.find((report) => targetIdSet.has(report.id));
        return updated && matchesTab(updated, activeTab) ? next : next.filter((report) => !targetIdSet.has(report.id));
      });

      setSelected(null);
      setSelectedPriorityGroup(null);
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
      const feature = getPriorityFeature(report);
      const existing = groups.get(feature) || [];
      existing.push(report);
      groups.set(feature, existing);
    }

    return Array.from(groups.entries())
      .map(([feature, items]) => ({
        feature,
        count: items.length,
        rank1: items.filter((r) => r.priority === 'KRITISK').length,
        rank2: items.filter((r) => r.priority === 'NORMAL').length,
        rank3: items.filter((r) => r.priority === 'LAV').length,
        reports: items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      }))
      .sort((a, b) => {
        if (b.rank1 !== a.rank1) return b.rank1 - a.rank1;
        if (b.rank2 !== a.rank2) return b.rank2 - a.rank2;
        if (b.rank3 !== a.rank3) return b.rank3 - a.rank3;
        if (b.count !== a.count) return b.count - a.count;
        return a.feature.localeCompare(b.feature, 'no');
      });
  }, [reports]);

  const inboxItems = useMemo<InboxItem[]>(() => {
    const items: InboxItem[] = [];
    const priorityGroups = new Map<string, FeedbackReport[]>();

    for (const report of reports) {
      if (report.type === 'vote' && getPriorityFeature(report)) {
        const feature = getPriorityFeature(report);
        const existing = priorityGroups.get(feature) || [];
        existing.push(report);
        priorityGroups.set(feature, existing);
        continue;
      }

      items.push({ kind: 'report', report });
    }

    for (const [feature, groupedReports] of Array.from(priorityGroups.entries())) {
      const sortedReports = [...groupedReports].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const latest = sortedReports[0];
      const priority =
        [...groupedReports].sort((a: FeedbackReport, b: FeedbackReport) => priorityWeight[b.priority] - priorityWeight[a.priority])[0]?.priority ||
        latest.priority;
      const status =
        [...groupedReports].sort((a: FeedbackReport, b: FeedbackReport) => statusWeight[b.status] - statusWeight[a.status])[0]?.status ||
        latest.status;

      items.push({
        kind: 'priority-group',
        feature,
        reports: sortedReports,
        latest,
        priority,
        status,
        count: sortedReports.length,
      });
    }

    return items.sort((a, b) => {
      const aTime = new Date(a.kind === 'report' ? a.report.created_at : a.latest.created_at).getTime();
      const bTime = new Date(b.kind === 'report' ? b.report.created_at : b.latest.created_at).getTime();
      return bTime - aTime;
    });
  }, [reports]);

  const detailMode = selectedPriorityGroup ? 'group' : selected ? 'single' : null;
  const detailReports = selectedPriorityGroup ? sortReportsByNewest(selectedPriorityGroup.reports) : selected ? [selected] : [];
  const detailPrimary = detailReports[0] || null;
  const detailTitle = selectedPriorityGroup ? `Prioritering: ${selectedPriorityGroup.feature}` : selected?.title || '';
  const detailDescription = selectedPriorityGroup
    ? `${selectedPriorityGroup.reports.length} stk ønsker denne prioriteringen.`
    : selected?.description || '';

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
                    <div className="text-sm text-gray-500 mt-1">1.: {group.rank1} • 2.: {group.rank2} • 3.: {group.rank3}</div>
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
            {(activeTab === 'inbox' ? inboxItems : reports.map((report) => ({ kind: 'report', report } as InboxItem))).map((item) => {
              const r = item.kind === 'report' ? item.report : item.latest;
              const tb = typeBadge(r.type);
              const sb = statusBadge(item.kind === 'report' ? r.status : item.status);
              const firstImage = item.kind === 'report' ? (r.image_urls && r.image_urls[0]) || r.auto_screenshot_url || '' : '';
              const priorityLabel = item.kind === 'report' ? r.priority : item.priority;
              const metaText =
                item.kind === 'priority-group'
                  ? `${item.count} ${item.count === 1 ? 'stk ønsker' : 'stk ønsker'} denne prioriteringen`
                  : `${r.user_name || r.user_id?.slice(0, 8)} • ${new Date(r.created_at).toLocaleString('no-NO')}`;
              return (
                <button
                  key={item.kind === 'report' ? r.id : `priority-${item.feature}`}
                  type="button"
                  onClick={() => {
                    if (item.kind === 'priority-group') {
                      setSelectedPriorityGroup({ feature: item.feature, reports: item.reports });
                      return;
                    }
                    setSelected(r);
                  }}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 text-left hover:border-purple-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className={`inline-flex items-center gap-2 text-xs font-black px-2 py-1 rounded-full border ${tb.cls}`}>
                        <tb.Icon className="w-4 h-4" />
                        {tb.label}
                        {item.kind === 'priority-group' && (
                          <span className="text-[11px] font-black text-emerald-700 bg-white/70 border border-emerald-200 px-2 py-0.5 rounded-full">
                            {item.count} stk
                          </span>
                        )}
                      </div>
                      <div className="font-black text-gray-900 mt-2 break-words">
                        {item.kind === 'priority-group' ? `Prioritering: ${item.feature}` : r.title}
                      </div>
                      <div className="text-sm text-gray-600 mt-1 line-clamp-2 break-words">
                        {item.kind === 'priority-group' ? `${item.count} stk ønsker denne prioriteringen.` : r.description}
                      </div>
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
                      {priorityLabel}
                    </div>
                    {item.kind === 'report' && r.duplicate_count > 0 && (
                      <div className="text-[11px] font-black text-purple-700 bg-purple-50 border border-purple-200 px-2 py-1 rounded-full">
                        👍 {r.duplicate_count}
                      </div>
                    )}
                    <div className="text-[11px] text-gray-500">{metaText}</div>
                    {item.kind === 'report' && r.route ? <div className="text-[11px] text-gray-500 break-all">{r.route}</div> : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {detailMode && detailPrimary && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-end md:items-center justify-center p-3">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="font-black text-gray-900">Detaljer</div>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setSelectedPriorityGroup(null);
                }}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-[75vh] overflow-auto">
              <div>
                <div className="font-black text-gray-900 text-lg break-words">{detailTitle}</div>
                <div className="text-sm text-gray-600 mt-1 break-words whitespace-pre-wrap">{detailDescription}</div>
              </div>

              {detailMode === 'single' && (detailPrimary.image_urls?.length || detailPrimary.auto_screenshot_url) && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {(detailPrimary.image_urls || []).map((u) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer">
                      <img src={u} alt="" className="w-full h-28 rounded-xl object-cover border border-gray-200" />
                    </a>
                  ))}
                  {detailPrimary.auto_screenshot_url && (
                    <a href={detailPrimary.auto_screenshot_url} target="_blank" rel="noreferrer">
                      <img
                        src={detailPrimary.auto_screenshot_url}
                        alt=""
                        className="w-full h-28 rounded-xl object-cover border border-gray-200"
                      />
                    </a>
                  )}
                </div>
              )}

              <div className="grid md:grid-cols-3 gap-2">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="text-xs font-black text-gray-500 uppercase">{detailMode === 'group' ? 'Stemmer' : 'Bruker'}</div>
                  <div className="text-sm font-bold text-gray-900 mt-1">
                    {detailMode === 'group' ? detailReports.length : detailPrimary.user_name || detailPrimary.user_id}
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="text-xs font-black text-gray-500 uppercase">{detailMode === 'group' ? 'Siste stemme' : 'Tid'}</div>
                  <div className="text-sm font-bold text-gray-900 mt-1">{new Date(detailPrimary.created_at).toLocaleString('no-NO')}</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="text-xs font-black text-gray-500 uppercase">{detailMode === 'group' ? 'Kilde' : 'Side'}</div>
                  <div className="text-sm font-bold text-gray-900 mt-1 break-all">{detailPrimary.route || '-'}</div>
                </div>
              </div>

              {detailMode === 'group' && (
                <div>
                  <div className="text-xs font-black text-gray-500 uppercase mb-2">Registrerte ønsker</div>
                  <div className="space-y-2 max-h-56 overflow-auto">
                    {detailReports.map((report) => (
                      <div key={report.id} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-bold text-gray-900">{report.user_name || report.user_id?.slice(0, 8) || 'Anonym'}</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-600">{new Date(report.created_at).toLocaleString('no-NO')}</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-600">{report.priority}</span>
                        </div>
                        {report.admin_comment ? <div className="text-sm text-gray-500 mt-1 break-words">{report.admin_comment}</div> : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                onClick={() => {
                  setSelected(null);
                  setSelectedPriorityGroup(null);
                }}
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
