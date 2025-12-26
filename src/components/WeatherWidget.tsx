'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudRain, Sun, Wind, Droplets } from 'lucide-react';

export default function WeatherWidget() {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Default to Halden (approx coords)
    // 59.12° N, 11.38° E
    fetchWeather(59.12, 11.38);
  }, []);

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Europe%2FBerlin`
      );
      const data = await res.json();
      setWeather(data.current);
    } catch (error) {
      console.error('Failed to fetch weather', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (code: number) => {
    // WMO Weather interpretation codes (WW)
    if (code === 0 || code === 1) return <Sun className="w-8 h-8 text-yellow-500" />;
    if (code === 2 || code === 3) return <Cloud className="w-8 h-8 text-gray-400" />;
    if (code >= 51 && code <= 67) return <CloudRain className="w-8 h-8 text-blue-400" />;
    if (code >= 80 && code <= 99) return <CloudRain className="w-8 h-8 text-blue-600" />;
    return <Sun className="w-8 h-8 text-yellow-500" />;
  };

  const getWeatherText = (code: number) => {
    if (code === 0) return 'Klart';
    if (code === 1) return 'Lett skyet';
    if (code === 2) return 'Delvis skyet';
    if (code === 3) return 'Overskyet';
    if (code >= 51) return 'Regn';
    return 'Ukjent';
  };

  if (loading) return <div className="h-32 bg-gray-100 rounded-xl animate-pulse"></div>;
  if (!weather) return null;

  return (
    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-lg">Været i Halden</h3>
          <p className="text-blue-100 text-sm">{getWeatherText(weather.weather_code)}</p>
        </div>
        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            {getWeatherIcon(weather.weather_code)}
        </div>
      </div>
      
      <div className="flex items-end gap-1 mb-4">
        <span className="text-4xl font-bold">{Math.round(weather.temperature_2m)}°</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm text-blue-100">
        <div className="flex items-center gap-2 bg-white/10 p-2 rounded-lg">
            <Wind className="w-4 h-4" />
            <span>{weather.wind_speed_10m} m/s</span>
        </div>
        <div className="flex items-center gap-2 bg-white/10 p-2 rounded-lg">
            <Droplets className="w-4 h-4" />
            <span>{weather.relative_humidity_2m}%</span>
        </div>
      </div>
    </div>
  );
}
