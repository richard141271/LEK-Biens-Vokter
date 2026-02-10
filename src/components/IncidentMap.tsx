'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Next.js
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
    shadowSize: [41, 41]
});

// Custom icons
const infectedIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const apiaryIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const safeIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const ownerIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Component to update map center
function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, 13);
    }, [center, map]);
    return null;
}

interface IncidentMapProps {
    center: [number, number];
    radius: number; // in meters
    apiaries: any[]; // List of all apiaries with isInside property
    showOwnerOnly?: boolean;
}

export default function IncidentMap({ center, radius, apiaries, showOwnerOnly }: IncidentMapProps) {
    // Filter apiaries if showOwnerOnly is true
    const displayApiaries = showOwnerOnly 
        ? apiaries.filter(a => a.isOwner)
        : apiaries;

    return (
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater center={center} />

            {/* Infection Zone */}
            <Circle 
                center={center} 
                radius={radius} 
                pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.2 }} 
            />
            
            {/* Protection Zone (3x radius example) */}
            <Circle 
                center={center} 
                radius={radius * 3} 
                pathOptions={{ color: 'orange', fillColor: 'orange', fillOpacity: 0.1, dashArray: '5, 10' }} 
            />

            {/* Infected Apiary (Center) */}
            <Marker position={center} icon={infectedIcon}>
                <Popup>
                    <strong>Smittepunkt</strong><br />
                    Kilde for utbrudd
                </Popup>
            </Marker>

            {/* Other Apiaries */}
            {displayApiaries.map((apiary) => (
                <Marker 
                    key={apiary.id} 
                    position={[apiary.lat, apiary.lon]} 
                    icon={apiary.isOwner ? ownerIcon : (apiary.isInside ? apiaryIcon : safeIcon)}
                    zIndexOffset={apiary.isOwner ? 1000 : 0}
                >
                    <Popup>
                        <strong>{apiary.name}</strong><br />
                        {apiary.users?.full_name || 'Ukjent eier'} {apiary.isOwner && '(Eier)'}<br />
                        <span className={`text-xs font-bold ${apiary.isInside ? 'text-red-600' : 'text-green-600'}`}>
                            {apiary.isInside ? 'Innenfor sone' : 'Utenfor sone'}
                        </span><br />
                        <span className="text-xs text-gray-500">{apiary.location}</span>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
