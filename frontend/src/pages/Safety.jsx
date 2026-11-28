import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Lock, ShieldAlert, ShieldCheck, Sparkles, TriangleAlert, X } from 'lucide-react';
import { Button, Card, CardTitle, inputCls } from '../components/ui';
import { api } from '../lib/api';
import { checkMessage } from '../lib/scam';

const VERDICTS = {
  high: { tone: 'bg-rose-500/15 text-rose-200 ring-rose-400/35', title: "Jiddiy xavf! Firibgarlik belgilari aniqlandi.", icon: ShieldAlert },
  mid: { tone: 'bg-ochre/18 text-[#F2C46B] ring-ochre/40', title: "Shubhali belgilar bor. Havolani bosmang va ma'lumot bermang.", icon: TriangleAlert },
  low: { tone: 'bg-ochre/18 text-[#F2C46B] ring-ochre/40', title: "Kichik shubhali belgilar bor. Ehtiyot bo'ling.", icon: TriangleAlert },
  none: { tone: 'bg-turq/14 text-turq-soft ring-turq/30', title: "Aniq xavf topilmadi, lekin har doim ehtiyotkor bo'ling.", icon: ShieldCheck },
};

const LEVEL = { high: 'Jiddiy', mid: "O'rtacha", low: 'Kichik' };

export default function Safety() {
  const [text, setText] = useState('');
  const [image, setImage] = useState(null); // { dataUrl, mimeType, name }
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);
  const v = result && VERDICTS[result.verdict];

  const loadImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 6 * 1024 * 1024) {
      alert("Rasm hajmi 6 MB dan oshmasligi kerak.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage({ dataUrl: String(reader.result || ''), mimeType: file.type || 'image/png', name: file.name || 'skrinshot.png' });
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const onPaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const f = item.getAsFile();
        if (f) loadImageFile(f);
        break;
      }
    }
  };

  const runCheck = async () => {
    if ((!text.trim() && !image) || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const ai = await api.checkScam({
        text: text.trim(),
        imageBase64: image?.dataUrl || '',
        mimeType: image?.mimeType || 'image/png',
      });
      if (ai?.ok) {
        setResult({ ...ai, aiPowered: true });
        setLoading(false);
        return;
      }
    } catch {
      // Offline yoki server javob bermasa lokal tekshiruvga tushadi
    }
    const local = checkMessage(text);
    setResult({
      ...local,
      aiPowered: false,
      summary: VERDICTS[local.verdict]?.title,
    });
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 xl:grid xl:max-w-none xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] xl:items-start xl:gap-4 xl:space-y-0">
      <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-plaster xl:col-span-full">Xavfsizlik</h1>

      <Card>
        <CardTitle icon={Lock}>Mizan nimani so'ramaydi</CardTitle>
        <ul className="space-y-1.5 text-sm text-plaster/80">
          <li>• Bank PIN-kodi, karta paroli, CVV yoki SMS tasdiqlash kodini hech qachon so'ramaydi va saqlamaydi.</li>
          <li>• Bank, Click yoki Payme hisobingizga kirish uchun parol so'ramaydi.</li>
          <li>• Telefondagi SMS'larni yashirincha o'qimaydi. Hech qanday SMS ruxsati so'ralmaydi.</li>
          <li>• Click, Payme yoki bankka ulanmagan. Barcha yozuvlarni siz o'zingiz kiritasiz.</li>
        </ul>
        <p className="mt-3 rounded-xl border border-ochre/30 bg-ochre/12 px-3 py-2 text-xs text-[#F2C46B]">
          Eslatma: kimdir o'zini bank xodimi deb kod yoki parol so'rasa, bu firibgarlik. Rasmiy xodim ham bu ma'lumotni so'ramaydi.
        </p>
      </Card>

      <Card>
        <CardTitle icon={ShieldAlert}>
          <span className="flex items-center gap-2">
            Shubhali xabar va skrinshotni AI tekshirish
            <span className="inline-flex items-center gap-1 rounded-full bg-turq/15 px-2 py-0.5 text-[10px] font-bold text-turq-soft ring-1 ring-turq/30">
              <Sparkles className="size-3" /> Mizan AI
            </span>
          </span>
        </CardTitle>
        <p className="mb-3 text-sm text-plaster/70">
          Shubhali SMS, Telegram xabari, havola matnini yozing yoki xabar skrinshotini yuklang. Mizan AI firibgarlik belgilarini darhol tekshirib beradi.
        </p>

        <textarea
          className={`${inputCls} min-h-28`}
          maxLength={4500}
          value={text}
          onPaste={onPaste}
          onChange={(e) => {
            setText(e.target.value);
            setResult(null);
          }}
          placeholder="Shubhali xabar matnini shu yerga yozing yoki nusxasini qo'ying..."
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) loadImageFile(f);
              e.target.value = '';
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <ImagePlus className="size-4 text-ochre" /> Skrinshot / Rasm yuklash
          </Button>
          {image && (
            <div className="relative flex items-center gap-2 rounded-xl border border-plaster/15 bg-[#071633] p-1.5 pr-2.5">
              <img src={image.dataUrl} alt="Yuklangan skrinshot" className="h-10 w-10 rounded-lg object-cover" />
              <span className="max-w-[160px] truncate text-xs text-plaster/80">{image.name}</span>
              <button
                type="button"
                aria-label="Rasmni olib tashlash"
                onClick={() => { setImage(null); setResult(null); }}
                className="rounded-full p-1 text-plaster/55 hover:bg-plaster/10 hover:text-plaster"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <Button disabled={(!text.trim() && !image) || loading} onClick={runCheck}>
            {loading ? <><Loader2 className="size-4 animate-spin" /> AI tekshirmoqda...</> : 'AI bilan tekshirish'}
          </Button>
          <Button variant="ghost" onClick={() => { setText(''); setImage(null); setResult(null); }}>
            Tozalash
          </Button>
        </div>

        {result && (
          <div className={`mt-4 rounded-2xl p-4 ring-1 ${v.tone}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="flex items-start gap-2 font-semibold">
                <v.icon className="mt-0.5 size-5 shrink-0" aria-hidden />
                <span>{result.summary || v.title}</span>
              </p>
              {result.aiPowered && typeof result.riskScore === 'number' && (
                <span className="rounded-full bg-black/25 px-2.5 py-0.5 text-xs font-bold tabular-nums">
                  Xavf darajasi: {result.riskScore}%
                </span>
              )}
            </div>
            {result.reasons?.length > 0 && (
              <ul className="mt-3 space-y-2 text-sm">
                {result.reasons.map((r, i) => (
                  <li key={i} className="rounded-lg border border-plaster/12 bg-[#071633]/85 px-3 py-2 text-plaster">
                    <span className="mr-2 text-[11px] font-bold uppercase opacity-75">{LEVEL[r.level] || 'Belgi'}</span>
                    {r.text}
                  </li>
                ))}
              </ul>
            )}
            {result.advice && (
              <p className="mt-3 rounded-xl border border-plaster/15 bg-[#071633]/65 px-3 py-2 text-xs font-medium text-plaster/90">
                <b>Tavsiya:</b> {result.advice}
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
