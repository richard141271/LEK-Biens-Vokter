'use client';

import dynamic from 'next/dynamic';
import ErrorBoundary from './ErrorBoundary';

const Map = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-gray-400">
      Laster kart...
    </div>
  ),
});

interface MapProps {
  center: [number, number];
  zoom?: number;
  markers?: {
    id: string;
    position: [number, number];
    title: string;
    type: 'healthy' | 'infected' | 'risky' | 'user';
    description?: string;
  }[];
  circles?: {
    center: [number, number];
    radius: number;
    color: string;
  }[];
  onMapClick?: (lat: number, lng: number) => void;
}

export default function SafeMap(props: MapProps) {
  return (
    <ErrorBoundary name="Kart">
      <Map {...props} />
    </ErrorBoundary>
  );
}
