'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Send, User, Clock, CheckCircle } from 'lucide-react';

interface Message {
  id: string;
  subject: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_id: string;
  parent_id?: string;
}

export default function ContactPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [unitId, setUnitId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get franchise unit first
      const { data: unit } = await supabase
        .from('franchise_units')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (unit) {
        setUnitId(unit.id);
        
        // Get messages
        const { data } = await supabase
          .from('franchise_messages')
          .select('*')
          .eq('franchise_id', unit.id)
          .order('created_at', { ascending: false });

        if (data) setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitId || !subject || !content) return;

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('franchise_messages')
        .insert({
          franchise_id: unitId,
          sender_id: user.id,
          recipient_role: 'admin',
          subject,
          content
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMessages([data, ...messages]);
        setSubject('');
        setContent('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Kunne ikke sende melding.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard/franchise"
                className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gray-100 text-gray-600 rounded-lg">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Meldinger</h1>
                  <p className="text-xs text-gray-500">Direkte linje til administrasjonen</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* New Message Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 sticky top-24">
            <h2 className="font-bold text-gray-900 mb-4">Ny melding</h2>
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emne</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none"
                  placeholder="Hva gjelder det?"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Melding</label>
                <textarea
                  required
                  rows={5}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none resize-none"
                  placeholder="Skriv din melding her..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={sending || !unitId}
                className={`w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors ${
                  sending ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {sending ? 'Sender...' : (
                  <>
                    <Send className="w-4 h-4" />
                    Send melding
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Message List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold text-gray-900 mb-2">Tidligere meldinger</h2>
          {loading ? (
            <div className="text-center py-12 text-gray-500">Laster meldinger...</div>
          ) : messages.length > 0 ? (
            messages.map((msg) => (
              <div key={msg.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-900">{msg.subject}</h3>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(msg.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-600 text-sm whitespace-pre-wrap">{msg.content}</p>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    msg.sender_id === unitId ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                  }`}>
                    {/* Note: This logic is simplified. In real app, check sender vs current user */}
                    Sendt
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Ingen meldinger ennå.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
