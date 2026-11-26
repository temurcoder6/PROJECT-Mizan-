import { useEffect, useState } from 'react';
import { ChartColumn, HandCoins, House, LifeBuoy, ListChecks, Settings as Cog, ShieldCheck, Sparkles, Target, Wallet } from 'lucide-react';
import { ConflictModal, SyncChip } from './components/Account';
import { ReminderWatcher } from './components/Insights';
import Assistant from './pages/Assistant';
import Dashboard from './pages/Dashboard';
import Debts from './pages/Debts';
import Goals from './pages/Goals';
import Help from './pages/Help';
import AdPage from './pages/AdPage';
import Film from './pages/Film';
import Reports from './pages/Reports';
import Safety from './pages/Safety';
import Settings from './pages/Settings';
import Site, { SITE_PAGES } from './pages/Site';
import Transactions from './pages/Transactions';
import { DEMO, StoreProvider, useStore } from './store';

const TABS = [
  { id: 'bosh', label: 'Bosh sahifa', icon: House, page: Dashboard },
  { id: 'yozuvlar', label: 'Yozuvlar', icon: ListChecks, page: Transactions },
  { id: 'qarzlar', label: 'Qarzlar', icon: HandCoins, page: Debts },
  { id: 'maqsadlar', label: 'Maqsadlar', icon: Target, page: Goals },
  { id: 'yordamchi', label: 'Yordamchi', icon: Sparkles, page: Assistant },
  { id: 'hisobot', label: 'Hisobot', icon: ChartColumn, page: Reports },
  { id: 'xavfsizlik', label: 'Xavfsizlik', icon: ShieldCheck, page: Safety },
  { id: 'yordam', label: 'Yordam', icon: LifeBuoy, page: Help },
  { id: 'sozlamalar', label: 'Sozlamalar', icon: Cog, page: Settings },
];
const MOBILE_TABS = ['bosh', 'yozuvlar', 'yordamchi', 'qarzlar', 'maqsadlar'];

function readHash() {
  const h = window.location.hash.replace('#', '');
  if (h.startsWith('/')) return DEMO ? 'bosh' : SITE_PAGES.includes(h) ? h : '';
  if (TABS.some((t) => t.id === h)) return h;
  return DEMO ? 'bosh' : '';
}

function Shell() {
  const [route, setRoute] = useState(readHash);
  const { conflict, settings } = useStore();
  const [conflictHidden, setConflictHidden] = useState(false);

  useEffect(() => {
    const onHash = () => setRoute(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (id) => {
    window.location.hash = id;
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route]);

  if (route === '/film') return <Film onExit={() => go('/')} />;
  if (route === '/reklama') return <AdPage onExit={() => go('/')} />;
  if (!route || route.startsWith('/')) return <Site page={route || '/'} onOpen={() => go('bosh')} />;
  const chip = <SyncChip onClick={() => go('sozlamalar')} onConflict={() => setConflictHidden(false)} />;

  const tab = TABS.find((t) => t.id === route) || TABS[0];
  const Page = tab.page;

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      {DEMO && <div className="bg-amber-100 py-0.5 text-center text-[10px] font-semibold text-amber-900">Namuna ma'lumot bilan. Bosib ko'ring</div>}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white p-4 lg:flex">
        <button type="button" onClick={() => go('')} className="mb-6 flex items-center gap-2 text-lg font-bold">
          <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Wallet className="size-4.5" />
          </span>
          Mizan
        </button>
        <nav className="space-y-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => go(t.id)}
              aria-current={t.id === tab.id ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${t.id === tab.id ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <t.icon className="size-4.5" aria-hidden /> {t.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-2">
          {chip}
          <p className="text-[11px] leading-relaxed text-slate-400">Hisob-kitoblar siz kiritgan ma'lumotga tayanadi, moliyaviy maslahat emas.</p>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <button type="button" onClick={() => go('')} className="flex items-center gap-2 font-bold">
          <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Wallet className="size-4" />
          </span>
          Mizan
        </button>
        <div className="flex items-center gap-1">
          {chip}
          {['hisobot', 'yordam', 'sozlamalar'].map((id) => {
            const t = TABS.find((x) => x.id === id);
            return (
              <button key={id} type="button" aria-label={t.label} onClick={() => go(id)} className={`rounded-lg p-2 ${route === id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'}`}>
                <t.icon className="size-5" />
              </button>
            );
          })}
        </div>
      </header>

      <main className="px-4 pt-4 pb-24 lg:ml-60 lg:px-8 lg:py-8 lg:pb-8">
        <div className="mx-auto max-w-5xl">
          <div key={route} className={settings.animations ? 'animate-page' : ''}>
            <Page go={go} />
          </div>
        </div>
      </main>

      <ReminderWatcher />
      {conflict && !conflictHidden && <ConflictModal onClose={() => setConflictHidden(true)} />}

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {MOBILE_TABS.map((id) => {
          const t = TABS.find((x) => x.id === id);
          const active = tab.id === id;
          return (
            <button key={id} type="button" onClick={() => go(id)} aria-current={active ? 'page' : undefined} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${active ? 'text-emerald-700' : 'text-slate-500'}`}>
              <t.icon className="size-5" aria-hidden />
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
