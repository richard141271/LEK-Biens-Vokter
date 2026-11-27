export interface DeviceCapabilities {
  geolocation: boolean;
  cameraCapture: boolean;
  getUserMedia: boolean;
  speechRecognition: boolean;
  speechSynthesis: boolean;
  serviceWorker: boolean;
  indexedDB: boolean;
  wasm: boolean;
  webgl: boolean;
  webgl2: boolean;
  modernJs: boolean;
  fetch: boolean;
}

let cached: DeviceCapabilities | null = null;

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function getDeviceCapabilities(): DeviceCapabilities {
  if (cached) return cached;

  const hasWindow = typeof window !== 'undefined';

  const geolocation = hasWindow && 'geolocation' in navigator;

  const cameraCapture = safe(() => {
    if (!hasWindow) return false;
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    return 'capture' in input;
  }, false);

  const getUserMedia = safe(() => {
    if (!hasWindow) return false;
    const md = navigator.mediaDevices;
    return !!(md && typeof md.getUserMedia === 'function');
  }, false);

  const speechRecognition = safe(() => {
    if (!hasWindow) return false;
    const w = window as any;
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  }, false);

  const speechSynthesis = safe(() => {
    if (!hasWindow) return false;
    return 'speechSynthesis' in window;
  }, false);

  const serviceWorker = safe(() => {
    if (!hasWindow) return false;
    return 'serviceWorker' in navigator;
  }, false);

  const indexedDB = safe(() => {
    if (!hasWindow) return false;
    return 'indexedDB' in window;
  }, false);

  const wasm = safe(() => {
    if (!hasWindow) return false;
    return typeof WebAssembly !== 'undefined' && typeof WebAssembly.instantiate === 'function';
  }, false);

  const webgl = safe(() => {
    if (!hasWindow) return false;
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || (canvas.getContext('experimental-webgl') as any));
  }, false);

  const webgl2 = safe(() => {
    if (!hasWindow) return false;
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  }, false);

  const modernJs = safe(() => {
    if (!hasWindow) return false;
    try {
      new Function('const a = () => 1; a?.(); return true');
      return true;
    } catch {
      return false;
    }
  }, false);

  const fetch = safe(() => {
    if (!hasWindow) return false;
    return typeof window.fetch === 'function';
  }, false);

  cached = {
    geolocation,
    cameraCapture,
    getUserMedia,
    speechRecognition,
    speechSynthesis,
    serviceWorker,
    indexedDB,
    wasm,
    webgl,
    webgl2,
    modernJs,
    fetch,
  };

  return cached;
}

export function hasCapability(key: keyof DeviceCapabilities): boolean {
  return getDeviceCapabilities()[key];
}
