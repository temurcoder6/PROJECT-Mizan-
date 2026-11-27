// Mizan AI Kontent Moderatsiyasi — 18+, haqorat, zo'ravonlik va taqiqlangan mahsulotlarni aniqlash.

const SEVERE_PATTERNS = [
  /\b(porn|porno|xxx|sex|seks|hentai|nude|yalang'och|yalangoch|jinsiy\s+aloqa|fuhsh|fohisha|escort|intim\s+xizmat|порно|секс|интим|проститут|эскорт|нюдс)\b/i,
  /\b(narkotik|geroin|kokain|mefedron|spays|gashish|marixuana|nasha|nashavand|qurol\s+sot|pistolet\s+ol|bomba\s+yas|terror|o'zini\s+o'ldir|suicide|наркотик|героин|кокаин|мефедрон|спайс|гашиш|оружие\s+куп|бомб|суицид)\b/i,
];

const PROFANITY_PATTERNS = [
  /\b(jalab|jalap|fohisha|qanjik|qanjiq|it\s+emgan|haromi|xaromi|ko't|kot|sik|sika|onangni|aming|qo'toq|qotoq|am\s+yala|blya|blyat|suka|nahuy|naxuy|pizdec|pizdets|ebat|yebat|fuck|shit|bitch|asshole|whore|slut|dick|pussy|cunt|хуй|пизд|бля|сука|ебат|нахуй|мудак|гандон|шлюха)\b/i,
];

export function checkModeration(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return { status: 'ok', severity: null, reason: '' };

  for (const rx of SEVERE_PATTERNS) {
    if (rx.test(text)) {
      return {
        status: 'ban',
        severity: 'severe',
        reason: "18+ / taqiqlangan mavzu yoki noqonuniy mahsulot/xizmat so'rovi aniqlandi.",
      };
    }
  }

  for (const rx of PROFANITY_PATTERNS) {
    if (rx.test(text)) {
      return {
        status: 'warn',
        severity: 'profanity',
        reason: "Haqoratli yoki odobsiz so'zlar ishlatildi. Iltimos, hurmat doirasida muloqot qiling.",
      };
    }
  }

  return { status: 'ok', severity: null, reason: '' };
}
