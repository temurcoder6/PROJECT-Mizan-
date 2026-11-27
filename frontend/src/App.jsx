import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChartColumn, ChevronLeft, CreditCard, HandCoins, House, KeyRound, LifeBuoy, ListChecks, Menu, Settings as Cog, ShieldCheck, Sparkles, Target, X } from 'lucide-react';
import { ConflictModal, SyncChip } from './components/Account';
import { GirihField, StarMark } from './components/Girih';
import { ReminderWatcher } from './components/Insights';
import { LITE } from './lib/perf';
import Admin from './pages/Admin';
import Assistant from './pages/Assistant';
import Cards from './pages/Cards';
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
  { id: 'kartalar', label: 'Kartalar', icon: CreditCard, page: Cards },
  { id: 'qarzlar', label: 'Qarzlar', icon: HandCoins, page: Debts },
  { id: 'maqsadlar', label: 'Maqsadlar', icon: Target, page: Goals },
  { id: 'yordamchi', label: 'Yordamchi', icon: Sparkles, page: Assistant },
  { id: 'hisobot', label: 'Hisobot', icon: ChartColumn, page: Reports },
  { id: 'xavfsizlik', label: 'Xavfsizlik', icon: ShieldCheck, page: Safety },
  { id: 'yordam', label: 'Yordam', icon: LifeBuoy, page: Help },
  { id: 'sozlamalar', label: 'Sozlamalar', icon: Cog, page: Settings },
  { id: 'admin', label: 'Admin', icon: KeyRound, page: Admin, adminOnly: true },
];

const MOBILE_TABS = ['bosh', 'yozuvlar', 'kartalar', 'yordamchi', 'maqsadlar'];

function readHash() {
  const h = window.location.hash.replace('#', '');
  if (h.startsWith('/')) return DEMO ? 'bosh' : SITE_PAGES.includes(h) ? h : '';
  if (TABS.some((t) => t.id === h)) return h;
  return DEMO ? 'bosh' : '';
}

function Shell() {
  const [route, setRoute] = useState(readHash);
  const { auth, conflict, settings } = useStore();
  const [conflictHidden, setConflictHidden] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hoveredDock, setHoveredDock] = useState(null);
  const closeTimerRef = useRef(null);
  const isAdmin = auth.status === 'in' && Boolean(auth.user?.isAdmin);
  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  useEffect(() => {
    const onHash = () => setRoute(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const openDrawer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setDrawerOpen(true);
  };

  const scheduleClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setDrawerOpen(false);
      closeTimerRef.current = null;
    }, 180);
  };

  const go = (id) => {
    window.location.hash = id;
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route]);

  if (route === '/film') return isAdmin ? <Film onExit={() => go('/')} /> : <Site page="/" onOpen={() => go('bosh')} />;
  if (route === '/reklama') return isAdmin ? <AdPage onExit={() => go('/')} /> : <Site page="/" onOpen={() => go('bosh')} />;
  if (!route || route.startsWith('/')) return <Site page={route || '/'} onOpen={() => go('bosh')} />;
  const chip = <SyncChip onClick={() => go('sozlamalar')} onConflict={() => setConflictHidden(false)} />;

  const tab = visibleTabs.find((t) => t.id === route) || visibleTabs[0];
  const Page = tab.page;
  const allowMotion = !LITE && settings.animations;

  const dockTransform = (i) => {
    if (!allowMotion || hoveredDock === null) return 'scale-100 translate-y-0';
    const d = Math.abs(hoveredDock - i);
    if (d === 0) return 'scale-[1.28] -translate-y-2 z-10';
    if (d === 1) return 'scale-[1.12] -translate-y-0.5 z-[5]';
    return 'scale-100 translate-y-0';
  };

  return (
    <div className="relative min-h-dvh overflow-x-clip bg-[#060E1F] text-plaster selection:bg-turq/30 selection:text-plaster">
      {!LITE && <GirihField id="app-girih" opacity={0.045} size={112} />}

      {DEMO && (
        <div className="relative z-20 border-b border-ochre/30 bg-[#1A140A] py-1 text-center text-[11px] font-semibold text-[#F2C46B]">
          Namuna ma'lumot bilan. Bosib ko'ring
        </div>
      )}

      <header className="app-glass sticky top-0 z-30 border-b border-plaster/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <button type="button" onClick={() => go('bosh')} className="group flex items-center gap-2.5 text-left">
            <StarMark className="size-8 transition-transform duration-300 group-hover:rotate-45" live />
            <div className="leading-none">
              <span className="font-display block text-lg font-semibold tracking-[-0.02em] text-plaster">Mizan</span>
              <span className="mt-0.5 hidden text-[11px] text-plaster/55 sm:block">Shaxsiy moliya</span>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {chip}
            <button
              type="button"
              onClick={() => go('')}
              className="hidden items-center gap-1 rounded-full border border-plaster/14 bg-plaster/5 px-3 py-1.5 text-xs font-semibold text-plaster/80 transition hover:border-ochre/45 hover:text-plaster sm:inline-flex"
            >
              Sayt <ArrowUpRight className="size-3.5 text-ochre" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Yon panelni ochish"
              aria-expanded={drawerOpen}
              onClick={() => (drawerOpen ? setDrawerOpen(false) : openDrawer())}
              className="inline-flex size-9 items-center justify-center rounded-xl border border-plaster/14 bg-plaster/5 text-plaster/80 transition hover:border-ochre/45 hover:text-plaster"
            >
              <Menu className="size-4.5" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pt-7 lg:pb-32">
        <div className="mx-auto max-w-5xl">
          <div key={route} className={settings.animations ? 'animate-page' : ''}>
            <Page go={go} />
          </div>
        </div>
      </main>

      <ReminderWatcher />
      {conflict && !conflictHidden && <ConflictModal onClose={() => setConflictHidden(true)} />}

      {/* Right-edge hover trigger */}
      <div
        data-testid="right-edge-trigger"
        onMouseEnter={openDrawer}
        onMouseLeave={scheduleClose}
        onClick={openDrawer}
        aria-label="O'ng menyuni ochish"
        className="fixed inset-y-0 right-0 z-40 flex w-4 cursor-pointer items-center justify-end sm:w-5"
      >
        <div
          className={`flex h-24 w-3.5 items-center justify-center rounded-l-full border border-r-0 border-ochre/45 bg-[#0A1F45]/90 text-ochre shadow-lg transition-opacity ${
            drawerOpen ? 'opacity-0' : 'opacity-85 hover:opacity-100'
          }`}
        >
          <ChevronLeft className="size-3" aria-hidden />
        </div>
      </div>

      {/* Right-edge hover-open / hover-close glass drawer */}
      <aside
        data-testid="right-drawer"
        aria-label="O'ng navigatsiya paneli"
        aria-hidden={!drawerOpen}
        onMouseEnter={openDrawer}
        onMouseLeave={scheduleClose}
        className={`app-dock fixed inset-y-3 right-3 z-50 flex w-72 max-w-[calc(100vw-1.5rem)] flex-col rounded-3xl p-4 shadow-2xl transition-all duration-300 ease-out ${
          drawerOpen ? 'pointer-events-auto translate-x-0 opacity-100' : 'pointer-events-none translate-x-[calc(100%+2rem)] opacity-0'
        }`}
      >
        <div className="mb-4 flex items-center justify-between border-b border-plaster/12 pb-3">
          <button
            type="button"
            onClick={() => {
              go('bosh');
              setDrawerOpen(false);
            }}
            className="flex items-center gap-2.5 text-left"
          >
            <StarMark className="size-7" live />
            <div>
              <span className="font-display block text-base font-semibold text-plaster">Mizan</span>
              <span className="block text-[10px] font-medium text-turq-soft">Barcha bo'limlar</span>
            </div>
          </button>
          <button
            type="button"
            aria-label="Panelni yopish"
            onClick={() => setDrawerOpen(false)}
            className="inline-flex size-8 items-center justify-center rounded-lg text-plaster/65 hover:bg-plaster/10 hover:text-plaster"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {visibleTabs.map((t) => {
            const active = t.id === tab.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  go(t.id);
                  setDrawerOpen(false);
                }}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? 'bg-cobalt/90 text-plaster ring-1 ring-ochre/45'
                    : 'text-plaster/70 hover:bg-plaster/10 hover:text-plaster'
                }`}
              >
                <span className="flex items-center gap-3">
                  <t.icon className={`size-4.5 ${active ? 'text-ochre' : ''}`} aria-hidden />
                  {t.label}
                </span>
                {active && <span className="size-1.5 rounded-full bg-turq shadow-[0_0_8px_#1FA6A0]" />}
              </button>
            );
          })}
        </nav>

        <div className="mt-3 space-y-2.5 border-t border-plaster/12 pt-3">
          {chip}
          <button
            type="button"
            onClick={() => {
              go('');
              setDrawerOpen(false);
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-plaster/14 bg-plaster/5 px-3 py-2 text-xs font-semibold text-plaster/80 transition hover:border-ochre/45 hover:text-plaster"
          >
            Landing saytga qaytish <ArrowUpRight className="size-3.5 text-ochre" aria-hidden />
          </button>
          <p className="text-[11px] leading-relaxed text-plaster/45">
            Hisob-kitoblar siz kiritgan ma'lumotga tayanadi, moliyaviy maslahat emas.
          </p>
        </div>
      </aside>

      {/* Apple-style Floating Bottom Dock */}
      <nav
        aria-label="Asosiy dock paneli"
        data-testid="apple-dock"
        className="fixed bottom-3 left-1/2 z-40 max-w-[calc(100vw-1rem)] -translate-x-1/2 pb-[env(safe-area-inset-bottom)] sm:bottom-4"
      >
        <div
          onMouseLeave={() => setHoveredDock(null)}
          className="app-dock hidden items-end gap-1.5 rounded-[26px] px-3 py-2 shadow-2xl md:flex"
        >
          {visibleTabs.map((t, i) => {
            const active = tab.id === t.id;
            return (
              <div key={t.id} className="relative flex flex-col items-center">
                {hoveredDock === i && (
                  <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-plaster/15 bg-[#050C1B]/95 px-2.5 py-1 text-[11px] font-semibold text-plaster shadow-lg">
                    {t.label}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => go(t.id)}
                  onMouseEnter={() => setHoveredDock(i)}
                  aria-label={t.label}
                  aria-current={active ? 'page' : undefined}
                  className={`flex size-10 origin-bottom items-center justify-center rounded-xl transition-all duration-200 ease-out ${dockTransform(i)} ${
                    active
                      ? 'bg-cobalt text-plaster ring-1 ring-ochre/60 shadow-lg shadow-cobalt/40'
                      : 'bg-plaster/[0.06] text-plaster/75 hover:bg-plaster/[0.16] hover:text-plaster'
                  }`}
                >
                  <t.icon className={`size-5 ${active ? 'text-ochre' : ''}`} aria-hidden />
                </button>
                <span className={`mt-1 size-1 rounded-full transition-colors ${active ? 'bg-turq shadow-[0_0_8px_#1FA6A0]' : 'bg-transparent'}`} />
              </div>
            );
          })}
        </div>

        {/* Mobile compact floating dock */}
        <div className="app-dock flex items-center gap-1 rounded-2xl px-2 py-1.5 shadow-2xl md:hidden">
          {MOBILE_TABS.map((id) => {
            const t = TABS.find((x) => x.id === id);
            const active = tab.id === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => go(id)}
                aria-current={active ? 'page' : undefined}
                className={`flex min-w-13 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-semibold transition ${
                  active ? 'bg-cobalt text-plaster ring-1 ring-ochre/50' : 'text-plaster/65 hover:text-plaster'
                }`}
              >
                <t.icon className={`size-4.5 ${active ? 'text-ochre' : ''}`} aria-hidden />
                <span className="truncate">{id === 'maqsadlar' ? 'Maqsad' : t.label}</span>
              </button>
            );
          })}
          <div className="mx-0.5 h-6 w-px bg-plaster/15" />
          <button
            type="button"
            onClick={openDrawer}
            aria-label="Barcha bo'limlar"
            className="flex min-w-12 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-semibold text-plaster/65 hover:text-plaster"
          >
            <Menu className="size-4.5" aria-hidden />
            <span>Menyu</span>
          </button>
        </div>
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
