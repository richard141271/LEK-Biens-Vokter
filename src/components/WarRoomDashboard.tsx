'use client';

import { useState, useEffect, useRef } from 'react';
import { 
    getWarRoomFeed, 
    postWarRoomEntry, 
    getDailyFocus, 
    setDailyFocus, 
    getWarRoomStats, 
    getUserStatuses, 
    updateUserStatus,
    sendRelationshipAlert,
    getIdeas,
    deleteWarRoomPost,
    editWarRoomPost,
    WarRoomPostType
} from '@/app/actions/war-room';
import { resolveWarRoomPost } from '@/app/actions/war-room-resolve';
import { createCase, getCasesForFeed, updateCaseStatus, getArchivedCases, addCaseComment, getCaseAttachments, getCaseSignedUploadUrl, addCaseAttachment, getCaseUpdates } from '@/app/actions/war-room-cases';
import { formatDistanceToNow, format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { 
    CheckCircle2, 
    Calendar, 
    HelpCircle, 
    Lightbulb, 
    AlertTriangle, 
    Send, 
    LayoutDashboard, 
    Users, 
    Activity,
    HeartHandshake,
    ArrowLeft,
    Trash2,
    Edit2,
    X,
    Check,
    Archive as ArchiveIcon
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

interface WarRoomDashboardProps {
    title?: string;
    subtitle?: string;
    backLink?: string;
    backText?: string;
}

export default function WarRoomDashboard({ 
    title = 'War Room',
    subtitle = 'Operativt kommandosenter',
    backLink,
    backText = 'Tilbake'
}: WarRoomDashboardProps) {
    const [activeTab, setActiveTab] = useState<'feed' | 'ideas' | 'status' | 'archive'>('feed');
    const [posts, setPosts] = useState<any[]>([]);
    const [cases, setCases] = useState<any[]>([]);
    const [recentResolvedCases, setRecentResolvedCases] = useState<any[]>([]);
    const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
    const [attachmentsByCase, setAttachmentsByCase] = useState<Record<string, any[]>>({});
    const [updatesByCase, setUpdatesByCase] = useState<Record<string, any[]>>({});
    const [noteByCase, setNoteByCase] = useState<Record<string, string>>({});
    const [ideas, setIdeas] = useState<any[]>([]);
    const [resolvedCount, setResolvedCount] = useState<number>(0);
    const [archived, setArchived] = useState<any[]>([]);
    const [focus, setFocus] = useState('');
    const [focusAuthor, setFocusAuthor] = useState('');
    const [stats, setStats] = useState<any>({});
    const [statuses, setStatuses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [isEditingFocus, setIsEditingFocus] = useState(false);
    
    // New Post State
    const [newPostType, setNewPostType] = useState<WarRoomPostType | null>(null);
    const [newPostContent, setNewPostContent] = useState('');
    const [sending, setSending] = useState(false);
    // Structured "Sak" (problem) fields
    const [caseAbout, setCaseAbout] = useState('');
    const [caseNotWorking, setCaseNotWorking] = useState('');
    const [caseExpected, setCaseExpected] = useState('');
    const [caseTried, setCaseTried] = useState('');
    const [newCaseType, setNewCaseType] = useState<'IDEA' | 'PLAN' | 'CASE' | null>(null);
    const [newCaseTitle, setNewCaseTitle] = useState('');
    const [newCaseDescription, setNewCaseDescription] = useState('');

    // My Status State
    const [myWorkingOn, setMyWorkingOn] = useState('');
    const [myStatusColor, setMyStatusColor] = useState<'green' | 'yellow' | 'red'>('green');
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Use ref to track editing state reliably inside async closures
    const isEditingFocusRef = useRef(false);
    const isSavingRef = useRef(false);

    useEffect(() => {
        loadData();
        const interval = setInterval(() => {
            // Only poll if NOT editing focus AND not saving
            if (!isEditingFocusRef.current && !isSavingRef.current) {
                loadData();
            }
        }, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        // Parallel fetch
        const [
            feedRes, 
            focusRes, 
            statsRes, 
            statusRes,
            ideasRes
        ] = await Promise.all([
            getWarRoomFeed(),
            getDailyFocus(),
            getWarRoomStats(),
            getUserStatuses(),
            getIdeas()
        ]);

        if (feedRes.posts) setPosts(feedRes.posts);
        if (feedRes.isAdmin) setIsAdmin(feedRes.isAdmin);
        if (focusRes.focus) {
            // Only update focus text if user is not editing it (double check via ref)
            if (!isEditingFocusRef.current) {
                setFocus(focusRes.focus.text);
            }
            setFocusAuthor(focusRes.focus.author || '');
        }
        if (statsRes.stats) setStats(statsRes.stats);
        if (statusRes.statuses) {
            setStatuses(statusRes.statuses);
            // Find my status? (Need user ID, but we can't get it easily here without passing it down or fetching)
            // For now, we rely on the input being empty initially or handle it differently.
            // A better way is to check if one of the statuses belongs to "me".
            // But we don't have "me" here easily. We'll skip pre-filling "my" status for now or assume empty.
        }
        if (ideasRes.ideas) setIdeas(ideasRes.ideas);

        const casesRes = await getCasesForFeed();
        if (!casesRes.error) {
            setCases(casesRes.cases || []);
            setRecentResolvedCases(casesRes.recentResolved || []);
            setResolvedCount(casesRes.resolvedCount || 0);
        }
        const archivedRes = await getArchivedCases();
        if (!archivedRes.error) setArchived(archivedRes.archived || []);
        
        setLoading(false);
    };

    const handlePost = async () => {
        if (!newPostType || sending) return;
        // Build content for "Sak" (problem) with structured fields
        let contentToSend = newPostContent.trim();
        if (newPostType === 'problem') {
            const parts: string[] = [];
            if (caseAbout.trim()) parts.push(`Hva gjelder: ${caseAbout.trim()}`);
            if (caseNotWorking.trim()) parts.push(`Hva fungerer ikke: ${caseNotWorking.trim()}`);
            if (caseExpected.trim()) parts.push(`Hva forventet du: ${caseExpected.trim()}`);
            if (caseTried.trim()) parts.push(`Hva har du prøvd: ${caseTried.trim()}`);
            if (newPostContent.trim()) parts.push(newPostContent.trim());
            contentToSend = parts.join('\n');
        }
        if (!contentToSend) return;
        setSending(true);
        try {
            await postWarRoomEntry(newPostType, contentToSend);
            setNewPostContent('');
            setCaseAbout('');
            setCaseNotWorking('');
            setCaseExpected('');
            setCaseTried('');
            setNewPostType(null);
            loadData();
        } catch (e) {
            console.error(e);
            alert('Kunne ikke lagre post');
        } finally {
            setSending(false);
        }
    };

    const handleUpdateFocus = async () => {
        if (!focus.trim()) return;
        isSavingRef.current = true;
        try {
            await setDailyFocus(focus);
            loadData();
        } catch (e) {
            console.error('Error saving focus:', e);
        } finally {
            isSavingRef.current = false;
        }
    };

    const handleUpdateStatus = async () => {
        setUpdatingStatus(true);
        try {
            await updateUserStatus(myWorkingOn, myStatusColor);
            loadData();
        } catch (e) {
            console.error(e);
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleRelationshipAlert = async () => {
        if (confirm('Er du sikker? Dette sender et varsel til admin om at relasjonen er i fare.')) {
            await sendRelationshipAlert();
            alert('Varsel sendt.');
            loadData();
        }
    };

    const handleDeletePost = async (id: string) => {
        if (!confirm('Er du sikker på at du vil slette denne posten?')) return;
        await deleteWarRoomPost(id);
        loadData();
    };

    const handleResolvePost = async (id: string) => {
        if (!confirm('Er du sikker på at du vil markere denne som løst/avklart?')) return;
        await resolveWarRoomPost(id);
        loadData();
    };

    const handleStartEdit = (post: any) => {
        setEditingPostId(post.id);
        setEditContent(post.content);
    };

    const handleSaveEdit = async () => {
        if (!editingPostId || !editContent.trim()) return;
        await editWarRoomPost(editingPostId, editContent);
        setEditingPostId(null);
        loadData();
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'done': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
            case 'plan': return <Calendar className="w-5 h-5 text-blue-600" />;
            case 'help': return <HelpCircle className="w-5 h-5 text-orange-600" />;
            case 'idea': return <Lightbulb className="w-5 h-5 text-yellow-600" />;
            case 'problem': return <AlertTriangle className="w-5 h-5 text-red-600" />;
            default: return <Activity className="w-5 h-5 text-gray-600" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'done': return 'Utført';
            case 'plan': return 'Planlegger';
            case 'help': return 'Sak'; // slått sammen i UI (help/problem) -> "Sak"
            case 'idea': return 'Idé';
            case 'problem': return 'Sak';
            default: return type;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'done': return 'bg-green-50 border-green-200';
            case 'plan': return 'bg-blue-50 border-blue-200';
            case 'help': return 'bg-orange-50 border-orange-200';
            case 'idea': return 'bg-yellow-50 border-yellow-200';
            case 'problem': return 'bg-red-50 border-red-200';
            default: return 'bg-gray-50 border-gray-200';
        }
    };

    const getCaseTypeLabel = (type: string) => {
        if (type === 'IDEA') return 'Idé';
        if (type === 'PLAN') return 'Plan';
        if (type === 'CASE') return 'Sak';
        return type;
    };

    return (
        <div className="flex flex-col h-full bg-gray-50/50">
            {/* Header / Stats */}
            <div className="bg-white border-b border-gray-200 p-4 space-y-4">
                {backLink && (
                    <Link href={backLink} className="flex items-center text-sm text-gray-500 hover:text-gray-900 mb-2">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        {backText}
                    </Link>
                )}
                <div className="flex justify-center items-start">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                        <p className="text-sm text-gray-500">{subtitle}</p>
                    </div>
                </div>

                {/* Weekly Focus */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 relative group">
                    <label className="block text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">
                        Ukens fokus
                    </label>
                    <div className="flex items-center">
                        <input 
                            type="text" 
                            value={focus}
                            onChange={(e) => setFocus(e.target.value)}
                            onFocus={() => {
                                setIsEditingFocus(true);
                                isEditingFocusRef.current = true;
                            }}
                            onBlur={() => {
                                setIsEditingFocus(false);
                                isEditingFocusRef.current = false;
                                handleUpdateFocus();
                            }}
                            placeholder="Hva er hovedmålet i dag?"
                            className="w-full bg-transparent border-none text-amber-900 placeholder-amber-900/50 focus:ring-0 p-0 text-lg font-medium"
                        />
                        {isAdmin && focus && (
                            <button
                                onClick={async () => {
                                    setFocus('');
                                    await setDailyFocus(' '); // Send space to clear visually, or empty string if allowed
                                    loadData();
                                }}
                                className="p-1 text-amber-800/50 hover:text-red-600 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Fjern fokus"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    {focusAuthor && focus.trim() && (
                        <p className="text-xs text-amber-800/60 mt-1 italic">
                            Satt av: {focusAuthor}
                        </p>
                    )}
                </div>

                {/* Stats & Activity (cases-driven) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {/* Løst = total RESOLVED (cases) */}
                    <div className={`p-2 rounded-lg border flex items-center justify-between ${getTypeColor('done')}`}>
                        <div className="flex items-center gap-2">
                            {getTypeIcon('done')}
                            <span className="text-xs font-medium capitalize">Løst</span>
                        </div>
                        <span className="text-lg font-bold">{resolvedCount}</span>
                    </div>
                    {/* Planlegger = åpne/pågår PLAN */}
                    <div className={`p-2 rounded-lg border flex items-center justify-between ${getTypeColor('plan')}`}>
                        <div className="flex items-center gap-2">
                            {getTypeIcon('plan')}
                            <span className="text-xs font-medium capitalize">Planlegger</span>
                        </div>
                        <span className="text-lg font-bold">{cases.filter(c => c.type === 'PLAN' && (c.status === 'OPEN' || c.status === 'IN_PROGRESS')).length}</span>
                    </div>
                    {/* Idé = åpne/pågår IDEA */}
                    <div className={`p-2 rounded-lg border flex items-center justify-between ${getTypeColor('idea')}`}>
                        <div className="flex items-center gap-2">
                            {getTypeIcon('idea')}
                            <span className="text-xs font-medium capitalize">Idé</span>
                        </div>
                        <span className="text-lg font-bold">{cases.filter(c => c.type === 'IDEA' && (c.status === 'OPEN' || c.status === 'IN_PROGRESS')).length}</span>
                    </div>
                    {/* Sak = åpne/pågår CASE */}
                    <div className={`p-2 rounded-lg border flex items-center justify-between ${getTypeColor('problem')}`}>
                        <div className="flex items-center gap-2">
                            {getTypeIcon('problem')}
                            <span className="text-xs font-medium capitalize">Sak</span>
                        </div>
                        <span className="text-lg font-bold">{cases.filter(c => c.type === 'CASE' && (c.status === 'OPEN' || c.status === 'IN_PROGRESS')).length}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Content (Feed) */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 bg-white">
                        <button 
                            onClick={() => setActiveTab('feed')}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'feed' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            <LayoutDashboard className="w-4 h-4 inline-block mr-2" />
                            Feed
                        </button>
                        <button 
                            onClick={() => setActiveTab('ideas')}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'ideas' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            <Lightbulb className="w-4 h-4 inline-block mr-2" />
                            Idébank
                        </button>
                        <button 
                            onClick={() => setActiveTab('archive')}
                            className={`hidden md:flex flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'archive' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            <ArchiveIcon className="w-4 h-4 inline-block mr-2" />
                            Arkiv
                        </button>
                        <button 
                            onClick={() => setActiveTab('status')}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 md:hidden ${activeTab === 'status' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            <Users className="w-4 h-4 inline-block mr-2" />
                            Status
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {activeTab === 'feed' ? (
                            <>
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
                                    <p className="text-sm font-medium text-gray-700">Ny sak:</p>
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {(['IDEA', 'PLAN', 'CASE'] as const).map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setNewCaseType(type)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                                                    newCaseType === type 
                                                    ? 'bg-gray-900 text-white border-gray-900' 
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                {type === 'IDEA' && <Lightbulb className="w-3 h-3" />}
                                                {type === 'PLAN' && <Calendar className="w-3 h-3" />}
                                                {type === 'CASE' && <AlertTriangle className="w-3 h-3" />}
                                                {getCaseTypeLabel(type)}
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        value={newCaseTitle}
                                        onChange={(e) => setNewCaseTitle(e.target.value)}
                                        placeholder="Kort tittel (min. 2 tegn)"
                                        className="w-full rounded-lg border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-sm"
                                    />
                                    {newCaseTitle.trim().length > 0 && newCaseTitle.trim().length < 2 && (
                                        <p className="text-[11px] text-red-600">Tittelen må ha minst 2 tegn.</p>
                                    )}
                                    {newCaseType === 'CASE' && (
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                value={caseAbout}
                                                onChange={(e) => setCaseAbout(e.target.value)}
                                                placeholder="Hva gjelder dette?"
                                                className="w-full rounded-lg border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-sm"
                                            />
                                            <textarea
                                                value={caseNotWorking}
                                                onChange={(e) => setCaseNotWorking(e.target.value)}
                                                placeholder="Hva fungerer ikke?"
                                                className="w-full rounded-lg border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-sm min-h-[60px]"
                                            />
                                            <textarea
                                                value={caseExpected}
                                                onChange={(e) => setCaseExpected(e.target.value)}
                                                placeholder="Hva forventet du skulle skje?"
                                                className="w-full rounded-lg border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-sm min-h-[60px]"
                                            />
                                            <textarea
                                                value={caseTried}
                                                onChange={(e) => setCaseTried(e.target.value)}
                                                placeholder="Hva har du prøvd?"
                                                className="w-full rounded-lg border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-sm min-h-[60px]"
                                            />
                                        </div>
                                    )}
                                    <textarea
                                        value={newCaseDescription}
                                        onChange={(e) => setNewCaseDescription(e.target.value)}
                                        placeholder={newCaseType === 'PLAN' ? 'Beskriv planen kort' : 'Beskriv kort hva dette gjelder'}
                                        className="w-full rounded-lg border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-sm min-h-[80px]"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => {
                                                setNewCaseType(null);
                                                setNewCaseTitle('');
                                                setNewCaseDescription('');
                                                setCaseAbout('');
                                                setCaseNotWorking('');
                                                setCaseExpected('');
                                                setCaseTried('');
                                            }}
                                            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
                                        >
                                            Avbryt
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (!newCaseType || newCaseTitle.trim().length < 2 || sending) return;
                                                let description = newCaseDescription.trim();
                                                if (newCaseType === 'CASE') {
                                                    const parts: string[] = [];
                                                    if (caseAbout.trim()) parts.push(`Hva gjelder: ${caseAbout.trim()}`);
                                                    if (caseNotWorking.trim()) parts.push(`Hva fungerer ikke: ${caseNotWorking.trim()}`);
                                                    if (caseExpected.trim()) parts.push(`Hva forventet du: ${caseExpected.trim()}`);
                                                    if (caseTried.trim()) parts.push(`Hva har du prøvd: ${caseTried.trim()}`);
                                                    if (description) parts.push(description);
                                                    description = parts.join('\n');
                                                }
                                                if (!description) return;
                                                setSending(true);
                                                const res = await createCase({
                                                    type: newCaseType,
                                                    title: newCaseTitle,
                                                    description
                                                });
                                                setSending(false);
                                                if (res.error) {
                                                    alert(`Kunne ikke opprette sak: ${res.error}`);
                                                    return;
                                                }
                                                setNewCaseType(null);
                                                setNewCaseTitle('');
                                                setNewCaseDescription('');
                                                setCaseAbout('');
                                                setCaseNotWorking('');
                                                setCaseExpected('');
                                                setCaseTried('');
                                                loadData();
                                            }}
                                            disabled={
                                                sending ||
                                                !newCaseType ||
                                                newCaseTitle.trim().length < 2
                                            }
                                            className="px-4 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
                                        >
                                            <Send className="w-3 h-3" />
                                            Opprett sak
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {loading && cases.length === 0 ? (
                                        <p className="text-center text-gray-500 py-8">Laster...</p>
                                    ) : (
                                        cases.map(item => (
                                            <div 
                                                key={item.id} 
                                                className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 cursor-pointer"
                                                onClick={async (e) => {
                                                    // un-bubble clicks from buttons
                                                    const target = e.target as HTMLElement;
                                                    if (target.closest('button')) return;
                                                    const nextId = expandedCaseId === item.id ? null : item.id;
                                                    setExpandedCaseId(nextId);
                                                    if (nextId) {
                                                        if (!attachmentsByCase[item.id]) {
                                                            const res = await getCaseAttachments(item.id);
                                                            if (!('error' in res) && (res as any).attachments) {
                                                                setAttachmentsByCase(prev => ({ ...prev, [item.id]: (res as any).attachments }));
                                                            }
                                                        }
                                                        if (!updatesByCase[item.id]) {
                                                            const upd = await getCaseUpdates(item.id);
                                                            if (!('error' in upd) && (upd as any).updates) {
                                                                setUpdatesByCase(prev => ({ ...prev, [item.id]: (upd as any).updates }));
                                                            }
                                                        }
                                                        if (!noteByCase[item.id]) {
                                                            setNoteByCase(prev => ({ ...prev, [item.id]: '' }));
                                                        }
                                                    }
                                                }}
                                                role="button"
                                                aria-expanded={expandedCaseId === item.id}
                                            >
                                                <div className="flex items-start justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`p-1.5 rounded-full ${item.type === 'CASE' ? 'bg-red-50 border border-red-200 text-red-700' : item.type === 'PLAN' ? 'bg-blue-50 border border-blue-200 text-blue-700' : 'bg-yellow-50 border border-yellow-200 text-yellow-700'}`}>
                                                            {item.type === 'CASE' && <AlertTriangle className="w-3 h-3" />}
                                                            {item.type === 'PLAN' && <Calendar className="w-3 h-3" />}
                                                            {item.type === 'IDEA' && <Lightbulb className="w-3 h-3" />}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-900 uppercase tracking-wide">
                                                                <span>{getCaseTypeLabel(item.type)}</span>
                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                                                    item.status === 'IN_PROGRESS' 
                                                                      ? 'bg-blue-100 text-blue-700 border-blue-300' 
                                                                      : 'bg-gray-50 text-gray-600 border-gray-300'
                                                                }`}>
                                                                    {item.status === 'OPEN' && 'ÅPEN'}
                                                                    {item.status === 'IN_PROGRESS' && `PÅGÅR${item.assigned?.full_name ? ` • ${item.assigned.full_name}` : ''}`}
                                                                </span>
                                                                {(updatesByCase[item.id]?.length || 0) > 0 && (
                                                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-red-500 text-[10px] font-bold text-red-600 bg-white">
                                                                        {updatesByCase[item.id].length}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="block text-sm font-semibold text-gray-900">
                                                                {item.title}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                {format(new Date(item.created_at), 'd. MMM yyyy HH:mm', { locale: nb })} ({formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: nb })})
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {/* Kursvenn: Pågår */}
                                                        {item.status === 'OPEN' && (
                                                            <button
                                                                onClick={async () => { 
                                                                    await updateCaseStatus(item.id, 'IN_PROGRESS'); 
                                                                    loadData();
                                                                }}
                                                                className="px-2 py-1 text-[11px] rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                                                                title="Start (sett til PÅGÅR)"
                                                            >
                                                                Start
                                                            </button>
                                                        )}
                                                        {/* Kursvenn/Admin: Tilbake til Åpen */}
                                                        {item.status === 'IN_PROGRESS' && (
                                                            <button
                                                                onClick={async () => {
                                                                    await updateCaseStatus(item.id, 'OPEN');
                                                                    loadData();
                                                                }}
                                                                className="px-2 py-1 text-[11px] rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                                                                title="Stans (sett til ÅPEN)"
                                                            >
                                                                Stans
                                                            </button>
                                                        )}
                                                        {/* Admin: Løst */}
                                                        {isAdmin && item.status !== 'RESOLVED' && (
                                                            <button
                                                                onClick={async () => { 
                                                                    await updateCaseStatus(item.id, 'RESOLVED'); 
                                                                    loadData();
                                                                }}
                                                                className="px-2 py-1 text-[11px] rounded border border-green-200 text-green-700 hover:bg-green-50"
                                                                title="Sett til Løst"
                                                            >
                                                                Løst
                                                            </button>
                                                        )}
                                                        {/* Admin: Arkiver */}
                                                        {isAdmin && item.status !== 'ARCHIVED' && (
                                                            <button
                                                                onClick={async () => { 
                                                                    await updateCaseStatus(item.id, 'ARCHIVED'); 
                                                                    loadData();
                                                                }}
                                                                className="px-2 py-1 text-[11px] rounded border border-gray-200 text-gray-700 hover:bg-gray-50"
                                                                title="Arkiver"
                                                            >
                                                                Arkiver
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className={`text-gray-800 text-sm whitespace-pre-wrap mt-1 ${expandedCaseId === item.id ? '' : 'line-clamp-2'}`}>
                                                    {item.description}
                                                </div>
                                                <div className="mt-1 text-[11px] text-gray-400">
                                                    {item.updated_at && item.updated_at !== item.created_at 
                                                      ? `Oppdatert ${formatDistanceToNow(new Date(item.updated_at), { addSuffix: true, locale: nb })}`
                                                      : (expandedCaseId === item.id ? 'Trykk for å lukke' : 'Trykk for å åpne')}
                                                </div>
                                                {expandedCaseId === item.id && (
                                                    <div className="mt-3 border-t pt-3 space-y-3">
                                                        {/* Vedlegg (bilder) */}
                                                        <div>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-xs font-semibold text-gray-700">Bilder</span>
                                                                <button
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        const input = document.createElement('input');
                                                                        input.type = 'file';
                                                                        input.accept = 'image/*';
                                                                        input.multiple = true;
                                                                        input.onchange = async (ev: any) => {
                                                                            const files: File[] = Array.from(ev.target.files || []);
                                                                            for (const f of files.slice(0, 4)) {
                                                                                try {
                                                                                    const ext = f.name.split('.').pop();
                                                                                    const name = `${Math.random().toString(36).slice(2)}.${ext}`;
                                                                                    const res = await getCaseSignedUploadUrl(name);
                                                                                    if ((res as any).error) { alert((res as any).error); continue; }
                                                                                    const { path, token } = res as any;
                                                                                    const supabase = createClient();
                                                                                    const { error: upErr } = await supabase.storage
                                                                                        .from('case-attachments')
                                                                                        .uploadToSignedUrl(path, token, f);
                                                                                    if (upErr) { alert(upErr.message); continue; }
                                                                                    await addCaseAttachment(item.id, path, f.type);
                                                                                } catch (err: any) {
                                                                                    alert('Opplasting feilet: ' + (err?.message || 'ukjent feil'));
                                                                                }
                                                                            }
                                                                            const latest = await getCaseAttachments(item.id);
                                                                            if (!('error' in latest) && (latest as any).attachments) {
                                                                                setAttachmentsByCase(prev => ({ ...prev, [item.id]: (latest as any).attachments }));
                                                                            }
                                                                        };
                                                                        input.click();
                                                                    }}
                                                                    className="px-2 py-1 text-[11px] rounded border border-amber-200 text-amber-700 hover:bg-amber-50"
                                                                >
                                                                    Legg til bilder
                                                                </button>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                {(attachmentsByCase[item.id] || []).map((att: any) => (
                                                                    <a key={att.id} href={att.file_url} target="_blank" rel="noreferrer" className="block">
                                                                        <img src={att.file_url} alt="Vedlegg" className="w-full h-24 object-cover rounded border" />
                                                                    </a>
                                                                ))}
                                                                {(!attachmentsByCase[item.id] || attachmentsByCase[item.id].length === 0) && (
                                                                    <p className="text-[11px] text-gray-500">Ingen vedlegg.</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {/* Notater */}
                                                        <div className="space-y-2">
                                                            <span className="text-xs font-semibold text-gray-700">Notater og oppdateringer</span>
                                                            {(updatesByCase[item.id] || []).length > 0 && (
                                                                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                                                    {(updatesByCase[item.id] || []).map((u: any) => (
                                                                        <div key={u.id} className="text-[11px] text-gray-700 flex flex-col border-l border-gray-200 pl-2">
                                                                            <span className="text-[10px] text-gray-400">
                                                                                {format(new Date(u.created_at), 'd. MMM HH:mm', { locale: nb })} • {u.type === 'COMMENT' ? 'Notat' : 'System'}
                                                                            </span>
                                                                            <span className="whitespace-pre-wrap">
                                                                                {u.message}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <textarea
                                                                value={noteByCase[item.id] || ''}
                                                                onChange={(e) => setNoteByCase(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                                placeholder="Skriv et kort notat…"
                                                                className="w-full rounded-lg border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-sm min-h-[60px]"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                            <div className="flex justify-end">
                                                                <button
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        const msg = (noteByCase[item.id] || '').trim();
                                                                        if (!msg) return;
                                                                        const res = await addCaseComment(item.id, msg);
                                                                        if ((res as any).error) { alert((res as any).error); return; }
                                                                        setNoteByCase(prev => ({ ...prev, [item.id]: '' }));
                                                                        const upd = await getCaseUpdates(item.id);
                                                                        if (!('error' in upd) && (upd as any).updates) {
                                                                            setUpdatesByCase(prev => ({ ...prev, [item.id]: (upd as any).updates }));
                                                                        }
                                                                    }}
                                                                    className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded hover:bg-gray-800"
                                                                >
                                                                    Legg til notat
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>

                                {recentResolvedCases.length > 0 && (
                                    <div className="mt-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-bold text-gray-500 uppercase">Siste løste</span>
                                            <span className="text-[10px] text-gray-400">(viser inntil 5)</span>
                                        </div>
                                        <div className="space-y-2">
                                            {recentResolvedCases.map(item => (
                                                <div key={item.id} className="bg-white p-3 rounded-lg border border-green-200 opacity-70">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-bold text-green-700 uppercase">Løst</span>
                                                                    <span className="text-[11px] text-gray-500">
                                                                        {format(new Date(item.resolved_at || item.updated_at || item.created_at), 'd. MMM yyyy HH:mm', { locale: nb })}
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs text-gray-700 line-through mt-1 whitespace-pre-wrap">
                                                                    {item.title}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : activeTab === 'ideas' ? (
                            <div className="space-y-3">
                                {/* Idébank viser kun nye ideer (cases av type IDÉ) */}
                                {cases.filter(c => c.type === 'IDEA').length > 0 ? (
                                    <div>
                                        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Nye ideer</div>
                                        <div className="space-y-2">
                                            {cases.filter(c => c.type === 'IDEA').map(item => (
                                                <div key={item.id} className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                                                    <div className="flex items-center gap-2 mb-1 text-yellow-800">
                                                        <Lightbulb className="w-4 h-4" />
                                                        <span className="text-xs font-bold uppercase">Idé</span>
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border border-yellow-300">
                                                            {item.status === 'OPEN' ? 'ÅPEN' : 'PÅGÅR'}
                                                            {item.status === 'IN_PROGRESS' && item.assigned?.full_name ? ` • ${item.assigned.full_name}` : ''}
                                                        </span>
                                                    </div>
                                                    <div className="text-gray-900 text-sm font-semibold">{item.title}</div>
                                                    <p className="text-gray-800 text-sm whitespace-pre-wrap mt-1">{item.description}</p>
                                                    <p className="text-xs text-yellow-700/70 mt-2">
                                                        Lagret {format(new Date(item.created_at), 'd. MMM yyyy HH:mm', { locale: nb })} ({formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: nb })})
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-gray-500">
                                        <Lightbulb className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                        <p>Ingen ideer registrert ennå.</p>
                                    </div>
                                )}
                            </div>
                        ) : activeTab === 'archive' ? (
                            <div className="space-y-3">
                                {archived.map(item => (
                                    <div key={item.id} className="bg-gray-50 p-4 rounded-xl shadow-sm border border-gray-200">
                                        <div className="flex items-start justify-between mb-1">
                                            <div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-gray-900 uppercase tracking-wide">
                                                    <span>{item.status === 'RESOLVED' ? 'Løst' : 'Arkivert'}</span>
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border border-gray-200">
                                                        {item.type === 'IDEA' ? 'IDÉ' : item.type === 'PLAN' ? 'PLAN' : 'SAK'}
                                                    </span>
                                                </div>
                                                <span className="block text-sm font-semibold text-gray-900">
                                                    {item.title}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {format(new Date(item.updated_at || item.created_at), 'd. MMM yyyy HH:mm', { locale: nb })}
                                                </span>
                                            </div>
                                            {isAdmin && (
                                                <button
                                                    onClick={async () => {
                                                        await updateCaseStatus(item.id, 'OPEN');
                                                        loadData();
                                                    }}
                                                    className="px-2 py-1 text-[11px] rounded border border-amber-200 text-amber-700 hover:bg-amber-50"
                                                    title="Gjenåpne"
                                                >
                                                    Gjenåpne
                                                </button>
                                            )}
                                        </div>
                                        <div className="text-gray-700 text-sm whitespace-pre-wrap line-clamp-2">
                                            {item.description}
                                        </div>
                                    </div>
                                ))}
                                {archived.length === 0 && (
                                    <div className="text-center py-12 text-gray-500">
                                        <ArchiveIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                        <p>Ingen arkiverte saker.</p>
                                    </div>
                                )}
                                {posts.length > 0 && (
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
                                        <p className="text-xs font-semibold text-gray-500 uppercase">Tidligere War Room-oppdateringer</p>
                                        <div className="space-y-3">
                                            {posts.map(post => (
                                                <div key={post.id} className={`bg-white p-4 rounded-xl border border-gray-200 ${post.is_resolved ? 'opacity-60 bg-gray-50' : ''}`}>
                                                    <div className="flex items-start gap-2 mb-2">
                                                        <div className={`p-1.5 rounded-full ${getTypeColor(post.type)}`}>
                                                            {getTypeIcon(post.type)}
                                                        </div>
                                                        <div>
                                                            <span className="flex items-center gap-2 text-xs font-bold text-gray-900 uppercase tracking-wide">
                                                                {getTypeLabel(post.type)}
                                                                {post.is_resolved && (
                                                                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold border border-green-200">
                                                                        LØST
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                {post.profile?.full_name} • {format(new Date(post.created_at), 'd. MMM yyyy HH:mm', { locale: nb })} ({formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: nb })})
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-gray-800 text-sm whitespace-pre-wrap pl-9">
                                                        {post.content}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                             /* Status Tab (Mobile Only) */
                             <div className="space-y-4 md:hidden">
                                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
                                    <Users className="w-4 h-4" />
                                    Status Nå
                                </h2>
                                
                                {/* My Status Update (Mobile) */}
                                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-4">
                                    <label className="block text-xs font-medium text-gray-700 mb-2">Hva jobber du med?</label>
                                    <div className="flex gap-2 mb-2">
                                        <button 
                                            onClick={() => setMyStatusColor('green')}
                                            className={`w-6 h-6 rounded-full border-2 ${myStatusColor === 'green' ? 'bg-green-500 border-green-600 ring-2 ring-offset-1 ring-green-500' : 'bg-green-100 border-gray-200'}`}
                                        />
                                        <button 
                                            onClick={() => setMyStatusColor('yellow')}
                                            className={`w-6 h-6 rounded-full border-2 ${myStatusColor === 'yellow' ? 'bg-yellow-500 border-yellow-600 ring-2 ring-offset-1 ring-yellow-500' : 'bg-yellow-100 border-gray-200'}`}
                                        />
                                        <button 
                                            onClick={() => setMyStatusColor('red')}
                                            className={`w-6 h-6 rounded-full border-2 ${myStatusColor === 'red' ? 'bg-red-500 border-red-600 ring-2 ring-offset-1 ring-red-500' : 'bg-red-100 border-gray-200'}`}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={myWorkingOn}
                                            onChange={(e) => setMyWorkingOn(e.target.value)}
                                            placeholder="Koding, møter, etc..."
                                            className="flex-1 text-sm rounded-md border-gray-300"
                                        />
                                        <button 
                                            onClick={handleUpdateStatus}
                                            disabled={updatingStatus}
                                            className="px-3 py-1 bg-gray-900 text-white text-xs rounded-md"
                                        >
                                            {updatingStatus ? '...' : 'Oppdater'}
                                        </button>
                                    </div>
                                </div>

                                {/* Status List (Mobile) */}
                                <div className="space-y-3">
                                    {statuses.map(status => (
                                        <div key={status.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                                            <div className="relative">
                                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                                    {status.full_name?.substring(0, 1)}
                                                </div>
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                                    status.status_color === 'green' ? 'bg-green-500' :
                                                    status.status_color === 'yellow' ? 'bg-yellow-500' :
                                                    'bg-red-500'
                                                }`} />
                                            </div>
                                            <div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-sm font-medium text-gray-900">{status.full_name}</span>
                                                    <span className="text-[10px] text-gray-400">
                                                        {format(new Date(status.updated_at), 'd. MMM HH:mm', { locale: nb })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-600 mt-0.5">
                                                    {status.current_task || 'Ingen status satt'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        )}
                    </div>
                </div>

                {/* Sidebar (Who is doing what) - Hidden on mobile? */}
                <div className="w-64 bg-white border-l border-gray-200 hidden md:flex flex-col">
                    <div className="p-4 border-b border-gray-200">
                        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Status Nå
                        </h2>
                    </div>
                    
                    {/* My Status Update */}
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <p className="text-xs font-medium text-gray-500 mb-2">Hva jobber du med?</p>
                        <input 
                            type="text"
                            value={myWorkingOn}
                            onChange={(e) => setMyWorkingOn(e.target.value)}
                            className="w-full text-xs p-2 rounded border border-gray-300 mb-2"
                            placeholder="Koding, møter, etc..."
                        />
                        <div className="flex gap-2 mb-2">
                            {(['green', 'yellow', 'red'] as const).map(color => (
                                <button
                                    key={color}
                                    onClick={() => setMyStatusColor(color)}
                                    className={`w-6 h-6 rounded-full border-2 ${
                                        myStatusColor === color ? 'border-gray-900 scale-110' : 'border-transparent'
                                    } ${
                                        color === 'green' ? 'bg-green-500' : color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                />
                            ))}
                        </div>
                        <button 
                            onClick={handleUpdateStatus}
                            disabled={updatingStatus}
                            className="w-full py-1 bg-gray-900 text-white text-xs rounded hover:bg-gray-800"
                        >
                            Oppdater
                        </button>
                    </div>

                    {/* Users List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {statuses.map(status => (
                            <div key={status.user_id} className="flex items-start gap-3">
                                <div className="relative">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                                        {status.profile?.avatar_url ? (
                                            <img src={status.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                                                {status.profile?.full_name?.[0]}
                                            </div>
                                        )}
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                                        status.status_color === 'green' ? 'bg-green-500' : 
                                        status.status_color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                                    }`} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-900">{status.profile?.full_name}</p>
                                    <p className="text-xs text-gray-500">{status.working_on || 'Ingen status'}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                        {format(new Date(status.updated_at), 'd. MMM HH:mm', { locale: nb })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
