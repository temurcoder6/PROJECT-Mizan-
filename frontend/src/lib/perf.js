// Kuchsiz qurilmani aniqlaydi: kam yadro yoki xotira, "kamroq harakat" sozlamasi, yoki ?lite=1.
// html elementiga .lite qo'yiladi: blur va doimiy 3D aylanish o'chadi, sayt silliq qoladi.
export function detectLite() {
  if (typeof window === 'undefined') return false;
  const q = new URLSearchParams(location.search);
  if (q.get('lite') === '0') return false;
  if (q.get('lite') === '1') return true;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  return Boolean(reduce || cores <= 2 || mem <= 2);
}

export const LITE = detectLite();
if (typeof document !== 'undefined' && LITE) document.documentElement.classList.add('lite');
