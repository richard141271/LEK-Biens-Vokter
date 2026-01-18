'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, PlusCircle } from 'lucide-react';

type MeetingNote = {
  id: string;
  title: string | null;
  date: string | null;
  duration: number | null;
};

const formatDuration = (duration: number | null) => {
  if (!duration || duration <= 0) {
    return 'Varighet ukjent';
  }
  if (duration < 60) {
    return `${duration} sek`;
  }
  const minutes = Math.round(duration / 60);
  return `${minutes} min`;
};

export default function MeetingNotesListPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<MeetingNote[]>([]);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login?next=/referater');
        return;
      }

      const { data } = await supabase
        .from('meeting_notes')
        .select('id, title, date, duration')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      setNotes((data as any as MeetingNote[]) || []);
      setLoading(false);
    };

    checkUser();
  }, [router, supabase]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Laster...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-honey-100 flex items-center justify-center">
            <FileText className="w-5 h-5 text-honey-700" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Referater</h1>
            <p className="text-xs text-gray-500">Her vil dine møtereferater dukke opp.</p>
          </div>
        </div>
        <Link
          href="/referater/new"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white text-xs font-semibold hover:bg-gray-900"
        >
          <PlusCircle className="w-4 h-4" />
          Nytt møteopptak
        </Link>
      </div>

      <div className="max-w-md mx-auto p-4">
        {notes.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            Ingen referater enda. Start med et{' '}
            <Link href="/referater/new" className="text-honey-600 font-semibold hover:underline">
              nytt møteopptak
            </Link>
            .
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => {
              const title =
                note.title && note.title.trim() && note.title !== 'Transkripsjon feilet – lydopptaket er lagret'
                  ? note.title
                  : 'Møteopptak';
              return (
              <button
                key={note.id}
                onClick={() => router.push(`/referater/${note.id}`)}
                className="w-full bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:border-honey-300 hover:shadow-sm text-left transition"
              >
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                      {title}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {note.date ? new Date(note.date).toLocaleString('nb-NO') : 'Ukjent tidspunkt'}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <span>{formatDuration(note.duration)}</span>
                </div>
              </button>
            )})}
          </div>
        )}
      </div>
    </div>
  );
}
