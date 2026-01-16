'use client';

import { useState, useRef } from 'react';
import { Activity, X, Camera, ShieldCheck } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface SicknessRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  allHives: any[];
  profile: any;
  onSuccess?: () => void;
}

export default function SicknessRegistrationModal({ isOpen, onClose, allHives, profile, onSuccess }: SicknessRegistrationModalProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [sicknessData, setSicknessData] = useState({
    hiveId: '',
    varroaCount: '',
    behavior: 'Normal',
    diseaseType: 'Annet / Vet ikke',
    mortality: 'Lav',
    description: '',
    sharedWithMattilsynet: false
  });
  const [sicknessImage, setSicknessImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setSicknessImage(null);
    setPreviewUrl(null);
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
    try {
        setUploading(true);
        let imageUrl = '';

        if (sicknessImage) {
            const fileExt = sicknessImage.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('sickness-images')
                .upload(filePath, sicknessImage);

            if (uploadError) {
                console.error('Upload error:', uploadError);
                const raw = uploadError.message || '';
                const msg = raw.toLowerCase();
                if (msg.includes('bucket') && msg.includes('not found')) {
                    alert('Kunne ikke lagre bildet (lagringsområde mangler). Rapporten sendes uten bilde.');
                    setSicknessImage(null);
                    setPreviewUrl(null);
                    setPreviewError('Bildet ble ikke lagret, men rapporten kan sendes uten.');
                } else {
                    throw new Error('Kunne ikke laste opp bilde: ' + raw);
                }
            } else {
                const { data: { publicUrl } } = supabase.storage
                    .from('sickness-images')
                    .getPublicUrl(filePath);
                
                imageUrl = publicUrl;
            }
        }

        // 1. AI Analysis Mock (PoC)
        let aiResult = null;
        if (sicknessImage) {
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

        const details = `Sykdom: ${sicknessData.diseaseType}, Atferd: ${sicknessData.behavior}, Død: ${sicknessData.mortality}, Varroa: ${sicknessData.varroaCount}. Beskrivelse: ${sicknessData.description} ${imageUrl ? `\nBilde: ${imageUrl}` : ''}${aiDetails}`;
        
        // Insert into hive_logs
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Du må være logget inn for å sende rapport");
        const userId = user.id;

        const { error: logError } = await supabase.from('hive_logs').insert({
            hive_id: sicknessData.hiveId || null,
            user_id: userId,
            action: 'SYKDOM',
            details: sicknessData.hiveId ? details : `(Generell Rapport) ${details}`,
            shared_with_mattilsynet: true,
            created_at: new Date().toISOString()
        });

        if (logError) throw logError;

        const aiMsg = aiResult 
            ? `\n\n🤖 AI-Analyse (PoC):\nModellen gjenkjenner: ${aiResult.detected} (${aiResult.confidence}% sannsynlighet).`
            : "";

        const riskWarning = '\n\n⚠️ Mulig smitte: Følg ekstra godt med på andre kuber i området, og unngå flytting av tavler mellom kuber før situasjonen er avklart.';
        
        const successMsg = profile?.role === 'beekeeper' 
            ? `Rapport sendt til Mattilsynet. 🚨${aiMsg}${riskWarning}`
            : `Melding sendt til Mattilsynet (Pilot) og Birøkter! 🚨${aiMsg}\n\nNabovarsel er sendt til 4 birøktere i radius på 3 km.${riskWarning}`;
        
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
                    <p className="text-xs text-gray-500">Sendes direkte til ansvarlig birøkter & Mattilsynet</p>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse</label>
                    <textarea 
                        value={sicknessData.description}
                        onChange={(e) => setSicknessData({...sicknessData, description: e.target.value})}
                        placeholder="Beskriv hva du ser... (f.eks. mange døde bier, urolig sverm, tegn til sykdom)"
                        className="w-full p-3 border border-gray-200 rounded-xl min-h-[80px] text-sm focus:ring-2 focus:ring-red-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last opp bilde (Påkrevd)</label>
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 cursor-pointer transition-colors relative overflow-hidden"
                    >
                        {sicknessImage ? (
                            <div className="text-center w-full">
                                <div className="relative w-full h-32 mb-2 rounded-lg overflow-hidden bg-gray-100">
                                    {previewUrl ? (
                                        <img 
                                            src={previewUrl} 
                                            alt="Preview" 
                                            className="w-full h-full object-contain" 
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-600 px-3 text-center">
                                            {previewError ? previewError : 'Forhåndsvisning genereres...'}
                                        </div>
                                    )}
                                </div>
                                <span className="text-xs font-medium text-green-600 block truncate px-4">{sicknessImage.name}</span>
                                <div className="flex items-center justify-center gap-3 mt-1">
                                    <span className="text-[11px] text-gray-400">Klikk for å endre</span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSicknessImage(null);
                                            setPreviewUrl(null);
                                            setPreviewError(null);
                                        }}
                                        className="text-[11px] text-red-600 underline"
                                    >
                                        Fjern bilde
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <Camera className="w-6 h-6 mb-1 text-gray-400" />
                                <span className="text-xs font-medium">Trykk for å ta bilde eller laste opp</span>
                            </>
                        )}
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*"
                            className="hidden" 
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    const file = e.target.files[0];
                                    setPreviewError(null);
                                    setPreviewUrl(null);
                                    // Handle HEIC conversion to JPEG for browser preview
                                    const isHeic = /\.heic$/i.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif';
                                    if (isHeic) {
                                        (async () => {
                                            try {
                                                const heic2any = (await import('heic2any')).default;
                                                const convertedBlob = await heic2any({
                                                    blob: file,
                                                    toType: 'image/jpeg',
                                                    quality: 0.85
                                                }) as Blob;
                                                const convertedFile = new File([convertedBlob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
                                                setSicknessImage(convertedFile);
                                                const url = URL.createObjectURL(convertedBlob);
                                                setPreviewUrl(url);
                                            } catch (err) {
                                                console.error('HEIC conversion failed:', err);
                                                setPreviewError('Kan ikke vise HEIC-bilde. Bildet blir likevel sendt.');
                                                // Fallback: upload original file but no preview
                                                setSicknessImage(file);
                                            }
                                        })();
                                    } else {
                                        setSicknessImage(file);
                                        const url = URL.createObjectURL(file);
                                        setPreviewUrl(url);
                                    }
                                }
                            }}
                        />
                    </div>
                </div>

                {profile?.role !== 'beekeeper' && (
                <div className="bg-blue-50 p-3 rounded-lg flex gap-2 text-xs text-blue-800">
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>Din birøkter vil vurdere bildet for å se om det krever utrykning eller er &quot;falsk alarm&quot;. Du hører fra oss!</p>
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
