import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useStore } from '../store';

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

export default function OAuthButtons({ theme = 'site', mode = 'login', next = '#bosh', exclude = [] }) {
  const { auth } = useStore();
  const isAdmin = auth.status === 'in' && Boolean(auth.user?.isAdmin);
  const providers = useAuthProviders();
  const [tip, setTip] = useState('');
  const list = [
    { id: 'google', name: 'Google', icon: GoogleMark, ready: providers.google },
    { id: 'github', name: 'GitHub', icon: GitHubMark, ready: providers.github },
  ].filter((p) => !exclude.includes(p.id));

  if (!list.length) return null;

  const isSite = theme === 'site';
  const verb = mode === 'link' ? 'ulash' : 'bilan davom etish';
  const hasUnconfigured = !providers.loading && !providers.offline && list.some((p) => !p.ready);

  return (
    <div className="space-y-2.5">
      <div className="grid gap-2.5 sm:grid-cols-2">
        {list.map((p) => {
          const Icon = p.icon;
          const label = `${p.name} ${verb}`;
          if (!providers.loading && !p.ready) {
            return (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  setTip(
                    providers.offline
                      ? "Hisob xizmati hozircha ulanmagan."
                      : isAdmin
                        ? `${p.name} OAuth hali sozlanmagan: backend/.env ga ${p.id.toUpperCase()}_CLIENT_ID va ${p.id.toUpperCase()}_CLIENT_SECRET qo'ying (callback: http://localhost:8787/api/auth/${p.id}/callback).`
                        : `${p.name} orqali kirish hozircha faol emas. Haqiqiy hisob ochish uchun nom va paroldan foydalaning.`,
                  )
                }
                className={
                  isSite
                    ? 'flex items-center justify-center gap-2.5 rounded-md border border-plaster/20 bg-cobalt-deep/70 px-4 py-3 text-sm font-semibold text-plaster/75 transition hover:border-ochre/60 hover:text-plaster'
                    : 'flex items-center justify-center gap-2 rounded-xl border border-plaster/16 bg-[#071633]/80 px-3.5 py-2.5 text-sm font-semibold text-plaster/75 transition hover:border-ochre/45 hover:text-plaster'
                }
              >
                <Icon className="size-4.5 shrink-0" />
                <span>{label}</span>
              </button>
            );
          }
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
        })}
      </div>

      {hasUnconfigured && (tip || isAdmin) && (
        <p className="text-xs leading-relaxed text-plaster/55">
          {tip || "Admin eslatmasi: Google/GitHub kirishi uchun backend/.env ga CLIENT_ID va CLIENT_SECRET yoziladi."}
        </p>
      )}
      {providers.offline && tip && <p className="text-xs leading-relaxed text-[#F2C46B]">{tip}</p>}
    </div>
  );
}
