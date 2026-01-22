'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Survey, Question, Option } from '@/lib/survey/types';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';

interface DynamicSurveyProps {
  survey: Survey;
}

export function DynamicSurvey({ survey }: DynamicSurveyProps) {
  const router = useRouter();
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sections = survey.sections.sort((a, b) => a.order - b.order);
  const currentSection = sections[currentSectionIndex];
  const isLastSection = currentSectionIndex === sections.length - 1;

  const updateAnswer = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const isQuestionVisible = (question: Question): boolean => {
    if (!question.visible_if || question.visible_if.length === 0) {
      return true;
    }
    // All conditions must be met (AND logic implied by array, or OR? Usually AND)
    // The requirement is "visible_if: [{...}]". Let's assume AND.
    return question.visible_if.every((condition) => {
      const answer = answers[condition.question_id];
      return answer === condition.equals;
    });
  };

  const validateSection = (): boolean => {
    const visibleQuestions = currentSection.questions.filter(isQuestionVisible);
    for (const q of visibleQuestions) {
      if (q.required) {
        const val = answers[q.id];
        if (val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
          setError(`Vennligst svar på spørsmålet: "${q.text}"`);
          return false;
        }
      }
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (validateSection()) {
      setCurrentSectionIndex((prev) => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    setCurrentSectionIndex((prev) => prev - 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    if (!validateSection()) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/survey/submit-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          surveyId: survey.id,
          surveyVersion: survey.version,
          answers,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Innsending feilet');
      }

      router.push('/survey/thanks');
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const renderQuestionInput = (question: Question) => {
    switch (question.type) {
      case 'SINGLE_CHOICE':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {question.options?.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateAnswer(question.id, opt.value)}
                className={`px-4 py-3 rounded-xl text-left text-sm font-medium border transition-all ${
                  answers[question.id] === opt.value
                    ? 'border-honey-500 bg-honey-50 text-honey-700 shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{opt.label}</span>
                  {answers[question.id] === opt.value && (
                    <Check className="w-4 h-4 text-honey-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
        );

      case 'MULTI_CHOICE':
        const currentSelected = (answers[question.id] as string[]) || [];
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {question.options?.map((opt) => {
              const isSelected = currentSelected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    const newSelected = isSelected
                      ? currentSelected.filter((v) => v !== opt.value)
                      : [...currentSelected, opt.value];
                    updateAnswer(question.id, newSelected);
                  }}
                  className={`px-4 py-3 rounded-xl text-left text-sm font-medium border transition-all ${
                    isSelected
                      ? 'border-honey-500 bg-honey-50 text-honey-700 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-honey-600" />}
                  </div>
                </button>
              );
            })}
          </div>
        );

      case 'DROPDOWN':
        return (
          <select
            value={answers[question.id] || ''}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
            className="w-full p-3 bg-white border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-honey-500 focus:border-transparent"
          >
            <option value="">Velg et alternativ...</option>
            {question.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'SCALE_1_5':
        return (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center gap-2 max-w-sm">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => updateAnswer(question.id, num)}
                  className={`w-12 h-12 rounded-full font-bold text-lg transition-all ${
                    answers[question.id] === num
                      ? 'bg-honey-500 text-white shadow-md scale-110'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-honey-300 hover:bg-honey-50'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-400 px-2 max-w-sm">
              <span>Lite viktig</span>
              <span>Svært viktig</span>
            </div>
          </div>
        );

      case 'TEXT':
      case 'EMAIL':
        return (
          <input
            type={question.type === 'EMAIL' ? 'email' : 'text'}
            value={answers[question.id] || ''}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
            className="w-full p-3 bg-white border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-honey-500 focus:border-transparent"
            placeholder={question.type === 'EMAIL' ? 'din@epost.no' : ''}
          />
        );

      default:
        return <p className="text-red-500">Ukjent spørsmålstype: {question.type}</p>;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs font-medium text-gray-500 mb-2">
          <span>Del {currentSectionIndex + 1} av {sections.length}</span>
          <span>{Math.round(((currentSectionIndex + 1) / sections.length) * 100)}% ferdig</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-honey-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentSectionIndex + 1) / sections.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Section Title */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentSection.title}</h2>
        {currentSection.description && (
          <p className="text-gray-600">{currentSection.description}</p>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-8">
        {currentSection.questions.filter(isQuestionVisible).map((question) => (
          <div key={question.id} className="animate-fadeIn">
            <label className="block text-base font-semibold text-gray-800 mb-3">
              {question.text}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderQuestionInput(question)}
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700 animate-shake">
          <div className="mt-0.5">⚠️</div>
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-10 flex justify-between gap-4">
        <button
          onClick={handleBack}
          disabled={currentSectionIndex === 0 || submitting}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${
            currentSectionIndex === 0
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
          Forrige
        </button>

        {isLastSection ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-full font-bold shadow-lg hover:bg-green-700 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Sender inn...' : 'Send svar'}
            <Check className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-8 py-3 bg-honey-500 text-white rounded-full font-bold shadow-lg hover:bg-honey-600 hover:shadow-xl transition-all"
          >
            Neste
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
