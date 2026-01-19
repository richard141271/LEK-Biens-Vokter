'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type PilotAnswer = "ja" | "kanskje" | "nei" | "";

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

const RENTAL_PRICE_OPTIONS = [
  "Inntil 199 kr per måned",
  "Inntil 299 kr per måned",
  "Inntil 399 kr per måned",
  "Inntil 599 kr per måned",
  "Inntil 999 kr per måned",
  "Over 1000 kr per måned",
  "Kun hvis det er gratis",
];

export function NonBeekeeperSurvey() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    eatsHoney: "" as "ja" | "nei" | "vet_ikke" | "",
    rentalInterest: "" as "ja" | "nei" | "vet_ikke" | "",
    rentalPrice: "",
    pollinatorImportance: "" as "ja" | "nei" | "vet_ikke" | "",
    county: "",
    
    digitalToolInterest: "" as "ja" | "nei" | "vet_ikke" | "",
    diseaseAwareness: "" as "ja" | "nei" | "usikker" | "",
    diseaseTypes: [] as string[],
    
    knowledgeAboutBeekeeping: "",
    consideredStartingBeekeeping: "",
    
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
    setStep((s) => Math.min(4, s + 1));
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
          isBeekeeper: false, // Mark as non-beekeeper
          
          eatsHoney: form.eatsHoney || null,
          rentalInterest: form.rentalInterest || null,
          rentalPrice: form.rentalPrice || null,
          pollinatorImportance: form.pollinatorImportance || null,
          county: form.county || null,
          
          digitalToolInterest: form.digitalToolInterest || null,
          diseaseAwareness: form.diseaseAwareness || null,
          diseaseTypes: form.diseaseTypes, // Only if relevant
          
          knowledgeAboutBeekeeping: form.knowledgeAboutBeekeeping || null,
          consideredStartingBeekeeping: form.consideredStartingBeekeeping || null,
          
          pilotAnswer: form.pilotAnswer,
          pilotEmail: form.pilotEmail || null,
          
          // Legacy fields mapping (optional, but keeps schema somewhat consistent if needed, 
          // or we handle nulls in backend)
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
                Seksjon 1 – Om deg
              </h2>
              <p className="text-sm text-gray-600">
                Litt om ditt forhold til honning og bier.
              </p>
            </div>

            <div className="space-y-6">
              {/* Spiser du mye honning? */}
              <div>
                <p className="block text-sm font-medium text-gray-800 mb-2">
                  Spiser du mye honning?
                </p>
                <div className="flex gap-3">
                  {[
                    { label: "Ja", value: "ja" },
                    { label: "Nei", value: "nei" },
                    { label: "Vet ikke", value: "vet_ikke" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("eatsHoney", option.value)}
                      className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border ${
                        form.eatsHoney === option.value
                          ? "border-honey-500 bg-honey-50 text-honey-700"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Leie bikube */}
              <div>
                <p className="block text-sm font-medium text-gray-800 mb-2">
                  Hvis du kunne leie en bikube og ha den i din egen hage, der en erfaren birøkter tar seg av alt stell – ville du vurdert dette?
                </p>
                <div className="flex gap-3">
                  {[
                    { label: "Ja", value: "ja" },
                    { label: "Nei", value: "nei" },
                    { label: "Vet ikke", value: "vet_ikke" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("rentalInterest", option.value)}
                      className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border ${
                        form.rentalInterest === option.value
                          ? "border-honey-500 bg-honey-50 text-honey-700"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pris */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Hva ville vært akseptabel pris per måned for å leie en bikube inkludert stell fra erfaren birøkter?
                </label>
                <select
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-honey-500"
                  value={form.rentalPrice}
                  onChange={(e) => updateField("rentalPrice", e.target.value)}
                >
                  <option value="">Velg prisnivå</option>
                  {RENTAL_PRICE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pollinator viktig */}
              <div>
                <p className="block text-sm font-medium text-gray-800 mb-2">
                  Synes du det er viktig å ta vare på pollinatorer som bier?
                </p>
                <div className="flex gap-3">
                  {[
                    { label: "Ja", value: "ja" },
                    { label: "Nei", value: "nei" },
                    { label: "Vet ikke", value: "vet_ikke" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("pollinatorImportance", option.value)}
                      className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border ${
                        form.pollinatorImportance === option.value
                          ? "border-honey-500 bg-honey-50 text-honey-700"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fylke */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Hvilket fylke bor du i?
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
                Seksjon 2 – Erfaring med biesykdommer
              </h2>
              <p className="text-sm text-gray-600">
                Dine tanker om sykdom og smittevern.
              </p>
            </div>

            <div className="space-y-6">
              {/* Digitalt verktøy */}
              <div>
                <p className="block text-sm font-medium text-gray-800 mb-2">
                  Hvis det fantes et digitalt verktøy som gjorde birøktere i stand til å oppdage smitte tidlig – synes du de burde bruke dette?
                </p>
                <div className="flex gap-3">
                  {[
                    { label: "Ja", value: "ja" },
                    { label: "Nei", value: "nei" },
                    { label: "Vet ikke", value: "vet_ikke" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("digitalToolInterest", option.value)}
                      className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border ${
                        form.digitalToolInterest === option.value
                          ? "border-honey-500 bg-honey-50 text-honey-700"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Opplevd sykdom */}
              <div>
                <p className="block text-sm font-medium text-gray-800 mb-2">
                  Har du opplevd eller hørt om biesykdommer de siste 3 årene?
                </p>
                <div className="flex gap-3">
                  {[
                    { label: "Ja", value: "ja" },
                    { label: "Nei", value: "nei" },
                    { label: "Usikker", value: "usikker" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("diseaseAwareness", option.value)}
                      className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border ${
                        form.diseaseAwareness === option.value
                          ? "border-honey-500 bg-honey-50 text-honey-700"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sykdomsliste */}
              {(form.diseaseAwareness === "ja" || form.diseaseAwareness === "usikker") && (
                <div>
                  <p className="block text-sm font-medium text-gray-800 mb-2">
                    Hvilke sykdommer har du hørt om?
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
                Seksjon 3 – Åpne spørsmål
              </h2>
              <p className="text-sm text-gray-600">
                Del dine tanker med oss.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Hva vet du om birøkt i dag?
                </label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-honey-500"
                  value={form.knowledgeAboutBeekeeping}
                  onChange={(e) => updateField("knowledgeAboutBeekeeping", e.target.value)}
                  placeholder="Skriv litt om hva du vet..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Har du noen gang vurdert å starte med bier?
                </label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-honey-500"
                  value={form.consideredStartingBeekeeping}
                  onChange={(e) => updateField("consideredStartingBeekeeping", e.target.value)}
                  placeholder="Ja/Nei, og gjerne hvorfor..."
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
                Seksjon 4 – Pilotprogram for leie av bikuber
              </h2>
              <p className="text-sm text-gray-600">
                Mulighet for å teste konseptet.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <p className="block text-sm font-medium text-gray-800 mb-2">
                  Ønsker du å få mulighet til å teste leie av bikuber til sterkt reduserte priser før lansering?
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  (Kun aktuelt for personer maks 20 minutter fra Halden sentrum)
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
                      onClick={() => updateField("pilotAnswer", option.value)}
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
                    E-post brukes kun for å invitere til pilotprogram og lagres separat.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      Legg igjen e-postadresse hvis du ønsker invitasjon til pilot
                    </label>
                    <input
                      type="email"
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-honey-500"
                      value={form.pilotEmail}
                      onChange={(e) => updateField("pilotEmail", e.target.value)}
                      placeholder="din@epost.no"
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
          Markedsanalyse - Ikke birøktere
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
          Bli med å forme fremtidens honningproduksjon
        </h1>
        <p className="text-sm text-gray-600">
          Undersøkelsen er anonym.
        </p>
      </header>

      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>Steg {step} av 4</span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-honey-500 transition-all"
            style={{ width: `${(step / 4) * 100}%` }}
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

          {step < 4 && (
            <button
              type="button"
              onClick={nextStep}
              disabled={submitting}
              className="px-6 py-2 rounded-lg text-sm font-semibold bg-honey-500 text-white hover:bg-honey-600 shadow-sm"
            >
              Neste steg
            </button>
          )}

          {step === 4 && (
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
