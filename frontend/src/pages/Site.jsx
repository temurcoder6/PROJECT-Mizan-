import { useState } from 'react';
import { ArrowRight, ArrowUpRight, ChevronDown, Lock, Menu, X } from 'lucide-react';
import Girih3D from '../components/Girih3D';
import ExplainerVideo from '../components/ExplainerVideo';
import { GirihField, StarBullet, StarMark, starPoints } from '../components/Girih';
import Intro from '../components/Intro';
import Laptop3D from '../components/Laptop3D';
import Phone3D from '../components/Phone3D';
import PromoPhone from '../components/PromoPhone';
import { money } from '../lib/format';
import { DEPENDS_ON_DEVICE, NEXT_STAGE, WORKS_NOW } from '../lib/status';

const NAV = [
  ['/', 'Bosh sahifa'],
  ['/xarajatlar', 'Xarajatlar'],
  ['/qarzlar', 'Qarzlar'],
  ['/maqsadlar', 'Maqsadlar'],
  ['/yordamchi', 'Yordamchi'],
  ['/xavfsizlik', 'Xavfsizlik'],
];
export const SITE_PAGES = [...NAV.map(([p]) => p), '/film', '/reklama'];

const display = 'font-display tracking-[-0.02em]';
const wrap = 'mx-auto w-full max-w-[76rem] px-5 sm:px-8';
const btnLight = 'inline-flex items-center gap-2 rounded-md bg-plaster px-6 py-3.5 font-semibold text-cobalt shadow-[0_10px_24px_-12px_rgb(0_0_0/0.6)] transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turq';
const btnGhost = 'inline-flex items-center gap-2 rounded-md px-5 py-3.5 font-semibold text-plaster ring-1 ring-plaster/30 transition hover:bg-plaster/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turq';
const btnDark = 'inline-flex items-center gap-2 rounded-md bg-cobalt px-6 py-3.5 font-semibold text-plaster shadow-[0_12px_24px_-14px_rgb(14_42_92/0.8)] transition hover:-translate-y-0.5 hover:bg-cobalt-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turq';

// ---------- phone with the real app inside ----------

export const PhoneFrame = Phone3D;

function Tabs({ tabs, i, setI }) {
  return (
    <div role="tablist" className="relative z-20 mx-auto flex w-fit gap-5 border-b border-plaster/15">
      {tabs.map((t, k) => (
        <button
          key={t.label}
          type="button"
          role="tab"
          aria-selected={i === k}
          onClick={() => setI(k)}
          className={`-mb-px border-b-2 pb-2.5 text-[13px] font-semibold transition ${i === k ? 'border-turq text-plaster' : 'border-transparent text-plaster/60 hover:text-plaster'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function LaptopTabs({ tabs }) {
  const [i, setI] = useState(0);
  return (
    <div>
      <Tabs tabs={tabs} i={i} setI={setI} />
      <div className="mt-10">
        <Laptop3D route={tabs[i].route} />
      </div>
      <p className="mt-8 text-center text-xs text-plaster/60">Bu ham haqiqiy ilova (kompyuter ko'rinishi), namuna ma'lumot bilan. Ekran ichida bosib ko'ring.</p>
    </div>
  );
}

function PhoneTabs({ tabs, size = 560 }) {
  const [i, setI] = useState(0);
  return (
    <div className="relative">
      {tabs.length > 1 && <Tabs tabs={tabs} i={i} setI={setI} />}
      <Girih3D size={size} className="mt-4">
        {tabs[i].promo ? <PromoPhone /> : <PhoneFrame route={tabs[i].route} />}
      </Girih3D>
    </div>
  );
}

// ---------- shared pieces ----------

function Logo({ dark = false }) {
  return (
    <a href="#/" className={`flex items-center gap-2.5 ${display} text-lg font-semibold ${dark ? 'text-cobalt' : 'text-plaster'}`}>
      <StarMark className="size-8" />
      Mizan
    </a>
  );
}

function Nav({ page, onOpen }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="glaze-light sticky top-0 z-40 border-b border-cobalt/10">
      <div className={`${wrap} flex h-16 items-center justify-between gap-4`}>
        <Logo dark />
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Sahifalar">
          {NAV.map(([p, label]) => (
            <a
              key={p}
              href={`#${p}`}
              aria-current={page === p ? 'page' : undefined}
              className={`border-b py-1 text-sm font-medium transition ${page === p ? 'border-ochre text-cobalt' : 'border-transparent text-cobalt/65 hover:text-cobalt'}`}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onOpen} className="rounded-md bg-cobalt px-4 py-2 text-sm font-semibold text-plaster transition hover:bg-cobalt-deep">
            Ilovani ochish
          </button>
          <button type="button" aria-label="Menyu" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="rounded-md p-2 text-cobalt hover:bg-cobalt/5 lg:hidden">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-cobalt/10 bg-plaster px-5 pb-3 lg:hidden" aria-label="Sahifalar">
          {NAV.map(([p, label]) => (
            <a key={p} href={`#${p}`} onClick={() => setOpen(false)} className={`block border-b border-cobalt/10 py-3.5 font-medium ${page === p ? 'text-cobalt' : 'text-cobalt/70'}`}>
              {label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

function Footer({ onOpen }) {
  return (
    <footer className="relative overflow-hidden bg-cobalt-night text-plaster/70">
      <GirihField id="g-foot" opacity={0.07} size={120} />
      <div className={`${wrap} relative grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]`}>
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm">Bugun qancha sarflasam bo'ladi? Pul rejasi oddiy tilda, Chiroqchidan.</p>
        </div>
        <div>
          <p className="mb-4 text-sm font-semibold text-plaster">Sahifalar</p>
          <ul className="space-y-2.5 text-sm">
            {NAV.map(([p, label]) => (
              <li key={p}><a href={`#${p}`} className="hover:text-plaster">{label}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-4 text-sm font-semibold text-plaster">Ilova</p>
          <ul className="space-y-2.5 text-sm">
            {[['bosh', 'Bosh sahifa'], ['yozuvlar', 'Yozuvlar'], ['qarzlar', 'Qarz daftari'], ['maqsadlar', 'Maqsadlar'], ['hisobot', 'Hisobot'], ['yordam', 'Yordam va shikoyat']].map(([r, l]) => (
              <li key={r}><a href={`#${r}`} className="hover:text-plaster">{l}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-4 text-sm font-semibold text-plaster">Sinab ko'ring</p>
          <button type="button" onClick={onOpen} className={`${btnLight} px-5 py-2.5 text-sm`}>
            Ilovani ochish <ArrowRight className="size-4" />
          </button>
          <p className="mt-3 text-xs">Ro'yxatdan o'tish shart emas.</p>
          <a href="#/film" className="mt-3 inline-block text-xs underline underline-offset-4 hover:text-plaster">Taqdimot rejimi (avtomatik namoyish)</a>
        </div>
      </div>
      <div className="relative border-t border-plaster/10 px-5 py-6 text-center text-xs">
        Mizan moliyaviy maslahat bermaydi va bank yoki to'lov tizimi bilan bog'liq emas. Hisob-kitoblar siz kiritgan ma'lumotga tayanadi.
        <span className="mt-1 block text-plaster/35">Nusxa: {typeof __BUILD__ === 'string' ? __BUILD__ : 'dev'}</span>
      </div>
    </footer>
  );
}

function Cta({ onOpen, title = "Sinab ko'ring: bir daqiqada boshlash mumkin", text = "Hisob ochish shart emas. Pulingizni kiriting va bugungi rejani ko'ring." }) {
  return (
    <section className="relative overflow-hidden bg-cobalt text-plaster">
      <svg viewBox="0 0 200 200" className="pointer-events-none absolute top-1/2 -right-24 size-[34rem] -translate-y-1/2 opacity-30 sm:right-[6%]" aria-hidden>
        <polygon points={starPoints(100, 100, 96)} fill="none" stroke="#C9962B" strokeWidth="0.6" />
        <polygon points={starPoints(100, 100, 62)} fill="none" stroke="#C9962B" strokeWidth="0.6" />
        <polygon points={starPoints(100, 100, 30)} fill="none" stroke="#C9962B" strokeWidth="0.6" />
      </svg>
      <div className={`${wrap} relative py-24 sm:py-28`}>
        <h2 className={`${display} max-w-2xl text-3xl leading-[1.15] font-semibold text-balance sm:text-[2.6rem]`}>{title}</h2>
        <p className="mt-4 max-w-xl text-plaster/75">{text}</p>
        <button type="button" onClick={onOpen} className={`${btnLight} mt-9 text-base`}>
          Ilovani ochish <ArrowRight className="size-5" />
        </button>
      </div>
    </section>
  );
}

function Calculator() {
  const [cash, setCash] = useState('850000');
  const [bills, setBills] = useState('300000');
  const [days, setDays] = useState('10');
  const n = (s) => Number(String(s).replace(/\s/g, '')) || 0;
  const d = n(days);
  const rest = n(cash) - n(bills);
  const ready = d >= 1 && cash !== '';
  const input = 'w-full border-0 border-b-2 border-cobalt/20 bg-transparent px-0 py-2.5 text-2xl font-semibold tabular-nums text-cobalt outline-none transition focus:border-cobalt';
  const label = 'flex items-center gap-2.5 text-sm font-medium text-cobalt/70';
  const step = 'flex size-5 items-center justify-center rounded-[3px] bg-cobalt text-[11px] font-semibold text-plaster';
  return (
    <div className="grid overflow-hidden rounded-xl ring-1 ring-cobalt/10 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-7 bg-white/70 p-7 sm:p-10">
        <label className="block"><span className={label}><b className={step}>1</b>Hozir qo'lingizda (so'm)</span><input className={input} inputMode="numeric" value={cash} onChange={(e) => setCash(e.target.value.replace(/\D/g, ''))} /></label>
        <label className="block"><span className={label}><b className={step}>2</b>Daromadgacha zarur to'lovlar (so'm)</span><input className={input} inputMode="numeric" value={bills} onChange={(e) => setBills(e.target.value.replace(/\D/g, ''))} /></label>
        <label className="block"><span className={label}><b className={step}>3</b>Daromadgacha necha kun</span><input className={input} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} /></label>
      </div>
      <div className="relative flex flex-col justify-center overflow-hidden bg-cobalt p-7 text-plaster sm:p-10">
        <GirihField id="g-calc" opacity={0.1} size={80} />
        <div className="relative" aria-live="polite">
          {!ready ? (
            <p className="text-sm text-plaster/75">Hisoblash uchun pul va kunlar sonini kiriting. Raqamni o'ylab topmayman.</p>
          ) : rest < 0 ? (
            <>
              <p className="text-sm font-semibold text-[#F2C46B]">Yetishmaydi</p>
              <p className={`${display} mt-1 text-5xl font-semibold tabular-nums sm:text-6xl`}>{money(-rest)}</p>
              <p className="mt-3 text-sm text-plaster/75">To'lovlar qo'lingizdagi puldan ko'p, kunlik summa chiqmaydi.</p>
            </>
          ) : (
            <>
              <p className="flex items-center gap-2 text-sm font-semibold text-turq-soft"><span className="size-2 rounded-full bg-turq" /> Kuniga</p>
              <p key={`${cash}-${bills}-${days}`} className={`${display} mt-1 animate-[tile-in_.45s_cubic-bezier(.16,1,.3,1)_.48s_both] text-5xl font-semibold tabular-nums sm:text-6xl`}>{money(rest / d)}</p>
              <p key={`f-${cash}-${bills}-${days}`} className="formula mt-5 flex flex-wrap items-baseline gap-x-1.5 gap-y-1 border-t border-plaster/15 pt-4 text-sm text-plaster/80 tabular-nums">
                {['Hisob: (', money(n(cash)), '−', money(n(bills)) + ')', '÷', `${d} kun`].map((term, k) => (
                  <span key={k} className="formula-term" style={{ animationDelay: `${k * 80}ms` }}>{term}</span>
                ))}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-plaster/60">Natija kiritgan ma'lumotingizga bog'liq, kafolatlangan mablag' emas. Ilovada qarz muddati va jamg'arma ham hisobga olinadi.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const FAQ = [
  ['Mizan bankka yoki Click/Payme ga ulanganmi?', "Yo'q. Bankdan hech qanday ma'lumot olinmaydi, hamma narsani siz o'zingiz kiritasiz. Shuning uchun kunlik reja siz kiritgan pul va sanaga tayanadi."],
  ["Nega faqat nom va parol so'raladi?", "Ataylab: byudjet ilovasiga pochta, telefon yoki hujjat kerak emas, shuning uchun ularni yig'maymiz (pasport hech qachon so'ralmaydi). Parolni unutsangiz, ro'yxatdan o'tganda berilgan tiklash kodi bilan tiklaysiz. Pochta bilan kirish keyingi bosqichda ixtiyoriy bo'ladi."],
  ["Ma'lumotlarim qayerda saqlanadi?", "Standart holatda faqat sizning qurilmangizdagi brauzerda. Hisob ochsangiz, ma'lumot server bazasiga ham saqlanadi va boshqa qurilmadan ochiladi. Istalgan vaqtda yuklab olish yoki butunlay o'chirish mumkin."],
  ['Parolni unutsam-chi?', "Hisob ochganda sizga bir martalik tiklash kodi ko'rsatiladi. Shu kod va nom bilan yangi parol qo'yasiz, ma'lumot joyida qoladi. Kodni ham yo'qotsangiz, hisobga kirib bo'lmaydi, shuning uchun uni saqlab qo'ying."],
  ['Ovozli kiritish qanchalik aniq?', "Brauzerning nutqni tanish xizmatiga bog'liq. O'zbek tilida ba'zan xato qiladi, shuning uchun summa har doim tasdiq oynasida tekshiriladi va hech narsa tasdiqsiz saqlanmaydi."],
  ["Bu moliyaviy maslahatmi?", "Yo'q. Hisoblar siz kiritgan ma'lumot asosida aniq formulalar bilan chiqariladi. Natija kiritgan ma'lumotingizga bog'liq, kafolatlangan mablag' emas va moliyaviy maslahat o'rnini bosmaydi."],
  ['Narxi qancha?', "Narx hali belgilanmagan. Hozir bu birinchi ishlaydigan nusxa."],
];

// ---------- home ----------

const MOSAIC = [
  { to: '/xarajatlar', title: 'Xarajatlar', text: "Summa yozing, toifani bosing. Hafta va oy hisoboti.", cls: 'sm:col-span-2 sm:row-span-2 bg-cobalt text-plaster', big: true },
  { to: '/qarzlar', title: 'Qarzlar', text: "Kim kimga qancha, qancha qaytdi, qachon muddat.", cls: 'bg-plaster text-cobalt' },
  { to: '/maqsadlar', title: 'Maqsadlar', text: "Telefon uchun haftasiga qancha kerak. Jamg'arma o'yini.", cls: 'bg-[#123569] text-plaster' },
  { to: '/yordamchi', title: 'Yordamchi', text: "Yozing yoki gapiring. Siz tasdiqlamaguncha saqlamaydi.", cls: 'bg-[#123569] text-plaster' },
  { to: '/xavfsizlik', title: 'Xavfsizlik', text: "Ma'lumotingiz qayerda turadi va hozir nima ishlaydi.", cls: 'bg-plaster text-cobalt' },
];

function Home({ onOpen }) {
  return (
    <>
      {/* Birinchi ekran: kobalt maydon, girih yulduzi ichida jonli telefon */}
      <section className="relative overflow-hidden bg-cobalt text-plaster">
        <GirihField id="g-hero" opacity={0.13} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-cobalt-deep to-transparent" aria-hidden />
        <div className={`${wrap} relative grid items-end gap-8 pt-14 pb-16 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[1fr_1.05fr] lg:gap-4 lg:pt-10 lg:pb-20`}>
          <div className="relative z-20 lg:pb-10">
            <h1 className={`${display} text-[2.1rem] leading-[1.1] font-semibold text-balance sm:text-[2.9rem] xl:text-[3.35rem]`}>
              <span className="text-plaster/80">Oy oxirida «pulim qayerga ketdi?» demang.</span> <span className="block text-plaster">Bugunni rejalang.</span>
            </h1>
            <p className="mt-7 max-w-[34rem] text-lg leading-relaxed text-plaster/78">
              Hozirgi pulingiz, daromad sanasi, to'lovlar, qarzlar va jamg'arma maqsadidan kunlik reja. Xarajatni yozish esa bir necha bosishda.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <button type="button" onClick={onOpen} className={`${btnLight} text-base`}>
                Ilovani ochish <ArrowRight className="size-5" />
              </button>
              <a href="#/xarajatlar" className={`${btnGhost} text-base`}>
                Qanday ishlaydi <ArrowUpRight className="size-5" />
              </a>
            </div>
            <p className="mt-8 flex max-w-md items-start gap-2.5 text-[13px] text-plaster/60">
              <Lock className="mt-0.5 size-4 shrink-0" /> Ro'yxatdan o'tish shart emas. Bankka ulanmagan: hamma narsani o'zingiz kiritasiz.
            </p>
          </div>
          <div>
            <PhoneTabs size={800} tabs={[{ label: 'Kunlik reja', route: 'bosh' }, { label: 'Maqsad', route: 'maqsadlar' }, { label: 'Yordamchi', route: 'yordamchi' }, { label: 'Reklama', promo: true }]} />
          </div>
        </div>
      </section>

      {/* Uchta sabab: kartalar emas, keng satrlar, har biri o'z chizig'ida */}
      <ExplainerVideo />
      <section className="bg-plaster text-cobalt">
        <div className={`${wrap} pt-28 pb-24 sm:pt-36`}>
          <h2 className={`${display} max-w-3xl text-[1.85rem] leading-[1.15] font-semibold text-balance sm:text-[2.6rem]`}>Pul kam emas, ko'rinmaydi. Uchta sabab.</h2>
          <div className="mt-16 border-t border-ochre/50">
            {[
              ['Yozish charchatadi', "Daftar uch kunda tashlanadi. Mizan'da xarajat — summa va bitta bosish; unutilgan kunni keyin bir summa bilan to'ldirasiz."],
              ["Naqd pul ko'rinmaydi", "Bank ilovasi faqat o'z kartangizni ko'radi. Mizan'da naqd ham, karta ham bir joyda, siz aytganingizcha."],
              ["Maqsad uzoq tuyuladi", "«Telefon 3 mln» katta raqam. «Haftasiga 140 ming» esa aniq qadam, hisobi bilan."],
            ].map(([t, d], i) => (
              <div key={t} className={`grid gap-3 border-b border-ochre/50 py-9 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-12`}>
                <h3 className={`${display} flex items-start gap-3 text-2xl font-semibold sm:text-[1.7rem]`}>
                  <StarBullet className="mt-2.5 text-ochre" /> {t}
                </h3>
                <p className="max-w-[38rem] text-[17px] leading-relaxed text-cobalt/75">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bo'limlar: koshin mozaikasi, chok sifatida ingichka oltin chiziq */}
      <section className="bg-plaster text-cobalt">
        <div className={`${wrap} pb-28`}>
          <h2 className={`${display} text-[1.85rem] font-semibold sm:text-[2.6rem]`}>Beshta bo'lim, bitta ilova.</h2>
          <div className="mt-12 grid auto-rows-[minmax(12rem,auto)] gap-px overflow-hidden rounded-[2px] bg-ochre p-px sm:grid-cols-4">
            {MOSAIC.map((b) => (
              <a key={b.to} href={`#${b.to}`} className={`group relative flex flex-col justify-end overflow-hidden p-7 transition-colors ${b.cls}`}>
                {b.big && <GirihField id="g-mosaic" opacity={0.14} size={88} />}
                {b.big && (
                  <svg viewBox="0 0 40 40" className="absolute top-7 left-7 size-12 opacity-80 transition-transform duration-700 group-hover:rotate-45" aria-hidden>
                    <polygon points={starPoints(20, 20, 19)} fill="none" stroke="#C9962B" strokeWidth="1" />
                  </svg>
                )}
                <div className="relative">
                  <h3 className={`${display} flex items-center gap-2 font-semibold ${b.big ? 'text-4xl sm:text-5xl' : 'text-2xl'}`}>
                    {b.title} <ArrowUpRight className="size-5 opacity-0 transition group-hover:opacity-100" />
                  </h3>
                  <p className={`mt-2 max-w-sm text-sm leading-relaxed opacity-75 ${b.big ? 'sm:text-base' : ''}`}>{b.text}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Kompyuterda: tun kobalti, keng nafas */}
      <section className="relative overflow-hidden bg-cobalt-night text-plaster">
        <GirihField id="g-laptop" opacity={0.06} size={140} />
        <div className={`${wrap} relative py-28 sm:py-36`}>
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end">
            <h2 className={`${display} text-[1.85rem] leading-[1.15] font-semibold text-balance sm:text-[2.6rem]`}>Telefonda yozing, kompyuterda hisobotni ko'ring.</h2>
            <p className="max-w-md text-plaster/70 lg:justify-self-end">Bir xil ilova har qanday ekranga moslashadi. Hisob ochsangiz, ma'lumot qurilmalar orasida o'zi sinxronlanadi.</p>
          </div>
          <div className="mt-16">
            <LaptopTabs tabs={[{ label: 'Bosh sahifa', route: 'bosh' }, { label: 'Hisobot', route: 'hisobot' }, { label: 'Qarzlar', route: 'qarzlar' }]} />
          </div>
        </div>
      </section>

      {/* Ma'lumot yo'li: uch bekat bitta chiziqda */}
      <section className="bg-plaster text-cobalt">
        <div className={`${wrap} py-24 sm:py-28`}>
          <h2 className={`${display} max-w-xl text-[2rem] font-semibold sm:text-[2.6rem]`}>Ma'lumotingiz qayerda turadi.</h2>
          <ol className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            <span className="pointer-events-none absolute top-[15px] right-[16%] left-[2%] hidden h-px bg-ochre md:block" aria-hidden />
            {[
              ['Qurilmangizda', "Hisob ochmasangiz, hamma narsa faqat shu brauzerda saqlanadi. Serverga hech narsa ketmaydi."],
              ['Serverdagi bazada', "Hisob ochsangiz, yozuvlar SQLite bazasiga saqlanadi va telefon bilan kompyuter bir xil ma'lumotni ko'radi."],
              ["Sizning nazoratingizda", "Yuklab olish, nusxadan tiklash va hisobni butunlay o'chirish istalgan vaqtda mumkin."],
            ].map(([t, d]) => (
              <li key={t} className="relative">
                <StarMark className="relative size-8" />
                <h3 className={`${display} mt-5 text-xl font-semibold`}>{t}</h3>
                <p className="mt-2 max-w-xs leading-relaxed text-cobalt/75">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Uch qadam: tartib muhim, raqam ma'lumot beradi */}
      <section className="relative overflow-hidden bg-cobalt text-plaster">
        <GirihField id="g-steps" opacity={0.1} />
        <div className={`${wrap} relative grid gap-12 py-24 sm:py-32 lg:grid-cols-[0.8fr_1.2fr]`}>
          <h2 className={`${display} text-4xl font-semibold sm:text-5xl lg:sticky lg:top-28 lg:self-start`}>Uch qadam.</h2>
          <ol className="space-y-4">
            {[
              ['1', "Pulingizni bildiring", "Hozirgi pul va keyingi daromad sanasini bir marta kiriting. Bankka ulanish kerak emas."],
              ['2', "Kunlik rejani ko'ring", "Mizan to'lovlar, qarz muddati va jamg'armani ajratib, bugun qancha sarflash mumkinligini ko'rsatadi."],
              ['3', 'Tez yozing', "Xarajatni bir necha bosishda yozing. Yozmagan kun bo'lsa, keyin to'ldirasiz, maqsad hisobi buzilmaydi."],
            ].map(([n, t, d], i) => (
              <li key={n} className={`glaze flex gap-6 rounded-xl p-6 sm:p-8 ${i === 1 ? 'lg:ml-[3rem]' : i === 2 ? 'lg:ml-[6rem]' : ''}`}>
                <span className="relative flex size-14 shrink-0 items-center justify-center">
                  <svg viewBox="0 0 56 56" className="absolute inset-0" aria-hidden>
                    <polygon points={starPoints(28, 28, 27)} fill="none" stroke="#C9962B" strokeWidth="1.2" />
                  </svg>
                  <span className={`${display} relative text-xl font-semibold`}>{n}</span>
                </span>
                <div>
                  <h3 className={`${display} text-xl font-semibold sm:text-2xl`}>{t}</h3>
                  <p className="mt-2 max-w-lg leading-relaxed text-plaster/75">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-plaster-dim/60 text-cobalt">
        <div className={`${wrap} pt-28 pb-20`}>
          <h2 className={`${display} mb-12 max-w-2xl text-[1.85rem] font-semibold sm:text-[2.6rem]`}>Kunlik reja shunday hisoblanadi.</h2>
          <Calculator />
        </div>
      </section>

      <section className="bg-plaster-dim/60 text-cobalt">
        <div className={`${wrap} grid gap-10 pt-12 pb-28 lg:grid-cols-[0.75fr_1.25fr]`}>
          <h2 className={`${display} text-3xl leading-tight font-semibold lg:sticky lg:top-28 lg:self-start`}>Ko'p so'raladigan savollar</h2>
          <div className="border-t border-cobalt/15">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group border-b border-cobalt/15">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[17px] font-medium transition hover:text-cobalt-deep">
                  {q}
                  <ChevronDown className="size-5 shrink-0 text-ochre transition group-open:rotate-180" />
                </summary>
                <p className="max-w-2xl pb-6 leading-relaxed text-cobalt/75">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// ---------- feature pages ----------

const FEATURES = {
  '/xarajatlar': {
    title: "Pulingiz qayerga ketayotganini oy oxirini kutmay ko'ring.",
    lead: "Xarajatni bir necha bosishda yozing. Hafta va oy hisoboti eng ko'p ketgan toifa va takrorlanadigan odatlar bilan.",
    tabs: [{ label: 'Tez kiritish', route: 'bosh' }, { label: 'Yozuvlar', route: 'yozuvlar' }, { label: 'Hisobot', route: 'hisobot' }],
    appRoute: 'yozuvlar',
    steps: [['Summani yozing', "Masalan 12 000. Nom va izoh shart emas."], ['Toifani bosing', "Yaqinda ishlatilgan toifalar birinchi turadi. Bosish bilan saqlanadi, «bekor qilish» bor."], ["Hisobotda ko'ring", "Hafta yoki oy, toifalar, rejalangan va kutilmagan xarajat, to'lov usuli."]],
    points: ["Unutilgan kunni kalendardan tanlab, umumiy summa kiritish yoki «xarajat bo'lmadi» deb belgilash", "Daromadni ham yozish: qoldiq oy bo'yicha chiqadi", "Odat tuzog'i: bir xil nomli xarajat 3+ marta takrorlansa, oylik va yillik narxi ko'rinadi", "Yozuvni tahrirlash va o'chirish, CSV yuklab olish"],
    formula: ["Odat tuzog'i hisobi", "o'rtacha summa × (yozuvlar soni − 1) ÷ birinchi va oxirgi yozuv orasidagi kunlar × 30", "Masalan: kofe 12 000, 10 yozuv, 9 kun → 12 000 × 9 ÷ 9 × 30 = 360 000 so'm/oy. Hozirgi odat davom etsa shunday bo'ladi."],
  },
  '/qarzlar': {
    title: "Kim kimga qancha qarz va qachon qaytadi.",
    lead: "Qarz bergan yoki olganingizni yozing. Qisman qaytarilgan pul, qoldiq va muddat eslatmasi hisoblanadi.",
    tabs: [{ label: 'Qarz daftari', route: 'qarzlar' }],
    appRoute: 'qarzlar',
    steps: [["Qarzni yozing", "Odam nomi, summa, sana va qaytarish muddati."], ["Qaytganini belgilang", "Qisman yoki to'liq. Qoldiq o'zi hisoblanadi."], ["Muddatni kuzating", "Muddat yaqinlashganda ilova ichida eslatadi."]],
    points: ["Men berdim / men oldim alohida ko'rinadi: kimdan qancha kutasiz, kimga qancha qaytarasiz", "Muddati o'tgan va yaqin qarzlar belgilanadi",
      "Qarzni oldindan rejalash: muddatgacha teng haftalik to'lovlar jadvali va shu hafta ajratish kerak summa",
      "Davriy to'lovlar (ijara, internet, kredit): har oy yoki har hafta, keyingi 30 kun va oylik yuk", "Men qaytaradigan qarz muddati daromad sanasigacha bo'lsa, kunlik rejadan ajratib qo'yiladi", "Mizan qarz bermaydi, undirmaydi va to'lov qilmaydi: u faqat siz yozgan qarzlarni hisoblaydi"],
    formula: ["Qoldiq hisobi", "qoldiq = qarz summasi − qaytarilgan pullar yig'indisi", "Masalan: 200 000 so'm qarz, 50 000 qaytdi → 150 000 so'm qoldi."],
  },
  '/maqsadlar': {
    title: "Telefon uchun yig'yapsizmi? Haftasiga qancha kerakligini biling.",
    lead: "Summa va sanani kiriting. Mizan haftalik va oylik jamg'arma summasini hisobi bilan chiqaradi.",
    tabs: [{ label: 'Maqsadlar', route: 'maqsadlar' }],
    appRoute: 'maqsadlar',
    steps: [['Maqsad oching', "Nomi, kerakli summa, hozir yig'ilgani va sana."], ["Rejani ko'ring", "Kuniga, haftasiga va oyiga qancha kerak."], ["Qadam tashlang", "Keyingi kichik qadam taklif qilinadi. Yig'ilgan pulni siz qo'shasiz."]],
    points: ["«Agar shu pulni sarflasam-chi?»: 50 000 sarflansa, haftalik summa qanchaga o'zgarishi", "Jamg'arma o'yini: halqa, 25/50/75/100% bosqichlari, daraja nomi", "Ketma-ket haftalar: haftalik reja bajarilgan haftalar soni", "Xarajat yozmagan kunlaringiz maqsad hisobiga va ketma-ketlikka zarar qilmaydi"],
    formula: ["Haftalik jamg'arma", "haftalik = (maqsad − yig'ilgan) ÷ qolgan haftalar", "Masalan: (3 000 000 − 600 000) ÷ 12,9 hafta = 186 667 so'm. Har hafta bir xil summa yig'ilsa shunday bo'ladi."],
  },
  '/yordamchi': {
    title: "Yozing yoki gapiring. Yordamchi tayyorlaydi, siz tasdiqlaysiz.",
    lead: "«Bugun yo'lga 12 ming sarfladim» desangiz, yozuv tayyor bo'ladi va siz «Saqlash» ni bosmaguningizcha hech narsa saqlanmaydi.",
    tabs: [{ label: 'Yordamchi', route: 'yordamchi' }],
    appRoute: 'yordamchi',
    steps: [["Gapiring yoki yozing", "O'zbek (lotin va kirill), rus yoki ingliz tilida."], ["Tasdiq kartasini tekshiring", "Summa, toifa va sana ko'rinadi, kerak bo'lsa tuzatasiz."], ["Saqlang", "Faqat shundan keyin yozuv qo'shiladi."]],
    points: ["Savollarga javob: «Pulim nimaga ko'p ketdi?», «Qarzimdan qancha qoldi?», «Telefon olishga qancha yig'ishim kerak?»", "«50 ming sarflasam, telefon rejam nima bo'ladi?» — hisobi bilan javob", "«Qayerda kamaytirsam bo'ladi?» — faqat sizning yozuvlaringizdan, formulasi bilan", "Tushunmagan summani o'ylab topmaydi: aniqlashtiruvchi savol beradi", "Javobni ovoz chiqarib o'qish mumkin (qurilmada shu til ovozi bo'lsa)"],
    formula: ["Halollik bilan", "Bu yordamchi hozir qoidalarga asoslangan, katta til modeli emas, shuning uchun murakkab jumlalarni tushunmasligi mumkin. Hisob-kitobni dastur formula bilan qiladi, yordamchi faqat tushuntiradi.", "Ovozli kiritish brauzerning nutqni tanish xizmatiga bog'liq (Chrome, Edge). O'zbek tilida ba'zan xato qiladi, shuning uchun tasdiq kartasi bor. Ovoz yozib olinmaydi va saqlanmaydi."],
  },
};

function FeaturePage({ path, onOpen }) {
  const f = FEATURES[path];
  const idx = NAV.findIndex(([p]) => p === path);
  const next = NAV[(idx + 1) % NAV.length];
  return (
    <>
      <section className="relative overflow-hidden bg-cobalt text-plaster">
        <GirihField id="g-feat" opacity={0.12} />
        <div className={`${wrap} relative grid items-center gap-10 pt-14 pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16 lg:pb-24`}>
          <div>
            <h1 className={`${display} text-[2rem] leading-[1.12] font-semibold text-balance sm:text-[2.7rem]`}>{f.title}</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-plaster/78">{f.lead}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href={`#${f.appRoute}`} className={btnLight}>
                Ilovada ochish <ArrowRight className="size-5" />
              </a>
              <a href={`#${next[0]}`} className={btnGhost}>
                {next[1]} <ArrowUpRight className="size-5" />
              </a>
            </div>
          </div>
          <PhoneTabs tabs={f.tabs} size={820} />
        </div>
      </section>

      <section className="bg-plaster text-cobalt">
        <div className={`${wrap} py-24 sm:py-28`}>
          <ol className="grid gap-10 border-t border-ochre/50 pt-10 md:grid-cols-3 md:gap-8">
            {f.steps.map(([t, d], i) => (
              <li key={t}>
                <span className={`${display} text-sm font-semibold text-cobalt/60`}>{i + 1} / {f.steps.length}</span>
                <h3 className={`${display} mt-3 text-2xl font-semibold`}>{t}</h3>
                <p className="mt-2 max-w-xs leading-relaxed text-cobalt/75">{d}</p>
              </li>
            ))}
          </ol>

          <div className="mt-24 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div>
              <h3 className={`${display} text-3xl font-semibold`}>Nimalar bor</h3>
              <ul className="mt-7 space-y-4">
                {f.points.map((p) => (
                  <li key={p} className="flex gap-3.5 text-[17px] leading-relaxed text-cobalt/85">
                    <StarBullet className="text-ochre" /> {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative self-start overflow-hidden rounded-xl bg-cobalt p-8 text-plaster lg:mt-14">
              <GirihField id="g-formula" opacity={0.1} size={72} />
              <div className="relative">
                <h3 className="text-sm font-semibold text-plaster/70">{f.formula[0]}</h3>
                <p className={`${display} mt-4 text-xl leading-snug font-semibold sm:text-2xl`}>{f.formula[1]}</p>
                <p className="mt-5 border-t border-plaster/15 pt-4 text-sm leading-relaxed text-plaster/75">{f.formula[2]}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Cta onOpen={onOpen} />
    </>
  );
}

// ---------- safety and honest status ----------

function SafetyPage({ onOpen }) {
  return (
    <>
      <section className="relative overflow-hidden bg-cobalt text-plaster">
        <GirihField id="g-safe" opacity={0.12} />
        <div className={`${wrap} relative pt-24 pb-24 sm:pt-32`}>
          <h1 className={`${display} max-w-4xl text-[2rem] leading-[1.12] font-semibold text-balance sm:text-[3.2rem]`}>Sizdan kerak bo'lmagan hech narsani so'ramaymiz.</h1>
          <p className="mt-6 max-w-2xl text-lg text-plaster/78 sm:ml-[18%]">Nima qilmasligimiz, ma'lumotingiz qayerdaligi va hozir nima ishlashi — hammasi shu yerda.</p>
        </div>
      </section>

      <section className="bg-plaster text-cobalt">
        <div className={`${wrap} grid gap-16 py-24 lg:grid-cols-2 lg:gap-20`}>
          <div>
            <h2 className={`${display} text-2xl font-semibold sm:text-3xl`}>Mizan nima qilmaydi</h2>
            <ul className="mt-7 divide-y divide-cobalt/10 border-y border-cobalt/10">
              {[
                "Bank, Click yoki Payme ga ulanmagan: karta, PIN yoki SMS-kod so'ralmaydi va SMS'lar o'qilmaydi",
                "Yordamchi tasdiqsiz yozuv qo'shmaydi, o'chirmaydi va o'zgartirmaydi",
                "Ovozni yozib olmaydi va saqlamaydi",
                "Qarz bermaydi, qarz undirmaydi, to'lov qilmaydi",
              ].map((t) => (
                <li key={t} className="flex gap-3.5 py-4 leading-relaxed text-cobalt/85"><Lock className="mt-1 size-4 shrink-0 text-ochre" /> {t}</li>
              ))}
            </ul>
          </div>
          <div className="lg:mt-20">
            <h2 className={`${display} text-2xl font-semibold sm:text-3xl`}>Ma'lumotingiz</h2>
            <ul className="mt-7 divide-y divide-cobalt/10 border-y border-cobalt/10">
              {[
                "Standart holatda faqat sizning qurilmangizdagi brauzerda saqlanadi",
                "Hisob ochsangiz, serverdagi SQLite bazasiga ham saqlanadi: parol xeshlanadi, har foydalanuvchi faqat o'z ma'lumotini ko'radi",
                "JSON/CSV yuklab olish, tiklash va hisobni butunlay o'chirish mumkin",
                "Ro'yxatdan o'tishda faqat nom va parol so'raladi (pochta, telefon yoki hujjat yo'q); parol tiklash kodi bilan tiklanadi",
                "Shubhali xabarni o'zingiz qo'yasiz; tekshiruv qurilmada ishlaydi va hech qachon «to'liq xavfsiz» demaydi",
              ].map((t) => (
                <li key={t} className="flex gap-3.5 py-4 leading-relaxed text-cobalt/85"><StarBullet className="text-ochre" /> {t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-cobalt-night text-plaster">
        <GirihField id="g-status" opacity={0.06} size={140} />
        <div className={`${wrap} relative py-24 sm:py-28`}>
          <h2 className={`${display} text-3xl font-semibold sm:text-4xl`}>Hozirgi holat</h2>
          <p className="mt-3 text-plaster/65">Bu birinchi ishlaydigan nusxa. Nima tayyor, nima hali yo'qligini yashirmaymiz.</p>
          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            <div className="glaze rounded-xl p-7">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-turq-soft"><span className="size-2 rounded-full bg-turq" /> Hozir ishlaydi</h3>
              <ul className="space-y-2.5 text-sm leading-relaxed">
                {WORKS_NOW.map((t) => (
                  <li key={t} className="flex gap-2.5"><StarBullet className="text-turq-soft" /> {t}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl p-7 ring-1 ring-plaster/15">
              <h3 className="mb-4 text-sm font-semibold text-[#F2C46B]">Qurilmaga bog'liq</h3>
              <ul className="space-y-2.5 text-sm leading-relaxed text-plaster/80">
                {DEPENDS_ON_DEVICE.map((t) => <li key={t} className="flex gap-2.5"><StarBullet className="text-ochre" /> {t}</li>)}
              </ul>
            </div>
            <div className="rounded-xl p-7 ring-1 ring-plaster/10">
              <h3 className="mb-4 text-sm font-semibold text-plaster/60">Keyingi bosqich</h3>
              <ul className="space-y-2.5 text-sm leading-relaxed text-plaster/60">
                {NEXT_STAGE.map((t) => <li key={t} className="flex gap-2.5"><StarBullet className="text-plaster/30" /> {t}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>
      <Cta onOpen={onOpen} />
    </>
  );
}

export default function Site({ page, onOpen }) {
  const [intro, setIntro] = useState(true);
  return (
    <div className="site min-h-dvh overflow-x-clip bg-plaster font-body text-cobalt">
      {intro && <Intro onDone={() => setIntro(false)} />}
      <Nav page={page} onOpen={onOpen} />
      <main>
        {page === '/' && <Home onOpen={onOpen} />}
        {FEATURES[page] && <FeaturePage path={page} onOpen={onOpen} />}
        {page === '/xavfsizlik' && <SafetyPage onOpen={onOpen} />}
      </main>
      <Footer onOpen={onOpen} />
    </div>
  );
}
