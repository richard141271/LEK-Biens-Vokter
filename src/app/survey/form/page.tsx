'use client';

import { useState } from "react";
import { BeekeeperSurvey } from "@/components/survey/BeekeeperSurvey";
import { NonBeekeeperSurvey } from "@/components/survey/NonBeekeeperSurvey";

export default function SurveyFormPage() {
  const [isBeekeeper, setIsBeekeeper] = useState<boolean | null>(null);

  if (isBeekeeper === null) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-honey-50 to-white pb-16">
        <div className="max-w-2xl mx-auto px-4 pt-32 pb-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-honey-100 text-honey-600 mb-6">
            <span className="text-3xl">🐝</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
            Før vi starter...
          </h1>
          <p className="text-lg text-gray-700 mb-10">
            Er du birøkter?
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
            <button
              onClick={() => setIsBeekeeper(true)}
              className="flex flex-col items-center justify-center p-6 bg-white border-2 border-honey-100 rounded-2xl shadow-sm hover:border-honey-500 hover:shadow-md transition-all group"
            >
              <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">🍯</span>
              <span className="text-lg font-bold text-gray-900">JA</span>
              <span className="text-sm text-gray-500 mt-1">Jeg har bier</span>
            </button>
            
            <button
              onClick={() => setIsBeekeeper(false)}
              className="flex flex-col items-center justify-center p-6 bg-white border-2 border-gray-100 rounded-2xl shadow-sm hover:border-honey-500 hover:shadow-md transition-all group"
            >
              <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">🏡</span>
              <span className="text-lg font-bold text-gray-900">NEI</span>
              <span className="text-sm text-gray-500 mt-1">Jeg er ikke birøkter</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      {isBeekeeper ? <BeekeeperSurvey /> : <NonBeekeeperSurvey />}
    </main>
  );
}
