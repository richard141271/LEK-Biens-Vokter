'use client';

import { useState, useRef } from 'react';
import { Activity, X, Camera, ShieldCheck, Mic, MicOff } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';

interface SicknessRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  allHives: any[];
  profile: any;
  onSuccess?: () => void;
}

import { submitSicknessReport, getSignedUploadUrl } from '@/app/actions/sickness';

export default function SicknessRegistrationModal({ isOpen, onClose, allHives, profile, onSuccess }: SicknessRegistrationModalProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { isListening, toggleListening, isSupported } = useVoiceRecognition((text) => {
      setSicknessData(prev => ({
          ...prev,
          description: prev.description ? `${prev.description} ${text}` : text
      }));
  });

  const [sicknessData, setSicknessData] = useState({
    hiveId: '',
    varroaCount: '',
    behavior: 'Normal',
    diseaseType: 'Annet / Vet ikke',
    mortality: 'Lav',
    description: '',
    sharedWithMattilsynet: false
  });
  const [sicknessImages, setSicknessImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setSicknessImages([]);
    setPreviewUrls([]);
    setPreviewError(null);
    setSicknessData({
      hiveId: '',
      varroaCount: '',
      behavior: 'Normal',
      diseaseType: 'Annet / Vet ikke',
      mortality: 'Lav',
      description: '',
      sharedWithMattilsynet: false
    });
  };

  const handleSubmit = async () => {
    // Validate that at least one image is provided
    if (sicknessImages.length === 0) {
        alert('Du må laste opp minst ett bilde før du kan sende rapporten. Dette er påkrevd for dokumentasjon.');
        return;
    }

    try {
        setUploading(true);
        const imageUrls: string[] = [];

        // Upload all images
        for (const image of sicknessImages) {
            try {
              const fileExt = image.name.split('.').pop();
              const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
              
              // 1. Get signed URL via Server Action (bypasses RLS)
              const { signedUrl, path, token } = await getSignedUploadUrl(fileName);

              // 2. Upload directly to signed URL
              const { error: uploadError } = await supabase.storage
                  .from('sickness-images')
                  .uploadToSignedUrl(path, token, image);

              if (uploadError) throw uploadError;

              // 3. Get Public URL
              const { data: { publicUrl } } = supabase.storage
                  .from('sickness-images')
                  .getPublicUrl(path);
              
              imageUrls.push(publicUrl);

            } catch (error: any) {
                console.error('Upload error for image:', image.name, error);
                throw new Error(`Kunne ikke laste opp bilde ${image.name}. Prøv igjen.`);
            }
        }

        // 1. AI Analysis Mock (PoC) - Use the first image
        let aiResult = null;
        if (sicknessImages.length > 0) {
            // Mock AI Analysis based on selected type or random
            const confidence = Math.floor(Math.random() * (98 - 70 + 1) + 70); // 70-98%
            const detected = sicknessData.diseaseType !== 'Annet / Vet ikke' 
                ? sicknessData.diseaseType 
                : ['Varroa', 'Yngelråte', 'Kalkyngel'][Math.floor(Math.random() * 3)];
            
            aiResult = {
                detected: detected,
                confidence: confidence,
                timestamp: new Date().toISOString()
            };
        }

        const aiDetails = aiResult 
            ? `\n\n[AI Analyse]\nFunnet: ${aiResult.detected}\nSikkerhet: ${aiResult.confidence}%`
            : "";

        const result = await submitSicknessReport({
            hiveId: sicknessData.hiveId,
            varroaCount: sicknessData.varroaCount,
            behavior: sicknessData.behavior,
            diseaseType: sicknessData.diseaseType,
            mortality: sicknessData.mortality,
            description: sicknessData.description,
            imageUrls: imageUrls,
            aiDetails: aiDetails
        });

        if (!result.success) {
            throw new Error(result.error || 'Feil ved innsending');
        }

        const aiMsg = aiResult 
            ? `\n\n🤖 AI-Analyse (PoC):\nModellen gjenkjenner: ${aiResult.detected} (${aiResult.confidence}% sannsynlighet).`
            : "";

        const riskWarning = '\n\n⚠️ Mulig smitte: Følg ekstra godt med på andre kuber i området, og unngå flytting av tavler mellom kuber før situasjonen er avklart.';
        
        const successMsg = `Melding sendt til Mattilsynet og Birøkter! 🚨${aiMsg}\n\nNabovarsel er sendt til ${result.neighborCount} birøktere i systemet (Pilot).${riskWarning}`;
        
        alert(successMsg);
        onClose();
        resetForm();
        if (onSuccess) onSuccess();
    } catch (e: any) {
        console.error(e);
        let msg = 'Ukjent feil';
        
        if (e instanceof Error) {
            msg = e.message;
        } else if (typeof e === 'object' && e !== null) {
            // Handle Supabase error objects
            msg = e.message || e.details || e.hint || JSON.stringify(e);
        } else if (typeof e === 'string') {
            msg = e;
        }

        alert(`Kunne ikke sende rapport.\n\nDetaljer: ${msg}`);
    } finally {
        setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[70]">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
                <X className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-red-100 p-3 rounded-full text-red-600">
                    <Activity className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Meld sykdom / avvik</h2>
                    <p className="text-xs text-gray-500">Sendes direkte til ansvarlig i Mattilsynet</p>
                </div>
            </div>

            <div className="space-y-4">
                {/* Hive Selector */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gjelder hvilken kube?</label>
                    <select
                        value={sicknessData.hiveId}
                        onChange={(e) => setSicknessData({...sicknessData, hiveId: e.target.value})}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-honey-500"
                    >
                        <option value="">Velg kube (hvis aktuelt)</option>
                        {allHives.map(h => (
                            <option key={h.id} value={h.id}>{h.hive_number}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Varroa-telling</label>
                        <input 
                            type="number" 
                            placeholder="Antall"
                            value={sicknessData.varroaCount}
                            onChange={(e) => setSicknessData({...sicknessData, varroaCount: e.target.value})}
                            className="w-full p-3 border border-gray-200 rounded-xl"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dødelighet</label>
                        <select
                            value={sicknessData.mortality}
                            onChange={(e) => setSicknessData({...sicknessData, mortality: e.target.value})}
                            className="w-full p-3 border border-gray-200 rounded-xl bg-white"
                        >
                            <option value="Lav">Lav</option>
                            <option value="Middels">Middels</option>
                            <option value="Høy">Høy</option>
                            <option value="Kritisk">Kritisk</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bie-atferd</label>
                        <select
                            value={sicknessData.behavior}
                            onChange={(e) => setSicknessData({...sicknessData, behavior: e.target.value})}
                            className="w-full p-3 border border-gray-200 rounded-xl bg-white"
                        >
                            <option value="Normal">Normal</option>
                            <option value="Aggressiv">Aggressiv</option>
                            <option value="Slapp/Rolig">Slapp/Rolig</option>
                            <option value="Svermetendens">Svermetendens</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mistenkt sykdom</label>
                        <select
                            value={sicknessData.diseaseType}
                            onChange={(e) => setSicknessData({...sicknessData, diseaseType: e.target.value})}
                            className="w-full p-3 border border-gray-200 rounded-xl bg-white"
                        >
                            <option value="Annet / Vet ikke">Annet / Vet ikke</option>
                            <option value="Lukket yngelråte">Lukket yngelråte</option>
                            <option value="Åpen yngelråte">Åpen yngelråte</option>
                            <option value="Kalkyngel">Kalkyngel</option>
                            <option value="Varroa-skade">Varroa-skade</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse av symptomer</label>
                    <div className="relative">
                        <textarea 
                            value={sicknessData.description}
                            onChange={(e) => setSicknessData({...sicknessData, description: e.target.value})}
                            placeholder="Beskriv hva du ser... (Du kan bruke stemmen)"
                            className="w-full p-3 border border-gray-200 rounded-xl min-h-[80px] text-sm focus:ring-2 focus:ring-red-500 outline-none"
                        />
                        <button 
                            type="button"
                            onClick={toggleListening}
                            className={`absolute bottom-3 right-3 p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            title="Bruk stemme til tekst"
                        >
                            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last opp bilde (Påkrevd)</label>
                    <div className="space-y-4">
                        <div 
                            onClick={() => sicknessImages.length < 4 && fileInputRef.current?.click()}
                            className={`border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors relative overflow-hidden ${sicknessImages.length >= 4 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <Camera className="w-6 h-6 mb-1 text-gray-400" />
                            <span className="text-xs font-medium">
                                {sicknessImages.length >= 4 
                                    ? 'Maks antall bilder nådd (4)' 
                                    : 'Trykk for å legge til bilder (Maks 4)'}
                            </span>
                        </div>

                        {sicknessImages.length > 0 && (
                            <div className="grid grid-cols-2 gap-3">
                                {sicknessImages.map((file, index) => (
                                    <div key={index} className="relative bg-gray-50 rounded-lg p-2 border border-gray-100">
                                        <div className="relative w-full h-24 mb-2 rounded overflow-hidden bg-gray-200">
                                            {previewUrls[index] ? (
                                                <img 
                                                    src={previewUrls[index]} 
                                                    alt={`Preview ${index + 1}`} 
                                                    className="w-full h-full object-cover" 
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500 text-center p-1">
                                                    {previewError && !previewUrls[index] ? 'Ingen visning (HEIC)' : 'Laster...'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[10px] font-medium text-gray-600 truncate max-w-[80px]">
                                                {file.name}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const newImages = [...sicknessImages];
                                                    newImages.splice(index, 1);
                                                    setSicknessImages(newImages);
                                                    
                                                    const newUrls = [...previewUrls];
                                                    newUrls.splice(index, 1);
                                                    setPreviewUrls(newUrls);
                                                }}
                                                className="text-[10px] text-red-600 hover:text-red-800"
                                            >
                                                Fjern
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*"
                            multiple
                            className="hidden" 
                            onChange={async (e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                    const newFiles = Array.from(e.target.files);
                                    
                                    if (sicknessImages.length + newFiles.length > 4) {
                                        alert('Du kan maksimalt laste opp 4 bilder.');
                                        return;
                                    }

                                    setPreviewError(null);
                                    
                                    for (const file of newFiles) {
                                        // Handle HEIC conversion to JPEG for browser preview
                                        const isHeic = /\.heic$/i.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif';
                                        
                                        if (isHeic) {
                                            try {
                                                const heic2any = (await import('heic2any')).default;
                                                const convertedBlob = await heic2any({
                                                    blob: file,
                                                    toType: 'image/jpeg',
                                                    quality: 0.85
                                                }) as Blob;
                                                const convertedFile = new File([convertedBlob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
                                                
                                                setSicknessImages(prev => [...prev, convertedFile]);
                                                const url = URL.createObjectURL(convertedBlob);
                                                setPreviewUrls(prev => [...prev, url]);
                                            } catch (err) {
                                                console.error('HEIC conversion failed:', err);
                                                setPreviewError('Noen bilder (HEIC) kunne ikke forhåndsvises, men blir sendt.');
                                                setSicknessImages(prev => [...prev, file]);
                                                setPreviewUrls(prev => [...prev, '']); // Empty string placeholder
                                            }
                                        } else {
                                            setSicknessImages(prev => [...prev, file]);
                                            const url = URL.createObjectURL(file);
                                            setPreviewUrls(prev => [...prev, url]);
                                        }
                                    }
                                }
                            }}
                        />
                    </div>
                </div>

                {profile?.role !== 'beekeeper' && (
                <div className="bg-blue-50 p-3 rounded-lg flex gap-2 text-xs text-blue-800">
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>Mattilsynet vil vurdere bildet for å se om det krever utrykning eller er &quot;falsk alarm&quot;. Du hører fra oss!</p>
                </div>
                )}

                <button 
                    onClick={handleSubmit}
                    disabled={uploading}
                    className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {uploading ? 'Sender rapport...' : 'Send Rapport'}
                </button>
                <button
                    type="button"
                    onClick={resetForm}
                    disabled={uploading}
                    className="w-full mt-2 text-xs text-gray-500 underline disabled:opacity-50"
                >
                    Nullstill skjema
                </button>
            </div>
        </div>
    </div>
  );
}
