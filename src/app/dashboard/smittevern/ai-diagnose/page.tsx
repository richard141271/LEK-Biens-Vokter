'use client';

import { useState, useRef } from 'react';
import { Upload, Scan, CheckCircle, AlertTriangle, X, Loader2, Camera, ArrowLeft, Info } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function AiDiagnosePage() {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImage(e.target.result as string);
          setResult(null); // Reset result on new image
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const startAnalysis = () => {
    if (!image) return;
    setAnalyzing(true);
    
    // Simulate AI Processing
    setTimeout(() => {
      setAnalyzing(false);
      // Mock Result
      setResult({
        status: 'healthy', // or 'warning'
        confidence: 94.5,
        details: [
            { name: 'Lukket yngelråte (AFB)', risk: 'Lav', probability: 0.2 },
            { name: 'Åpen yngelråte (EFB)', risk: 'Lav', probability: 0.5 },
            { name: 'Kalkyngel', risk: 'Lav', probability: 1.2 },
            { name: 'Varroa-skade', risk: 'Medium', probability: 12.4 },
        ]
      });
    }, 3500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/smittevern" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
        </Link>
        <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Scan className="w-6 h-6 text-indigo-600" />
                AI-Bildediagnose
            </h1>
            <p className="text-sm text-gray-500">Last opp bilde av tavle for automatisk analyse.</p>
        </div>
      </div>

      {/* Upload Area */}
      {!image ? (
        <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center hover:border-indigo-500 hover:bg-indigo-50 transition-all cursor-pointer bg-white"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleImageUpload}
          />
          <div className="bg-indigo-100 p-4 rounded-full mb-4">
            <Camera className="w-8 h-8 text-indigo-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Ta bilde eller last opp</h3>
          <p className="text-gray-500 mt-2 text-sm max-w-xs">
            Bruk kameraet på mobilen eller last opp et bilde fra galleriet.
            Sørg for god belysning.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
            {/* Image Preview */}
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-black">
                <img src={image} alt="Preview" className="w-full h-auto max-h-[500px] object-contain mx-auto" />
                
                {/* Scanning Overlay */}
                {analyzing && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                        <div className="w-full h-1 bg-indigo-500 absolute top-1/2 animate-pulse shadow-[0_0_20px_rgba(99,102,241,1)]" />
                        <div className="bg-white/90 backdrop-blur px-6 py-3 rounded-full flex items-center gap-3">
                            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                            <span className="font-bold text-indigo-900">Analyserer bilde med AI...</span>
                        </div>
                        <p className="text-white/80 text-xs mt-4 animate-pulse">Sjekker for yngelråte...</p>
                    </div>
                )}

                {/* Close Button */}
                {!analyzing && !result && (
                    <button 
                        onClick={() => setImage(null)}
                        className="absolute top-4 right-4 bg-white/90 p-2 rounded-full hover:bg-white text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Actions */}
            {!analyzing && !result && (
                <button 
                    onClick={startAnalysis}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 text-lg"
                >
                    <Scan className="w-6 h-6" />
                    Kjør Analyse
                </button>
            )}

            {/* Results */}
            {result && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-6 border-b border-gray-100 bg-green-50">
                        <div className="flex items-center gap-3 mb-2">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                            <div>
                                <h3 className="text-xl font-bold text-green-900">Ingen alvorlige funn</h3>
                                <p className="text-green-700 text-sm">AI-modellen er {result.confidence}% sikker.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6">
                        <h4 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">Detaljert Analyse</h4>
                        <div className="space-y-4">
                            {result.details.map((item: any, i: number) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${item.probability > 10 ? 'bg-orange-500' : 'bg-green-500'}`} />
                                        <span className="text-gray-700 font-medium">{item.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-sm font-bold ${item.probability > 10 ? 'text-orange-600' : 'text-gray-400'}`}>
                                            {item.probability}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <div className="bg-blue-50 p-4 rounded-lg flex gap-3 items-start">
                                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-blue-800">
                                    Dette er en automatisert analyse. Ved mistanke om sykdom bør du alltid kontakte en sertifisert birøkter eller Mattilsynet for manuell inspeksjon.
                                </p>
                            </div>
                        </div>

                        <button 
                            onClick={() => setImage(null)}
                            className="w-full mt-6 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-colors"
                        >
                            Start ny analyse
                        </button>
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
}
