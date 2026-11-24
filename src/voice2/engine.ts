import type { Voice2State } from '@/voice2/types';

type Callbacks = {
  onText: (text: string) => void;
  onState?: (state: Voice2State) => void;
  onError?: (error: string) => void;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: any) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

export class Voice2Engine {
  private callbacks: Callbacks;
  private recognition: SpeechRecognitionLike | null = null;
  private keepAlive = false;
  private paused = false;
  private speaking = false;
  private starting = false;
  private listening = false;
  private lastStopAt = 0;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private audioCtx: any | null = null;
  private ttsUnlocked = false;
  private ttsCache = new Map<string, ArrayBuffer>();
  private ttsGain = 1.6;
  private ttsPlaybackRate = 1.05;

  constructor(callbacks: Callbacks) {
    this.callbacks = callbacks;
    if (typeof window === 'undefined') return;
    const w = window as any;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const r: SpeechRecognitionLike = new Ctor();
    r.continuous = true;
    r.lang = 'nb-NO';
    r.interimResults = false;
    r.maxAlternatives = 5;
    r.onresult = (event: any) => {
      try {
        const last = (event?.results?.length || 0) - 1;
        const res = event?.results?.[last];
        const len = typeof res?.length === 'number' ? res.length : 0;
        let bestText = '';
        let bestConf = -1;
        for (let i = 0; i < len; i += 1) {
          const t = String(res?.[i]?.transcript || '').trim();
          if (!t) continue;
          const c = typeof res?.[i]?.confidence === 'number' ? res[i].confidence : 0;
          if (c > bestConf) {
            bestConf = c;
            bestText = t;
          }
        }
        if (!bestText && res?.[0]?.transcript) bestText = String(res[0].transcript).trim();
        if (!bestText) return;
        this.callbacks.onText(bestText);
      } catch {}
    };
    r.onstart = () => {
      this.starting = false;
      this.listening = true;
      this.callbacks.onState?.('listening');
    };
    r.onend = () => {
      this.starting = false;
      this.listening = false;
      this.lastStopAt = Date.now();
      if (!this.keepAlive || this.paused || this.speaking) {
        this.callbacks.onState?.('idle');
        return;
      }
      this.scheduleRestart(260);
    };
    r.onerror = (event: any) => {
      this.starting = false;
      this.listening = false;
      const e = String(event?.error || 'unknown').toLowerCase();
      this.callbacks.onError?.(e);
      if (e === 'not-allowed' || e === 'service-not-allowed') {
        this.keepAlive = false;
        this.paused = false;
        try {
          r.stop();
        } catch {}
        this.callbacks.onState?.('error');
        return;
      }
      if (this.keepAlive && !this.paused && !this.speaking) this.scheduleRestart(420);
    };
    this.recognition = r;
  }

  isSupported(): boolean {
    return !!this.recognition;
  }

  unlockFromGesture(): void {
    try {
      if (typeof window === 'undefined') return;
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (Ctx) {
        if (!this.audioCtx) this.audioCtx = new Ctx();
        const ctx = this.audioCtx;
        try {
          if (ctx?.state === 'suspended' && typeof ctx.resume === 'function') void ctx.resume();
        } catch {}
        try {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          g.gain.value = 0;
          o.connect(g);
          g.connect(ctx.destination);
          o.start();
          o.stop(ctx.currentTime + 0.05);
        } catch {}
      }

      const s = (window as any).speechSynthesis as SpeechSynthesis | undefined;
      if (s && !this.ttsUnlocked) {
        try {
          if (typeof s.getVoices === 'function') s.getVoices();
        } catch {}
        const u = new SpeechSynthesisUtterance('.');
        u.lang = 'nb-NO';
        u.rate = 1.0;
        u.pitch = 1.0;
        u.volume = 0.0;
        u.onstart = () => {
          this.ttsUnlocked = true;
        };
        try {
          const v = this.pickNorwegianVoice(s);
          if (v) u.voice = v;
        } catch {}
        try {
          if (typeof s.resume === 'function') s.resume();
        } catch {}
        try {
          if (s.speaking || s.pending) s.cancel();
        } catch {}
        try {
          s.speak(u);
        } catch {}
      }
    } catch {}
  }

  start(): void {
    if (!this.recognition) return;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    this.keepAlive = true;
    this.paused = false;
    this.safeStart();
  }

  stop(): void {
    this.keepAlive = false;
    this.paused = false;
    this.listening = false;
    this.starting = false;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    const r = this.recognition;
    if (!r) return;
    try {
      if (typeof r.abort === 'function') r.abort();
    } catch {}
    try {
      r.stop();
    } catch {}
    this.callbacks.onState?.('idle');
  }

  async speak(text: string): Promise<void> {
    const t = String(text || '').trim();
    if (!t) return;
    if (typeof window === 'undefined') return;
    const r = this.recognition;
    const shouldResume = this.keepAlive;
    if (r) {
      try {
        this.paused = true;
        this.starting = false;
        this.listening = false;
        this.lastStopAt = Date.now();
        if (typeof r.abort === 'function') r.abort();
      } catch {}
      try {
        r.stop();
      } catch {}
    }
    this.speaking = true;
    this.callbacks.onState?.('speaking');
    this.unlockFromGesture();

    const spoke = await this.speakWithAny(t).catch(() => false);
    if (!spoke) {
      this.callbacks.onError?.('tts_failed');
    }

    this.speaking = false;
    if (shouldResume) {
      this.paused = false;
      if (this.restartTimer) {
        clearTimeout(this.restartTimer);
        this.restartTimer = null;
      }
      this.safeStart();
      this.scheduleRestart(520);
    } else {
      this.callbacks.onState?.('idle');
    }
  }

  private safeStart(): void {
    const r = this.recognition;
    if (!r) return;
    if (!this.keepAlive || this.paused || this.speaking) return;
    if (this.starting) return;
    if (this.listening) return;
    const sinceStop = Date.now() - this.lastStopAt;
    if (sinceStop < 180) {
      this.scheduleRestart(220);
      return;
    }
    try {
      this.starting = true;
      r.start();
    } catch {
      this.starting = false;
      this.scheduleRestart(520);
    }
  }

  private scheduleRestart(delayMs: number): void {
    if (!this.keepAlive || this.paused || this.speaking) return;
    if (this.restartTimer) return;
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      this.safeStart();
    }, Math.max(120, delayMs));
  }

  private pickNorwegianVoice(s: SpeechSynthesis): SpeechSynthesisVoice | null {
    try {
      const voices = typeof s.getVoices === 'function' ? s.getVoices() : [];
      const lc = (v: SpeechSynthesisVoice) => String(v?.lang || '').toLowerCase();
      const nm = (v: SpeechSynthesisVoice) => String(v?.name || '').toLowerCase();
      return (
        voices.find((v) => lc(v).startsWith('nb')) ||
        voices.find((v) => lc(v).startsWith('no')) ||
        voices.find((v) => lc(v).startsWith('nn')) ||
        voices.find((v) => lc(v).includes('nor')) ||
        voices.find((v) => nm(v).includes('norsk')) ||
        null
      ) as any;
    } catch {
      return null;
    }
  }

  private hasNorwegianVoice(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const s = (window as any).speechSynthesis as SpeechSynthesis | undefined;
      if (!s) return false;
      try {
        if (typeof s.getVoices === 'function') s.getVoices();
      } catch {}
      return !!this.pickNorwegianVoice(s);
    } catch {
      return false;
    }
  }

  private async speakWithAny(text: string): Promise<boolean> {
    // Konsistent stemme per enhet: har enheten en norsk stemme, bruk den alltid.
    // Ellers faller vi til server-TTS. Vi mikser ikke vilkårlig mellom stemmer.
    if (this.hasNorwegianVoice()) {
      const okLocal = await this.speakWithSynthesis(text);
      if (okLocal) return true;
    }
    if (typeof navigator === 'undefined' || navigator.onLine) {
      const okServer = await this.speakWithServerTts(text).catch(() => false);
      if (okServer) return true;
    }
    return this.speakWithSynthesis(text);
  }

  private speakWithSynthesis(text: string): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false;
      let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
      let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        if (keepAliveTimer) {
          try {
            clearInterval(keepAliveTimer);
          } catch {}
          keepAliveTimer = null;
        }
        if (timeoutTimer) {
          try {
            clearTimeout(timeoutTimer);
          } catch {}
          timeoutTimer = null;
        }
        resolve(ok);
      };
      try {
        const s = (window as any).speechSynthesis as SpeechSynthesis | undefined;
        if (!s) return finish(false);
        try {
          if (typeof s.getVoices === 'function') s.getVoices();
        } catch {}
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'nb-NO';
        u.rate = 1.08;
        u.pitch = 1.0;
        u.volume = 1.0;
        try {
          const v = this.pickNorwegianVoice(s);
          if (v) u.voice = v;
        } catch {}
        u.onend = () => finish(true);
        u.onerror = () => finish(false);
        try {
          if (typeof s.resume === 'function') s.resume();
        } catch {}
        try {
          if (s.speaking || s.pending) s.cancel();
        } catch {}
        // Android: tale-syntesen kan «pause» seg selv etter ~15 sek. Hold den i gang.
        keepAliveTimer = setInterval(() => {
          try {
            if (s.speaking) s.resume();
          } catch {}
        }, 4000);
        // Noen nettlesere (særlig Android) fyrer aldri onend. Sikre at vi aldri henger.
        const estimateMs = Math.min(2600 + text.length * 95, 20000);
        timeoutTimer = setTimeout(() => finish(true), estimateMs);
        try {
          s.speak(u);
        } catch {
          finish(false);
        }
      } catch {
        finish(false);
      }
    });
  }

  private async speakWithServerTts(text: string): Promise<boolean> {
    const trimmed = String(text || '').trim();
    if (!trimmed) return false;
    this.unlockFromGesture();

    let bytes = this.ttsCache.get(trimmed) || null;
    if (!bytes) {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const abortTimer = controller
        ? setTimeout(() => {
            try {
              controller.abort();
            } catch {}
          }, 8000)
        : null;
      try {
        const res = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed }),
          signal: controller ? controller.signal : undefined,
        });
        if (!res.ok) return false;
        bytes = await res.arrayBuffer();
        this.ttsCache.set(trimmed, bytes);
      } catch {
        return false;
      } finally {
        if (abortTimer) {
          try {
            clearTimeout(abortTimer);
          } catch {}
        }
      }
    }

    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) throw new Error('no_audiocontext');
      if (!this.audioCtx) this.audioCtx = new Ctx();
      const ctx = this.audioCtx;
      try {
        if (ctx?.state === 'suspended' && typeof ctx.resume === 'function') await ctx.resume();
      } catch {}
      const decoded: AudioBuffer = await new Promise((resolve, reject) => {
        try {
          const maybe = ctx.decodeAudioData(bytes!.slice(0));
          if (typeof maybe?.then === 'function') {
            maybe.then(resolve).catch(reject);
            return;
          }
          ctx.decodeAudioData(bytes!.slice(0), resolve, reject);
        } catch (e) {
          reject(e);
        }
      });
      await new Promise<void>((resolve) => {
        let settled = false;
        let hardStop: ReturnType<typeof setTimeout> | null = null;
        const finish = () => {
          if (settled) return;
          settled = true;
          if (hardStop) {
            try {
              clearTimeout(hardStop);
            } catch {}
            hardStop = null;
          }
          resolve();
        };
        const src = ctx.createBufferSource();
        src.buffer = decoded;
        try {
          if (src.playbackRate && typeof src.playbackRate.value === 'number') {
            src.playbackRate.value = this.ttsPlaybackRate;
          }
        } catch {}
        try {
          const g = ctx.createGain();
          g.gain.value = this.ttsGain;
          src.connect(g);
          g.connect(ctx.destination);
        } catch {
          try {
            src.connect(ctx.destination);
          } catch {}
        }
        src.onended = finish;
        hardStop = setTimeout(finish, Math.min(3000 + trimmed.length * 110, 20000));
        try {
          src.start();
        } catch {
          finish();
        }
      });
      return true;
    } catch {
      return await this.playWithHtmlAudio(bytes);
    }
  }

  private playWithHtmlAudio(bytes: ArrayBuffer | null): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        if (!bytes) return resolve(false);
        let settled = false;
        let hardStop: ReturnType<typeof setTimeout> | null = null;
        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          if (hardStop) {
            try {
              clearTimeout(hardStop);
            } catch {}
            hardStop = null;
          }
          resolve(ok);
        };
        const blob = new Blob([bytes], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const cleanup = () => {
          try {
            URL.revokeObjectURL(url);
          } catch {}
        };
        const a = new Audio();
        a.preload = 'auto';
        a.volume = 1.0;
        a.src = url;
        a.onended = () => {
          cleanup();
          finish(true);
        };
        a.onerror = () => {
          cleanup();
          finish(false);
        };
        // Sikre at vi aldri henger hvis onended uteblir.
        try {
          const approx = bytes.byteLength / 2 / 16000;
          const waitMs = Math.min(Math.max(4000, approx * 1000 + 2500), 25000);
          hardStop = setTimeout(() => {
            cleanup();
            finish(true);
          }, waitMs);
        } catch {
          hardStop = setTimeout(() => {
            cleanup();
            finish(true);
          }, 15000);
        }
        const p = a.play();
        if (p && typeof (p as any).catch === 'function') {
          (p as any).catch(() => {
            cleanup();
            finish(false);
          });
        }
      } catch {
        resolve(false);
      }
    });
  }
}
