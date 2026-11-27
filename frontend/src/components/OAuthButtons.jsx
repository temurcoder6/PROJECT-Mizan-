import { useEffect, useState } from 'react';
import { ArrowRight, Check, Copy, KeyRound, Mail, X } from 'lucide-react';
import { api } from '../lib/api';
import { useStore } from '../store';
import { GirihField } from './Girih';

let cachedProviders = null;
let inflight = null;

export function useAuthProviders() {
  const [state, setState] = useState(() =>
    cachedProviders ? { loading: false, offline: false, ...cachedProviders } : { loading: true, offline: false, google: false, github: false, demo: false },
  );

  useEffect(() => {
    if (cachedProviders) return undefined;
    let alive = true;
    inflight =
      inflight ||
      api
        .authProviders()
        .then((r) => {
          cachedProviders = { google: Boolean(r.google), github: Boolean(r.github), demo: Boolean(r.demo) };
          return cachedProviders;
        })
        .catch(() => null);

    inflight.then((res) => {
      if (!alive) return;
      if (res) setState({ loading: false, offline: false, ...res });
      else setState({ loading: false, offline: true, google: false, github: false, demo: false });
    });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}

export function GoogleMark({ className = 'size-4.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.87c2.26-2.08 3.57-5.15 3.57-8.64Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.96H1.28v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.28 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.28V6.62H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.38l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.76c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.94 1.19 15.23 0 12 0A12 12 0 0 0 1.28 6.62l4 3.1C6.23 6.87 8.88 4.76 12 4.76Z" />
    </svg>
  );
}

export function GitHubMark({ className = 'size-4.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 1.5C6.2 1.5 1.5 6.2 1.5 12c0 4.64 3.01 8.58 7.18 9.97.53.1.72-.23.72-.51v-1.8c-2.92.63-3.54-1.41-3.54-1.41-.48-1.22-1.17-1.54-1.17-1.54-.96-.65.07-.64.07-.64 1.06.08 1.62 1.09 1.62 1.09.94 1.61 2.47 1.15 3.07.88.1-.68.37-1.15.67-1.41-2.33-.27-4.78-1.16-4.78-5.18 0-1.15.41-2.08 1.08-2.82-.11-.26-.47-1.33.1-2.77 0 0 .88-.28 2.89 1.08a10.02 10.02 0 0 1 5.26 0c2.01-1.36 2.89-1.08 2.89-1.08.57 1.44.21 2.51.1 2.77.67.74 1.08 1.67 1.08 2.82 0 4.03-2.46 4.91-4.8 5.17.38.32.72.97.72 1.96v2.91c0 .28.19.62.73.51A10.5 10.5 0 0 0 22.5 12c0-5.8-4.7-10.5-10.5-10.5Z"
      />
    </svg>
  );
}

export const OAUTH_ERROR_TEXT = {
  not_configured: 'Bu kirish usuli hozircha faol emas.',
  cancelled: 'Kirish bekor qilindi.',
  invalid_state: "Xavfsizlik tekshiruvi muddati tugadi yoki mos kelmadi. Qayta urinib ko'ring.",
  already_linked: 'Bu Google yoki GitHub hisobi boshqa Mizan hisobiga allaqachon ulangan.',
  already_provider: 'Bu turdagi hisob allaqachon ulangan.',
  rate_limit: "Juda ko'p urinish. Bir necha daqiqadan keyin qayta urinib ko'ring.",
  provider_error: "Google yoki GitHub bilan bog'lanishda xato yuz berdi. Qayta urinib ko'ring.",
};

export function consumeOAuthQuery() {
  if (typeof window === 'undefined' || !window.location.search) return { error: '', linked: '', provider: '' };
  const sp = new URLSearchParams(window.location.search);
  const error = sp.get('oauth_error') || '';
  const linked = sp.get('oauth') || '';
  const provider = sp.get('provider') || '';
  if (error || linked) {
    sp.delete('oauth_error');
    sp.delete('oauth');
    sp.delete('provider');
    const q = sp.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`);
  }
  return { error, linked, provider };
}

function DirectProviderModal({ provider, open, onClose, next = '#bosh', onOpen }) {
  const { authActions } = useStore();
  const [tab, setTab] = useState('register'); // 'register' | 'login'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recovery, setRecovery] = useState('');
  const [savedCode, setSavedCode] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const isGoogle = provider === 'google';
  const name = isGoogle ? 'Google (Gmail)' : 'GitHub';
  const Icon = isGoogle ? GoogleMark : GitHubMark;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    let idClean = identifier.trim();
    if (!idClean) {
      setError(isGoogle ? 'Gmail pochtangizni kiriting.' : 'GitHub nomingiz yoki pochtangizni kiriting.');
      return;
    }
    if (isGoogle && !idClean.includes('@')) {
      idClean = `${idClean}@gmail.com`;
      setIdentifier(idClean);
    }
    if (!password || password.length < 8) {
      setError("Parol kamida 8 ta belgidan iborat bo'lishi kerak.");
      return;
    }

    setBusy(true);
    try {
      const res = await authActions.authenticate(tab, idClean, password);
      if (res.recoveryCode) {
        setRecovery(res.recoveryCode);
      } else {
        onClose();
        if (onOpen) onOpen();
        else window.location.hash = next || '#bosh';
      }
    } catch (err) {
      const msg = err.message || '';
      if (tab === 'register' && (msg.includes('band') || msg.includes('mavjud'))) {
        setError(`Bu ${isGoogle ? 'Gmail' : 'hisob'} allaqachon ro'yxatdan o'tgan. 'Kirish' yorlig'iga o'tib parolingizni kiriting.`);
      } else if (tab === 'login' && msg.includes('noto')) {
        setError("Kiritilgan pochta yoki parol noto'g'ri. Qayta tekshiring.");
      } else {
        setError(msg || 'Xatolik yuz berdi');
      }
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(recovery);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-plaster/20 bg-[#0A1F45] p-6 text-plaster shadow-2xl sm:p-7">
        <GirihField id="g-modal-auth" opacity={0.08} size={84} />
        
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-plaster/60 transition hover:bg-white/10 hover:text-plaster"
          aria-label="Yopish"
        >
          <X className="size-5" />
        </button>

        {recovery ? (
          <div className="relative space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-turq-soft">
              <span className="size-2 rounded-full bg-turq" /> Hisob muvaffaqiyatli ochildi!
            </div>
            <h3 className="font-display text-xl font-bold">Xavfsizlik: Tiklash kodingiz</h3>
            <p className="text-xs text-plaster/80">
              Sizning hisobingiz: <b className="text-white">{identifier}</b>.<br />
              Parolni unutsangiz hisobni shu kod bilan tiklaysiz. Kod faqat bir marta ko'rsatiladi:
            </p>
            <p className="rounded-lg border border-ochre/60 bg-[#071633] px-3.5 py-3 text-center font-mono text-base font-semibold tracking-wider text-ochre select-all">
              {recovery}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyCode}
                className="inline-flex items-center gap-1.5 rounded-lg border border-plaster/25 px-3 py-1.5 text-xs font-semibold text-plaster transition hover:bg-white/10"
              >
                <Copy className="size-3.5" /> {copied ? 'Nusxalandi!' : 'Kodni nusxalash'}
              </button>
            </div>
            <label className="flex cursor-pointer items-center gap-2.5 pt-2 text-xs text-plaster/85">
              <input
                type="checkbox"
                className="size-4 rounded accent-[#1FA6A0]"
                checked={savedCode}
                onChange={(e) => setSavedCode(e.target.checked)}
              />
              Kodni saqlab oldim
            </label>
            <button
              type="button"
              disabled={!savedCode}
              onClick={() => {
                onClose();
                if (onOpen) onOpen();
                else window.location.hash = next || '#bosh';
              }}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-turq px-4 py-2.5 text-sm font-bold text-cobalt shadow-lg transition hover:bg-[#32BDB6] disabled:opacity-45"
            >
              Ilovaga kirish <ArrowRight className="size-4" />
            </button>
          </div>
        ) : (
          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white shadow">
                <Icon className="size-6" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold">{name} bilan kirish</h3>
                <p className="text-xs text-plaster/70">Haqiqiy pochtangiz bilan tizimga ulaning</p>
              </div>
            </div>

            <div className="flex rounded-lg bg-black/25 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setTab('register'); setError(''); }}
                className={`flex-1 rounded-md py-1.5 transition ${tab === 'register' ? 'bg-turq text-cobalt font-bold shadow' : 'text-plaster/70 hover:text-plaster'}`}
              >
                Ro'yxatdan o'tish
              </button>
              <button
                type="button"
                onClick={() => { setTab('login'); setError(''); }}
                className={`flex-1 rounded-md py-1.5 transition ${tab === 'login' ? 'bg-turq text-cobalt font-bold shadow' : 'text-plaster/70 hover:text-plaster'}`}
              >
                Kirish
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 pt-1">
              <div>
                <label className="mb-1 block text-xs font-medium text-plaster/80">
                  {isGoogle ? 'Gmail pochtangiz' : 'Pochta yoki login'}
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-plaster/40" />
                  <input
                    type={isGoogle ? 'email' : 'text'}
                    autoComplete={isGoogle ? 'email' : 'username'}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={isGoogle ? 'ismingiz@gmail.com' : 'username yoki email'}
                    className="w-full rounded-xl border border-plaster/20 bg-black/25 py-2.5 pr-3 pl-9 text-sm text-plaster placeholder:text-plaster/35 focus:border-turq focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-medium text-plaster/80">
                    Mizan uchun parol
                  </label>
                  <span className="text-[10px] text-ochre">Shaxsiy Google parolingiz emas</span>
                </div>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-plaster/40" />
                  <input
                    type="password"
                    autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Kamida 8 ta belgi"
                    className="w-full rounded-xl border border-plaster/20 bg-black/25 py-2.5 pr-3 pl-9 text-sm text-plaster placeholder:text-plaster/35 focus:border-turq focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[11px] text-plaster/60">
                  Xavfsizlik: O'zingiz eslab qoladigan yangi parol kiriting.
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-turq py-2.5 text-sm font-bold text-cobalt shadow-md transition hover:bg-[#32BDB6] disabled:opacity-50"
              >
                {busy ? 'Tekshirilmoqda…' : tab === 'register' ? `${name} hisobini ochish` : `${name} bilan kirish`}
                <ArrowRight className="size-4" />
              </button>
            </form>

            <div className="border-t border-plaster/10 pt-3 text-[11px] text-plaster/50">
              <p>
                <b>1-bosqichli (1-click) OAuth haqida:</b> Google Cloud Console orqali bevosita kirish uchun 
                <code className="mx-1 rounded bg-black/30 px-1 py-0.5 text-ochre">backend/.env</code> ga 
                <code className="mx-1 rounded bg-black/30 px-1 py-0.5 text-ochre">GOOGLE_CLIENT_ID</code> yoziladi.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OAuthButtons({ theme = 'site', mode = 'login', next = '#bosh', exclude = [], onOpen }) {
  const { auth } = useStore();
  const isAdmin = auth.status === 'in' && Boolean(auth.user?.isAdmin);
  const providers = useAuthProviders();
  const [modalProvider, setModalProvider] = useState(null);

  const list = [
    { id: 'google', name: 'Google', icon: GoogleMark, ready: providers.google },
    { id: 'github', name: 'GitHub', icon: GitHubMark, ready: providers.github },
  ].filter((p) => !exclude.includes(p.id));

  if (!list.length) return null;

  const isSite = theme === 'site';
  const verb = mode === 'link' ? 'ulash' : 'bilan davom etish';

  return (
    <>
      <div className="space-y-2.5">
        <div className="grid gap-2.5 sm:grid-cols-2">
          {list.map((p) => {
            const Icon = p.icon;
            const label = `${p.name} ${verb}`;
            
            // Agar serverda to'liq OAuth (Google Cloud Client ID) sozlangan bo'lsa:
            if (p.ready) {
              return (
                <a
                  key={p.id}
                  href={`/api/auth/${p.id}?next=${encodeURIComponent(next)}`}
                  className={
                    isSite
                      ? p.id === 'google'
                        ? 'flex items-center justify-center gap-2.5 rounded-md bg-plaster px-4 py-3 text-sm font-semibold text-cobalt shadow-[0_8px_20px_-12px_rgb(0_0_0/0.6)] transition hover:-translate-y-0.5 hover:bg-white'
                        : 'flex items-center justify-center gap-2.5 rounded-md border border-plaster/30 bg-cobalt-night/70 px-4 py-3 text-sm font-semibold text-plaster transition hover:-translate-y-0.5 hover:border-ochre hover:bg-cobalt-deep'
                      : 'flex items-center justify-center gap-2 rounded-xl bg-[#0A1F45] px-3.5 py-2.5 text-sm font-semibold text-plaster ring-1 ring-plaster/20 transition hover:border-ochre/50 hover:bg-[#123066]'
                  }
                >
                  <Icon className="size-4.5 shrink-0" />
                  <span>{label}</span>
                </a>
              );
            }

            // Agar Google Cloud Client ID hali kiritilmagan bo'lsa, to'g'ridan-to'g'ri haqiqiy Gmail bilan kirish modalini ochadi:
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setModalProvider(p.id)}
                className={
                  isSite
                    ? p.id === 'google'
                      ? 'flex items-center justify-center gap-2.5 rounded-md bg-white px-4 py-3 text-sm font-semibold text-[#1f1f1f] shadow-[0_8px_20px_-12px_rgb(0_0_0/0.6)] transition hover:-translate-y-0.5 hover:bg-[#f8f9fa]'
                      : 'flex items-center justify-center gap-2.5 rounded-md border border-plaster/20 bg-cobalt-deep/70 px-4 py-3 text-sm font-semibold text-plaster/85 transition hover:border-ochre/60 hover:text-plaster'
                    : 'flex items-center justify-center gap-2 rounded-xl border border-plaster/16 bg-[#071633]/80 px-3.5 py-2.5 text-sm font-semibold text-plaster/85 transition hover:border-ochre/45 hover:text-plaster'
                }
              >
                <Icon className="size-4.5 shrink-0" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {isAdmin && !providers.google && (
          <p className="text-[11px] leading-relaxed text-plaster/50">
            Admin eslatmasi: Google 1-bosqichli (1-click) OAuth uchun <code className="text-ochre">backend/.env</code> ga <code className="text-ochre">GOOGLE_CLIENT_ID</code> va <code className="text-ochre">GOOGLE_CLIENT_SECRET</code> yoziladi.
          </p>
        )}
      </div>

      <DirectProviderModal
        provider={modalProvider}
        open={Boolean(modalProvider)}
        onClose={() => setModalProvider(null)}
        next={next}
        onOpen={onOpen}
      />
    </>
  );
}
