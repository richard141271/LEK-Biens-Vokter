'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf';
import {
  ArrowLeft,
  FileText,
  Clock,
  ListChecks,
  ListTodo,
  Link as LinkIcon,
  Download,
  Edit2,
  Save,
  X,
  Trash2,
} from 'lucide-react';

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

const ERROR_TITLE = 'Transkripsjon feilet – lydopptaket er lagret';

export default function MeetingNoteDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<MeetingNoteDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [summaryDraft, setSummaryDraft] = useState('');
  const [actionPointsDraft, setActionPointsDraft] = useState('');
  const [transcriptDraft, setTranscriptDraft] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
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
      setTitleDraft(typed.title || '');
      setSummaryDraft(typed.summary || '');
      setActionPointsDraft(typed.action_points || '');
      setTranscriptDraft(typed.transcript || '');

      if (typed.audio_url) {
        try {
          const res = await fetch('/api/meeting-notes/audio-url', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: params.id }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const message = err.error || 'Kunne ikke hente lydfil';
            setAudioError(message);
          } else {
            const json = (await res.json()) as { url?: string };
            if (json.url) {
              // Use signed URL directly instead of fetching blob to avoid CORS/memory issues
              setAudioUrl(json.url);
            } else {
              setAudioError('Mangler URL til lydfil');
            }
          }
        } catch (e) {
          console.error('Uventet feil ved henting av lyd-URL', e);
          setAudioError('Uventet feil ved henting av lydfil');
        }
      }

      setLoading(false);
    };

    fetchNote();
  }, [params.id, router, supabase]);

  // Removed URL.revokeObjectURL effect since we're using direct URLs mostly now
  // (Browser handles garbage collection for direct strings, and we aren't creating object URLs)

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

  const effectiveTitle =
    note.title && note.title.trim() && note.title !== ERROR_TITLE
      ? note.title
      : 'Møteopptak';

  const effectiveSummary =
    note.title === ERROR_TITLE || !note.summary || !note.summary.trim()
      ? 'Dette er et lagret møteopptak uten automatisk tekstlig oppsummering.'
      : note.summary;

  const actionPoints = note.action_points
    ? note.action_points.split('\n').filter((line) => line.trim().length > 0)
    : [];

  const startEditing = () => {
    setTitleDraft(note.title || '');
    setSummaryDraft(note.summary || '');
    setActionPointsDraft(note.action_points || '');
    setTranscriptDraft(note.transcript || '');
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setTitleDraft(note.title || '');
    setSummaryDraft(note.summary || '');
    setActionPointsDraft(note.action_points || '');
    setTranscriptDraft(note.transcript || '');
  };

  const saveChanges = async () => {
    if (!note) return;
    setSaving(true);

    const updated = {
      title: titleDraft.trim() || null,
      summary: summaryDraft.trim() || null,
      action_points: actionPointsDraft.trim() || null,
      transcript: transcriptDraft.trim() || null,
    };

    const { error } = await supabase
      .from('meeting_notes')
      .update(updated)
      .eq('id', note.id);

    if (error) {
      console.error('Kunne ikke oppdatere referat', error);
      alert('Kunne ikke lagre endringene. Prøv igjen.');
      setSaving(false);
      return;
    }

    setNote({
      ...note,
      ...updated,
    });
    setEditing(false);
    setSaving(false);
  };

  const deleteNote = async () => {
    if (!note) return;
    const confirmed = window.confirm(
      'Er du sikker på at du vil slette dette møtereferatet permanent?'
    );
    if (!confirmed) return;

    setDeleting(true);

    const { error } = await supabase
      .from('meeting_notes')
      .delete()
      .eq('id', note.id);

    if (error) {
      console.error('Kunne ikke slette referat', error);
      alert('Kunne ikke slette referatet. Prøv igjen.');
      setDeleting(false);
      return;
    }

    router.push('/referater');
  };

  const exportAsPdf = () => {
    if (!note) return;
    setExporting(true);

    try {
      const doc = new jsPDF();
      const left = 14;
      let y = 16;

      doc.setFontSize(14);
      doc.text(effectiveTitle, left, y);
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
      const summaryLines = doc.splitTextToSize(effectiveSummary, 180);
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
      const transcriptLines = doc.splitTextToSize(
        'Ingen transkripsjon tilgjengelig for dette opptaket.',
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
        effectiveTitle + '\n',
        note.date ? new Date(note.date).toLocaleString('nb-NO') + '\n\n' : '\n',
        'Ingen transkripsjon tilgjengelig for dette opptaket.',
      ],
      { type: 'text/plain;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = effectiveTitle + '.txt';
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
        <div className="flex items-center gap-2">
          <button
            onClick={editing ? cancelEditing : startEditing}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-200 text-xs text-gray-700 hover:bg-gray-50"
            disabled={saving || deleting}
          >
            {editing ? (
              <>
                <X className="w-3 h-3" />
                Avbryt
              </>
            ) : (
              <>
                <Edit2 className="w-3 h-3" />
                Rediger
              </>
            )}
          </button>
          {editing && (
            <button
              onClick={saveChanges}
              disabled={saving}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-honey-600 text-xs text-white hover:bg-honey-700 disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              Lagre
            </button>
          )}
          <button
            onClick={deleteNote}
            disabled={deleting}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-200 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" />
            Slett
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-honey-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-honey-700" />
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  className="w-full text-base font-semibold text-gray-900 border border-gray-300 rounded-md px-2 py-1 text-sm"
                  placeholder="Tittel på møtereferatet"
                />
              ) : (
                <h2 className="text-base font-semibold text-gray-900 truncate">
                  {effectiveTitle}
                </h2>
              )}
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

          {audioError && (
            <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-md text-xs">
              <p className="font-semibold">Feil ved lasting av lydfil:</p>
              <p>{audioError}</p>
              <p className="mt-1 font-mono text-[10px] opacity-75 break-all">Path: {note.audio_url}</p>
            </div>
          )}

          {audioUrl && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                <LinkIcon className="w-3 h-3" />
                Lydopptak
              </p>
              <audio
                controls
                src={audioUrl}
                className="w-full"
                onError={() =>
                  setAudioError('Kunne ikke spille av lydfilen i nettleseren')
                }
              >
                Din nettleser støtter ikke lydavspilling.
              </audio>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Sammendrag</h3>
          {editing ? (
            <textarea
              value={summaryDraft}
              onChange={(e) => setSummaryDraft(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 min-h-[80px]"
              placeholder="Kort sammendrag av møtet"
            />
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {effectiveSummary}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-honey-600" />
            Beslutninger
          </h3>
          {editing ? (
            <textarea
              value={actionPointsDraft}
              onChange={(e) => setActionPointsDraft(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 min-h-[80px]"
              placeholder={'Skriv ett aksjonspunkt per linje\nEksempel:\n– Sende oppsummering til deltakerne\n– Bestille ny oppfølgingstime'}
            />
          ) : actionPoints.length === 0 ? (
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
          {editing ? (
            <textarea
              value={transcriptDraft}
              onChange={(e) => setTranscriptDraft(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 min-h-[160px]"
              placeholder="Her kan du rette opp eller skrive inn transkripsjonsteksten manuelt."
            />
          ) : (
            <div className="max-h-80 overflow-y-auto text-sm text-gray-700 whitespace-pre-line border border-gray-100 rounded-lg p-3 bg-gray-50">
              {note.transcript && note.transcript.trim()
                ? note.transcript
                : 'Ingen transkripsjon tilgjengelig for dette opptaket.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
