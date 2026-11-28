import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Maximize, Minimize, Pause, Play, RotateCcw } from 'lucide-react';
import { PhoneFrame } from './Site';

// Scripted walkthrough: the page drives the REAL app inside the phone (typing, tapping, asking),
// while the subtitle shows what to say. Record it with OBS and read the subtitles in your own voice.

const CHAPTERS = ['Muammo', 'Kunlik reja', 'Tez kiritish', 'Qarzlar', 'Maqsad', 'Yordamchi', 'Xavfsizlik'];
const CANCEL = 'film-cancel';

const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

function setValue(el, value) {
  const view = el.ownerDocument.defaultView;
  const proto = el.tagName === 'TEXTAREA' ? view.HTMLTextAreaElement.prototype : view.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new view.Event('input', { bubbles: true }));
}

const byText = (doc, text) => [...doc.querySelectorAll('button')].find((b) => !b.disabled && b.textContent.trim().includes(text));

export default function Film({ onExit }) {
  const [run, setRun] = useState(0);
  const [paused, setPaused] = useState(false);
  const [caption, setCaption] = useState('');
  const [chapter, setChapter] = useState(-1);
  const [tap, setTap] = useState(null);
  const [done, setDone] = useState(false);
  const [idle, setIdle] = useState(false);
  const [full, setFull] = useState(false);
  const iframeRef = useRef(null);
  const pausedRef = useRef(false);
  const token = useRef(0);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    let timer;
    const wake = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), 3000);
    };
    const onKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    const onFs = () => setFull(Boolean(document.fullscreenElement));
    wake();
    window.addEventListener('mousemove', wake);
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', wake);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFs);
    };
  }, []);

  useEffect(() => {
    if (run === 0) return undefined;
    const my = ++token.current;
    const alive = () => {
      if (token.current !== my) throw new Error(CANCEL);
    };
    const wait = async (ms) => {
      let t = 0;
      while (t < ms) {
        alive();
        await sleepMs(100);
        if (!pausedRef.current) t += 100;
      }
    };
    const doc = () => iframeRef.current?.contentDocument;
    const waitFor = async (fn, timeout = 8000) => {
      let t = 0;
      while (t < timeout) {
        alive();
        const v = fn();
        if (v) return v;
        await sleepMs(150);
        t += 150;
      }
      return null;
    };
    const place = (el) => {
      const f = iframeRef.current;
      const fr = f.getBoundingClientRect();
      const ratio = fr.width / f.clientWidth;
      const r = el.getBoundingClientRect();
      return { x: fr.left + (r.left + r.width / 2) * ratio, y: fr.top + (r.top + r.height / 2) * ratio };
    };
    const reveal = async (el) => {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      await wait(700);
    };
    const c = {
      say: (t) => setCaption(t),
      chapter: (i) => setChapter(i),
      wait,
      async nav(route) {
        iframeRef.current.contentWindow.location.hash = `#${route}`;
        await wait(900);
        iframeRef.current.contentWindow.scrollTo(0, 0);
      },
      async tapEl(el) {
        await reveal(el);
        setTap(place(el));
        await wait(500);
        el.click();
        await wait(300);
        setTap(null);
      },
      async tapText(text) {
        const el = await waitFor(() => doc() && byText(doc(), text));
        if (el) await c.tapEl(el);
        return Boolean(el);
      },
      async type(selector, text) {
        const el = await waitFor(() => doc()?.querySelector(selector));
        if (!el) return false;
        await reveal(el);
        setTap(place(el));
        el.focus();
        await wait(400);
        setTap(null);
        for (let i = 1; i <= text.length; i++) {
          setValue(el, text.slice(0, i));
          await wait(65);
        }
        return true;
      },
      async scrollTo(selector) {
        const el = await waitFor(() => doc()?.querySelector(selector));
        if (el) await reveal(el);
      },
    };

    const script = async () => {
      setDone(false);
      setChapter(-1);
      setCaption('');
      const ready = await waitFor(() => doc()?.querySelector('main'), 10000);
      if (!ready) {
        c.say("Avto-namoyishni hozir boshlab bo'lmadi. Sahifani yangilab, qayta urinib ko'ring.");
        return;
      }
      await wait(1200);

      c.chapter(0);
      c.say("Oy oxirida har birimiz bir xil savol beramiz: pulim qayerga ketdi? Aslida muhimroq savol boshqa: bugun qancha sarflasam bo'ladi?");
      await c.nav('bosh');
      await wait(8000);

      c.chapter(1);
      c.say("Hozirgi pulingiz va daromad sanangizni bir marta kiriting. Mizan bugungi rejani ko'rsatadi.");
      await wait(5000);
      c.say("Hisobi ham ochiq: pul, to'lovlar, qarz muddati va jamg'arma ajratmasi, kunlarga bo'lingan.");
      await c.tapText('Hisob qanday chiqdi');
      await wait(7000);

      c.chapter(2);
      c.say("Xarajatni yozish ikki bosish: summa va toifa. Nom yozish shart emas. Reja darhol yangilanadi.");
      await c.type('input[aria-label="Xarajat summasi"]', '12000');
      await wait(800);
      await c.tapText('Transport');
      await wait(2500);
      await c.scrollTo('[role="status"]');
      await wait(3500);

      c.chapter(3);
      c.say("Qarz daftari: kim kimga qancha qarz, qancha qaytdi va qachon muddat. Mizan qarz bermaydi va undirmaydi, faqat hisoblaydi.");
      await c.nav('qarzlar');
      await wait(9000);

      c.chapter(4);
      c.say("Telefon uchun yig'ayotgan bo'lsangiz, haftasiga qancha kerakligi hisobi bilan chiqadi. Yozmagan kunlaringiz maqsadga zarar qilmaydi.");
      await c.nav('maqsadlar');
      await wait(7000);
      c.say("«Agar 50 ming sarflasam-chi?» — maqsad rejasi qanchaga o'zgarishini darhol ko'ring.");
      await c.type('input[placeholder="masalan 300 000"]', '50000');
      await wait(7000);

      c.chapter(5);
      c.say("Yordamchiga yozing yoki gapiring. U yozuvni tayyorlaydi, siz tasdiqlamaguncha hech narsa saqlanmaydi.");
      await c.nav('yordamchi');
      await wait(2500);
      await c.type('textarea[placeholder="Xarajat yozing yoki savol bering"]', "50 ming sarflasam, telefon rejam nima bo'ladi?");
      await wait(600);
      const send = doc()?.querySelector('button[aria-label="Yuborish"]');
      if (send) await c.tapEl(send);
      await wait(8000);

      c.chapter(6);
      c.say("Mizan bankka ulanmagan, hamma narsani siz kiritasiz. Ma'lumotni istalgan vaqtda yuklab olish yoki o'chirish mumkin.");
      await c.nav('xavfsizlik');
      await wait(8000);

      c.say("Mizan hali yosh loyiha, lekin hammasi hozir ishlaydi. Sinab ko'ring.");
      setChapter(-1);
      await wait(5000);
      setCaption('');
      setDone(true);
    };

    script().catch((e) => {
      if (e.message !== CANCEL) console.error(e);
    });
    const live = token;
    return () => {
      live.current++;
    };
  }, [run]);

  const start = () => {
    setPaused(false);
    setDone(false);
    setRun((r) => r + 1);
  };
  const toggleFull = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());
  const ctrl = `transition-opacity duration-500 ${idle && run > 0 && !done ? 'opacity-0' : 'opacity-100'}`;

  return (
    <div className={`relative min-h-dvh overflow-hidden bg-[#060E1F] text-plaster ${idle && run > 0 && !done ? 'cursor-none' : ''}`}>
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-cobalt/40 blur-3xl" aria-hidden />

      <div className={`absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 p-4 ${ctrl}`}>
        <button type="button" onClick={onExit} className="flex items-center gap-2 rounded-full border border-plaster/15 bg-plaster/10 px-4 py-2 text-sm font-semibold hover:bg-plaster/20">
          <ArrowLeft className="size-4" /> Saytga
        </button>
        <div className="hidden flex-wrap justify-center gap-1.5 md:flex" aria-label="Bo'limlar">
          {CHAPTERS.map((t, i) => (
            <span key={t} className={`rounded-full px-3 py-1 text-xs font-bold transition ${chapter === i ? 'bg-turq text-cobalt-night' : i < chapter ? 'bg-plaster/20 text-plaster' : 'bg-plaster/5 text-plaster/40'}`}>
              {t}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          {run > 0 && (
            <>
              <button type="button" aria-label={paused ? 'Davom ettirish' : "To'xtatish"} onClick={() => setPaused((p) => !p)} className="rounded-full border border-plaster/15 bg-plaster/10 p-2.5 hover:bg-plaster/20">
                {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
              </button>
              <button type="button" aria-label="Boshidan" onClick={start} className="rounded-full border border-plaster/15 bg-plaster/10 p-2.5 hover:bg-plaster/20">
                <RotateCcw className="size-4" />
              </button>
            </>
          )}
          <button type="button" aria-label="To'liq ekran" onClick={toggleFull} className="rounded-full border border-plaster/15 bg-plaster/10 p-2.5 hover:bg-plaster/20">
            {full ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </button>
        </div>
      </div>

      <div className="mx-auto flex min-h-dvh max-w-4xl flex-col items-center justify-center px-4 pt-16 pb-44">
        <div className="origin-center scale-[.9] sm:scale-100 lg:scale-[1.12]">
          <PhoneFrame route="bosh" iframeRef={iframeRef} runKey={run} fresh showCaption={false} still />
        </div>
      </div>

      {run === 0 && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#060E1F]/92 px-6 text-center backdrop-blur-sm">
          <h1 className="font-display text-5xl font-semibold tracking-tight sm:text-7xl">Mizan</h1>
          <p className="mt-3 max-w-xl text-lg text-plaster/70">Bugun qancha sarflasam bo'ladi? Haqiqiy ilova o'zi ishlab ko'rsatadi. Davomiyligi 2 daqiqa 40 soniya.</p>
          <button type="button" onClick={start} className="mt-8 inline-flex items-center gap-2 rounded-full bg-turq px-8 py-4 text-lg font-bold text-cobalt-night hover:bg-[#32BDB6]">
            <Play className="size-5" /> Boshlash
          </button>
          <ul className="mt-8 max-w-md space-y-1.5 text-left text-sm text-plaster/55">
            <li>• Yozib olish uchun: «To'liq ekran» ni bosing va OBS bilan oynani yozing.</li>
            <li>• Pastdagi matnni o'z ovozingiz bilan o'qing.</li>
            <li>• Bo'sh joy: to'xtatish va davom ettirish.</li>
          </ul>
        </div>
      )}

      {done && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#060E1F]/94 px-6 text-center backdrop-blur-sm">
          <h2 className="font-display text-5xl font-semibold tracking-tight sm:text-6xl">Mizan</h2>
          <p className="mt-3 text-xl text-turq-soft">Sinab ko'ring</p>
          <p className="mt-2 max-w-md text-sm text-plaster/60">Ma'lumotingiz sizniki: yuklab olish va o'chirish istalgan vaqtda mumkin.</p>
          <div className="mt-8 flex gap-3">
            <button type="button" onClick={start} className="inline-flex items-center gap-2 rounded-full border border-plaster/15 bg-plaster/10 px-6 py-3 font-bold hover:bg-plaster/20">
              <RotateCcw className="size-4" /> Qayta
            </button>
            <button type="button" onClick={onExit} className="inline-flex items-center gap-2 rounded-full bg-turq px-6 py-3 font-bold text-cobalt-night">
              Saytga
            </button>
          </div>
        </div>
      )}

      {tap && (
        <span className="pointer-events-none fixed z-40 -translate-x-1/2 -translate-y-1/2" style={{ left: tap.x, top: tap.y }} aria-hidden>
          <span className="absolute size-12 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-turq/60" />
          <span className="block size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-plaster bg-turq/80 shadow-lg" />
        </span>
      )}

      {caption && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-8">
          <p key={caption} className="animate-sheet max-w-3xl rounded-2xl border border-plaster/12 bg-[#050C1B]/85 px-6 py-4 text-center text-lg leading-snug font-semibold text-plaster shadow-2xl backdrop-blur sm:text-2xl">
            {caption}
          </p>
        </div>
      )}
      {paused && run > 0 && !done && <p className="absolute top-20 left-1/2 z-30 -translate-x-1/2 rounded-full bg-ochre px-4 py-1 text-xs font-bold text-cobalt-night">To'xtatildi, Bo'sh joy bilan davom eting</p>}
    </div>
  );
}
