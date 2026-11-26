const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export const voiceInputSupported = Boolean(Recognition);
export const voiceOutputSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

export const VOICE_LANGS = [
  { value: 'uz-UZ', label: "O'zbek" },
  { value: 'ru-RU', label: 'Русский' },
  { value: 'en-US', label: 'English' },
];

// Audio is handled by the browser's speech service; the app only receives the resulting text
// and never records or stores audio itself.
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

// Brauzer ovozlar ro'yxatini sahifa ochilgandan keyin asta yuklaydi (birinchi so'rovda bo'sh qaytadi),
// shuning uchun oldindan so'rab qo'yamiz va yangilanishini kutamiz.
let cachedVoices = [];
if (voiceOutputSupported) {
  const refresh = () => { cachedVoices = window.speechSynthesis.getVoices(); };
  refresh();
  window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
}

export function findVoice(lang) {
  if (!voiceOutputSupported) return null;
  const want = SPEECH_LANG[lang] || 'uz-UZ';
  const base = want.split('-')[0];
  if (!cachedVoices.length) cachedVoices = window.speechSynthesis.getVoices();
  const voices = cachedVoices;
  return voices.find((v) => v.lang === want) || voices.find((v) => v.lang.startsWith(base)) || null;
}

// Returns false when the device has no voice for the language, so the UI can say so honestly.
export function speak(text, lang) {
  if (!voiceOutputSupported) return false;
  const voice = findVoice(lang);
  if (!voice) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[•«»]/g, ''));
  u.voice = voice;
  u.lang = voice.lang;
  window.speechSynthesis.speak(u);
  return true;
}

export function stopSpeaking() {
  if (voiceOutputSupported) window.speechSynthesis.cancel();
}
