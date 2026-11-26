import { useState } from 'react';
import { Lock, ShieldAlert, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Button, Card, CardTitle, inputCls } from '../components/ui';
import { checkMessage } from '../lib/scam';

const VERDICTS = {
  high: { tone: 'bg-rose-500/15 text-rose-200 ring-rose-400/35', title: "Bir nechta jiddiy shubhali belgi bor. Ehtiyot bo'ling.", icon: ShieldAlert },
  mid: { tone: 'bg-ochre/18 text-[#F2C46B] ring-ochre/40', title: "Shubhali belgilar bor. Havolani bosmang va ma'lumot bermang.", icon: TriangleAlert },
  low: { tone: 'bg-ochre/18 text-[#F2C46B] ring-ochre/40', title: 'Kichik shubhali belgilar bor.', icon: TriangleAlert },
  none: { tone: 'bg-turq/14 text-turq-soft ring-turq/30', title: "Men shubhali belgi topmadim, lekin bu xabar xavfsiz degani emas.", icon: ShieldCheck },
};

const LEVEL = { high: 'Jiddiy', mid: "O'rtacha", low: 'Kichik' };

export default function Safety() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const v = result && VERDICTS[result.verdict];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-plaster">Xavfsizlik</h1>

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
        <CardTitle icon={ShieldAlert}>Shubhali xabarni tekshirish</CardTitle>
        <p className="mb-3 text-sm text-plaster/70">
          Shubhali SMS yoki xabar matnini o'zingiz shu yerga qo'ying. Ilova boshqa xabarlaringizni o'qimaydi, matn qurilmangizdan chiqmaydi.
        </p>
        <textarea
          className={`${inputCls} min-h-32`}
          maxLength={5000}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setResult(null);
          }}
          placeholder="Xabar matnini shu yerga qo'ying..."
        />
        <div className="mt-3 flex gap-2">
          <Button disabled={!text.trim()} onClick={() => setResult(checkMessage(text))}>
            Tekshirish
          </Button>
          <Button variant="ghost" onClick={() => { setText(''); setResult(null); }}>
            Tozalash
          </Button>
        </div>

        {result && (
          <div className={`mt-4 rounded-2xl p-4 ring-1 ${v.tone}`}>
            <p className="flex items-start gap-2 font-semibold">
              <v.icon className="mt-0.5 size-5 shrink-0" aria-hidden /> {v.title}
            </p>
            {result.reasons.length > 0 && (
              <ul className="mt-3 space-y-2 text-sm">
                {result.reasons.map((r, i) => (
                  <li key={i} className="rounded-lg border border-plaster/12 bg-[#071633]/85 px-3 py-2 text-plaster">
                    <span className="mr-2 text-[11px] font-bold uppercase opacity-75">{LEVEL[r.level]}</span>
                    {r.text}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs opacity-80">
              Bu tekshiruv faqat umumiy belgilarni qidiradi va havolani internetda tekshirmaydi. Hech qanday xabarni «to'liq xavfsiz» deb kafolatlab bo'lmaydi. Shubhangiz bo'lsa, bank
              ilovasidagi rasmiy raqam orqali o'zingiz bog'laning.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
