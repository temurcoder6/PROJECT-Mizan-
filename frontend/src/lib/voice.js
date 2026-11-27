const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export const voiceInputSupported = Boolean(Recognition);
export const voiceOutputSupported = typeof window !== 'undefined' && (typeof Audio !== 'undefined' || 'speechSynthesis' in window);

export const VOICE_LANGS = [
  { value: 'uz-UZ', label: "O'zbek" },
  { value: 'ru-RU', label: 'Русский' },
  { value: 'en-US', label: 'English' },
];

export function listen({ lang, onResult, onEnd, onError }) {
  const rec = new Recognition();
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e) => {
    let text = '';
    let final = false;
    for (let i = e.resultIndex; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
      if (e.results[i].isFinal) final = true;
    }
    onResult(text, final);
  };
  rec.onerror = (e) => onError?.(e.error);
  rec.onend = () => onEnd?.();
  rec.start();
  return () => {
    try {
      rec.stop();
    } catch {
      // already stopped
    }
  };
}

const SPEECH_LANG = { uz: 'uz-UZ', 'uz-cyrl': 'uz-UZ', ru: 'ru-RU', en: 'en-US' };

let cachedVoices = [];
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const refresh = () => { cachedVoices = window.speechSynthesis.getVoices(); };
  refresh();
  window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
}

export function findVoice(lang) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const want = SPEECH_LANG[lang] || 'uz-UZ';
  const base = want.split('-')[0];
  if (!cachedVoices.length) cachedVoices = window.speechSynthesis.getVoices();
  const voices = cachedVoices;
  return voices.find((v) => v.lang === want) || voices.find((v) => v.lang.startsWith(base)) || null;
}

const ttsCache = new Map();
let activeAudio = null;
let activeAbort = null;

export function stopSpeaking() {
  if (activeAbort) {
    try { activeAbort.abort(); } catch {}
    activeAbort = null;
  }
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch {}
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function speakLocalFallback(text, lang, hooks = {}) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    hooks.onError?.();
    return false;
  }
  const voice = findVoice(lang);
  if (!voice) {
    hooks.onError?.();
    return false;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[•«»*#_`]/g, ''));
  u.voice = voice;
  u.lang = voice.lang;
  u.onstart = () => hooks.onStart?.();
  u.onend = () => hooks.onEnd?.();
  u.onerror = () => hooks.onError?.();
  window.speechSynthesis.speak(u);
  return true;
}

// Gemini Neural TTS orqali odamnikidek tiniq ovozda o'qib beradi; oflaynda brauzer ovoziga o'tadi.
export async function speak(text, lang = 'uz', hooks = {}) {
  const clean = String(text || '').trim();
  if (!clean) return false;
  stopSpeaking();

  const cacheKey = `${hooks.voiceName || 'Kore'}:${clean.slice(0, 1200)}`;
  let blobUrl = ttsCache.get(cacheKey);

  if (!blobUrl) {
    const controller = new AbortController();
    activeAbort = controller;
    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean.slice(0, 1200), voiceName: hooks.voiceName || 'Kore' }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('TTS HTTP ' + res.status);
      const blob = await res.blob();
      if (!blob || blob.size < 100) throw new Error('Empty audio');
      blobUrl = URL.createObjectURL(blob);
      if (ttsCache.size > 25) {
        const firstKey = ttsCache.keys().next().value;
        const oldUrl = ttsCache.get(firstKey);
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        ttsCache.delete(firstKey);
      }
      ttsCache.set(cacheKey, blobUrl);
    } catch (err) {
      if (err?.name === 'AbortError') return false;
      return speakLocalFallback(clean, lang, hooks);
    } finally {
      if (activeAbort === controller) activeAbort = null;
    }
  }

  try {
    const audio = new Audio(blobUrl);
    activeAudio = audio;
    audio.onplay = () => hooks.onStart?.();
    audio.onended = () => {
      if (activeAudio === audio) activeAudio = null;
      hooks.onEnd?.();
    };
    audio.onerror = () => {
      if (activeAudio === audio) activeAudio = null;
      speakLocalFallback(clean, lang, hooks);
    };
    await audio.play();
    return true;
  } catch {
    return speakLocalFallback(clean, lang, hooks);
  }
}
