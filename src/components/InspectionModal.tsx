'use client';

import { useState, useRef } from 'react';
import { X, Camera, Check, ChevronDown, ClipboardCheck } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface InspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  allHives: any[];
  onSuccess?: () => void;
}

export default function InspectionModal({ isOpen, onClose, allHives, onSuccess }: InspectionModalProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [inspectionData, setInspectionData] = useState({
    hiveId: '',
    queenSeen: false,
    eggsSeen: false,
    larvaeSeen: false,
    pupaSeen: false,
    honeyFrames: '',
    pollenFrames: '',
    temperament: 'Rolig',
    notes: '',
    sharedWithMattilsynet: false
  });
  const [inspectionImage, setInspectionImage] = useState<File | null>(null);

  const handleSubmit = async () => {
    if (!inspectionData.hiveId) {
      alert('Velg bikube');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Ikke logget inn');

      let imageUrl = null;
      if (inspectionImage) {
        const fileExt = inspectionImage.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('hive-images')
          .upload(fileName, inspectionImage);

        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('hive-images')
          .getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      const { error } = await supabase.from('hive_logs').insert({
        user_id: user.id,
        hive_id: inspectionData.hiveId,
        action: 'INSPEKSJON',
        details: `Inspeksjon: ${inspectionData.temperament} gemytt. ${inspectionData.notes}`,
        image_url: imageUrl,
        shared_with_mattilsynet: inspectionData.sharedWithMattilsynet,
        data: {
            queen_seen: inspectionData.queenSeen,
            eggs_seen: inspectionData.eggsSeen,
            larvae_seen: inspectionData.larvaeSeen,
            pupa_seen: inspectionData.pupaSeen,
            honey_frames: parseInt(inspectionData.honeyFrames) || 0,
            pollen_frames: parseInt(inspectionData.pollenFrames) || 0,
            temperament: inspectionData.temperament
        }
      });

      if (error) throw error;

      // Reset form
      setInspectionData({
        hiveId: '',
        queenSeen: false,
        eggsSeen: false,
        larvaeSeen: false,
        pupaSeen: false,
        honeyFrames: '',
        pollenFrames: '',
        temperament: 'Rolig',
        notes: '',
        sharedWithMattilsynet: false
      });
      setInspectionImage(null);
      
      alert('Inspeksjon loggført!');
      onClose();
      onSuccess?.();

    } catch (e: any) {
        alert('Feil ved lagring: ' + e.message);
    } finally {
        setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
                <X className="w-6 h-6" />
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <ClipboardCheck className="w-6 h-6 text-honey-500" />
                Ny Inspeksjon
            </h2>

            <div className="space-y-6">
                
                {/* 1. Velg Kube */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Velg Bikube</label>
                    <div className="relative">
                        <select
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none focus:ring-2 focus:ring-honey-500 outline-none"
                            value={inspectionData.hiveId}
                            onChange={(e) => setInspectionData({...inspectionData, hiveId: e.target.value})}
                        >
                            <option value="">Velg kube...</option>
                            {allHives.map(hive => (
                                <option key={hive.id} value={hive.id}>
                                    {hive.hive_number} ({hive.active ? 'Aktiv' : 'Inaktiv'})
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* 2. Observasjoner (Grid) */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">Observasjoner</label>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { key: 'queenSeen', label: 'Dronning sett' },
                            { key: 'eggsSeen', label: 'Egg sett' },
                            { key: 'larvaeSeen', label: 'Larver sett' },
                            { key: 'pupaSeen', label: 'Forseglet yngel' }
                        ].map((item) => (
                            <button
                                key={item.key}
                                onClick={() => setInspectionData(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof inspectionData] }))}
                                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                                    inspectionData[item.key as keyof typeof inspectionData] 
                                    ? 'bg-honey-100 border-honey-500 text-honey-900' 
                                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                <span className="text-sm font-medium">{item.label}</span>
                                {inspectionData[item.key as keyof typeof inspectionData] && <Check className="w-4 h-4 text-honey-600" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. Tavler & Gemytt */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Honningtavler</label>
                        <input
                            type="number"
                            placeholder="Antall"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-honey-500 outline-none"
                            value={inspectionData.honeyFrames}
                            onChange={(e) => setInspectionData({...inspectionData, honeyFrames: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pollentavler</label>
                        <input
                            type="number"
                            placeholder="Antall"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-honey-500 outline-none"
                            value={inspectionData.pollenFrames}
                            onChange={(e) => setInspectionData({...inspectionData, pollenFrames: e.target.value})}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Gemytt</label>
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        {['Rolig', 'Middels', 'Aggressiv'].map((temp) => (
                            <button
                                key={temp}
                                onClick={() => setInspectionData({...inspectionData, temperament: temp})}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                                    inspectionData.temperament === temp
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {temp}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 4. Notater & Bilde */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Notater</label>
                    <textarea
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-honey-500 outline-none h-24 resize-none"
                        placeholder="Skriv dine observasjoner her..."
                        value={inspectionData.notes}
                        onChange={(e) => setInspectionData({...inspectionData, notes: e.target.value})}
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Last opp bilde (valgfritt)</label>
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50 hover:border-honey-500 transition-colors"
                    >
                        {inspectionImage ? (
                            <div className="relative w-full h-48">
                                <img 
                                    src={URL.createObjectURL(inspectionImage)} 
                                    alt="Preview" 
                                    className="w-full h-full object-contain rounded-lg"
                                />
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setInspectionImage(null);
                                    }}
                                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <Camera className="w-8 h-8 mb-2 text-gray-400" />
                                <span className="text-sm">Klikk for å velge bilde</span>
                            </>
                        )}
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                                if (e.target.files?.[0]) {
                                    setInspectionImage(e.target.files[0]);
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Mattilsynet Share Checkbox */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
                    <label className="flex items-start gap-3 cursor-pointer">
                    <input 
                        type="checkbox" 
                        className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        checked={inspectionData.sharedWithMattilsynet}
                        onChange={(e) => setInspectionData({...inspectionData, sharedWithMattilsynet: e.target.checked})}
                    />
                    <div>
                        <span className="block text-sm font-bold text-gray-900">Del denne inspeksjonen med Mattilsynet</span>
                        <span className="block text-xs text-gray-600 mt-0.5">
                        Huk av her hvis du ønsker at Mattilsynet skal få innsyn i denne spesifikke inspeksjonen. 
                        Standard er at inspeksjoner er private.
                        </span>
                    </div>
                    </label>
                </div>

                <button 
                    onClick={handleSubmit}
                    disabled={uploading}
                    className="w-full bg-honey-500 text-white font-bold py-3 rounded-xl hover:bg-honey-600 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {uploading ? 'Lagrer...' : 'Lagre Inspeksjon'}
                </button>
            </div>
        </div>
    </div>
  );
}
