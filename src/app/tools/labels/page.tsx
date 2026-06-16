'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, getUserWithSessionFallback } from '@/utils/supabase/client';
import { jsPDF } from 'jspdf';
import { ArrowLeft, Link as LinkIcon, Printer, X } from 'lucide-react';

type ProfileLike = {
  full_name?: string | null;
  member_number?: string | null;
  is_lek_honning_member?: boolean | null;
};

export default function LabelsToolPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<ProfileLike | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChildModal, setShowChildModal] = useState(false);
  const [childPendingAction, setChildPendingAction] = useState<'print' | 'save'>('print');
  const [childLabelData, setChildLabelData] = useState({ name: '', age: '' });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const user = await getUserWithSessionFallback(supabase);
        if (!user) {
          router.push('/login');
          return;
        }

        const { data } = await supabase.from('profiles').select('full_name, member_number, is_lek_honning_member').eq('id', user.id).maybeSingle();
        if (!cancelled) {
          setProfile({
            full_name: data?.full_name || user.user_metadata?.full_name || user.email || '',
            member_number: data?.member_number || null,
            is_lek_honning_member: Boolean(data?.is_lek_honning_member),
          });
        }
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const printPdf = (doc: jsPDF) => {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = url;
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {}
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
        iframe.remove();
      }, 1500);
    };
    document.body.appendChild(iframe);
  };

  const buildLabelDoc = (type: 'standard' | 'child') => {
    const doc = new jsPDF();
    const cols = 3;
    const rows = 8;
    const labelWidth = 70;
    const labelHeight = 37;
    const startX = 0;
    const startY = 0;
    const year = new Date().getFullYear();
    const beekeeperName = profile?.full_name || 'Ukjent birøkter';
    const memberNumber = profile?.member_number || '';
    const isLekMember = Boolean(profile?.is_lek_honning_member);
    const maxTextWidth = labelWidth - 8;

    const clipToWidth = (text: string, width: number) => {
      if (doc.getTextWidth(text) <= width) return text;
      let low = 0;
      let high = text.length;
      while (low < high) {
        const mid = Math.ceil((low + high) / 2);
        const candidate = text.slice(0, mid) + '…';
        if (doc.getTextWidth(candidate) <= width) low = mid;
        else high = mid - 1;
      }
      return text.slice(0, low) + '…';
    };

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * labelWidth;
        const y = startY + r * labelHeight;
        const cx = x + labelWidth / 2;

        doc.setDrawColor(210, 180, 140);
        doc.setLineWidth(0.2);
        doc.rect(x + 1.5, y + 1.5, labelWidth - 3, labelHeight - 3);
        doc.setDrawColor(180, 140, 60);
        doc.line(x + 4, y + 9, x + labelWidth - 4, y + 9);
        doc.line(x + 4, y + labelHeight - 3, x + labelWidth - 4, y + labelHeight - 3);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(184, 134, 11);
        doc.text('LEK-HONNING™', cx, y + 6, { align: 'center' });

        doc.setTextColor(0);

        if (type === 'standard') {
          doc.setFont('times', 'italic');
          doc.setFontSize(11);
          doc.text('Norsk Honning', cx, y + 15, { align: 'center' });

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.text('Birøkter:', cx, y + 21, { align: 'center' });

          doc.setFont('times', 'bold');
          doc.setFontSize(8.5);
          doc.text(clipToWidth(beekeeperName, maxTextWidth), cx, y + 25, { align: 'center' });

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.text(`Sommer ${year}`, cx, y + 29, { align: 'center' });

          const memberLine = isLekMember && memberNumber ? `LEK-sertifisert birøkter • Medlem #${memberNumber}` : '';
          const qualityLine = '100 % ekte honning • Norsk naturprodukt';

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.2);

          if (memberLine) {
            doc.text(clipToWidth(memberLine, maxTextWidth), cx, y + 31.6, { align: 'center' });
            doc.text(clipToWidth(qualityLine, maxTextWidth), cx, y + 33.6, { align: 'center' });
          } else {
            doc.text(clipToWidth(qualityLine, maxTextWidth), cx, y + 32.6, { align: 'center' });
          }
        } else {
          const childName = childLabelData.name || beekeeperName;
          const ageText = childLabelData.age ? `${childLabelData.age} år` : '';

          doc.setFont('times', 'italic');
          doc.setFontSize(9.5);
          doc.text('Honning fra min egen hage', cx, y + 16, { align: 'center' });

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.text(ageText ? `Birøkter: ${childName} (${ageText})` : `Birøkter: ${childName}`, cx, y + 22, { align: 'center' });

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.text(`Sommer ${year}`, cx, y + 26, { align: 'center' });

          doc.setFontSize(5.5);
          doc.text('LEK-Honning  •  100 % ekte honning', cx, y + 30, { align: 'center' });
        }
      }
    }

    const filename = type === 'standard' ? 'lek-etiketter-standard.pdf' : 'lek-etiketter-barnas.pdf';
    return { doc, filename };
  };

  const handleLabels = (type: 'standard' | 'child', mode: 'print' | 'save') => {
    const { doc, filename } = buildLabelDoc(type);
    if (mode === 'save') {
      doc.save(filename);
      return;
    }
    printPdf(doc);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="min-w-0">
            <div className="text-xs font-black text-gray-500 uppercase">Verktøy</div>
            <h1 className="text-xl font-black text-gray-900 break-words">🏷️ Etiketter & Utskrift</h1>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
            <Printer className="w-5 h-5 text-honey-600" />
            <div className="font-bold text-gray-900">Etiketter</div>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Last ned og skriv ut profesjonelle etiketter til din honning. Designet passer til standard etikettark (70x37mm,
            24 per ark).
          </p>

          <a
            href="https://www.google.com/search?q=etiketter+70x37mm+a4"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-blue-600 hover:underline mb-6"
          >
            <LinkIcon className="w-3 h-3" />
            Finn etikettpapir (Google Søk)
          </a>

          {loading ? (
            <div className="text-sm text-gray-500">Laster…</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col justify-between">
                <div>
                  <h2 className="font-bold text-gray-800 text-sm mb-1">Standard LEK-Etikett</h2>
                  <p className="text-xs text-gray-500 mb-3">Med ditt navn og medlemsinfo.</p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => handleLabels('standard', 'print')}
                    className="w-full bg-black text-white font-bold py-2 rounded-lg text-sm hover:bg-gray-800 transition-colors"
                  >
                    Skriv ut
                  </button>
                  <button
                    onClick={() => handleLabels('standard', 'save')}
                    className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors"
                  >
                    Lagre PDF
                  </button>
                </div>
              </div>

              <div className="bg-honey-50 p-4 rounded-lg border border-honey-100 flex flex-col justify-between">
                <div>
                  <h2 className="font-bold text-honey-800 text-sm mb-1">Barnas Etikett</h2>
                  <p className="text-xs text-honey-600 mb-3">&quot;Honning fra min egen hage&quot;</p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => {
                      setChildPendingAction('print');
                      setShowChildModal(true);
                    }}
                    className="w-full bg-honey-500 text-white font-bold py-2 rounded-lg text-sm hover:bg-honey-600 transition-colors"
                  >
                    Skriv ut
                  </button>
                  <button
                    onClick={() => {
                      setChildPendingAction('save');
                      setShowChildModal(true);
                    }}
                    className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors"
                  >
                    Lagre PDF
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {showChildModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Barnas etikett</h3>
              <button onClick={() => setShowChildModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Navn</label>
                <input
                  value={childLabelData.name}
                  onChange={(e) => setChildLabelData((p) => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="F.eks. Emma"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Alder (valgfritt)</label>
                <input
                  value={childLabelData.age}
                  onChange={(e) => setChildLabelData((p) => ({ ...p, age: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="F.eks. 8"
                  inputMode="numeric"
                />
              </div>

              <div className="grid grid-cols-1 gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowChildModal(false);
                    handleLabels('child', childPendingAction);
                  }}
                  className="w-full bg-honey-500 text-white font-bold py-3 rounded-xl hover:bg-honey-600 transition-colors"
                >
                  {childPendingAction === 'print' ? 'Skriv ut' : 'Lagre PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
