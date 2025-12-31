'use client';

import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix for default markers in Next.js
const icon = L.icon({
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Helper to update map center when props change
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

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
    radius: number; // in meters
    color: string;
  }[];
  onMapClick?: (lat: number, lng: number) => void;
}

const Map = ({ center, zoom = 13, markers = [], circles = [], onMapClick }: MapProps) => {
  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <ChangeView center={center} zoom={zoom} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {markers.map((marker) => (
        <Marker 
          key={marker.id} 
          position={marker.position}
          icon={
            new L.Icon({
              iconUrl: marker.type === 'infected' 
                ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png'
                : marker.type === 'risky'
                ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png'
                : marker.type === 'user'
                ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png'
                : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            })
          }
        >
          <Popup>
            <div className="font-sans">
              <h3 className="font-bold">{marker.title}</h3>
              {marker.description && <p className="text-sm">{marker.description}</p>}
            </div>
          </Popup>
        </Marker>
      ))}

      {circles.map((circle, index) => (
        <Circle
          key={index}
          center={circle.center}
          radius={circle.radius}
          pathOptions={{ color: circle.color, fillColor: circle.color, fillOpacity: 0.2 }}
        />
      ))}
    </MapContainer>
  );
};

export default Map;
