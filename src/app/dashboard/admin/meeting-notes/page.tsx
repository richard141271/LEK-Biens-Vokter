'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Trash2, Edit2, Save, X } from 'lucide-react';

type AdminMeetingNote = {
  id: string;
  title: string | null;
  date: string | null;
  duration: number | null;
  user_id: string;
};

export default function AdminMeetingNotesPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<AdminMeetingNote[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/admin');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && user.email !== 'richard141271@gmail.com') {
      router.push('/admin');
      return;
    }

    const { data } = await supabase.from('meeting_notes').select('id, title, date, duration, user_id').order('date', {
      ascending: false,
    });

    setNotes((data as any as AdminMeetingNote[]) || []);
    setLoading(false);
  };

  const startEdit = (note: AdminMeetingNote) => {
    setEditingId(note.id);
    setEditingTitle(note.title || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const saveTitle = async () => {
    if (!editingId) return;
    setSaving(true);

    const { error } = await supabase.from('meeting_notes').update({ title: editingTitle }).eq('id', editingId);

    if (error) {
      console.error('Update title error', error);
      alert('Kunne ikke oppdatere tittel.');
    } else {
      setNotes((prev) =>
        prev.map((n) => (n.id === editingId ? { ...n, title: editingTitle } : n)),
      );
      cancelEdit();
    }

    setSaving(false);
  };

  const deleteNote = async (id: string) => {
    if (!confirm('Er du sikker på at du vil slette dette referatet?')) return;
    setDeletingId(id);

    const { error } = await supabase.from('meeting_notes').delete().eq('id', id);

    if (error) {
      console.error('Delete note error', error);
      alert('Kunne ikke slette referat.');
    } else {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    }

    setDeletingId(null);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Laster referater...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/admin')}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-honey-100 flex items-center justify-center">
              <FileText className="w-4 h-4 text-honey-700" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Referater</h1>
              <p className="text-xs text-gray-500">Administrer alle møtereferater i systemet.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {notes.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            Ingen referater funnet.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Tittel</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Dato</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Varighet</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Bruker</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {notes.map((note) => (
                  <tr key={note.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2 align-top">
                      {editingId === note.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                          />
                          <button
                            onClick={saveTitle}
                            disabled={saving}
                            className="p-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            <Save className="w-3 h-3" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => router.push(`/referater/${note.id}`)}
                          className="text-xs font-medium text-gray-900 hover:text-honey-700"
                        >
                          {note.title || 'Møtereferat'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500 align-top">
                      {note.date ? new Date(note.date).toLocaleString('nb-NO') : '-'}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500 align-top">
                      {note.duration ? `${Math.round(note.duration / 60)} min` : '-'}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500 align-top">
                      {note.user_id}
                    </td>
                    <td className="px-4 py-2 text-xs text-right align-top">
                      {editingId !== note.id && (
                        <button
                          onClick={() => startEdit(note)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 mr-2"
                        >
                          <Edit2 className="w-3 h-3" />
                          Rediger
                        </button>
                      )}
                      <button
                        onClick={() => deleteNote(note.id)}
                        disabled={deletingId === note.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        Slett
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

