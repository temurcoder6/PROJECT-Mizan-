// "Mizan AI tushuntirsin" savoli: Yordamchi sahifasining kiritish qatoriga qo'yiladi. Yuborilmaydi:
// foydalanuvchi o'zi Yuborish tugmasini bosadi (AI faqat shundagina chaqiriladi).
export const ASK_EVENT = 'mizan:ask';
const ASK_KEY = 'mizan.ai.ask';

export function queueAsk(text) {
  try {
    sessionStorage.setItem(ASK_KEY, text);
  } catch {
    // storage unavailable
  }
  window.dispatchEvent(new CustomEvent(ASK_EVENT));
}

// Navbatdagi savolni oladi va o'chiradi. Yo'q bo'lsa bo'sh satr.
export function takeAsk() {
  try {
    const v = sessionStorage.getItem(ASK_KEY) || '';
    sessionStorage.removeItem(ASK_KEY);
    return v;
  } catch {
    return '';
  }
}
