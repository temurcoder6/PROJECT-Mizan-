import { useEffect, useState } from 'react';
import { ArrowUpRight, BadgePercent, Building2, Check, Copy, Crown, Gift, Sparkles, Store } from 'lucide-react';
import { Button, Card, CardTitle } from '../components/ui';
import ProModal from '../components/ProModal';
import { api } from '../lib/api';

const FALLBACK_PARTNERS = [
  { id: 'tbc_salom', name: 'TBC Bank — Salom Card', category: 'Bank kartasi', badge: '0% P2P + Foyda', tagline: "Bepul ochish va yetkazish · qoldiqqa foiz · 0% P2P o'tkazmalar", benefit: "Oyiga ~100 000 so'mgacha komissiya tejaydi.", url: 'https://tbcbank.uz/uz/cards/salom-card/' },
  { id: 'uzum_karta', name: 'Uzum Bank — Uzum Karta', category: 'Bank kartasi', badge: 'Bepul + Keshbek', tagline: "Bepul virtual/plastik Visa · Uzum ekotizimida keshbek", benefit: "Uzum Market xaridlari va P2P da qulay.", url: 'https://uzumbank.uz/' },
  { id: 'anor_black', name: 'Anorbank — Anor Black / Omonat', category: 'Bank & Omonat', badge: 'Yuqori foiz', tagline: "Keshbek kartasi va yuqori foizli onlayn so'm omonatlari", benefit: "Jamg'armangizni inflyatsiyadan himoya qiladi.", url: 'https://anorbank.uz/' },
  { id: 'olcha_uz', name: 'Olcha.uz', category: "Rasmiy do'kon", badge: 'Naqd + Nasiya', tagline: "Rasmiy kafolatli smartfon va maishiy texnika", benefit: "Naqd va muddatli to'lovni solishtirib xarid qiling.", url: 'https://olcha.uz/' },
  { id: 'uzum_nasiya', name: 'Uzum Market & Uzum Nasiya', category: "Marketpleys & Nasiya", badge: '3–24 oy', tagline: "1 kunda bepul yetkazish · 24 oygacha bo'lib to'lash", benefit: "Aksiyali mahsulotlarda 3 oylik 0% reja.", url: 'https://uzum.uz/' },
  { id: 'alif_nasiya', name: 'Alif Nasiya / Alif Shop', category: "Muddatli to'lov", badge: 'Ochiq shart', tagline: "Shaffof oylik to'lovlar · hamkor do'konlar tarmog'i", benefit: "Yashirin komissiyasiz muddatli to'lov.", url: 'https://alifshop.uz/' },
  { id: 'iman_pay', name: 'Iman Pay', category: 'Islomiy moliya', badge: 'Penyadan xoli', tagline: "Islomiy murabaha tamoyili · kechikish jarimasiz", benefit: "Halol muddatli to'lov izlovchilar uchun.", url: 'https://imanpay.uz/' },
  { id: 'texnomart', name: 'Texnomart', category: 'Texnika tarmog‘i', badge: 'Aksiyalar 0%', tagline: "Butun O'zbekiston bo'ylab maishiy texnika va gadjetlar", benefit: "Mavsumiy chegirma va bonuslar.", url: 'https://texnomart.uz/' },
];

const FILTERS = [
  { id: 'all', label: 'Barchasi' },
  { id: 'bank', label: 'Banklar va kartalar' },
  { id: 'shop', label: "Do'kon va texnika" },
  { id: 'nasiya', label: "Muddatli to'lov" },
];

function matchFilter(p, filter) {
  if (filter === 'all') return true;
  const c = (p.category || '').toLowerCase();
  if (filter === 'bank') return /bank|karta|omonat|kredit|valyuta/.test(c);
  if (filter === 'shop') return /do'kon|texnika|elektronika|market/.test(c);
  if (filter === 'nasiya') return /nasiya|to'lov|islomiy/.test(c);
  return true;
}

export default function Marketplace({ go }) {
  const [partners, setPartners] = useState(FALLBACK_PARTNERS);
  const [filter, setFilter] = useState('all');
  const [claimed, setClaimed] = useState({});
  const [copiedId, setCopiedId] = useState('');
  const [showPro, setShowPro] = useState(false);

  useEffect(() => {
    api.partners().then((r) => {
      if (Array.isArray(r?.partners) && r.partners.length) setPartners(r.partners);
    }).catch(() => {});
  }, []);

  const claim = (p) => {
    const code = `MIZAN-${p.id.toUpperCase().slice(0, 6)}`;
    setClaimed((prev) => ({ ...prev, [p.id]: code }));
    api.trackPartnerClick(p.id, 'marketplace').catch(() => {});
  };

  const copyCode = async (id, code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 1500);
    } catch {}
  };

  const list = partners.filter((p) => matchFilter(p, filter));

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-turq-soft">Foydalanuvchilar uchun tejash · Mizan uchun barqaror daromad</p>
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-plaster">Mizan Bozor va Keshbek</h1>
        </div>
        <Button variant="outline" onClick={() => setShowPro(true)} className="border-ochre/40 text-ochre hover:bg-ochre/15">
          <Crown className="size-4" /> Pro va Biznes rejalar
        </Button>
      </div>

      {/* Mizan daromad modeli (Hakamlar va hamkorlar uchun shaffof ko'rsatkich) */}
      <Card className="border-turq/30 bg-gradient-to-br from-[#0A2148] to-[#071633]">
        <CardTitle icon={Building2}>Mizan ekotizimi qanday qiymat va daromad yaratadi?</CardTitle>
        <div className="grid gap-3 text-xs sm:grid-cols-3">
          <div className="rounded-xl border border-plaster/12 bg-[#061228]/90 p-3">
            <div className="flex items-center gap-1.5 font-bold text-turq-soft">
              <BadgePercent className="size-4" /> 1. Hamkorlik (CPA / Keshbek)
            </div>
            <p className="mt-1.5 text-plaster/75 leading-relaxed">
              Bank kartasi ochish, omonat va texnika xaridlarida hamkorlar Mizan'ga komissiya to'laydi — Siz uchun narx oshmaydi, aksincha vaucher olasiz.
            </p>
          </div>
          <div className="rounded-xl border border-plaster/12 bg-[#061228]/90 p-3">
            <div className="flex items-center gap-1.5 font-bold text-ochre">
              <Crown className="size-4" /> 2. Mizan Pro & Oilaviy obuna
            </div>
            <p className="mt-1.5 text-plaster/75 leading-relaxed">
              Cheksiz Mizan AI, AI Chek Skaneri, oilaviy umumiy byudjet (5 kishigacha) va PDF moliyaviy audit hisobotlari.
            </p>
          </div>
          <div className="rounded-xl border border-plaster/12 bg-[#061228]/90 p-3">
            <div className="flex items-center gap-1.5 font-bold text-plaster">
              <Sparkles className="size-4 text-turq-soft" /> 3. B2B Bank & Biznes moduli
            </div>
            <p className="mt-1.5 text-plaster/75 leading-relaxed">
              Kichik biznes kassa nazorati hamda O'zbekiston banklari uchun tayyor AI moliyaviy tahlil API litsenziyasi.
            </p>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === f.id
                ? 'bg-turq text-cobalt-night shadow'
                : 'border border-plaster/15 bg-[#071633] text-plaster/75 hover:text-plaster'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((p) => {
          const code = claimed[p.id];
          return (
            <Card key={p.id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-semibold text-plaster/55 uppercase">{p.category}</span>
                    <h2 className="mt-0.5 text-base font-bold text-plaster">{p.name}</h2>
                  </div>
                  <span className="shrink-0 rounded-full bg-turq/15 px-2.5 py-0.5 text-[11px] font-bold text-turq-soft ring-1 ring-turq/30">
                    {p.badge}
                  </span>
                </div>
                <p className="mt-2 text-xs text-plaster/75">{p.tagline}</p>
                {p.benefit && <p className="mt-1.5 text-xs font-medium text-ochre/90">{p.benefit}</p>}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-plaster/10 pt-3">
                {code ? (
                  <button
                    type="button"
                    onClick={() => copyCode(p.id, code)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-turq/40 bg-turq/15 px-3 py-1.5 font-mono text-xs font-bold text-turq-soft"
                  >
                    {copiedId === p.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copiedId === p.id ? 'Nusxalandi!' : code}
                  </button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => claim(p)}>
                    <Gift className="size-3.5 text-ochre" /> Vaucher olish
                  </Button>
                )}
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => api.trackPartnerClick(p.id, 'marketplace').catch(() => {})}
                  className="inline-flex items-center gap-1 rounded-xl bg-turq px-3 py-1.5 text-xs font-bold text-cobalt-night transition hover:bg-[#32BDB6]"
                >
                  Saytga o'tish <ArrowUpRight className="size-3.5" />
                </a>
              </div>
            </Card>
          );
        })}
      </div>

      {go && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => go('yordamchi')}>
            <Store className="size-4 text-turq-soft" /> Qaysi biri menga foydali? Mizan AI'dan so'rang →
          </Button>
        </div>
      )}

      <ProModal open={showPro} onClose={() => setShowPro(false)} />
    </div>
  );
}
