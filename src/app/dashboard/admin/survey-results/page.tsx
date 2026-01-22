'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { Activity, ArrowLeft, BarChart2, FileDown, Printer, Flag, Trash2, Undo2, CheckSquare, Square, Users, Bug } from 'lucide-react';
import { jsPDF } from 'jspdf';

type SurveyResponse = {
  id: string;
  created_at: string;
  is_beekeeper: boolean;
  county: string | null;
  pilot_answer: string | null;
  pilot_interest: boolean | null;
  is_test: boolean | null;
  is_invalid: boolean | null;
  submitted_at: string | null;
  ip_address: string | null;

  // Beekeeper specific
  number_of_hives_category: string | null;
  years_experience_category: string | null;
  is_member_norwegian_beekeepers: boolean | null;
  experienced_disease: boolean | null;
  disease_types: string | null;
  current_record_method: string | null;
  time_spent_documentation: string | null;
  value_warning_system: number | null;
  value_nearby_alert: number | null;
  value_reporting: number | null;
  value_better_overview: number | null;
  would_use_system_choice: string | null;
  willingness_to_pay: string | null;
  biggest_challenge: string | null;
  feature_wishes: string | null;

  // Non-beekeeper specific
  eats_honey: string | null;
  rental_interest: string | null;
  rental_price: string | null;
  pollinator_importance: string | null;
  digital_tool_interest: string | null;
  disease_awareness: string | null;
  knowledge_about_beekeeping: string | null;
  considered_starting_beekeeping: string | null;
};

type FilterType = 'all' | 'valid' | 'test' | 'invalid';
type TabType = 'beekeeper' | 'non_beekeeper';

export default function SurveyResultsAdminPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [pilotCount, setPilotCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeResponse, setActiveResponse] = useState<SurveyResponse | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [challengeFilter, setChallengeFilter] = useState<'all' | 'disease'>('all');
  const [activeTab, setActiveTab] = useState<TabType>('beekeeper');

  useEffect(() => {
    checkUser();
    fetchResults();
  }, []);

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileData?.role !== 'admin' && user.email !== 'richard141271@gmail.com') {
      await supabase.auth.signOut();
      router.push('/admin');
      return;
    }

    setProfile(profileData);
  };

  const fetchResults = async () => {
    try {
      const res = await fetch('/api/admin/survey-results');
      if (!res.ok) {
        console.error('Feil ved henting av survey-resultater:', await res.text());
        setError('Kunne ikke hente resultater fra behovsanalysen.');
        setLoading(false);
        return;
      }

      const data = await res.json();
      setResponses(data.responses || []);
      setPilotCount(data.pilotCount || 0);
      setLoading(false);
    } catch (e) {
      console.error('Error fetching survey results:', e);
      setError('Uventet feil ved henting av resultater.');
      setLoading(false);
    }
  };

  // --- 1. Filtered Data Management ---
  // Base filtered data (by tab and validity) - Source of truth for both Table and Stats
  const validResponses = useMemo(() => {
    let base = responses;

    // Filter by tab
    if (activeTab === 'beekeeper') {
      base = base.filter(r => r.is_beekeeper === true);
    } else {
      base = base.filter(r => r.is_beekeeper === false);
    }

    // Always filter out tests and invalid for the default view/stats
    // unless the user specifically asks for them in the list (handled below)
    return base.filter(r => r.is_test !== true && r.is_invalid !== true);
  }, [responses, activeTab]);

  // Display data (allows showing tests/invalid if selected)
  const displayResponses = useMemo(() => {
    let base = responses;

    // Filter by tab
    if (activeTab === 'beekeeper') {
      base = base.filter(r => r.is_beekeeper === true);
    } else {
      base = base.filter(r => r.is_beekeeper === false);
    }

    // Filter by status dropdown
    if (filter === 'test') {
      return base.filter((r) => r.is_test === true);
    }
    if (filter === 'invalid') {
      return base.filter((r) => r.is_invalid === true);
    }
    if (filter === 'valid') {
      return base.filter((r) => r.is_test !== true && r.is_invalid !== true);
    }
    return base; // 'all' - shows everything
  }, [responses, filter, activeTab]);

  const visibleResponses = useMemo(
    () => displayResponses.slice(0, 200),
    [displayResponses]
  );

  // --- 2. Stats Calculation (Based on VALID responses only) ---
  const stats = useMemo(() => {
    // We calculate stats based on validResponses to ensure consistency
    // If activeTab is beekeeper, validResponses contains only valid beekeepers.
    
    const total = validResponses.length;
    let pilotCount = 0;

    // Common/Beekeeper stats
    let experiencedDisease = 0;
    let memberCount = 0;
    let sumWarning = 0; let countWarning = 0;
    let sumNearby = 0; let countNearby = 0;
    let sumReporting = 0; let countReporting = 0;
    let sumOverview = 0; let countOverview = 0;
    let wouldUse = { yes: 0, yesIfEasy: 0, unsure: 0, no: 0 };

    // Non-beekeeper stats
    const eatsHoney = { yes: 0, no: 0, unsure: 0 };
    const rentalInterest = { yes: 0, no: 0, unsure: 0, maybe: 0 };
    const pollinatorImportance = { yes: 0, no: 0, unsure: 0 };
    const digitalToolInterest = { yes: 0, yesIfEasy: 0, unsure: 0, no: 0 };

    validResponses.forEach((r) => {
      // Pilot Interest Calculation
      if (activeTab === 'beekeeper') {
        // For beekeepers, explicit pilot interest field
        if (r.pilot_interest === true) pilotCount++;
      } else {
        // For non-beekeepers, "Rental Interest" of 'ja' counts as pilot interest
        // OR if there is an explicit pilot_interest set
        // Case insensitive check
        const rInterest = (r.rental_interest || '').toLowerCase();
        if (rInterest === 'ja' || r.pilot_interest === true) pilotCount++;
      }

      if (activeTab === 'beekeeper') {
        // Beekeeper Stats
        if (r.experienced_disease === true) experiencedDisease++;
        if (r.is_member_norwegian_beekeepers === true) memberCount++;

        if (r.value_warning_system) { sumWarning += r.value_warning_system; countWarning++; }
        if (r.value_nearby_alert) { sumNearby += r.value_nearby_alert; countNearby++; }
        if (r.value_reporting) { sumReporting += r.value_reporting; countReporting++; }
        if (r.value_better_overview) { sumOverview += r.value_better_overview; countOverview++; }

        const usage = (r.would_use_system_choice || '').toLowerCase();
        if (usage === 'ja') wouldUse.yes++;
        else if (usage.includes('kanskje')) wouldUse.yesIfEasy++;
        else if (usage === 'nei') wouldUse.no++;
        else if (usage === 'vet ikke') wouldUse.unsure++;

      } else {
        // Non-beekeeper
        const eats = (r.eats_honey || '').toLowerCase();
        if (eats === 'ja') eatsHoney.yes++;
        else if (eats === 'nei') eatsHoney.no++;
        else if (eats.includes('vet')) eatsHoney.unsure++;

        const rent = (r.rental_interest || '').toLowerCase();
        if (rent === 'ja') rentalInterest.yes++;
        else if (rent === 'nei') rentalInterest.no++;
        else if (rent.includes('vet')) rentalInterest.unsure++;
        else if (rent === 'kanskje') rentalInterest.maybe++;

        const pol = (r.pollinator_importance || '').toLowerCase();
        if (pol === 'ja') pollinatorImportance.yes++;
        else if (pol === 'nei') pollinatorImportance.no++;
        else if (pol.includes('vet')) pollinatorImportance.unsure++;

        const dig = (r.digital_tool_interest || '').toLowerCase();
        if (dig === 'ja') digitalToolInterest.yes++;
        else if (dig === 'nei') digitalToolInterest.no++;
        else if (dig.includes('enkelt')) digitalToolInterest.yesIfEasy++;
        else if (dig === 'usikker' || dig.includes('vet')) digitalToolInterest.unsure++;
      }
    });

    const avg = (sum: number, count: number) => count ? Math.round((sum / count) * 10) / 10 : 0;

    return {
      total,
      pilotCount,
      // Beekeeper
      experiencedDisease,
      memberCount,
      avgWarning: avg(sumWarning, countWarning),
      avgNearby: avg(sumNearby, countNearby),
      avgReporting: avg(sumReporting, countReporting),
      avgOverview: avg(sumOverview, countOverview),
      wouldUse,
      // Non-beekeeper
      eatsHoney,
      rentalInterest,
      pollinatorImportance,
      digitalToolInterest
    };
  }, [validResponses, activeTab]);

  const challengeQuotes = useMemo(() => {
    const source = validResponses; // Use validResponses directly
    const texts = source
      .map((r) => r.biggest_challenge)
      .filter((v): v is string => !!v && !!v.trim());

    const filtered =
      challengeFilter === 'disease'
        ? texts.filter((t) => {
            const lower = t.toLowerCase();
            return lower.includes('smitte') || lower.includes('sykdom');
          })
        : texts;

    const unique: string[] = [];
    filtered.forEach((t) => {
      const normalized = t.trim();
      if (!unique.some((u) => u === normalized)) {
        unique.push(normalized);
      }
    });

    return unique.slice(0, 10);
  }, [validResponses, challengeFilter]);

  const exportCsv = () => {
    if (!responses.length) return;

    const headers = [
      'id', 'created_at', 'is_beekeeper', 'county', 'pilot_answer', 'pilot_interest',
      'is_test', 'is_invalid', 'ip_address',
      // Beekeeper
      'number_of_hives_category', 'years_experience_category', 'is_member_norwegian_beekeepers',
      'experienced_disease', 'disease_types', 'current_record_method', 'time_spent_documentation',
      'value_warning_system', 'value_nearby_alert', 'value_reporting', 'value_better_overview',
      'would_use_system_choice', 'willingness_to_pay', 'biggest_challenge', 'feature_wishes',
      // Non-beekeeper
      'eats_honey', 'rental_interest', 'rental_price', 'pollinator_importance',
      'digital_tool_interest', 'disease_awareness', 'knowledge_about_beekeeping', 'considered_starting_beekeeping'
    ];

    const escapeValue = (value: any) => {
      if (value == null) return '';
      const str = String(value).replace(/"/g, '""');
      if (str.includes(';') || str.includes('\n') || str.includes('"')) {
        return `"${str}"`;
      }
      return str;
    };

    const rows = responses.map((r) =>
      headers
        .map((key) =>
          escapeValue((r as any)[key as keyof SurveyResponse])
        )
        .join(';')
    );

    const csvContent = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'behovsanalyse_svar.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getBase64FromUrl = async (url: string): Promise<string> => {
    try {
      const data = await fetch(url);
      const blob = await data.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          resolve(base64data);
        };
      });
    } catch (e) {
      console.warn("Could not load image", url, e);
      throw e;
    }
  };

  const generatePdfReport = async () => {
    if (!validResponses.length) return;
    
    // Create new document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    
    // Helper to center text
    const centerText = (text: string, y: number, size = 12, bold = false) => {
        doc.setFontSize(size);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.text(text, pageWidth / 2, y, { align: 'center' });
    };

    // --- Page 1: Title ---
    // Logo
    try {
        // Attempt to load the logo
        const logoData = await getBase64FromUrl('/våpen.png');
        doc.addImage(logoData, 'PNG', (pageWidth / 2) - 15, 45, 30, 30);
    } catch (e) {
        // Fallback to Gold circle if logo fails
        doc.setFillColor(218, 165, 32); // Honey gold
        doc.circle(pageWidth / 2, 60, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("LEK", pageWidth / 2, 62, { align: "center" });
        doc.setTextColor(0, 0, 0);
    }

    centerText("Behovsanalyse – LEK-Biens Vokter™", 100, 24, true);
    centerText(
      `Oppsummert rapport basert på spørreundersøkelse blant ${activeTab === 'beekeeper' ? 'birøktere' : 'ikke-birøktere'} i Norge.`,
      115,
      14
    );
    centerText(`Generert: ${new Date().toLocaleDateString('no-NO', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`, 125, 10);

    const introText = activeTab === 'beekeeper' 
        ? "Formålet med denne behovsanalysen er å forstå hvordan birøktere arbeider med forebygging, oppdagelse og håndtering av sykdom i bigården, samt å vurdere nytten av digitale verktøy som kan støtte smittevern, rapportering og oversikt."
        : "Formålet med denne markedsanalysen er å kartlegge interessen for birøkt, leie av bikuber og honningproduksjon blant privatpersoner, samt å vurdere markedspotensialet for nye tjenester.";
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const introLines = doc.splitTextToSize(introText, pageWidth - 2 * margin);
    doc.text(introLines, margin, 150);

    centerText("Resultatene brukes til å prioritere videre utvikling av LEK-Biens Vokter™ og planlegging av et pilotprogram.", 180, 14, true);

    // Footer Page 1
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("LEK-Honning – Internt arbeidsdokument", margin, pageHeight - 10);
    doc.text("Side 1 av 4 – Forside", pageWidth - margin - 30, pageHeight - 10);
    doc.setTextColor(0);


    // --- Page 2: Dashboard / Summary ---
    doc.addPage();
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("Nøkkeltall", margin, 30);

    // Stats Cards
    const cardWidth = (pageWidth - (margin * 2) - 15) / 4;
    const cardHeight = 30;
    let cardX = margin;

    // Helper to draw card
    const drawCard = (title: string, value: string, subtext: string, x: number) => {
        doc.setFillColor(249, 250, 251); // gray-50
        doc.setDrawColor(229, 231, 235); // gray-200
        doc.roundedRect(x, 40, cardWidth, cardHeight, 3, 3, 'FD');
        
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128); // gray-500
        doc.text(title, x + 5, 48);
        
        doc.setFontSize(14);
        doc.setTextColor(17, 24, 39); // gray-900
        doc.setFont('helvetica', 'bold');
        doc.text(value, x + 5, 58);
        
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(156, 163, 175); // gray-400
        doc.text(subtext, x + 5, 66);
    };

    if (activeTab === 'beekeeper') {
        drawCard("Antall svar", stats.total.toString(), "Totalt antall svar", cardX);
        cardX += cardWidth + 5;
        
        drawCard("Sykdomserfaring", `${Math.round((stats.experiencedDisease / stats.total || 0) * 100)}%`, "Andel med erfaring", cardX);
        cardX += cardWidth + 5;
        
        drawCard("Medlem i NBL", `${Math.round((stats.memberCount / stats.total || 0) * 100)}%`, "Organisasjonsgrad", cardX);
        cardX += cardWidth + 5;

        const pilotPercent = Math.round((stats.pilotCount / stats.total || 0) * 100);
        drawCard("Pilotinteresse", stats.pilotCount.toString(), `${pilotPercent}% av svarene`, cardX);

    } else {
        drawCard("Antall svar", stats.total.toString(), "Totalt antall svar", cardX);
        cardX += cardWidth + 5;
        
        const rentalYes = stats.rentalInterest.yes + stats.rentalInterest.maybe;
        drawCard("Leieinteresse", `${Math.round((rentalYes / stats.total || 0) * 100)}%`, "Ja eller Kanskje", cardX);
        cardX += cardWidth + 5;
        
        const eatsHoneyYes = stats.eatsHoney.yes;
        drawCard("Spiser honning", `${Math.round((eatsHoneyYes / stats.total || 0) * 100)}%`, "Markedsgrunnlag", cardX);
        cardX += cardWidth + 5;

        const pilotPercent = Math.round((stats.pilotCount / stats.total || 0) * 100);
        drawCard("Pilotinteresse", stats.pilotCount.toString(), `${pilotPercent}% av svarene`, cardX);
    }

    // Summary Text
    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("Sammendrag av hovedfunn", margin, 90);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let summaryY = 100;
    
    const summaryPoints = activeTab === 'beekeeper' ? [
        `Totalt ${stats.total} svar fra birøktere.`,
        `${Math.round((stats.experiencedDisease / stats.total || 0) * 100)}% rapporterer å ha erfart sykdom, som understreker behovet for bedre verktøy.`,
        `Gjennomsnittlig opplevd nytteverdi av automatisk varsling er ${stats.avgWarning} av 5.`,
        `Interessen for å bruke systemet er høy: ${stats.wouldUse.yes + stats.wouldUse.yesIfEasy} av ${stats.total} er positive.`,
        `De største utfordringene som nevnes er ofte relatert til tidsklemme, sykdomskontroll og oversikt.`
    ] : [
        `Totalt ${stats.total} svar fra privatpersoner.`,
        `${Math.round(((stats.rentalInterest.yes + stats.rentalInterest.maybe) / stats.total || 0) * 100)}% er positive til å leie bikube (Ja eller Kanskje).`,
        `Dette indikerer et betydelig markedspotensial for utleiemodellen.`,
        `${Math.round((stats.eatsHoney.yes / stats.total || 0) * 100)}% oppgir at de spiser honning.`,
        `Pilotprogrammet har generert ${stats.pilotCount} interesserte kandidater.`
    ];

    summaryPoints.forEach(point => {
        doc.text(`• ${point}`, margin + 5, summaryY);
        summaryY += 7;
    });

    // Footer Page 2
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("LEK-Honning – Internt arbeidsdokument", margin, pageHeight - 10);
    doc.text("Side 2 av 4 – Sammendrag", pageWidth - margin - 35, pageHeight - 10);
    doc.setTextColor(0);


    // --- Page 3: Detailed Stats ---
    doc.addPage();
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("Detaljerte resultater", margin, 30);
    
    let detailsY = 45;

    const drawBarChart = (label: string, data: { label: string, value: number, total: number }[]) => {
        if (detailsY > 250) {
            doc.addPage();
            detailsY = 30;
        }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(label, margin, detailsY);
        detailsY += 8;

        data.forEach(item => {
            const percent = item.total ? (item.value / item.total) : 0;
            const barWidth = (pageWidth - margin * 2 - 60) * percent; // Max width minus label space
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(item.label, margin, detailsY + 4);
            
            // Bar background
            doc.setFillColor(243, 244, 246);
            doc.rect(margin + 40, detailsY, pageWidth - margin * 2 - 60, 6, 'F');
            
            // Bar value
            if (barWidth > 0) {
                doc.setFillColor(218, 165, 32); // Honey
                doc.rect(margin + 40, detailsY, barWidth, 6, 'F');
            }
            
            doc.text(`${item.value} (${Math.round(percent * 100)}%)`, margin + 45 + (pageWidth - margin * 2 - 60), detailsY + 4);
            
            detailsY += 10;
        });
        detailsY += 10;
    };

    if (activeTab === 'beekeeper') {
        drawBarChart("Ville du brukt systemet?", [
             { label: "Ja", value: stats.wouldUse.yes, total: stats.total },
             { label: "Ja, hvis enkelt", value: stats.wouldUse.yesIfEasy, total: stats.total },
             { label: "Vet ikke", value: stats.wouldUse.unsure, total: stats.total },
             { label: "Nei", value: stats.wouldUse.no, total: stats.total },
        ]);
        
    } else {
        drawBarChart("Interesse for å leie bikube", [
            { label: "Ja", value: stats.rentalInterest.yes, total: stats.total },
            { label: "Kanskje", value: stats.rentalInterest.maybe, total: stats.total },
            { label: "Nei", value: stats.rentalInterest.no, total: stats.total },
            { label: "Vet ikke", value: stats.rentalInterest.unsure, total: stats.total },
        ]);

        drawBarChart("Viktighet av pollinatorer", [
            { label: "Ja, viktig", value: stats.pollinatorImportance.yes, total: stats.total },
            { label: "Nei", value: stats.pollinatorImportance.no, total: stats.total },
            { label: "Vet ikke", value: stats.pollinatorImportance.unsure, total: stats.total },
        ]);

        drawBarChart("Interesse for digitalt verktøy", [
            { label: "Ja", value: stats.digitalToolInterest.yes, total: stats.total },
            { label: "Ja, hvis enkelt", value: stats.digitalToolInterest.yesIfEasy, total: stats.total },
            { label: "Nei", value: stats.digitalToolInterest.no, total: stats.total },
            { label: "Usikker", value: stats.digitalToolInterest.unsure, total: stats.total },
        ]);
    }

    // Footer Page 3
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("LEK-Honning – Internt arbeidsdokument", margin, pageHeight - 10);
    doc.text("Side 3 av 4 – Detaljer", pageWidth - margin - 30, pageHeight - 10);
    doc.setTextColor(0);

    // --- Page 4: Qualitative Feedback ---
    doc.addPage();
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(activeTab === 'beekeeper' ? "Utfordringer og ønsker" : "Kunnskap og interesse", margin, 30);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let qualY = 45;

    if (activeTab === 'beekeeper') {
        doc.text("Hva er din største utfordring?", margin, qualY);
        qualY += 10;
        
        challengeQuotes.slice(0, 15).forEach(quote => {
             if (qualY > 270) {
                 doc.addPage();
                 qualY = 30;
             }
             const splitQuote = doc.splitTextToSize(`- "${quote}"`, pageWidth - margin * 2);
             doc.text(splitQuote, margin, qualY);
             qualY += (splitQuote.length * 5) + 3;
        });
    } else {
        doc.text("Kvalitative tilbakemeldinger:", margin, qualY);
        qualY += 10;
        
        const comments = validResponses
            .filter(r => !r.is_beekeeper && r.knowledge_about_beekeeping)
            .map(r => r.knowledge_about_beekeeping as string)
            .filter(t => t.length > 5);

        if (comments.length === 0) {
            doc.text("Ingen spesifikke fritekstsvar tilgjengelig for denne visningen.", margin, qualY);
        } else {
             comments.slice(0, 15).forEach(comment => {
                 if (qualY > 270) {
                     doc.addPage();
                     qualY = 30;
                 }
                 const splitQuote = doc.splitTextToSize(`- "${comment}"`, pageWidth - margin * 2);
                 doc.text(splitQuote, margin, qualY);
                 qualY += (splitQuote.length * 5) + 3;
            });
        }
    }

    // Footer Page 4
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("LEK-Honning – Internt arbeidsdokument", margin, pageHeight - 10);
    doc.text("Side 4 av 4 – Fritekst", pageWidth - margin - 30, pageHeight - 10);
    doc.setTextColor(0);

    // Save
    doc.save(`behovsanalyse-rapport-${activeTab}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const performActionOnId = async (
    id: string,
    action: 'mark_test' | 'mark_invalid' | 'restore' | 'delete'
  ) => {
    if (action === 'delete') {
      const res = await fetch(`/api/admin/survey-responses/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        console.error('Feil ved sletting av svar:', await res.text());
        setError('Kunne ikke slette ett eller flere svar.');
        return;
      }
      setResponses((prev) => prev.filter((r) => r.id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      return;
    }

    const res = await fetch(`/api/admin/survey-responses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      console.error('Feil ved oppdatering av svar:', await res.text());
      setError('Kunne ikke oppdatere ett eller flere svar.');
      return;
    }

    const patch = 
      action === 'mark_test' ? { is_test: true, is_invalid: false } :
      action === 'mark_invalid' ? { is_invalid: true } :
      { is_test: false, is_invalid: false };
    
    setResponses((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
        Laster resultater fra behovsanalysen...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-[#111827] text-white py-6 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/admin" className="inline-flex items-center gap-2 text-gray-300 hover:text-white text-sm">
              <ArrowLeft className="w-4 h-4" />
              Tilbake til admin
            </Link>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-white">{profile?.full_name || 'Administrator'}</div>
            <div className="text-xs text-purple-300">Behovsanalyse</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Resultater – Behovsanalyse</h1>
            <p className="text-sm text-gray-600">Oversikt over svar fra både birøktere og ikke-birøktere.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportCsv} disabled={!responses.length} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm disabled:opacity-60">
              <FileDown className="w-4 h-4" />
              Eksporter til CSV
            </button>
            <button onClick={generatePdfReport} disabled={!responses.length} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm disabled:opacity-60">
              <Printer className="w-4 h-4" />
              Last ned PDF
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-8">
          <button
            onClick={() => setActiveTab('beekeeper')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'beekeeper'
                ? 'border-honey-500 text-honey-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Bug className="w-4 h-4" />
            Birøktere ({responses.filter(r => r.is_beekeeper).length})
          </button>
          <button
            onClick={() => setActiveTab('non_beekeeper')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'non_beekeeper'
                ? 'border-honey-500 text-honey-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4" />
            Ikke-birøktere ({responses.filter(r => !r.is_beekeeper).length})
          </button>
        </div>

        {activeTab === 'beekeeper' ? (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Antall svar</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Sykdomserfaring</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.total ? Math.round((stats.experiencedDisease / stats.total) * 100) : 0}%
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Medlem i NBL</p>
                <p className="text-2xl font-bold text-honey-600">
                  {stats.total ? Math.round((stats.memberCount / stats.total) * 100) : 0}%
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Pilotinteresse</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.total ? Math.round((stats.pilotCount / stats.total) * 100) : 0}%
                </p>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
              <div className="bg-white p-5 rounded-xl border border-gray-200">
                <h2 className="text-sm font-bold text-gray-900 mb-4">
                  Hvis det fantes et digitalt verktøy som gjorde birøktere i stand til å oppdage smitte tidlig – synes du de burde bruke dette?
                </h2>
                <div className="space-y-3">
                  {[
                    { label: 'Ja', value: stats.wouldUse.yes, color: 'bg-honey-500' },
                    { label: 'Ja, hvis det er enkelt å bruke', value: stats.wouldUse.yesIfEasy, color: 'bg-green-500' },
                    { label: 'Usikker', value: stats.wouldUse.unsure, color: 'bg-yellow-500' },
                    { label: 'Nei', value: stats.wouldUse.no, color: 'bg-red-500' },
                  ].map((item) => {
                    const percentage = stats.total ? Math.round((item.value / stats.total) * 100) : 0;
                    return (
                      <div key={item.label} className="relative">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">{item.label}</span>
                          <span className="text-gray-500">{item.value} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${item.color}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-200">
                <h2 className="text-sm font-bold text-gray-900 mb-4">Verdivurdering (Snitt 1-5)</h2>
                <div className="space-y-4">
                  {[
                    { label: 'Automatisk smittevarsling', value: stats.avgWarning },
                    { label: 'Varsel til nærliggende', value: stats.avgNearby },
                    { label: 'Enkel rapportering', value: stats.avgReporting },
                    { label: 'Bedre oversikt', value: stats.avgOverview },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between mb-1 text-sm">
                        <span>{item.label}</span>
                        <span className="font-bold">{item.value}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${(item.value / 5) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

             <section className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-10">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-900">Utvalgte utfordringer (Fritekst)</h3>
                <div className="flex gap-2">
                  <button onClick={() => setChallengeFilter('all')} className={`px-3 py-1 text-xs rounded-full ${challengeFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-white border text-gray-600'}`}>Alle</button>
                  <button onClick={() => setChallengeFilter('disease')} className={`px-3 py-1 text-xs rounded-full ${challengeFilter === 'disease' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white border text-gray-600'}`}>Sykdom/Smitte</button>
                </div>
              </div>
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {challengeQuotes.length > 0 ? (
                  challengeQuotes.map((quote, i) => (
                    <div key={i} className="p-4 text-sm text-gray-600 italic">"{quote}"</div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-400 text-sm">Ingen sitater funnet med valgt filter.</div>
                )}
              </div>
            </section>
          </>
        ) : (
          <>
            {/* Non-Beekeeper Stats */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Antall svar</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Interesse for leie</p>
                <p className="text-2xl font-bold text-honey-600">
                  {stats.total ? Math.round((stats.rentalInterest.yes / stats.total) * 100) : 0}%
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Spiser honning (Ja)</p>
                <p className="text-2xl font-bold text-honey-600">
                  {stats.total ? Math.round((stats.eatsHoney.yes / stats.total) * 100) : 0}%
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Pilotinteresse</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.total ? Math.round((stats.pilotCount / stats.total) * 100) : 0}%
                </p>
              </div>
            </section>

             <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
              <div className="bg-white p-5 rounded-xl border border-gray-200">
                <h2 className="text-sm font-bold text-gray-900 mb-4">Interesse for å leie bikube</h2>
                 <div className="space-y-3">
                  {[
                    { label: 'Ja', value: stats.rentalInterest.yes, color: 'bg-honey-500' },
                    { label: 'Kanskje', value: stats.rentalInterest.maybe, color: 'bg-orange-300' },
                    { label: 'Nei', value: stats.rentalInterest.no, color: 'bg-gray-300' },
                    ...(stats.rentalInterest.unsure > 0 ? [{ label: 'Vet ikke (gammelt)', value: stats.rentalInterest.unsure, color: 'bg-yellow-500' }] : []),
                  ].map((item) => {
                     const total = stats.rentalInterest.yes + stats.rentalInterest.no + stats.rentalInterest.unsure + stats.rentalInterest.maybe;
                     const percent = total ? Math.round((item.value / total) * 100) : 0;
                     return (
                      <div key={item.label}>
                        <div className="flex justify-between mb-1 text-sm">
                          <span>{item.label}</span>
                          <span className="text-gray-500">{item.value} ({percent}%)</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color}`} style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                     );
                  })}
                </div>
              </div>

               <div className="bg-white p-5 rounded-xl border border-gray-200">
                <h2 className="text-sm font-bold text-gray-900 mb-4">Viktighet av pollinatorer</h2>
                 <div className="space-y-3">
                  {[
                    { label: 'Ja', value: stats.pollinatorImportance.yes, color: 'bg-green-500' },
                    { label: 'Nei', value: stats.pollinatorImportance.no, color: 'bg-red-500' },
                    { label: 'Vet ikke', value: stats.pollinatorImportance.unsure, color: 'bg-yellow-500' },
                  ].map((item) => {
                     const total = stats.pollinatorImportance.yes + stats.pollinatorImportance.no + stats.pollinatorImportance.unsure;
                     const percent = total ? Math.round((item.value / total) * 100) : 0;
                     return (
                      <div key={item.label}>
                        <div className="flex justify-between mb-1 text-sm">
                          <span>{item.label}</span>
                          <span className="text-gray-500">{item.value} ({percent}%)</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color}`} style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                     );
                  })}
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-200">
                <h2 className="text-sm font-bold text-gray-900 mb-4">Interesse for digitalt verktøy</h2>
                 <div className="space-y-3">
                  {[
                    { label: 'Ja', value: stats.digitalToolInterest.yes, color: 'bg-honey-500' },
                    { label: 'Ja, hvis enkelt', value: stats.digitalToolInterest.yesIfEasy, color: 'bg-green-500' },
                    { label: 'Usikker', value: stats.digitalToolInterest.unsure, color: 'bg-yellow-500' },
                    { label: 'Nei', value: stats.digitalToolInterest.no, color: 'bg-red-500' },
                  ].map((item) => {
                     const total = stats.digitalToolInterest.yes + stats.digitalToolInterest.yesIfEasy + stats.digitalToolInterest.unsure + stats.digitalToolInterest.no;
                     const percent = total ? Math.round((item.value / total) * 100) : 0;
                     return (
                      <div key={item.label}>
                        <div className="flex justify-between mb-1 text-sm">
                          <span>{item.label}</span>
                          <span className="text-gray-500">{item.value} ({percent}%)</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color}`} style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                     );
                  })}
                </div>
              </div>
             </section>
          </>
        )}

        {/* Detailed List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900">Alle svar ({visibleResponses.length})</h3>
            <div className="flex gap-2">
               <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  filter === 'all' ? 'bg-gray-800 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
                }`}
              >
                Alle
              </button>
              <button
                onClick={() => setFilter('valid')}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  filter === 'valid' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white border text-gray-600 hover:bg-gray-50'
                }`}
              >
                Gyldige
              </button>
              <button
                onClick={() => setFilter('test')}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  filter === 'test' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-white border text-gray-600 hover:bg-gray-50'
                }`}
              >
                Testdata
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Dato</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Fylke</th>
                  {activeTab === 'beekeeper' ? (
                     <>
                        <th className="px-4 py-3">Kuber</th>
                        <th className="px-4 py-3">Sykdom?</th>
                        <th className="px-4 py-3">Pilot?</th>
                     </>
                  ) : (
                     <>
                        <th className="px-4 py-3">Leie?</th>
                        <th className="px-4 py-3">Spiser honning?</th>
                        <th className="px-4 py-3">Pilot?</th>
                     </>
                  )}
                  <th className="px-4 py-3 text-right">Handlinger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleResponses.map((r) => (
                  <tr key={r.id} className={`hover:bg-gray-50 ${r.is_test ? 'bg-yellow-50/50' : ''} ${r.is_invalid ? 'bg-red-50/50' : ''}`}>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {new Date(r.created_at).toLocaleDateString('no-NO')}
                    </td>
                    <td className="px-4 py-3">
                       {r.is_beekeeper ? (
                         <span className="px-2 py-1 bg-honey-100 text-honey-700 rounded-full text-xs">Birøkter</span>
                       ) : (
                         <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">Ikke-birøkter</span>
                       )}
                    </td>
                    <td className="px-4 py-3 text-gray-900">{r.county || '–'}</td>
                    {activeTab === 'beekeeper' ? (
                       <>
                         <td className="px-4 py-3">{r.number_of_hives_category || '–'}</td>
                         <td className="px-4 py-3">
                           {r.experienced_disease ? (
                             <span className="text-red-600 font-medium">Ja</span>
                           ) : (
                             <span className="text-green-600">Nei</span>
                           )}
                         </td>
                       </>
                    ) : (
                       <>
                         <td className="px-4 py-3">{r.rental_interest || '–'}</td>
                         <td className="px-4 py-3">{r.eats_honey || '–'}</td>
                       </>
                    )}
                    <td className="px-4 py-3">
                       {r.pilot_interest ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Interessert</span>
                       ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                       <button onClick={() => performActionOnId(r.id, 'delete')} className="text-gray-400 hover:text-red-600 p-1">
                          <Trash2 className="w-4 h-4" />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
