'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { ArrowLeft, PlayCircle, CheckCircle, Clock, GraduationCap } from 'lucide-react';

interface TrainingVideo {
  id: string;
  title: string;
  description: string;
  content_url: string;
  category: string;
  progress?: {
    status: string;
    progress_percent: number;
  };
}

export default function TrainingPage() {
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<TrainingVideo | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch videos
      const { data: videoData, error: videoError } = await supabase
        .from('franchise_documents')
        .select('*')
        .eq('type', 'video')
        .eq('category', 'training')
        .eq('is_active', true)
        .order('title', { ascending: true });

      if (videoData) {
        // Fetch progress
        const { data: progressData } = await supabase
          .from('franchise_training_progress')
          .select('*')
          .eq('user_id', user.id);

        // Merge progress
        const videosWithProgress = videoData.map(v => ({
          ...v,
          progress: progressData?.find(p => p.video_id === v.id) || null
        }));

        setVideos(videosWithProgress);
      }
    } catch (error) {
      console.error('Error fetching training:', error);
    } finally {
      setLoading(false);
    }
  };

  const markCompleted = async (videoId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('franchise_training_progress')
        .upsert({
          user_id: user.id,
          video_id: videoId,
          status: 'completed',
          progress_percent: 100,
          completed_at: new Date().toISOString()
        }, { onConflict: 'user_id, video_id' });

      if (!error) {
        // Refresh local state
        setVideos(prev => prev.map(v => 
          v.id === videoId 
            ? { ...v, progress: { status: 'completed', progress_percent: 100 } }
            : v
        ));
      }
    } catch (error) {
      console.error('Error marking completed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard/franchise"
                className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Salgsopplæring</h1>
                  <p className="text-xs text-gray-500">Videokurs og sertifisering</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Active Video Player */}
        {activeVideo && (
          <div className="mb-12 bg-black rounded-xl overflow-hidden shadow-2xl">
            <div className="aspect-w-16 aspect-h-9 w-full relative pt-[56.25%] bg-gray-900">
              <iframe 
                src={activeVideo.content_url}
                className="absolute top-0 left-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="p-6 bg-white border-t border-gray-800">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{activeVideo.title}</h2>
                  <p className="text-gray-600">{activeVideo.description}</p>
                </div>
                <button
                  onClick={() => markCompleted(activeVideo.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                    activeVideo.progress?.status === 'completed'
                      ? 'bg-green-100 text-green-700 cursor-default'
                      : 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
                  }`}
                >
                  {activeVideo.progress?.status === 'completed' ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Fullført
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Marker som ferdig
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-3 text-center py-12 text-gray-500">Laster kurskatalog...</div>
          ) : videos.length > 0 ? (
            videos.map((video) => (
              <button
                key={video.id}
                onClick={() => {
                  setActiveVideo(video);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`text-left group bg-white rounded-xl shadow-sm border transition-all overflow-hidden hover:shadow-md ${
                  activeVideo?.id === video.id 
                    ? 'border-green-500 ring-2 ring-green-100' 
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="relative h-48 bg-gray-100">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <PlayCircle className={`w-12 h-12 ${
                      activeVideo?.id === video.id ? 'text-green-500' : 'text-gray-400 group-hover:text-green-500'
                    } transition-colors`} />
                  </div>
                  {video.progress?.status === 'completed' && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      <CheckCircle className="w-3 h-3" />
                      Ferdig
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className={`font-bold text-lg mb-2 group-hover:text-green-700 transition-colors ${
                    activeVideo?.id === video.id ? 'text-green-700' : 'text-gray-900'
                  }`}>
                    {video.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2">{video.description}</p>
                  
                  {/* Progress Bar */}
                  <div className="mt-4 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-green-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${video.progress?.progress_percent || 0}%` }}
                    />
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="col-span-3 text-center py-12">
              <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Ingen kurs tilgjengelig</h3>
              <p className="text-gray-500">Det er ikke lagt ut noen opplæringsvideoer enda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
