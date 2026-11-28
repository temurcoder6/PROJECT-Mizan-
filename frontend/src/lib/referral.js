// Referal: ?ref=KOD havolasidan kodni oladi, brauzerda saqlaydi va do'st hisob ochganda serverga yuboriladi.
// Kod faqat 8 ta harf/raqam (server bilan bir xil alfavit); boshqa hamma narsa tashlab yuboriladi.

export const REF_KEY = 'mizan.ref';

export function parseRefCode(search) {
  try {
    const raw = new URLSearchParams(String(search || '')).get('ref') || '';
    const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return /^[A-Z0-9]{8}$/.test(code) ? code : '';
  } catch {
    return '';
  }
}

export function refLink(origin, code) {
  return `${String(origin || '').replace(/\/+$/, '')}/?ref=${code}`;
}

export function captureReferral() {
  if (typeof window === 'undefined') return;
  const code = parseRefCode(window.location.search);
  if (!code) return;
  try {
    // Mavjud hisobi bor kishi ham saqlaydi: server "faqat yangi hisob" qoidasini o'zi tekshiradi.
    localStorage.setItem(REF_KEY, code);
    const url = new URL(window.location.href);
    url.searchParams.delete('ref');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  } catch {
    // saqlash imkonsiz: bonus yo'qoladi, ilova ishlayveradi
  }
}

export function pendingReferral() {
  try {
    return parseRefCode(`ref=${localStorage.getItem(REF_KEY) || ''}`);
  } catch {
    return '';
  }
}

export function clearReferral() {
  try {
    localStorage.removeItem(REF_KEY);
  } catch {
    // e'tiborsiz
  }
}
