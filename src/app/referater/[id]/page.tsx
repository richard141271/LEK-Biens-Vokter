'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf';
import { ArrowLeft, FileText, Clock, ListChecks, ListTodo, Link as LinkIcon, Download } from 'lucide-react';

type MeetingNoteDetail = {
  id: string;
  title: string | null;
  date: string | null;
  duration: number | null;
  transcript: string | null;
  summary: string | null;
  action_points: string | null;
  audio_url: string | null;
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

export default function MeetingNoteDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<MeetingNoteDetail | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchNote = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/login?next=/referater/${params.id}`);
        return;
      }

      const { data } = await supabase
        .from('meeting_notes')
        .select('*')
        .eq('id', params.id)
        .single();

      if (!data) {
        setLoading(false);
        return;
      }

      const typed = data as any as MeetingNoteDetail;
      setNote(typed);

      if (typed.audio_url) {
        const { data: signed, error } = await supabase.storage
          .from('meeting-audio')
          .createSignedUrl(typed.audio_url, 60 * 60);

        if (!error && signed?.signedUrl) {
          setAudioUrl(signed.signedUrl);
        }
      }

      setLoading(false);
    };

    fetchNote();
  }, [params.id, router, supabase]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Laster referat...</div>;
  }

  if (!note) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="max-w-md mx-auto p-4 pt-10">
          <button
            onClick={() => router.push('/referater')}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Tilbake til referater
          </button>
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">
            Referat ikke funnet.
          </div>
        </div>
      </div>
    );
  }

  const durationDisplay = formatDuration(note.duration);

  const actionPoints = note.action_points
    ? note.action_points.split('\n').filter((line) => line.trim().length > 0)
    : [];

  const exportAsPdf = () => {
    if (!note) return;
    setExporting(true);

    try {
      const doc = new jsPDF();
      const left = 14;
      let y = 16;

      doc.setFontSize(14);
      doc.text(note.title || 'Møtereferat', left, y);
      y += 8;

      doc.setFontSize(10);
      doc.text(
        note.date ? new Date(note.date).toLocaleString('nb-NO') : 'Dato: ukjent',
        left,
        y,
      );
      y += 6;
      doc.text(`Varighet: ${durationDisplay}`, left, y);
      y += 10;

      doc.setFontSize(12);
      doc.text('Sammendrag', left, y);
      y += 6;
      doc.setFontSize(10);
      const summary = note.summary || '';
      const summaryLines = doc.splitTextToSize(summary || 'Ingen oppsummering.', 180);
      doc.text(summaryLines, left, y);
      y += summaryLines.length * 5 + 8;

      doc.setFontSize(12);
      doc.text('Aksjonspunkter', left, y);
      y += 6;
      doc.setFontSize(10);
      if (actionPoints.length === 0) {
        doc.text('Ingen aksjonspunkter.', left, y);
        y += 6;
      } else {
        actionPoints.forEach((ap) => {
          const lines = doc.splitTextToSize('- ' + ap, 180);
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(lines, left, y);
          y += lines.length * 5;
        });
        y += 8;
      }

      doc.setFontSize(12);
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.text('Full transkripsjon', left, y);
      y += 6;
      doc.setFontSize(9);
      const transcript = note.transcript || '';
      const transcriptLines = doc.splitTextToSize(
        transcript || 'Ingen transkripsjon tilgjengelig.',
        180,
      );
      transcriptLines.forEach((line: string | string[]) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(line as string, left, y);
        y += 4;
      });

      doc.save((note.title || 'møtereferat') + '.pdf');
    } finally {
      setExporting(false);
    }
  };

  const downloadTranscript = () => {
    if (!note) return;
    const blob = new Blob(
      [
        (note.title || 'Møtereferat') + '\n',
        note.date ? new Date(note.date).toLocaleString('nb-NO') + '\n\n' : '\n',
        note.transcript || '',
      ],
      { type: 'text/plain;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (note.title || 'møtereferat') + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/referater')}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-gray-900">Møtereferat</h1>
            <p className="text-xs text-gray-500">
              {note.date ? new Date(note.date).toLocaleString('nb-NO') : 'Ukjent dato'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-honey-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-honey-700" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {note.title || 'Møtereferat'}
              </h2>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <Clock className="w-3 h-3" />
                <span>{durationDisplay}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={exportAsPdf}
                disabled={exporting}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-200 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Download className="w-3 h-3" />
                PDF
              </button>
              <button
                onClick={downloadTranscript}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-200 text-xs text-gray-700 hover:bg-gray-50"
              >
                <Download className="w-3 h-3" />
                Tekst
              </button>
            </div>
          </div>

          {audioUrl && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                <LinkIcon className="w-3 h-3" />
                Lydopptak
              </p>
              <audio controls src={audioUrl} className="w-full">
                Din nettleser støtter ikke lydavspilling.
              </audio>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Sammendrag</h3>
          <p className="text-sm text-gray-700 whitespace-pre-line">
            {note.summary || 'Ingen oppsummering tilgjengelig.'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-honey-600" />
            Beslutninger
          </h3>
          {actionPoints.length === 0 ? (
            <p className="text-sm text-gray-500">Ingen aksjonspunkter registrert.</p>
          ) : (
            <ul className="space-y-1 text-sm text-gray-700">
              {actionPoints.map((line, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-[3px] w-1.5 h-1.5 rounded-full bg-honey-500" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-gray-500" />
            Full transkripsjon
          </h3>
          <div className="max-h-80 overflow-y-auto text-sm text-gray-700 whitespace-pre-line border border-gray-100 rounded-lg p-3 bg-gray-50">
            {note.transcript || 'Ingen transkripsjon tilgjengelig.'}
          </div>
        </div>
      </div>
    </div>
  );
}
