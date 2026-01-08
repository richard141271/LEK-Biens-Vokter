'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

type PageContent = {
  id: string;
  page_slug: string;
  section_key: string;
  content: string;
  label: string;
  type: 'text' | 'textarea' | 'html';
};

export default function EditPageContent() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const supabase = createClient();

  const [contentItems, setContentItems] = useState<PageContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchContent();
  }, [slug]);

  const fetchContent = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('page_content')
      .select('*')
      .eq('page_slug', slug)
      .order('created_at', { ascending: true }); // Or order by some other logic if needed

    if (error) {
      console.error('Error fetching content:', error);
      setMessage({ type: 'error', text: 'Kunne ikke hente innhold. Sjekk at du er logget inn som admin.' });
    } else {
      setContentItems(data || []);
    }
    setLoading(false);
  };

  const handleInputChange = (id: string, newValue: string) => {
    setContentItems(items => 
      items.map(item => item.id === id ? { ...item, content: newValue } : item)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // Upsert all items
      // In a real app we might only update changed items, but for simplicity we update all
      const updates = contentItems.map(item => ({
        id: item.id,
        page_slug: item.page_slug,
        section_key: item.section_key,
        content: item.content,
        label: item.label,
        type: item.type,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('page_content')
        .upsert(updates);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Endringer lagret!' });
      
      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);

    } catch (error) {
      console.error('Error saving:', error);
      setMessage({ type: 'error', text: 'Kunne ikke lagre endringer. Prøv igjen.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-honey-500" />
      </div>
    );
  }

  // Helper to group items if needed, but simple list is fine for now
  // Maybe we can group by 'intro', 'feature', etc based on key prefix? 
  // For now, simple list.

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link href="/dashboard/admin/pages" className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Tilbake til oversikt
      </Link>

      <div className="flex justify-between items-center mb-8 sticky top-0 bg-gray-50/80 backdrop-blur-sm py-4 z-10 border-b border-gray-200">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 capitalize">Rediger: {slug}</h1>
            <p className="text-gray-500">Endre tekster og innhold på siden.</p>
        </div>
        <button
            onClick={handleSave}
            disabled={saving}
            className="bg-honey-500 hover:bg-honey-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
        >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? 'Lagrer...' : 'Lagre Endringer'}
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
        </div>
      )}

      {contentItems.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">Ingen redigerbare felter funnet for denne siden.</p>
            <p className="text-xs text-gray-400 mt-2">(Har du kjørt databasemigrasjonen?)</p>
        </div>
      ) : (
        <div className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            {contentItems.map((item) => (
                <div key={item.id} className="group">
                    <label className="block text-sm font-medium text-gray-700 mb-2 group-hover:text-honey-600 transition-colors">
                        {item.label} <span className="text-xs font-mono text-gray-400 font-normal ml-2">({item.section_key})</span>
                    </label>
                    
                    {item.type === 'textarea' ? (
                        <textarea
                            value={item.content}
                            onChange={(e) => handleInputChange(item.id, e.target.value)}
                            rows={4}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:border-honey-500 focus:ring-2 focus:ring-honey-200 transition-all outline-none"
                        />
                    ) : (
                        <input
                            type="text"
                            value={item.content}
                            onChange={(e) => handleInputChange(item.id, e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:border-honey-500 focus:ring-2 focus:ring-honey-200 transition-all outline-none"
                        />
                    )}
                </div>
            ))}
        </div>
      )}
    </div>
  );
}
