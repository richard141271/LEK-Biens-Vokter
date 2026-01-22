'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { BeekeeperSurvey } from '@/lib/survey/beekeeper';
import { NonBeekeeperSurvey } from '@/lib/survey/non-beekeeper';
import { Survey, Question } from '@/lib/survey/types';

interface Submission {
  id: string;
  answers: Record<string, any>;
  created_at: string;
}

export default function DynamicSurveyResultsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurveyType, setSelectedSurveyType] = useState<"BEEKEEPER" | "NON_BEEKEEPER">("BEEKEEPER");
  
  const supabase = createClient();
  const survey = selectedSurveyType === "BEEKEEPER" ? BeekeeperSurvey : NonBeekeeperSurvey;

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('survey_submissions')
        .select('*')
        .eq('survey_id', survey.id);
      
      if (data) {
        setSubmissions(data);
      }
      setLoading(false);
    };

    fetchSubmissions();
  }, [survey.id]);

  if (loading && !submissions.length) return <div className="p-8">Laster resultater...</div>;

  const renderQuestionStats = (question: Question) => {
    // Skip text/email fields for stats view
    if (question.type === 'TEXT' || question.type === 'EMAIL') return null;

    const counts: Record<string, number> = {};
    let total = 0;

    submissions.forEach((sub) => {
      const val = sub.answers[question.id];
      if (val === undefined || val === null) return;

      if (Array.isArray(val)) {
        val.forEach((v) => {
          counts[v] = (counts[v] || 0) + 1;
        });
        total++; // Or should we count respondents? Let's count respondents who answered.
      } else {
        counts[val] = (counts[val] || 0) + 1;
        total++;
      }
    });

    return (
      <div key={question.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">{question.text}</h3>
        <div className="space-y-3">
          {question.options?.map((opt) => {
            const count = counts[opt.value] || 0;
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={opt.value}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{opt.label}</span>
                  <span className="text-gray-500">{count} ({percentage}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className="bg-honey-500 h-2.5 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 text-xs text-gray-400">
          Totalt antall svar: {total}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{survey.title}</h1>
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
        <p className="text-gray-500 mb-8">Versjon {survey.version} • {submissions.length} svar</p>

        {survey.sections.map((section) => (
          <div key={section.id} className="mb-10">
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
