import { useRef, useState } from 'react';
import { Bell, Check, Clock, Database, Download, Info, Sparkles, Trash2, Upload } from 'lucide-react';
import { AccountCard, TelegramCard } from '../components/Account';
import { Button, Card, CardTitle, Field, Toggle, inputCls } from '../components/ui';
import { DEPENDS_ON_DEVICE, NEXT_STAGE, WORKS_NOW } from '../lib/status';
import { VOICE_LANGS, voiceInputSupported, voiceOutputSupported } from '../lib/voice';
import { exportCSV, exportJSON, useStore } from '../store';

function List({ items, icon: Icon, tone }) {
  return (
    <ul className="space-y-1.5 text-sm text-slate-700">
      {items.map((t) => (
        <li key={t} className="flex gap-2">
          <Icon className={`mt-0.5 size-4 shrink-0 ${tone}`} aria-hidden />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Settings() {
  const store = useStore();
  const { settings, actions, transactions, debts, goals, profile } = store;
  const fileRef = useRef(null);
  const [msg, setMsg] = useState('');
  const hasSample = [...transactions, ...debts, ...goals].some((x) => x.sample);

  const onImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.app !== 'pulim') throw new Error('format');
      if (!window.confirm("Hozirgi ma'lumotlar import qilinayotgan fayl bilan almashtiriladi. Davom etasizmi?")) return;
      actions.importAll(data);
      setMsg('Tiklandi.');
    } catch {
      setMsg("Fayl o'qilmadi. Mizan'dan yuklab olingan JSON fayl kerak.");
    }
  };

  const wipe = () => {
    if (window.confirm("Barcha yozuv, qarz va maqsadlar shu qurilmadan butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi. Davom etasizmi?")) {
      actions.clearAll();
      setMsg("Hamma ma'lumot o'chirildi.");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Sozlamalar</h1>

      <Card>
        <CardTitle icon={Sparkles}>Ko'rinish va eslatma</CardTitle>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-800">Animatsiyalar</p>
              <p className="text-xs text-slate-500">O'chirsangiz, kirish sahifasi va harakatlar sokin bo'ladi (kuchsiz telefonlar uchun).</p>
            </div>
            <Toggle label="Animatsiyalar" checked={settings.animations} onChange={(v) => actions.setSetting('animations', v)} />
          </div>
          <Field label="Qarz eslatmasi: muddatdan necha kun oldin">
            <select className={inputCls} value={settings.remindDays} onChange={(e) => actions.setSetting('remindDays', Number(e.target.value))}>
              {[1, 3, 5, 7, 14].map((d) => (
                <option key={d} value={d}>
                  {d} kun
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ovozli kiritish tili" hint={voiceInputSupported ? undefined : "Bu brauzerda ovozli kiritish yo'q. Chrome yoki Edge kerak."}>
            <select className={inputCls} value={settings.voiceLang} onChange={(e) => actions.setSetting('voiceLang', e.target.value)}>
              {VOICE_LANGS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-800">Javoblarni ovoz chiqarib o'qish</p>
              <p className="text-xs text-slate-500">Yordamchi javobi avtomatik o'qiladi. Qurilmada shu til uchun ovoz bo'lishi kerak{voiceOutputSupported ? '' : "; bu brauzerda ovoz chiqarish yo'q"}.</p>
            </div>
            <Toggle label="Javoblarni o'qish" checked={settings.autoSpeak} onChange={(v) => actions.setSetting('autoSpeak', v)} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-800">Mikrofon roziligi</p>
              <p className="text-xs text-slate-500">Yoqilgan bo'lsa, mikrofon tugmasi darhol eshitishni boshlaydi. Ovoz saqlanmaydi.</p>
            </div>
            <Toggle label="Mikrofon roziligi" checked={settings.voiceConsent} onChange={(v) => actions.setSetting('voiceConsent', v)} />
          </div>
        </div>
      </Card>

      <AccountCard />
      <TelegramCard />

      <Card>
        <CardTitle icon={Bell}>Eslatma</CardTitle>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-800">Kunlik eslatma</p>
              <p className="text-xs text-slate-500">Kuniga bir marta, yumshoq: «Bugun xarajat bo'ldimi?». Yozgan yoki «xarajat bo'lmadi» deb belgilagan kuni chiqmaydi.</p>
            </div>
            <Toggle label="Kunlik eslatma" checked={profile.reminder.enabled} onChange={(v) => actions.updateProfile({ reminder: { ...profile.reminder, enabled: v } })} />
          </div>
          {profile.reminder.enabled && (
            <>
              <Field label="Vaqti">
                <input type="time" className={inputCls} value={profile.reminder.time} onChange={(e) => actions.updateProfile({ reminder: { ...profile.reminder, time: e.target.value || '21:00' } })} />
              </Field>
              {typeof Notification !== 'undefined' && Notification.permission !== 'granted' && (
                <Button size="sm" variant="outline" onClick={() => Notification.requestPermission().then(() => setMsg(''))}>
                  Bildirishnomaga ruxsat berish
                </Button>
              )}
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Hozircha eslatma ilova (yoki brauzer) ochiq bo'lganda ishlaydi: vaqt kelganda bildirishnoma yoki bosh sahifada eslatma chiqadi. Telefon yopiq bo'lganda keladigan push eslatma uchun server tomonidagi
                bildirishnoma kerak, u keyingi bosqichda.
              </p>
            </>
          )}
        </div>
      </Card>

      <Card>
        <CardTitle icon={Database}>Ma'lumotlaringiz</CardTitle>
        <p className="mb-3 text-sm text-slate-600">
          Hamma ma'lumot faqat shu qurilmadagi brauzerda saqlanadi. Hozircha server yo'q, shuning uchun brauzer ma'lumotini tozalasangiz yoki telefonni almashtirsangiz, yuklab
          olmagan ma'lumot yo'qoladi. Vaqti-vaqti bilan nusxa oling.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportJSON(store)}>
            <Download className="size-4" /> To'liq nusxa (JSON)
          </Button>
          <Button variant="outline" disabled={!transactions.length} onClick={() => exportCSV(transactions)}>
            <Download className="size-4" /> Yozuvlar (CSV)
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> Nusxadan tiklash
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImport} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {hasSample ? (
            <Button variant="ghost" size="sm" onClick={actions.removeSample}>
              Namuna ma'lumotni olib tashlash
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={actions.loadSample}>
              Namuna ma'lumot yuklash
            </Button>
          )}
          <Button variant="danger" size="sm" onClick={wipe}>
            <Trash2 className="size-3.5" /> Hammasini o'chirish
          </Button>
        </div>
        {msg && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</p>}
      </Card>

      <Card>
        <CardTitle icon={Info}>Hozir nima ishlaydi</CardTitle>
        <List items={WORKS_NOW} icon={Check} tone="text-emerald-600" />
        <h3 className="mt-5 mb-2 text-sm font-bold text-slate-900">Qurilma va brauzerga bog'liq</h3>
        <List items={DEPENDS_ON_DEVICE} icon={Info} tone="text-amber-500" />
        <p className="mt-2 text-xs text-slate-500">
          Sizning brauzeringizda: ovozli kiritish {voiceInputSupported ? 'bor' : "yo'q"}, ovoz chiqarib o'qish {voiceOutputSupported ? 'bor' : "yo'q"}.
        </p>
        <h3 className="mt-5 mb-2 text-sm font-bold text-slate-900">Keyingi bosqich (hali ishlamaydi)</h3>
        <List items={NEXT_STAGE} icon={Clock} tone="text-slate-400" />
      </Card>
    </div>
  );
}
