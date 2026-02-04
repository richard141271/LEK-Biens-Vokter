'use client';

import { useEffect, useState, useRef } from 'react';
import { getCommunityMessages, postCommunityMessage } from '@/app/actions/founder-community';
import { Send, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';
import Link from 'next/link';

interface WarRoomChatProps {
    backLink: string;
    backText?: string;
    title?: string;
    subtitle?: string;
}

export default function WarRoomChat({ 
    backLink, 
    backText = 'Tilbake',
    title = 'War Room',
    subtitle = 'Felles chat for gründere'
}: WarRoomChatProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const loadMessages = async () => {
        try {
            const res = await getCommunityMessages();
            if (res.error) {
                console.error('Error loading messages:', res.error);
                setError(res.error);
            } else if (res.messages) {
                setMessages(res.messages.reverse());
                setError(null);
            }
        } catch (e) {
            console.error('Exception loading messages:', e);
            setError('Kunne ikke laste meldinger');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMessages();
        // Poll for new messages every 10 seconds
        const interval = setInterval(loadMessages, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Scroll to bottom on new messages
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        try {
            const res = await postCommunityMessage(newMessage);
            if (res.success) {
                setNewMessage('');
                await loadMessages();
            } else {
                alert('Kunne ikke sende melding: ' + res.error);
            }
        } catch (e) {
            console.error('Error sending message:', e);
            alert('En uventet feil oppstod ved sending av melding');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-10 shadow-sm">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href={backLink} className="text-gray-500 hover:text-gray-900 text-sm">
                            ← {backText}
                        </Link>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-amber-600" />
                            {title}
                        </h1>
                    </div>
                    <div className="text-xs text-gray-500 hidden sm:block">
                        {subtitle}
                    </div>
                </div>
            </header>

            {/* Chat Area */}
            <main className="flex-1 overflow-y-auto p-4">
                <div className="max-w-4xl mx-auto space-y-4 pb-4">
                    {loading ? (
                        <div className="text-center py-12 text-gray-500">Laster meldinger...</div>
                    ) : error ? (
                        <div className="text-center py-12 bg-red-50 rounded-xl border border-red-200 text-red-600">
                            <p className="font-bold">Feil ved lasting av meldinger</p>
                            <p className="text-sm mt-1">{error}</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">Ingen meldinger ennå. Start praten!</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div key={msg.id} className="flex gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200 overflow-hidden">
                                    {msg.founder_profiles?.profiles?.avatar_url ? (
                                        <img 
                                            src={msg.founder_profiles.profiles.avatar_url} 
                                            alt="Avatar" 
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="font-bold text-amber-700">
                                            {msg.founder_profiles?.profiles?.full_name?.[0] || '?'}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 max-w-[80%]">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-sm text-gray-900">
                                            {msg.founder_profiles?.profiles?.full_name || 'Ukjent'}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: nb })}
                                        </span>
                                    </div>
                                    <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 text-gray-800 whitespace-pre-wrap">
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Input Area */}
            <footer className="bg-white border-t border-gray-200 p-4 sticky bottom-0">
                <div className="max-w-4xl mx-auto">
                    <form onSubmit={handleSend} className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Skriv en melding til teamet..."
                            className="flex-1 rounded-lg border-gray-300 focus:border-amber-500 focus:ring-amber-500 p-3 shadow-sm outline-none ring-1 ring-gray-200"
                            disabled={sending}
                        />
                        <button
                            type="submit"
                            disabled={sending || !newMessage.trim()}
                            className="bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                        >
                            <Send className="w-4 h-4" />
                            Send
                        </button>
                    </form>
                </div>
            </footer>
        </div>
    );
}