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
import { formatDistanceToNow } from 'date-fns';
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
    Check
} from 'lucide-react';
import Link from 'next/link';

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
    const [activeTab, setActiveTab] = useState<'feed' | 'ideas'>('feed');
    const [posts, setPosts] = useState<any[]>([]);
    const [ideas, setIdeas] = useState<any[]>([]);
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
        
        setLoading(false);
    };

    const handlePost = async () => {
        if (!newPostType || !newPostContent.trim() || sending) return;
        setSending(true);
        try {
            await postWarRoomEntry(newPostType, newPostContent);
            setNewPostContent('');
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
            case 'help': return 'Trenger hjelp';
            case 'idea': return 'Idé';
            case 'problem': return 'Problem';
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
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                        <p className="text-sm text-gray-500">{subtitle}</p>
                    </div>
                    <button 
                        onClick={handleRelationshipAlert}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-medium rounded-full border border-red-100 hover:bg-red-100 transition-colors"
                    >
                        <HeartHandshake className="w-4 h-4" />
                        Relasjonsvarsel
                    </button>
                </div>

                {/* Daily Focus */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 relative group">
                    <label className="block text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">
                        Dagens Fokus
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

                {/* Stats & Activity */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {['done', 'plan', 'help', 'idea', 'problem'].map(type => (
                        <div key={type} className={`p-2 rounded-lg border flex items-center justify-between ${getTypeColor(type)}`}>
                            <div className="flex items-center gap-2">
                                {getTypeIcon(type)}
                                <span className="text-xs font-medium capitalize">{getTypeLabel(type)}</span>
                            </div>
                            <span className="text-lg font-bold">{stats[type] || 0}</span>
                        </div>
                    ))}
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
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {activeTab === 'feed' ? (
                            <>
                                {/* New Post Input */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
                                    <p className="text-sm font-medium text-gray-700">Ny oppdatering:</p>
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {(['done', 'plan', 'help', 'idea', 'problem'] as WarRoomPostType[]).map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setNewPostType(type)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                                                    newPostType === type 
                                                    ? 'bg-gray-900 text-white border-gray-900' 
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                {getTypeIcon(type)}
                                                {getTypeLabel(type)}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    {newPostType && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <textarea
                                                value={newPostContent}
                                                onChange={(e) => setNewPostContent(e.target.value)}
                                                placeholder={`Hva vil du dele om ${getTypeLabel(newPostType).toLowerCase()}?`}
                                                className="w-full rounded-lg border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-sm min-h-[80px]"
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setNewPostType(null)}
                                                    className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
                                                >
                                                    Avbryt
                                                </button>
                                                <button
                                                    onClick={handlePost}
                                                    disabled={!newPostContent.trim() || sending}
                                                    className="px-4 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    <Send className="w-3 h-3" />
                                                    Publiser
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Feed Items */}
                                <div className="space-y-3">
                                    {loading && posts.length === 0 ? (
                                        <p className="text-center text-gray-500 py-8">Laster...</p>
                                    ) : (
                                        posts.map(post => (
                                            <div key={post.id} className={`bg-white p-4 rounded-xl shadow-sm border border-gray-200 ${post.is_resolved ? 'opacity-60 bg-gray-50' : ''}`}>
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-2">
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
                                                                {post.profile?.full_name} • {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: nb })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {isAdmin && (
                                                        <div className="flex items-center gap-1">
                                                            {/* Show Resolve button only if NOT resolved */}
                                                            {!post.is_resolved && (
                                                                <button 
                                                                    onClick={() => handleResolvePost(post.id)}
                                                                    className="p-1 text-gray-400 hover:text-green-600 rounded-full hover:bg-green-50"
                                                                    title="Markér som avklart/løst"
                                                                >
                                                                    <Check className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                            <button 
                                                                onClick={() => handleStartEdit(post)}
                                                                className="p-1 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50"
                                                                title="Rediger"
                                                            >
                                                                <Edit2 className="w-3 h-3" />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeletePost(post.id)}
                                                                className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"
                                                                title="Slett"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                {editingPostId === post.id ? (
                                                    <div className="pl-9 mt-2 space-y-2">
                                                        <textarea
                                                            value={editContent}
                                                            onChange={(e) => setEditContent(e.target.value)}
                                                            className="w-full rounded-lg border-gray-300 text-sm focus:ring-amber-500 focus:border-amber-500"
                                                            rows={3}
                                                        />
                                                        <div className="flex justify-end gap-2">
                                                            <button 
                                                                onClick={() => setEditingPostId(null)}
                                                                className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                                                                title="Avbryt"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                onClick={handleSaveEdit}
                                                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                                title="Lagre"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-gray-800 text-sm whitespace-pre-wrap pl-9">
                                                        {post.content}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="space-y-3">
                                {/* Ideas List */}
                                {ideas.map(idea => (
                                    <div key={idea.id} className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                                        <div className="flex items-center gap-2 mb-2 text-yellow-800">
                                            <Lightbulb className="w-4 h-4" />
                                            <span className="text-xs font-bold uppercase">Idé</span>
                                        </div>
                                        <p className="text-gray-900 text-sm">{idea.content}</p>
                                        <p className="text-xs text-yellow-600/70 mt-2">
                                            Lagret {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true, locale: nb })}
                                        </p>
                                    </div>
                                ))}
                                {ideas.length === 0 && (
                                    <div className="text-center py-12 text-gray-500">
                                        <Lightbulb className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                        <p>Ingen ideer registrert ennå.</p>
                                    </div>
                                )}
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
                                        {formatDistanceToNow(new Date(status.updated_at), { addSuffix: true, locale: nb })}
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
