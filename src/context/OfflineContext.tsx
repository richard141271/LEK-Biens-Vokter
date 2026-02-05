
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  OfflineInspection, 
  saveOfflineInspection, 
  getPendingInspections, 
  deleteOfflineInspection 
} from '@/utils/offline-storage';

interface OfflineContextType {
  isOffline: boolean;
  pendingCount: number;
  saveInspection: (data: Omit<OfflineInspection, 'id' | 'timestamp'>) => Promise<void>;
  sync: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const supabase = createClient();

  // Check initial count
  useEffect(() => {
    getPendingInspections().then(list => setPendingCount(list.length)).catch(console.error);
  }, []);

  // Network listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      console.log('App is online - attempting sync...');
      sync();
    };
    const handleOffline = () => {
      setIsOffline(true);
      console.log('App is offline');
    };

    // Set initial state
    setIsOffline(!navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveInspection = async (data: Omit<OfflineInspection, 'id' | 'timestamp'>) => {
    const inspection: OfflineInspection = {
      ...data,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    
    await saveOfflineInspection(inspection);
    setPendingCount(prev => prev + 1);
    
    // Feedback
    // If we had a toast library we'd use it. For now, we rely on the calling component to show feedback,
    // or we could add a global toast here.
  };

  const sync = useCallback(async () => {
    if (isSyncing) return;
    
    try {
      const pending = await getPendingInspections();
      if (pending.length === 0) return;

      setIsSyncing(true);
      console.log(`Syncing ${pending.length} inspections...`);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('Cannot sync: User not logged in');
        return;
      }

      let successCount = 0;

      for (const item of pending) {
        try {
          // Get user from session (should be valid since we just checked)
          // But for the record insertion, we use the user.id
          
          let imageUrl = null;

          // Upload image if exists
          if (item.image) {
            const fileName = `${Math.random()}.${item.image.name.split('.').pop()}`;
            const { error: uploadError } = await supabase.storage
              .from(item.action === 'FULL_INSPECTION' ? 'inspection-images' : 'hive-images')
              .upload(`${item.hiveId}/${fileName}`, item.image.blob);

            if (uploadError) {
                console.error('Image upload failed for item', item.id, uploadError);
                // Throw to skip this item for now
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
              .from(item.action === 'FULL_INSPECTION' ? 'inspection-images' : 'hive-images')
              .getPublicUrl(`${item.hiveId}/${fileName}`);
            imageUrl = publicUrl;
          }

          if (item.action === 'FULL_INSPECTION') {
             // 1. Insert Inspection
             const { error: inspectionError } = await supabase
               .from('inspections')
               .insert({
                 ...item.data.inspection,
                 image_url: imageUrl,
                 user_id: user.id
               });
             if (inspectionError) throw inspectionError;

             // 2. Update Hive
             await supabase.from('hives').update(item.data.hiveUpdate).eq('id', item.hiveId);

             // 3. Log
             await supabase.from('hive_logs').insert({
                hive_id: item.hiveId,
                user_id: user.id,
                action: 'INSPEKSJON',
                details: item.details,
                created_at: new Date(item.timestamp).toISOString()
             });

          } else {
            // Default/Simple Log (Modal)
            const { error: insertError } = await supabase.from('hive_logs').insert({
                user_id: user.id,
                hive_id: item.hiveId,
                action: item.action,
                details: item.details,
                image_url: imageUrl,
                shared_with_mattilsynet: item.sharedWithMattilsynet,
                data: item.data,
                created_at: new Date(item.timestamp).toISOString()
            });
            if (insertError) throw insertError;
          }

          // Remove from local DB
          await deleteOfflineInspection(item.id);
          successCount++;
          
        } catch (e) {
          console.error('Failed to sync item', item.id, e);
          // Keep in DB to try again later
        }
      }

      const remaining = await getPendingInspections();
      setPendingCount(remaining.length);

      if (successCount > 0) {
        alert(`${successCount} inspeksjoner ble synkronisert fra offline-lageret!`);
      }

    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, supabase]);

  return (
    <OfflineContext.Provider value={{ isOffline, pendingCount, saveInspection, sync }}>
      {children}
      {/* Visual Indicator for Offline Mode */}
      {isOffline && (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-50 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium">Du er offline</span>
          </div>
          <span className="text-xs text-gray-400">Endringer lagres lokalt</span>
        </div>
      )}
      {/* Visual Indicator for Pending Sync (when online but pending exists) */}
      {!isOffline && pendingCount > 0 && (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-50 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-sm font-medium">Synkroniserer {pendingCount} endringer...</span>
          </div>
        </div>
      )}
    </OfflineContext.Provider>
  );
}

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};
