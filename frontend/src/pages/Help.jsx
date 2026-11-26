import { useEffect, useState } from 'react';
import { Check, ChevronDown, Copy, LifeBuoy, Send } from 'lucide-react';
import { Badge, Button, Card, CardTitle, Field, inputCls } from '../components/ui';
import { api } from '../lib/api';
import { useStore } from '../store';

const CATEGORIES = [
  ['muammo', 'Muammo (nimadir ishlamayapti)'],
  ['shikoyat', 'Shikoyat'],
  ['taklif', 'Taklif'],
  ['savol', 'Savol'],
];

const STATUS = { open: ['Ochiq', 'amber'], answered: ['Javob berildi', 'green'], closed: ['Yopilgan', 'slate'] };

const FAQ = [
  ["Ma'lumotim yo'qolib qoldi", "Hisob ochmagan bo'lsangiz, ma'lumot faqat shu brauzerda turadi: brauzer ma'lumotini tozalash yoki boshqa qurilmaga o'tish uni o'chiradi. Sozlamalardan nusxa oling. Hisob ochgan bo'lsangiz, boshqa qurilmadan kirsangiz ma'lumot qaytadi."],
  ["Kunlik reja noto'g'ri ko'rinyapti", "Reja siz kiritgan hozirgi pul va daromad sanasiga tayanadi. Yozilmagan xarajat hisobga kirmaydi, shuning uchun haftada bir «Pulni yangilash» ni bosing. «Hisob qanday chiqdi» tugmasi formulani ko'rsatadi."],
  ["Ovozli kiritish ishlamayapti", "U faqat Chrome yoki Edge'da va mikrofonga ruxsat berilganda ishlaydi. Ishlamasa, yozib kiriting: natija bir xil. Tushunmovchilik bo'lsa, yordamchi tasdiq kartasini ko'rsatadi."],
  ["Parolni unutdim", "Sozlamalar → Hisob → «Parolni unutdim» ni tanlang va ro'yxatdan o'tganda berilgan tiklash kodini kiriting. Kodni ham yo'qotgan bo'lsangiz, hisobga kirib bo'lmaydi: yangi hisob ochib, yuklab olingan nusxadan ma'lumotni tiklashingiz mumkin."],
  ["Telefonda bosh ekranga qo'shish", "Faqat https manzilda ishlaydi. Chrome menyusidan «Bosh ekranga qo'shish» ni tanlang."],
];

export default function Help() {
  const { auth } = useStore();
  const [category, setCategory] = useState('muammo');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [tech, setTech] = useState(true);
  const [state, setState] = useState({ phase: 'idle', id: null, error: '' });
  const [mine, setMine] = useState([]);
  const [copied, setCopied] = useState(false);

  const context = tech ? `sahifa: ${window.location.hash || '/'}; nusxa: ${typeof __BUILD__ === 'string' ? __BUILD__ : 'dev'}; brauzer: ${navigator.userAgent.slice(0, 90)}` : '';
  const draft = `[${category}] ${message.trim()}${contact.trim() ? `\nAloqa: ${contact.trim()}` : ''}${context ? `\n${context}` : ''}`;

  useEffect(() => {
    if (auth.status !== 'in') return;
    api.mySupport().then((r) => setMine(r.tickets)).catch(() => {});
  }, [auth.status, state.id]);

  const submit = async (e) => {
    e.preventDefault();
    setState({ phase: 'sending', id: null, error: '' });
    try {
      const r = await api.support({ category, message, contact, context });
      setState({ phase: 'sent', id: r.id, error: '' });
      setMessage('');
    } catch (err) {
      setState({ phase: err.code ? 'offline' : 'error', id: null, error: err.message });
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const tooShort = message.trim().length < 10;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Yordam va shikoyat</h1>

      <Card>
        <CardTitle icon={LifeBuoy}>Ko'p uchraydigan savollar</CardTitle>
        <div className="divide-y divide-slate-100">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-800">
                {q}
                <ChevronDown className="size-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm text-slate-600">{a}</p>
            </details>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle icon={Send}>Murojaat yuborish</CardTitle>
        {state.phase === 'sent' ? (
          <div className="space-y-3">
            <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
              <Check className="mt-0.5 size-4 shrink-0" /> Murojaatingiz qabul qilindi. Raqami: <b>#{state.id}</b>.{' '}
              {auth.status === 'in' ? "Javob va holat pastdagi «Murojaatlarim» da ko'rinadi." : 'Hisobsiz yuborganingiz uchun javobni bu yerda ko\'ra olmaysiz, aloqa maydonini to\'ldirgan bo\'lsangiz, shu orqali bog\'lanamiz.'}
            </p>
            <Button variant="outline" onClick={() => setState({ phase: 'idle', id: null, error: '' })}>Yana yuborish</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <Field label="Turi">
              <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Xabaringiz" hint={`${message.trim().length}/2000. Nima bo'ldi, qaysi sahifada, nima kutgan edingiz?`}>
              <textarea className={`${inputCls} min-h-32`} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} />
            </Field>
            <Field label="Aloqa (ixtiyoriy)" hint="Telegram @nom yoki telefon. Faqat javob berish uchun ishlatiladi.">
              <input className={inputCls} maxLength={120} value={contact} onChange={(e) => setContact(e.target.value)} />
            </Field>
            <label className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
              <input type="checkbox" className="mt-0.5 size-4 accent-emerald-600" checked={tech} onChange={(e) => setTech(e.target.checked)} />
              Texnik ma'lumot qo'shilsin (sahifa nomi, nusxa vaqti, brauzer turi). Xarajat, qarz yoki maqsad ma'lumoti hech qachon qo'shilmaydi.
            </label>
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Murojaatga parol yoki karta raqamini yozmang.</p>

            {state.phase === 'error' && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>}
            {state.phase === 'offline' && (
              <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                <p>Server ulanmagan, shuning uchun murojaatni bu yerdan yubora olmadim. Matnni nusxalab, o'zingiz yuboring:</p>
                <pre className="max-h-40 overflow-auto rounded-lg bg-white p-2 text-xs whitespace-pre-wrap ring-1 ring-slate-200">{draft}</pre>
                <Button size="sm" variant="outline" type="button" onClick={copy}>
                  <Copy className="size-3.5" /> {copied ? 'Nusxalandi' : 'Nusxalash'}
                </Button>
              </div>
            )}

            <Button type="submit" disabled={tooShort || state.phase === 'sending'}>
              {state.phase === 'sending' ? 'Yuborilmoqda…' : 'Yuborish'}
            </Button>
            <p className="text-xs text-slate-500">Loyiha yosh, javob muddatini kafolatlay olmayman. Murojaatlar faqat shu muammoni hal qilish uchun o'qiladi. Hisobni o'chirsangiz, murojaatlaringiz ham o'chadi.</p>
          </form>
        )}
      </Card>

      {auth.status === 'in' && mine.length > 0 && (
        <Card>
          <CardTitle icon={LifeBuoy}>Murojaatlarim</CardTitle>
          <ul className="space-y-3">
            {mine.map((t) => (
              <li key={t.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">#{t.id} · {CATEGORIES.find((c) => c[0] === t.category)?.[1] || t.category}</span>
                  <Badge tone={(STATUS[t.status] || STATUS.open)[1]}>{(STATUS[t.status] || STATUS.open)[0]}</Badge>
                </div>
                <p className="mt-1 whitespace-pre-line text-slate-700">{t.message}</p>
                {t.reply && <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900"><b>Javob:</b> {t.reply}</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
