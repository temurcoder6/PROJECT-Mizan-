// O'zbekiston moliya bozoridan jonli ma'lumotlarni (Markaziy Bank kurslari, Bank.uz foizlari, Olcha.uz narxlari, veb qidiruv) yig'ish.
// Har bir so'rov qisqa timeout (2.5s) bilan himoyalangan va keshlanadi, shuning uchun AI hech qachon qotib qolmaydi.

const TTL_MS = 30 * 60 * 1000; // 30 daqiqa kesh
let marketCache = { ts: 0, text: '' };
const searchCache = new Map();

const cleanText = (s) =>
  String(s || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

async function safeFetchText(url, timeoutMs = 2500) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'uz,ru;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export async function fetchCbuRates() {
  try {
    const data = JSON.parse(await safeFetchText('https://cbu.uz/uz/arkhiv-kursov-valyut/json/', 2200));
    if (!Array.isArray(data)) return '';
    const pick = data.filter((x) => ['USD', 'EUR', 'RUB', 'GBP', 'KZT'].includes(x.Ccy));
    if (!pick.length) return '';
    const date = pick[0].Date || '';
    const lines = pick.map((x) => `${x.Ccy}: ${x.Rate} so'm (${Number(x.Diff) >= 0 ? '+' : ''}${x.Diff})`);
    return `MB rasmiy kurslari (${date}): ${lines.join(' | ')}`;
  } catch {
    return '';
  }
}

function extractBankUzSection(html, anchor) {
  const t = cleanText(html);
  const idx = t.indexOf(anchor);
  if (idx === -1) return '';
  return t.slice(idx, idx + 1500);
}

export async function getLiveMarketContext() {
  if (marketCache.text && Date.now() - marketCache.ts < TTL_MS) {
    return marketCache.text;
  }

  const [cbu, fxHtml, depHtml, credHtml, cardHtml] = await Promise.all([
    fetchCbuRates(),
    safeFetchText('https://bank.uz/currency', 2500).catch(() => ''),
    safeFetchText('https://bank.uz/deposits', 2500).catch(() => ''),
    safeFetchText('https://bank.uz/credits', 2500).catch(() => ''),
    safeFetchText('https://bank.uz/cards', 2500).catch(() => ''),
  ]);

  const parts = [];
  if (cbu) parts.push(cbu);

  if (fxHtml) {
    const fxSlice = extractBankUzSection(fxHtml, 'Покупка');
    if (fxSlice) parts.push(`Bank.uz tijorat banklari USD kursi: ${fxSlice.slice(0, 850)}`);
  }
  if (depHtml) {
    const depSlice = extractBankUzSection(depHtml, 'Название вклада');
    if (depSlice) parts.push(`Bank.uz joriy omonatlar (2026): ${depSlice.slice(0, 950)}`);
  }
  if (credHtml) {
    const credSlice = extractBankUzSection(credHtml, 'Название кредита');
    if (credSlice) parts.push(`Bank.uz joriy kredit va mikroqarzlar (2026): ${credSlice.slice(0, 950)}`);
  }
  if (cardHtml) {
    const cardSlice = extractBankUzSection(cardHtml, 'Название карты');
    if (cardSlice) parts.push(`Bank.uz bank kartalari (2026): ${cardSlice.slice(0, 850)}`);
  }

  const combined = parts.join('\n\n');
  if (combined) marketCache = { ts: Date.now(), text: combined };
  return combined;
}

function extractProductQuery(prompt) {
  const s = String(prompt || '').toLowerCase();
  const match = s.match(/(iphone\s*\d*\s*(?:pro\s*max|pro|plus|air)?|samsung\s*(?:galaxy\s*)?[a-z0-9\s]{0,14}|macbook\s*[a-z0-9\s]{0,10}|xiaomi\s*[a-z0-9\s]{0,12}|redmi\s*[a-z0-9\s]{0,12}|airpods\s*[a-z0-9\s]{0,8}|playstation\s*\d?|ps5|noutbuk|televizor|muzlatgich|konditsioner|kir yuvish|planshet|ipad)/i);
  if (!match) return '';
  return match[1].trim().slice(0, 32);
}

export async function searchLiveInternet(prompt) {
  const q = String(prompt || '').trim();
  if (!q || q.length < 3) return '';
  const key = q.toLowerCase().slice(0, 80);
  const hit = searchCache.get(key);
  if (hit && Date.now() - hit.ts < 10 * 60 * 1000) return hit.text;

  const chunks = [];
  const tasks = [];

  const productQ = extractProductQuery(q);
  if (productQ) {
    tasks.push(
      safeFetchText(`https://api.olcha.uz/api/v2/products?q=${encodeURIComponent(productQ)}&per_page=4`, 2400)
        .then((raw) => {
          const json = JSON.parse(raw);
          const list = (json?.data?.products || []).slice(0, 4);
          if (list.length) {
            const items = list.map((p) => {
              const name = p.name_oz || p.name_ru || p.name_en || '';
              const price = Number(p.total_price || p.price || 0).toLocaleString('uz-UZ');
              const monthly = p.monthly_repayment ? ` · oyiga ~${Number(p.monthly_repayment).toLocaleString('uz-UZ')} so'm` : '';
              return `- ${name}: ${price} so'm${monthly}`;
            });
            chunks.push(`Olcha.uz jonli bozor narxlari («${productQ}»):\n${items.join('\n')}`);
          }
        })
        .catch(() => {}),
    );
  }

  // Qidiruv kerak bo'ladigan savollar (bank, foiz, karta, narx, nasiya, kredit, bozor, aksiya) uchun Bing live search
  if (/(bank|karta|foiz|omonat|kredit|mikroqarz|nasiya|uzum|tbc|anor|avo|kapital|ipak|hamkor|agro|xalq|sqb|nbu|infin|alif|iman|payme|click|olcha|asaxiy|texnomart|malika|narx|kurs|dollar|yevro|iphone|samsung|macbook|chevrolet|byd|kia|avto|uy|ipoteka)/i.test(q)) {
    const searchQuery = `${q} O'zbekiston`;
    tasks.push(
      safeFetchText(`https://www.bing.com/search?q=${encodeURIComponent(searchQuery)}`, 2400)
        .then((html) => {
          const snippets = [...html.matchAll(/<li class="b_algo"[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi)]
            .slice(0, 4)
            .map((m) => `- ${cleanText(m[1])}: ${cleanText(m[2])}`)
            .filter((line) => line.length > 12);
          if (snippets.length) {
            chunks.push(`Internet qidiruv natijalari:\n${snippets.join('\n')}`);
          }
        })
        .catch(() => {}),
    );
  }

  await Promise.all(tasks);
  const result = chunks.join('\n\n');
  if (searchCache.size > 40) searchCache.delete(searchCache.keys().next().value);
  searchCache.set(key, { ts: Date.now(), text: result });
  return result;
}
