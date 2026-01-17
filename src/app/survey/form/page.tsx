'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type PilotAnswer = "ja" | "kanskje" | "nei" | "";

export default function SurveyFormPage() {
  const supabase = createClient();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    county: "",
    numberOfHives: "",
    yearsExperience: "",
    beekeeperType: "",
    experiencedDisease: "" as "" | "ja" | "nei",
    diseaseTypes: "",
    difficultyDetectingDisease: 3,
    lateDetection: "" as "" | "ja" | "nei",
    currentRecordMethod: "",
    timeSpentDocumentation: "",
    valueWarningSystem: 3,
    valueNearbyAlert: 3,
    valueReporting: 3,
    valueAiAnalysis: 3,
    wouldUseSystem: "",
    willingnessToPay: "",
    biggestChallenge: "",
    featureWishes: "",
    pilotAnswer: "" as PilotAnswer,
    pilotEmail: "",
    pilotHivesForTesting: "",
  });

  const updateField = (field: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    setStep((s) => Math.min(7, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prevStep = () => {
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const experiencedDiseaseBool =
        form.experiencedDisease === "" ? null : form.experiencedDisease === "ja";
      const lateDetectionBool =
        form.lateDetection === "" ? null : form.lateDetection === "ja";

      const { error: insertError } = await supabase
        .from("survey_responses")
        .insert({
          county: form.county || null,
          number_of_hives: form.numberOfHives || null,
          years_experience: form.yearsExperience || null,
          beekeeper_type: form.beekeeperType || null,
          experienced_disease: experiencedDiseaseBool,
          disease_types: form.diseaseTypes || null,
          difficulty_detecting_disease: form.difficultyDetectingDisease,
          late_detection: lateDetectionBool,
          current_record_method: form.currentRecordMethod || null,
          time_spent_documentation: form.timeSpentDocumentation || null,
          value_warning_system: form.valueWarningSystem,
          value_nearby_alert: form.valueNearbyAlert,
          value_reporting: form.valueReporting,
          value_ai_analysis: form.valueAiAnalysis,
          willingness_to_pay: form.willingnessToPay || null,
          biggest_challenge: form.biggestChallenge || null,
          feature_wishes: form.featureWishes || null,
        });

      if (insertError) {
        throw insertError;
      }

      if (
        (form.pilotAnswer === "ja" || form.pilotAnswer === "kanskje") &&
        form.pilotEmail
      ) {
        const { error: pilotError } = await supabase
          .from("survey_pilot_interest")
          .insert({
            email: form.pilotEmail,
            interested: true,
            number_of_hives_for_testing:
              form.pilotHivesForTesting || form.numberOfHives || null,
          });

        if (pilotError) {
          // Ikke stopp hele skjemaet, men logg feilen og gå videre
          console.error("Feil ved lagring av pilot-interesse", pilotError);
        }
      }

      router.push("/survey/thanks");
    } catch (err: any) {
      console.error("Feil ved innsending av undersøkelse", err);
      setError(
        "Noe gikk galt ved innsending av skjemaet. Vennligst prøv igjen om litt."
      );
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Seksjon 1 – Om deg som birøkter
              </h2>
              <p className="text-sm text-gray-600">
                Noen enkle spørsmål for å forstå bakgrunnen din.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hvor mange kuber har du?
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-honey-500"
                  value={form.numberOfHives}
                  onChange={(e) => updateField("numberOfHives", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hvor lenge har du drevet med birøkt?
                </label>
                <input
                  type="text"
                  placeholder="For eksempel: 2 år, 5–10 år, siden 1998"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-honey-500"
                  value={form.yearsExperience}
                  onChange={(e) =>
                    updateField("yearsExperience", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Driver du som hobby eller næring?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {["Hobby", "Næring", "Både hobby og næring"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateField("beekeeperType", option)}
                      className={`px-3 py-2 rounded-lg border text-sm ${
                        form.beekeeperType === option
                          ? "border-honey-500 bg-honey-50 text-honey-700 font-semibold"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hvilket fylke driver du i?
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-honey-500"
                  value={form.county}
                  onChange={(e) => updateField("county", e.target.value)}
                >
                  <option value="">Velg fylke</option>
                  <option value="Agder">Agder</option>
                  <option value="Akershus">Akershus</option>
                  <option value="Buskerud">Buskerud</option>
                  <option value="Finnmark">Finnmark</option>
                  <option value="Innlandet">Innlandet</option>
                  <option value="Møre og Romsdal">Møre og Romsdal</option>
                  <option value="Nordland">Nordland</option>
                  <option value="Rogaland">Rogaland</option>
                  <option value="Telemark">Telemark</option>
                  <option value="Troms">Troms</option>
                  <option value="Trøndelag">Trøndelag</option>
                  <option value="Vestfold">Vestfold</option>
                  <option value="Vestland">Vestland</option>
                  <option value="Østfold">Østfold</option>
                </select>
              </div>
            </div>
          </section>
        );

      case 2:
        return (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Seksjon 2 – Erfaring med sykdom
              </h2>
              <p className="text-sm text-gray-600">
                Her spør vi om erfaringer med sykdom de siste årene.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Har du opplevd sykdom siste 3 år?
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateField("experiencedDisease", "ja")}
                    className={`px-3 py-2 rounded-lg border text-sm flex-1 ${
                      form.experiencedDisease === "ja"
                        ? "border-honey-500 bg-honey-50 text-honey-700 font-semibold"
                        : "border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    Ja
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField("experiencedDisease", "nei")}
                    className={`px-3 py-2 rounded-lg border text-sm flex-1 ${
                      form.experiencedDisease === "nei"
                        ? "border-honey-500 bg-honey-50 text-honey-700 font-semibold"
                        : "border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    Nei
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hvilke typer sykdom?
                </label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-honey-500"
                  placeholder="For eksempel: amerikansk yngelråte, varroa, nosema ..."
                  value={form.diseaseTypes}
                  onChange={(e) =>
                    updateField("diseaseTypes", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hvor vanskelig er tidlig oppdagelse?
                </label>
                <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
                  <span>1 = Svært enkelt</span>
                  <span>5 = Svært vanskelig</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        updateField("difficultyDetectingDisease", value)
                      }
                      className={`flex-1 py-2 rounded-lg border text-sm ${
                        form.difficultyDetectingDisease === value
                          ? "border-honey-500 bg-honey-500 text-white font-semibold"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Har du opplevd å oppdage sykdom for sent?
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateField("lateDetection", "ja")}
                    className={`px-3 py-2 rounded-lg border text-sm flex-1 ${
                      form.lateDetection === "ja"
                        ? "border-red-500 bg-red-50 text-red-700 font-semibold"
                        : "border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    Ja
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField("lateDetection", "nei")}
                    className={`px-3 py-2 rounded-lg border text-sm flex-1 ${
                      form.lateDetection === "nei"
                        ? "border-honey-500 bg-honey-50 text-honey-700 font-semibold"
                        : "border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    Nei
                  </button>
                </div>
              </div>
            </div>
          </section>
        );

      case 3:
        return (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Seksjon 3 – Dagens arbeidsmetoder
              </h2>
              <p className="text-sm text-gray-600">
                Hvordan dokumenterer du i dag, og hvor mye tid bruker du?
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hvordan registrerer du inspeksjoner i dag?
                </label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-honey-500"
                  placeholder="For eksempel: papirskjema, Excel, egen app, LEK-Biens Vokter ..."
                  value={form.currentRecordMethod}
                  onChange={(e) =>
                    updateField("currentRecordMethod", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hvor mye tid bruker du på dokumentasjon?
                </label>
                <input
                  type="text"
                  placeholder="For eksempel: ca. 1 time per uke"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-honey-500"
                  value={form.timeSpentDocumentation}
                  onChange={(e) =>
                    updateField("timeSpentDocumentation", e.target.value)
                  }
                />
              </div>
            </div>
          </section>
        );

      case 4:
        return (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Seksjon 4 – Verdi av digitale verktøy
              </h2>
              <p className="text-sm text-gray-600">
                Gi karakter fra 1–5 hvor 1 = liten verdi og 5 = svært høy verdi.
              </p>
            </div>

            <div className="space-y-5">
              {[
                {
                  label: "Automatisk smittevarsling",
                  field: "valueWarningSystem" as const,
                  value: form.valueWarningSystem,
                },
                {
                  label: "Varsling til nærliggende bigårder",
                  field: "valueNearbyAlert" as const,
                  value: form.valueNearbyAlert,
                },
                {
                  label: "Enkel rapportering til Mattilsynet",
                  field: "valueReporting" as const,
                  value: form.valueReporting,
                },
                {
                  label: "AI-analyse av registreringer",
                  field: "valueAiAnalysis" as const,
                  value: form.valueAiAnalysis,
                },
              ].map((item) => (
                <div key={item.field}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {item.label}
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateField(item.field, value)}
                        className={`flex-1 py-2 rounded-lg border text-sm ${
                          item.value === value
                            ? "border-honey-500 bg-honey-500 text-white font-semibold"
                            : "border-gray-200 bg-white text-gray-700"
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case 5:
        return (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Seksjon 5 – Betalingsvilje
              </h2>
              <p className="text-sm text-gray-600">
                Vi spør for å forstå betalingsviljen for et digitalt smittevernverktøy.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ville du brukt et slikt system?
                </label>
                <textarea
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-honey-500"
                  placeholder="For eksempel: Ja, hvis det er enkelt nok å bruke ..."
                  value={form.wouldUseSystem}
                  onChange={(e) =>
                    updateField("wouldUseSystem", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hva ville vært akseptabel pris per år?
                </label>
                <input
                  type="text"
                  placeholder="For eksempel: 500 kr, 1 000 kr, avhengig av antall kuber ..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-honey-500"
                  value={form.willingnessToPay}
                  onChange={(e) =>
                    updateField("willingnessToPay", e.target.value)
                  }
                />
              </div>
            </div>
          </section>
        );

      case 6:
        return (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Seksjon 6 – Åpne spørsmål
              </h2>
              <p className="text-sm text-gray-600">
                Her kan du utdype utfordringer og ønskede funksjoner.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hva er din største utfordring i dag?
                </label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-honey-500"
                  value={form.biggestChallenge}
                  onChange={(e) =>
                    updateField("biggestChallenge", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hvilke funksjoner ønsker du deg?
                </label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-honey-500"
                  value={form.featureWishes}
                  onChange={(e) =>
                    updateField("featureWishes", e.target.value)
                  }
                />
              </div>
            </div>
          </section>
        );

      case 7:
        return (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Seksjon 7 – Pilotprogram
              </h2>
              <p className="text-sm text-gray-600">
                Her kan du melde interesse for å teste LEK-Biens Vokter™️ 2.0 før lansering.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Ønsker du å få mulighet til å teste LEK-Biens Vokter™️ 2.0 før lansering?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { label: "Ja", value: "ja" as PilotAnswer },
                    { label: "Kanskje", value: "kanskje" as PilotAnswer },
                    { label: "Nei", value: "nei" as PilotAnswer },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("pilotAnswer", option.value)}
                      className={`px-3 py-2 rounded-lg border text-sm ${
                        form.pilotAnswer === option.value
                          ? "border-honey-500 bg-honey-50 text-honey-700 font-semibold"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {(form.pilotAnswer === "ja" || form.pilotAnswer === "kanskje") && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-600">
                    E-post brukes kun for å invitere til pilotprogram og lagres separat.
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      E-postadresse
                    </label>
                    <input
                      type="email"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-honey-500"
                      value={form.pilotEmail}
                      onChange={(e) =>
                        updateField("pilotEmail", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hvor mange kuber kunne du tenke deg å bruke i testingen?
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-honey-500"
                      value={form.pilotHivesForTesting}
                      onChange={(e) =>
                        updateField("pilotHivesForTesting", e.target.value)
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-3xl mx-auto px-4 pt-20">
        <header className="mb-8">
          <p className="text-xs font-bold text-honey-600 uppercase mb-2">
            Behovsanalyse
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
            Hjelp oss å forme LEK-Biens Vokter™️ 2.0
          </h1>
          <p className="text-sm text-gray-600">
            Undersøkelsen er anonym. Det tar ca. 5–7 minutter å svare.
          </p>
        </header>

        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>
              Steg {step} av 7
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-honey-500 transition-all"
              style={{ width: `${(step / 7) * 100}%` }}
            />
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-8"
        >
          {renderStep()}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={prevStep}
              disabled={step === 1 || submitting}
              className={`px-4 py-2 rounded-lg text-sm border ${
                step === 1
                  ? "border-gray-200 text-gray-300 cursor-not-allowed"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Tilbake
            </button>

            {step < 7 && (
              <button
                type="button"
                onClick={nextStep}
                disabled={submitting}
                className="px-6 py-2 rounded-lg text-sm font-semibold bg-honey-500 text-white hover:bg-honey-600 shadow-sm"
              >
                Neste steg
              </button>
            )}

            {step === 7 && (
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 rounded-lg text-sm font-semibold bg-honey-500 text-white hover:bg-honey-600 shadow-sm disabled:opacity-60"
              >
                {submitting ? "Sender inn svar..." : "Send inn svar"}
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}

