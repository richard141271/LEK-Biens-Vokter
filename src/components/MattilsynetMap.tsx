'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix for default markers in Next.js
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

// Red icon for sickness
const sicknessIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function MattilsynetMap({ apiaries }: { apiaries: any[] }) {
  
  useEffect(() => {
    // Force icon fix
    (delete (L.Icon.Default.prototype as any)._getIconUrl);
    L.Icon.Default.mergeOptions({
      iconUrl,
      iconRetinaUrl,
      shadowUrl,
    });
  }, []);

  // Default center (Norway)
  const center: [number, number] = [60.472, 8.468];
  const zoom = 6;

  return (
    <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {apiaries.map((apiary) => {
        if (!apiary.latitude || !apiary.longitude) return null;
        
        const isSick = apiary.has_sickness;

        return (
          <Marker 
            key={apiary.id} 
            position={[apiary.latitude, apiary.longitude]}
            icon={isSick ? sicknessIcon : defaultIcon}
          >
            <Popup>
              <div className="p-1">
                <h3 className="font-bold text-sm">{apiary.name}</h3>
                <p className="text-xs text-gray-600">{apiary.location}</p>
                <p className="text-xs mt-1">
                  Eier: {apiary.profiles?.full_name || 'Ukjent'}
                </p>
                <p className="text-xs font-mono text-gray-400 mt-1">{apiary.apiary_number}</p>
                {isSick && (
                  <div className="mt-2 bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">
                    ⚠️ AKTIV SMITTE
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
