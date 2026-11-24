export type DeviceFeature = 'location' | 'camera' | 'microphone';

const preferenceKey = (feature: DeviceFeature) => `lek_device_${feature}_enabled`;
export const DEVICE_PREFERENCES_CHANGED = 'lek-device-preferences-changed';

export function isDeviceFeatureEnabled(feature: DeviceFeature): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(preferenceKey(feature)) !== '0';
  } catch {
    return true;
  }
}

export function setDeviceFeatureEnabled(feature: DeviceFeature, enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(preferenceKey(feature), enabled ? '1' : '0');
    if (feature === 'location' && !enabled) {
      window.localStorage.removeItem('lek_last_weather_coords');
      window.localStorage.removeItem('lek_last_weather_place');
      window.localStorage.removeItem('lek_last_map_coords');
    }
    window.dispatchEvent(new Event(DEVICE_PREFERENCES_CHANGED));
  } catch {}
}
