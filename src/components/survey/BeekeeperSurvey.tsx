'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type PilotAnswer = "ja" | "kanskje" | "nei" | "";

const HIVE_OPTIONS = [
  "1–4 kuber",
  "5–9 kuber",
  "10–24 kuber",
  "25–49 kuber",
  "50 kuber eller flere",
];

const YEARS_OPTIONS = [
  "Mindre enn 1 år",
  "1–3 år",
  "4–10 år",
  "11–20 år",
  "Mer enn 20 år",
];

const COUNTIES = [
  "Agder",
  "Akershus",
  "Buskerud",
  "Finnmark",
  "Innlandet",
  "Møre og Romsdal",
  "Nordland",
  "Rogaland",
  "Telemark",
  "Troms",
  "Trøndelag",
  "Vestfold",
  "Vestland",
  "Østfold",
];

const DISEASE_OPTIONS = [
  "Varroa",
  "Åpen yngelråte",
  "Lukket yngelråte",
  "Nosema",
  "Kalkyngel",
  "Stein-yngel",
  "Trakémidd",
  "Vingedeformitetsvirus",
  "Amerikansk yngelråte",
  "Europeisk yngelråte",
  "Svertesopp",
  "Ukjent sykdom",
  "Ingen sykdom observert",
];

const RECORD_METHOD_OPTIONS = [
  "Notatbok/papir",
  "Excel eller egne lister",
  "Digital app",
  "Egen metode",
  "Ingen systematisk registrering",
  "Annet",
];

const TIME_OPTIONS = [
  "Mindre enn 15 minutter",
  "15–30 minutter",
  "30–60 minutter",
  "1–2 timer",
  "Mer enn 2 timer",
];

const PRICE_OPTIONS = [
  "Inntil 500 kr per år",
  "Inntil 1000 kr per år",
  "Inntil 1500 kr per år",
  "Avhengig av antall kuber",
  "Gratis",
];

export function BeekeeperSurvey() {
  const supabase = createClient();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    county: "",
    numberOfHivesCategory: "",
    yearsExperienceCategory: "",
    isMember: "" as "" | "ja" | "nei",
    experiencedDisease: "" as "" | "ja" | "nei" | "usikker",
    diseaseTypes: [] as string[],
    currentRecordMethod: "",
    timeSpentPerWeek: "",
    valueWarningSystem: 3,
    valueNearbyAlert: 3,
    valueReporting: 3,
    valueBetterOverview: 3,
    wouldUseSystemChoice: "",
    pricePerYear: "",
    biggestChallenge: "",
    featureWishes: "",
    pilotAnswer: "" as PilotAnswer,
    pilotEmail: "",
  });

  const updateField = (field: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleDiseaseType = (value: string) => {
    setForm((prev) => {
      const exists = prev.diseaseTypes.includes(value);
      return {
        ...prev,
        diseaseTypes: exists
          ? prev.diseaseTypes.filter((v) => v !== value)
          : [...prev.diseaseTypes, value],
      };
    });
  };

  const nextStep = () => {
    setStep((s) => Math.min(8, s + 1));
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
      const res = await fetch("/api/survey/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isBeekeeper: true, // Mark as beekeeper
          county: form.county || null,
          numberOfHivesCategory: form.numberOfHivesCategory || null,
          yearsExperienceCategory: form.yearsExperienceCategory || null,
          isMember: form.isMember,
          experiencedDisease: form.experiencedDisease,
          diseaseTypes: form.diseaseTypes,
          currentRecordMethod: form.currentRecordMethod || null,
          timeSpentPerWeek: form.timeSpentPerWeek || null,
          valueWarningSystem: form.valueWarningSystem,
          valueNearbyAlert: form.valueNearbyAlert,
          valueReporting: form.valueReporting,
          valueBetterOverview: form.valueBetterOverview,
          wouldUseSystemChoice: form.wouldUseSystemChoice || null,
          pricePerYear: form.pricePerYear || null,
          biggestChallenge: form.biggestChallenge || null,
          featureWishes: form.featureWishes || null,
          pilotAnswer: form.pilotAnswer,
          pilotEmail: form.pilotEmail || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message =
          data?.error ||
          "Noe gikk galt ved innsending av skjemaet. Vennligst prøv igjen om litt.";
        throw new Error(message);
      }

      router.push("/survey/thanks");
    } catch (err: any) {
      console.error("Feil ved innsending av undersøkelse", err);
      setError(
        err?.message ||
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
                Noen korte spørsmål om birøkten din.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Hvor mange kuber har du?
                </label>
                <select
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-honey-500"
                  value={form.numberOfHivesCategory}
                  onChange={(e) =>
                    updateField("numberOfHivesCategory", e.target.value)
                  }
                >
                  <option value="">Velg antall kuber</option>
                  {HIVE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Hvor lenge har du drevet med birøkt?
                </label>
                <select
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-honey-500"
                  value={form.yearsExperienceCategory}
                  onChange={(e) =>
                    updateField("yearsExperienceCategory", e.target.value)
                  }
                >
                  <option value="">Velg erfaring</option>
                  {YEARS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="block text-sm font-medium text-gray-800 mb-2">
                  Er du medlem av Norges Birøkterlag?
                </p>
                <div className="flex gap-3">
                  {["ja", "nei"].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        updateField("isMember", value as "ja" | "nei")
                      }
                      className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border ${
                        form.isMember === value
                          ? "border-honey-500 bg-honey-50 text-honey-700"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      {value === "ja" ? "Ja" : "Nei"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Hvilket fylke driver du i?
                </label>
                <select
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-honey-500"
                  value={form.county}
                  onChange={(e) => updateField("county", e.target.value)}
                >
                  <option value="">Velg fylke</option>
                  {COUNTIES.map((county) => (
                    <option key={county} value={county}>
                      {county}
                    </option>
                  ))}
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
                Vi spør om erfaringer med sykdom de siste årene.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <p className="block text-sm font-medium text-gray-800 mb-2">
                  Har du opplevd sykdom i kubene de siste 3 årene?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Ja", value: "ja" },
                    { label: "Nei", value: "nei" },
                    { label: "Usikker", value: "usikker" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        updateField(
                          "experiencedDisease",
                          option.value as "ja" | "nei" | "usikker"
                        )
                      }
                      className={`px-4 py-3 rounded-xl text-sm font-medium border ${
                        form.experiencedDisease === option.value
                          ? "border-honey-500 bg-honey-50 text-honey-700"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {(form.experiencedDisease === "ja" ||
                form.experiencedDisease === "usikker") && (
                <div>
                  <p className="block text-sm font-medium text-gray-800 mb-2">
                    Hvilke typer sykdom har du erfart?
                  </p>
                  <p className="text-xs text-gray-500 mb-2">
                    Du kan krysse av for flere.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {DISEASE_OPTIONS.map((option) => {
                      const checked = form.diseaseTypes.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => toggleDiseaseType(option)}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm border ${
                            checked
                              ? "border-honey-500 bg-honey-50 text-honey-700"
                              : "border-gray-200 bg-white text-gray-700"
                          }`}
                        >
                          <span>{option}</span>
                          <span
                            className={`w-4 h-4 rounded-full border ${
                              checked
                                ? "border-honey-500 bg-honey-500"
                                : "border-gray-300"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
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
                Hvordan du registrerer og fører oversikt i dag.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Hvordan registrerer du inspeksjoner i dag?
                </label>
                <select
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-honey-500"
                  value={form.currentRecordMethod}
                  onChange={(e) =>
                    updateField("currentRecordMethod", e.target.value)
                  }
                >
                  <option value="">Velg metode</option>
                  {RECORD_METHOD_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Hvor mye tid bruker du på dokumentasjon per uke?
                </label>
                <select
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-honey-500"
                  value={form.timeSpentPerWeek}
                  onChange={(e) =>
                    updateField("timeSpentPerWeek", e.target.value)
                  }
                >
                  <option value="">Velg tidsbruk</option>
                  {TIME_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        );

      case 4:
        return (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Seksjon 4 – Verdi av et digitalt system
              </h2>
              <p className="text-sm text-gray-600">
                Gi karakter fra 1 til 5 der 1 er liten verdi og 5 er svært høy
                verdi.
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
                  label: "Bedre oversikt over egen bigård",
                  field: "valueBetterOverview" as const,
                  value: form.valueBetterOverview,
                },
              ].map((item) => (
                <div key={item.field}>
                  <label className="block text-sm font-medium text-gray-800 mb-2">
                    {item.label}
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateField(item.field, value)}
                        className={`flex-1 py-3 rounded-xl text-sm font-medium border ${
                          item.value === value
                            ? "border-honey-500 bg-honey-500 text-white"
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
                Seksjon 5 – Hovedspørsmål
              </h2>
              <p className="text-sm text-gray-600">
                Her ønsker vi din ærlige vurdering av et slikt system.
              </p>
            </div>

            <div className="space-y-4">
              <p className="block text-sm font-medium text-gray-800 mb-2">
                Ville du brukt et slikt system?
              </p>
              <div className="grid grid-cols-1 gap-3">
                {[
                  "Ja",
                  "Ja, hvis det er enkelt å bruke",
                  "Vet ikke",
                  "Nei",
                ].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      updateField("wouldUseSystemChoice", option)
                    }
                    className={`w-full px-5 py-4 rounded-2xl text-base font-semibold border text-left ${
                      form.wouldUseSystemChoice === option
                        ? "border-honey-500 bg-honey-50 text-honey-800"
                        : "border-gray-200 bg-white text-gray-800"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </section>
        );

      case 6:
        return (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Seksjon 6 – Pris og betalingsvilje
              </h2>
              <p className="text-sm text-gray-600">
                Dette hjelper oss å forstå hva som er realistisk prisnivå.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Hva ville vært akseptabel pris per år for et slikt system?
                </label>
                <select
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-honey-500"
                  value={form.pricePerYear}
                  onChange={(e) =>
                    updateField("pricePerYear", e.target.value)
                  }
                >
                  <option value="">Velg prisnivå</option>
                  {PRICE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        );

      case 7:
        return (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Seksjon 7 – Åpne spørsmål
              </h2>
              <p className="text-sm text-gray-600">
                Her kan du dele erfaringer og ønsker med egne ord.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Hva er din største utfordring som birøkter i dag?
                </label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-honey-500"
                  value={form.biggestChallenge}
                  onChange={(e) =>
                    updateField("biggestChallenge", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Hvilke funksjoner ønsker du deg mest i en slik app?
                </label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-honey-500"
                  value={form.featureWishes}
                  onChange={(e) =>
                    updateField("featureWishes", e.target.value)
                  }
                />
              </div>
            </div>
          </section>
        );

      case 8:
        return (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Seksjon 8 – Pilotprogram
              </h2>
              <p className="text-sm text-gray-600">
                Her kan du melde interesse for å teste LEK-Honning™️ 2.0 før
                lansering.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <p className="block text-sm font-medium text-gray-800 mb-2">
                  Ønsker du å få mulighet til å teste LEK-Honning™️ 2.0 før
                  lansering?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Ja", value: "ja" as PilotAnswer },
                    { label: "Kanskje", value: "kanskje" as PilotAnswer },
                    { label: "Nei", value: "nei" as PilotAnswer },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        updateField("pilotAnswer", option.value)
                      }
                      className={`px-4 py-3 rounded-xl text-sm font-medium border ${
                        form.pilotAnswer === option.value
                          ? "border-honey-500 bg-honey-50 text-honey-700"
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
                    E-post brukes kun for å invitere til pilotprogram og lagres
                    separat.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      Legg igjen e-postadresse hvis du ønsker invitasjon til
                      testing
                    </label>
                    <input
                      type="email"
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-honey-500"
                      value={form.pilotEmail}
                      onChange={(e) =>
                        updateField("pilotEmail", e.target.value)
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
    <div className="max-w-3xl mx-auto px-4 pt-20">
      <header className="mb-8">
        <p className="text-xs font-bold text-honey-600 uppercase mb-2">
          Behovsanalyse - Birøkter
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
          Hjelp oss å forme neste generasjon verktøy for birøktere
        </h1>
        <p className="text-sm text-gray-600">
          Undersøkelsen er anonym. Det tar vanligvis 5–7 minutter å svare.
        </p>
      </header>

      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>Steg {step} av 8</span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-honey-500 transition-all"
            style={{ width: `${(step / 8) * 100}%` }}
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

          {step < 8 && (
            <button
              type="button"
              onClick={nextStep}
              disabled={submitting}
              className="px-6 py-2 rounded-lg text-sm font-semibold bg-honey-500 text-white hover:bg-honey-600 shadow-sm"
            >
              Neste steg
            </button>
          )}

          {step === 8 && (
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
  );
}
