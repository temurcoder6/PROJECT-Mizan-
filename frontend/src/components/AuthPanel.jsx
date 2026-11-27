import { useState } from 'react';
import { ArrowRight, Check, Copy, LogOut } from 'lucide-react';
import { useStore } from '../store';
import { GirihField, StarBullet } from './Girih';
import OAuthButtons, { OAUTH_ERROR_TEXT, consumeOAuthQuery } from './OAuthButtons';

const MODES = [
  ['register', "Ro'yxatdan o'tish"],
  ['login', 'Kirish'],
  ['recover', 'Parolni tiklash'],
];

export default function AuthPanel({ onOpen, defaultMode = 'register', nextHash = '#bosh' }) {
  const { auth, sync, authActions } = useStore();
  const [oauthNotice] = useState(() => {
    const q = consumeOAuthQuery();
    return q.error ? OAUTH_ERROR_TEXT[q.error] || OAUTH_ERROR_TEXT.provider_error : '';
  });
  const [mode, setMode] = useState(oauthNotice ? 'login' : defaultMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState(oauthNotice);
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState('');
  const [savedCode, setSavedCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r =
        mode === 'recover'
          ? await authActions.recover(username.trim(), codeInput, password)
          : await authActions.authenticate(mode, username.trim(), password);
      setPassword('');
      setCodeInput('');
      if (r.recoveryCode) {
        setRecovery(r.recoveryCode);
        setSavedCode(false);
        setCopied(false);
      } else {
        onOpen?.();
      }
    } catch (err) {
      setError(
        err.code === 'network' || err.code === 'noserver'
          ? "Serverga ulanib bo'lmadi. Ilovani backend orqali oching (http://localhost:8787)."
          : err.message,
      );
    }
    setBusy(false);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(recovery);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const fieldCls =
    'w-full border-0 border-b-2 border-plaster/25 bg-transparent px-0 py-2.5 text-base font-medium text-plaster placeholder:text-plaster/40 outline-none transition focus:border-turq';

  if (recovery) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-plaster/15 bg-cobalt p-7 text-plaster sm:p-9">
        <GirihField id="g-auth-rec" opacity={0.09} size={84} />
        <div className="relative space-y-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-turq-soft">
            <span className="size-2 rounded-full bg-turq" /> Hisob tayyor
          </p>
          <h3 className="font-display text-2xl font-semibold tracking-[-0.02em]">Tiklash kodingiz</h3>
          <p className="text-sm leading-relaxed text-plaster/80">
            Parolni unutsangiz, hisobni shu kod bilan tiklaysiz. Kod <b>faqat bir marta</b> ko'rsatiladi va serverda saqlanmaydi: uni saqlab qo'ying.
          </p>
          <p className="rounded-md border border-ochre/60 bg-cobalt-night px-4 py-4 text-center font-mono text-lg font-semibold tracking-wider text-plaster select-all sm:text-xl">
            {recovery}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex items-center gap-2 rounded-md border border-plaster/25 px-4 py-2 text-sm font-semibold text-plaster transition hover:bg-plaster/10"
            >
              <Copy className="size-4" /> {copied ? 'Nusxalandi' : 'Nusxalash'}
            </button>
          </div>
          <label className="flex cursor-pointer items-center gap-3 border-t border-plaster/15 pt-4 text-sm text-plaster/85">
            <input type="checkbox" className="size-4 accent-[#1FA6A0]" checked={savedCode} onChange={(e) => setSavedCode(e.target.checked)} />
            Kodni saqlab oldim
          </label>
          <button
            type="button"
            disabled={!savedCode}
            onClick={() => {
              setRecovery('');
              onOpen?.();
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-turq px-6 py-3.5 text-base font-semibold text-cobalt-night shadow-[0_10px_24px_-12px_rgb(0_0_0/0.6)] transition hover:bg-[#32BDB6] disabled:pointer-events-none disabled:opacity-45"
          >
            Ilovaga o'tish <ArrowRight className="size-5" />
          </button>
        </div>
      </div>
    );
  }

  if (auth.status === 'in' && auth.user) {
    const has = (p) => auth.user.oauth?.some((o) => o.provider === p);
    return (
      <div className="relative overflow-hidden rounded-xl border border-plaster/15 bg-cobalt p-7 text-plaster sm:p-9">
        <GirihField id="g-auth-in" opacity={0.09} size={84} />
        <div className="relative space-y-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-turq-soft">
            <span className="size-2 rounded-full bg-turq" /> Kirilgan
          </p>
          <div>
            <h3 className="font-display text-2xl font-semibold tracking-[-0.02em]">{auth.user.username}</h3>
            <p className="mt-1 text-sm text-plaster/75">
              {sync.state === 'syncing' ? 'Serverga saqlanmoqda…' : 'Maʼlumotlaringiz server bazasi bilan sinxron.'}
            </p>
          </div>
          <ul className="space-y-2 border-y border-plaster/15 py-4 text-sm text-plaster/85">
            <li className="flex items-center gap-2.5">
              <StarBullet className="text-ochre" /> Parol: {auth.user.hasPassword ? "o'rnatilgan" : "o'rnatilmagan (Sozlamalarda qo'shish mumkin)"}
            </li>
            <li className="flex items-center gap-2.5">
              <StarBullet className={has('google') ? 'text-turq-soft' : 'text-plaster/30'} /> Google: {has('google') ? 'ulangan' : 'ulanmagan'}
            </li>
            <li className="flex items-center gap-2.5">
              <StarBullet className={has('github') ? 'text-turq-soft' : 'text-plaster/30'} /> GitHub: {has('github') ? 'ulangan' : 'ulanmagan'}
            </li>
          </ul>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex items-center gap-2 rounded-md bg-turq px-6 py-3 text-sm font-semibold text-cobalt-night shadow-[0_10px_24px_-12px_rgb(0_0_0/0.6)] transition hover:-translate-y-0.5 hover:bg-[#32BDB6]"
            >
              Ilovani ochish <ArrowRight className="size-4" />
            </button>
            <a
              href="#sozlamalar"
              className="inline-flex items-center gap-2 rounded-md px-4 py-3 text-sm font-semibold text-plaster ring-1 ring-plaster/30 transition hover:bg-plaster/10"
            >
              Sozlamalar
            </a>
            <button
              type="button"
              onClick={authActions.logout}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-3 text-sm font-medium text-plaster/75 transition hover:text-plaster"
            >
              <LogOut className="size-4" /> Chiqish
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-plaster/15 bg-cobalt p-7 text-plaster sm:p-9">
      <GirihField id="g-auth" opacity={0.09} size={84} />
      <div className="relative">
        <div role="tablist" aria-label="Hisob amallari" className="flex flex-wrap gap-5 border-b border-plaster/15">
          {MODES.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => {
                setMode(id);
                setError('');
              }}
              className={`-mb-px border-b-2 pb-2.5 text-[13px] font-semibold transition ${
                mode === id ? 'border-turq text-plaster' : 'border-transparent text-plaster/60 hover:text-plaster'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode !== 'recover' && (
          <div className="mt-6">
            <OAuthButtons theme="site" mode="login" next={nextHash} onOpen={onOpen} />
            <div className="my-6 flex items-center gap-3 text-xs text-plaster/55">
              <span className="h-px flex-1 bg-ochre/45" />
              <span>yoki nom va parol bilan</span>
              <span className="h-px flex-1 bg-ochre/45" />
            </div>
          </div>
        )}

        <form onSubmit={submit} className={`space-y-5 ${mode === 'recover' ? 'mt-6' : ''}`}>
          <label className="block">
            <span className="flex items-center gap-2 text-xs font-semibold text-plaster/75">
              <b className="flex size-5 items-center justify-center rounded-[3px] bg-plaster text-[11px] font-semibold text-cobalt">1</b>
              Email (Gmail) yoki foydalanuvchi nomi
            </span>
            <input
              className={fieldCls}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="temur@gmail.com yoki temur_01"
            />
          </label>

          {mode === 'recover' && (
            <label className="block">
              <span className="flex items-center gap-2 text-xs font-semibold text-plaster/75">
                <b className="flex size-5 items-center justify-center rounded-[3px] bg-plaster text-[11px] font-semibold text-cobalt">2</b>
                Tiklash kodi
              </span>
              <input
                className={`${fieldCls} font-mono`}
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                autoComplete="off"
                placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
              />
            </label>
          )}

          <label className="block">
            <span className="flex items-center gap-2 text-xs font-semibold text-plaster/75">
              <b className="flex size-5 items-center justify-center rounded-[3px] bg-plaster text-[11px] font-semibold text-cobalt">
                {mode === 'recover' ? '3' : '2'}
              </b>
              {mode === 'recover' ? 'Yangi parol (kamida 8 belgi)' : mode === 'register' ? 'Mizan uchun yangi parol (kamida 8 belgi)' : 'Parol'}
            </span>
            <input
              type="password"
              className={fieldCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
            />
            {mode === 'register' && (
              <span className="mt-1.5 block text-[11px] text-turq-soft/90">
                Shaxsiy Gmail yoki bank parolingizni yozmang — Mizan uchun alohida, esda qoladigan parol o'ylab toping.
              </span>
            )}
          </label>

          {mode === 'register' && (
            <p className="flex items-start gap-2 text-xs leading-relaxed text-plaster/70">
              <Check className="mt-0.5 size-3.5 shrink-0 text-turq-soft" /> Pochta, telefon yoki hujjat so'ralmaydi. Ro'yxatdan o'tgach bir martalik tiklash kodi beriladi.
            </p>
          )}

          {error && <p className="rounded-md border border-[#F2C46B]/50 bg-cobalt-night/80 px-3.5 py-2.5 text-sm text-[#F2C46B]">{error}</p>}

          <button
            type="submit"
            disabled={busy || !username.trim() || !password || (mode === 'recover' && !codeInput.trim())}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-turq px-6 py-3.5 text-base font-semibold text-cobalt-night shadow-[0_10px_24px_-12px_rgb(0_0_0/0.6)] transition hover:-translate-y-0.5 hover:bg-[#32BDB6] disabled:pointer-events-none disabled:opacity-45"
          >
            {busy ? 'Kuting…' : mode === 'register' ? 'Hisob ochish' : mode === 'recover' ? 'Parolni tiklash' : 'Kirish'}
            <ArrowRight className="size-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
