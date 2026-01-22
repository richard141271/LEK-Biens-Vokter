'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { BeekeeperSurvey } from '@/lib/survey/beekeeper';
import { NonBeekeeperSurvey } from '@/lib/survey/non-beekeeper';
import { Survey, Question } from '@/lib/survey/types';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Submission {
  id: string;
  answers: Record<string, any>;
  created_at: string;
}

export default function DynamicSurveyResultsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSurveyType, setSelectedSurveyType] = useState<"BEEKEEPER" | "NON_BEEKEEPER">("BEEKEEPER");
  
  const survey = selectedSurveyType === "BEEKEEPER" ? BeekeeperSurvey : NonBeekeeperSurvey;

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/survey-responses', { cache: 'no-store' });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Feil: ${res.status} ${res.statusText}`);
        }
        
        const data = await res.json();
        const allResponses = data.responses || [];
        
        const filteredData = allResponses.filter((row: any) => 
          selectedSurveyType === "BEEKEEPER" ? row.is_beekeeper : !row.is_beekeeper
        );

        const mappedSubmissions = filteredData.map((row: any) => ({
          id: row.id,
          created_at: row.created_at,
          answers: mapResponseToAnswers(row, selectedSurveyType)
        }));
        setSubmissions(mappedSubmissions);
      } catch (error: any) {
        console.error("Error fetching survey responses:", error);
        setError(error.message || "En ukjent feil oppstod");
      }
      setLoading(false);
    };

    fetchSubmissions();
  }, [selectedSurveyType]);

  const mapResponseToAnswers = (row: any, type: "BEEKEEPER" | "NON_BEEKEEPER") => {
    if (type === "BEEKEEPER") {
      return {
        hives_count: row.number_of_hives_category,
        experience_years: row.years_experience_category,
        nbl_member: row.is_member_norwegian_beekeepers ? 'ja' : 'nei',
        county: row.county,
        disease_last_3y: row.experienced_disease === true ? 'ja' : (row.experienced_disease === false ? 'nei' : 'usikker'),
        disease_types: row.disease_types ? row.disease_types.split(',') : [],
        inspection_logging: row.current_record_method,
        weekly_documentation_time: row.time_spent_documentation,
        value_automatic_alert: row.value_warning_system,
        value_nearby_alert: row.value_nearby_alert,
        value_reporting: row.value_reporting,
        value_overview: row.value_better_overview,
        would_use_system: row.would_use_system_choice,
        acceptable_price: row.willingness_to_pay,
        biggest_challenge: row.biggest_challenge,
        desired_features: row.feature_wishes,
        pilot_interest: row.pilot_answer,
      };
    } else {
      return {
        nb_eats_honey: row.eats_honey,
        nb_rental_interest: row.rental_interest,
        nb_rental_price: row.rental_price,
        nb_pollinator_importance: row.pollinator_importance,
        nb_county: row.county,
        nb_digital_tool_interest: row.digital_tool_interest,
        nb_disease_awareness: row.disease_awareness,
        nb_disease_types: row.disease_types ? row.disease_types.split(',') : [],
        nb_knowledge: row.knowledge_about_beekeeping,
        nb_considered_starting: row.considered_starting_beekeeping,
        nb_pilot_interest: row.pilot_answer,
      };
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && !submissions.length) return <div className="p-8">Laster resultater...</div>;

  if (error) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <Link 
            href="/dashboard/admin" 
            className="flex items-center text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tilbake til Admin
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          <h3 className="font-bold">Feil ved henting av data</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const renderQuestionStats = (question: Question) => {
    // Skip text/email fields for stats view, but allow TEXT for open questions if needed (maybe just list them?)
    // For now, let's keep skipping TEXT/EMAIL to keep the report clean, or maybe show count of answers?
    if (question.type === 'TEXT' || question.type === 'EMAIL') return null;

    const counts: Record<string, number> = {};
    let answeredCount = 0;
    const totalRespondents = submissions.length;

    submissions.forEach((sub) => {
      const val = sub.answers[question.id];
      // Skip if null/undefined or empty string (which we map to null in backend but check here too)
      if (val === undefined || val === null || val === '') return;

      // Also check for empty arrays in multi-choice
      if (Array.isArray(val) && val.length === 0) return;

      answeredCount++;

      if (Array.isArray(val)) {
        val.forEach((v) => {
          counts[v] = (counts[v] || 0) + 1;
        });
      } else {
        counts[val] = (counts[val] || 0) + 1;
      }
    });
    
    let optionsToRender = question.options || [];

    // Handle Scale 1-5
    if (question.type === 'SCALE_1_5') {
      optionsToRender = [
        { value: "1", label: "1 - Lite viktig" },
        { value: "2", label: "2" },
        { value: "3", label: "3" },
        { value: "4", label: "4" },
        { value: "5", label: "5 - Svært viktig" }
      ];
    }

    return (
      <div key={question.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6 break-inside-avoid">
        <h3 className="text-lg font-bold text-gray-900 mb-4">{question.text}</h3>
        <div className="space-y-3">
          {optionsToRender.map((opt) => {
            const valKey = String(opt.value);
            let count = counts[valKey] || 0;
            if (count === 0 && !isNaN(Number(valKey))) {
               count = counts[Number(valKey)] || 0;
            }

            // Calculate percentage based on TOTAL respondents, not just those who answered
            const percentage = totalRespondents > 0 ? Math.round((count / totalRespondents) * 100) : 0;
            
            return (
              <div key={opt.value}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{opt.label}</span>
                  <span className="text-gray-500">{count} ({percentage}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 print:border print:border-gray-300">
                  <div
                    className="bg-honey-500 h-2.5 rounded-full print:bg-black print:opacity-50"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 text-xs text-gray-400">
          Besvart: {answeredCount} av {totalRespondents}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 print:p-0 print:bg-white">
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white;
          }
          .break-inside-avoid {
            break-inside: avoid;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto">
        <div className="mb-6 no-print">
          <Link 
            href="/dashboard/admin" 
            className="flex items-center text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tilbake til Admin
          </Link>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{survey.title}</h1>
          <div className="flex gap-4 no-print">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Printer size={18} />
              Skriv ut rapport
            </button>
            <div className="flex bg-white rounded-lg p-1 border border-gray-200">
              <button
                onClick={() => setSelectedSurveyType("BEEKEEPER")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedSurveyType === "BEEKEEPER"
                    ? "bg-honey-100 text-honey-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Birøktere
              </button>
              <button
                onClick={() => setSelectedSurveyType("NON_BEEKEEPER")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedSurveyType === "NON_BEEKEEPER"
                    ? "bg-honey-100 text-honey-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Ikke-birøktere
              </button>
            </div>
          </div>
        </div>
        <p className="text-gray-500 mb-8 print:mb-4">Versjon {survey.version} • {submissions.length} svar • {new Date().toLocaleDateString()}</p>

        {survey.sections.map((section) => (
          <div key={section.id} className="mb-10 break-inside-avoid">
            <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">{section.title}</h2>
            <div className="grid grid-cols-1 gap-6">
              {section.questions.map((q) => renderQuestionStats(q))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
