'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMyMessages, sendMessage, markAsRead } from '@/app/actions/mail';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Mail, Plus, Search, Trash2, Send, X, RefreshCw } from 'lucide-react';

export default function MailPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Compose state
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        router.push('/login');
        return;
    }

    const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    
    if (!profileData?.email_enabled) {
        alert('Du har ikke tilgang til e-post.');
        router.push('/dashboard');
        return;
    }

    setProfile(profileData);

    const res = await getMyMessages();
    if (res.data) {
        setMessages(res.data);
    }
    setLoading(false);
  };

  const handleOpenMessage = async (msg: any) => {
    setSelectedMessage(msg);
    if (!msg.read) {
        await markAsRead(msg.id);
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
    }
  };

  const handleSend = async () => {
    if (!to || !subject || !body) return;
    setSending(true);
    const res = await sendMessage(to, subject, body);
    setSending(false);
    
    if (res.error) {
        alert('Feil ved sending: ' + res.error);
    } else {
        setIsComposing(false);
        setTo('');
        setSubject('');
        setBody('');
        alert('Melding sendt!');
        fetchData(); 
    }
  };

  if (loading) return <div className="p-8 text-center">Laster e-post...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-gray-100 rounded-full">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-500" />
                Webmail
            </h1>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={fetchData} 
                className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
                title="Oppdater"
            >
                <RefreshCw className="w-5 h-5" />
            </button>
            <button 
                onClick={() => setIsComposing(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-full font-bold text-sm shadow-md hover:bg-blue-700 flex items-center gap-2"
            >
                <Plus className="w-4 h-4" />
                Ny melding
            </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-5xl mx-auto w-full p-4">
        
        {/* Inbox List */}
        {!selectedMessage && !isComposing && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <span className="font-bold text-gray-700 text-sm">Innboks ({profile?.email_alias})</span>
                    <span className="text-xs text-gray-500">{messages.length} meldinger</span>
                </div>
                
                {messages.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Ingen meldinger i innboksen.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {messages.map(msg => (
                            <div 
                                key={msg.id} 
                                onClick={() => handleOpenMessage(msg)}
                                className={`p-4 hover:bg-blue-50 cursor-pointer transition-colors flex items-start gap-3 ${!msg.read ? 'bg-blue-50/50' : ''}`}
                            >
                                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!msg.read ? 'bg-blue-500' : 'bg-transparent'}`} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className={`text-sm truncate pr-2 ${!msg.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                            {msg.from_alias}
                                        </h3>
                                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                            {new Date(msg.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className={`text-sm mb-1 ${!msg.read ? 'font-bold text-gray-900' : 'text-gray-800'}`}>
                                        {msg.subject}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                        {msg.body}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* Message Detail View */}
        {selectedMessage && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[calc(100vh-140px)] flex flex-col">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <button onClick={() => setSelectedMessage(null)} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm font-medium">
                        <ArrowLeft className="w-4 h-4" /> Tilbake
                    </button>
                    <div className="flex gap-2">
                        <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">{selectedMessage.subject}</h2>
                    
                    <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold">
                                {selectedMessage.from_alias[0].toUpperCase()}
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 text-sm">{selectedMessage.from_alias}</p>
                                <p className="text-xs text-gray-500">Til: meg</p>
                            </div>
                        </div>
                        <div className="text-xs text-gray-500">
                            {new Date(selectedMessage.created_at).toLocaleString()}
                        </div>
                    </div>
                    
                    <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                        {selectedMessage.body}
                    </div>
                </div>
                
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                     <button 
                        onClick={() => {
                            setIsComposing(true);
                            setTo(selectedMessage.from_alias);
                            setSubject('Re: ' + selectedMessage.subject);
                            setBody('\n\n\n--- Opprinnelig melding ---\n' + selectedMessage.body);
                            setSelectedMessage(null);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-white transition-colors"
                    >
                        Svar
                    </button>
                </div>
            </div>
        )}

        {/* Compose Modal */}
        {isComposing && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                        <h3 className="font-bold text-gray-900">Ny melding</h3>
                        <button onClick={() => setIsComposing(false)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-4 overflow-y-auto flex-1">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Til:</label>
                            <input 
                                type="text" 
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="w-full p-2 border-b border-gray-200 focus:border-blue-500 outline-none transition-colors"
                                placeholder="mottaker@kias.no"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Emne:</label>
                            <input 
                                type="text" 
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full p-2 border-b border-gray-200 focus:border-blue-500 outline-none transition-colors font-medium"
                                placeholder="Emne"
                            />
                        </div>
                        <div className="flex-1 min-h-[200px]">
                            <textarea 
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                className="w-full h-full p-2 resize-none outline-none text-gray-800"
                                placeholder="Skriv din melding her..."
                            />
                        </div>
                    </div>
                    
                    <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
                        <button 
                            onClick={() => setIsComposing(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                        >
                            Avbryt
                        </button>
                        <button 
                            onClick={handleSend}
                            disabled={sending || !to || !subject}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {sending ? 'Sender...' : (
                                <>
                                    <Send className="w-4 h-4" /> Send
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}
