const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export const voiceInputSupported = Boolean(Recognition);
export const voiceOutputSupported = false;

export function unlockAudio() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    }
  } catch {}
}

export const VOICE_LANGS = [
  { value: 'uz-UZ', label: "O'zbek" },
  { value: 'ru-RU', label: 'Русский' },
  { value: 'en-US', label: 'English' },
];

export function listen({ lang, onResult, onEnd, onError }) {
  if (!Recognition) {
    onError?.('not-supported');
    return () => {};
  }
  let stopped = false;
  let rec = null;

  try {
    rec = new Recognition();
    rec.lang = lang || 'uz-UZ';
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      let full = '';
      for (let i = 0; i < e.results.length; i++) {
        full += e.results[i][0].transcript;
      }
      if (full) {
        onResult?.(full);
      }
    };

    rec.onerror = (e) => {
      if (e.error === 'no-speech') return;
      if (e.error === 'aborted') {
        if (stopped) onEnd?.();
        return;
      }
      onError?.(e.error);
    };

    rec.onend = () => {
      onEnd?.();
    };

    rec.start();
  } catch {
    onError?.('start-failed');
  }

  return () => {
    stopped = true;
    try {
      rec?.stop();
    } catch {}
  };
}

export function findVoice() {
  return null;
}

export function stopSpeaking() {}

export async function speak() {
  return false;
}
