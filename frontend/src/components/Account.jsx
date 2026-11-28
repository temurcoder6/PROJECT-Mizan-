import { useEffect, useState } from 'react';
import { CloudCheck, CloudOff, Link2Off, LogOut, RefreshCw, Send, Server, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { profileHasData } from '../lib/plan';
import { useStore } from '../store';
import OAuthButtons, { GitHubMark, GoogleMark, OAUTH_ERROR_TEXT, consumeOAuthQuery } from './OAuthButtons';
import { Button, Card, CardTitle, Field, Modal, Segmented, inputCls } from './ui';

export function SyncChip({ onClick, onConflict }) {
  const { auth, sync, conflict } = useStore();
  let text = 'Faqat qurilmada';
  let tone = 'bg-plaster/40';
  if (auth.status === 'checking') text = 'Tekshirilmoqda…';
  else if (auth.status === 'out') text = 'Kirilmagan, faqat qurilmada';
  else if (auth.status === 'in') {
    if (conflict) { text = "Ma'lumot ziddiyati: hal qiling"; tone = 'bg-amber-400'; }
    else if (sync.state === 'syncing') { text = 'Saqlanmoqda…'; tone = 'bg-sky-400'; }
    else if (sync.state === 'error') { text = 'Sinxronlash xatosi'; tone = 'bg-rose-400'; }
    else { text = 'Serverda saqlangan'; tone = 'bg-turq'; }
  }
  return (
    <button
      type="button"
      onClick={conflict ? onConflict : onClick}
      className="flex items-center gap-1.5 rounded-full border border-plaster/14 bg-plaster/8 px-2.5 py-1 text-[11px] font-semibold text-plaster/85 transition hover:border-ochre/45 hover:bg-plaster/14"
    >
      <span className={`size-2 rounded-full ${tone}`} /> {text}
    </button>
  );
}

const count = (d) => (d.transactions?.length || 0) + (d.debts?.length || 0) + (d.goals?.length || 0) + (d.cards?.length || 0);

export function ConflictModal({ onClose }) {
  const { conflict, transactions, debts, goals, cards, profile, authActions } = useStore();
  const [busy, setBusy] = useState(false);
  if (!conflict) return null;
  const local = { transactions, debts, goals, cards };
  const localHas = count(local) > 0 || profileHasData(profile);

  const choose = async (c) => {
    setBusy(true);
    await authActions.resolveConflict(c);
    setBusy(false);
  };

  return (
    <Modal title="Qaysi ma'lumot qolsin?" onClose={onClose}>
      <p className="mb-3 text-sm text-plaster/75">
        Serverda ham, shu qurilmada ham ma'lumot bor va ular farq qiladi. Hech narsa o'zi o'chmaydi: tanlovingizni kutyapman.
      </p>
      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-plaster/12 bg-[#071633] p-3">
          <div className="text-xs font-semibold text-plaster/55">Serverda</div>
          <div className="font-bold text-plaster">{count(conflict)} ta yozuv</div>
        </div>
        <div className="rounded-xl border border-plaster/12 bg-[#071633] p-3">
          <div className="text-xs font-semibold text-plaster/55">Shu qurilmada</div>
          <div className="font-bold text-plaster">{localHas ? `${count(local)} ta yozuv` : "bo'sh"}</div>
        </div>
      </div>
      <div className="space-y-2">
        <Button className="w-full" disabled={busy} onClick={() => choose('merge')}>
          Birlashtirish (ikkalasini saqlash)
        </Button>
        <Button variant="outline" className="w-full" disabled={busy} onClick={() => choose('server')}>
          Serverdagini olish (qurilmadagi almashtiriladi)
        </Button>
        <Button variant="outline" className="w-full" disabled={busy} onClick={() => choose('local')}>
          Qurilmadagini yuklash (serverdagi almashtiriladi)
        </Button>
      </div>
      <p className="mt-3 text-xs text-plaster/55">Birlashtirishda bir xil identifikatorli yozuvlar uchun serverdagisi olinadi. Oldin o'chirgan yozuvingiz qayta paydo bo'lishi mumkin.</p>
    </Modal>
  );
}

function DeleteAccount({ onClose }) {
  const { auth, authActions } = useStore();
  const hasPassword = auth.user?.hasPassword !== false;
  const [pw, setPw] = useState('');
  const [confirmName, setConfirmName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await authActions.deleteAccount(hasPassword ? { password: pw } : { confirmUsername: confirmName.trim() });
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <Modal title="Hisobni o'chirish" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-plaster/75">
          Serverdagi hisobingiz va barcha ma'lumotlaringiz butunlay o'chadi, qaytarib bo'lmaydi. Shu qurilmadagi nusxa saqlanib qoladi.{' '}
          {hasPassword ? 'Tasdiqlash uchun parolni kiriting.' : `Tasdiqlash uchun foydalanuvchi nomingizni (${auth.user?.username}) yozing.`}
        </p>
        {hasPassword ? (
          <input type="password" autoFocus className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Parol" autoComplete="current-password" />
        ) : (
          <input autoFocus className={inputCls} value={confirmName} onChange={(e) => setConfirmName(e.target.value)} placeholder={auth.user?.username} />
        )}
        {error && <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-300 ring-1 ring-rose-400/25">{error}</p>}
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            type="submit"
            variant="danger"
            className="flex-1"
            disabled={busy || (hasPassword ? !pw : confirmName.trim().toLowerCase() !== auth.user?.username?.toLowerCase())}
          >
            O'chirish
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ChangePassword({ onClose, onCode }) {
  const { auth, authActions } = useStore();
  const hasPassword = auth.user?.hasPassword !== false;
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api.changePassword(hasPassword ? oldPw : '', newPw);
      if (r.user) authActions.setUser(r.user);
      if (r.recoveryCode) {
        onCode?.(r.recoveryCode);
        onClose();
        return;
      }
      setDone(true);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };
  return (
    <Modal title={hasPassword ? 'Parolni almashtirish' : "Parol o'rnatish"} onClose={onClose}>
      {done ? (
        <div className="space-y-3">
          <p className="rounded-lg bg-turq/15 px-3 py-2 text-sm text-turq-soft ring-1 ring-turq/30">Parol almashtirildi. Boshqa qurilmalar tizimdan chiqarildi, shu qurilma qoldi.</p>
          <Button className="w-full" onClick={onClose}>Yopish</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          {hasPassword ? (
            <input type="password" autoFocus className={inputCls} value={oldPw} onChange={(e) => setOldPw(e.target.value)} placeholder="Joriy parol" autoComplete="current-password" />
          ) : (
            <p className="text-sm text-plaster/75">Google yoki GitHub'dan tashqari oddiy nom va parol bilan ham kirish uchun parol qo'ying.</p>
          )}
          <input type="password" autoFocus={!hasPassword} className={inputCls} value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Yangi parol (kamida 8 belgi)" autoComplete="new-password" />
          {error && <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-300 ring-1 ring-rose-400/25">{error}</p>}
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={onClose}>Bekor qilish</Button>
            <Button type="submit" className="flex-1" disabled={busy || (hasPassword && !oldPw) || newPw.length < 8}>
              {hasPassword ? 'Almashtirish' : "O'rnatish"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function RecoveryCodeModal({ code, onClose }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <Modal title="Tiklash kodingiz" onClose={() => saved && onClose()}>
      <div className="space-y-3 text-sm text-plaster/80">
        <p>
          Parolni unutsangiz, hisobni shu kod bilan tiklaysiz (pochta yoki telefon kerak emas). Kod <b>faqat bir marta</b> ko'rsatiladi va bizda saqlanmaydi: uni daftarga yozing yoki parol menejeriga qo'ying.
        </p>
        <p className="rounded-xl border border-ochre/35 bg-[#050C1B] px-4 py-4 text-center font-mono text-xl font-bold tracking-wider text-turq-soft select-all">{code}</p>
        <Button variant="outline" size="sm" onClick={copy}>{copied ? 'Nusxalandi' : 'Nusxalash'}</Button>
        <label className="flex items-start gap-3 rounded-xl border border-plaster/12 bg-[#071633] px-3 py-2.5">
          <input type="checkbox" className="mt-0.5 size-4 accent-turq" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
          Kodni saqlab oldim
        </label>
        <Button className="w-full" disabled={!saved} onClick={onClose}>Davom etish</Button>
      </div>
    </Modal>
  );
}

function MakeCode({ onClose, onCode }) {
  const { authActions } = useStore();
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try {
      const r = await api.recoveryCode(pw);
      authActions.markRecovery();
      onCode(r.recoveryCode);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <Modal title="Yangi tiklash kodi" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-plaster/75">Yangi kod olsangiz, eskisi ishlamay qoladi. Tasdiqlash uchun parolni kiriting.</p>
        <input type="password" autoFocus className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Parol" autoComplete="current-password" />
        {error && <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-300 ring-1 ring-rose-400/25">{error}</p>}
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Bekor qilish</Button>
          <Button type="submit" className="flex-1" disabled={!pw}>Kod olish</Button>
        </div>
      </form>
    </Modal>
  );
}

export function TelegramCard() {
  const { auth } = useStore();
  const [st, setSt] = useState(null);
  const [code, setCode] = useState(null);
  const [error, setError] = useState('');
  const loggedIn = auth.status === 'in';

  useEffect(() => {
    if (!loggedIn) return undefined;
    let alive = true;
    const load = () => api.telegramStatus().then((r) => alive && setSt(r)).catch(() => {});
    load();
    const id = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [loggedIn]);

  const isAdmin = auth.status === 'in' && Boolean(auth.user?.isAdmin);
  if (!loggedIn || !st) return null;
  if (!st.configured && !isAdmin) return null;

  const getCode = async () => {
    setError('');
    try {
      const r = await api.telegramLink();
      setCode(r);
    } catch (e) {
      setError(e.message);
    }
  };
  const unlink = async () => {
    await api.telegramUnlink().catch(() => {});
    setSt({ ...st, linked: false });
    setCode(null);
  };

  return (
    <Card>
      <CardTitle icon={Send}>Telegram bot</CardTitle>
      {!st.configured ? (
        <p className="text-sm text-plaster/70">Telegram bot hozircha sozlanmagan. Bu eslatmani faqat administrator ko'radi.</p>
      ) : st.linked ? (
        <div className="space-y-3 text-sm text-plaster/80">
          <p className="flex items-center gap-2 font-semibold text-plaster"><CloudCheck className="size-4 text-turq-soft" /> Telegram ulangan</p>
          <p>
            Botga yozing: «non 5000», <b>/reja</b> (bugungi reja), <b>/hisobot</b>, <b>/eslatma 21:00</b> (kunlik eslatma, telefon yopiq bo'lsa ham keladi). Botdagi yozuv shu hisobda, sayt bilan bir xil bazada.
          </p>
          <Button variant="outline" size="sm" onClick={unlink}>Telegramni uzish</Button>
        </div>
      ) : (
        <div className="space-y-3 text-sm text-plaster/80">
          <p>Botda xarajatni «non 5000» deb yozasiz, kunlik rejani ko'rasiz va kunlik eslatma olasiz. Sayt bilan bir xil hisob va baza.</p>
          {code ? (
            <div className="space-y-2 rounded-xl border border-ochre/35 bg-[#050C1B] p-4 text-plaster">
              <p className="text-xs text-plaster/60">Botga shuni yozing ({code.minutes} daqiqa amal qiladi):</p>
              <p className="font-mono text-xl font-bold tracking-wider text-turq-soft select-all">/ulash {code.code}</p>
              {st.username && (
                <a className="inline-block text-xs font-semibold text-plaster underline" href={`https://t.me/${st.username}`} target="_blank" rel="noreferrer">
                  @{st.username} ni ochish
                </a>
              )}
            </div>
          ) : (
            <Button size="sm" onClick={getCode}>Ulash kodini olish</Button>
          )}
          {error && <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-rose-300 ring-1 ring-rose-400/25">{error}</p>}
        </div>
      )}
    </Card>
  );
}

function Devices() {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const load = () => api.sessions().then((r) => setList(r.sessions)).catch(() => setErr("Ro'yxat yuklanmadi."));
  useEffect(() => {
    if (open) load();
  }, [open]);
  const revoke = async (id) => {
    try {
      await api.revokeSession(id);
      load();
    } catch {
      setErr("Uzib bo'lmadi.");
    }
  };
  const when = (t) => {
    const d = new Date(t);
    const p2 = (n) => String(n).padStart(2, '0');
    return `${p2(d.getDate())}.${p2(d.getMonth() + 1)} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  };
  return (
    <div>
      <button type="button" className="text-sm font-semibold text-turq-soft underline" onClick={() => setOpen((v) => !v)}>
        {open ? 'Qurilmalarni yashirish' : 'Kirilgan qurilmalarim'}
      </button>
      {open && (
        <ul className="mt-2 space-y-2">
          {err && <li className="text-sm text-rose-300">{err}</li>}
          {!list && !err && <li className="text-sm text-plaster/55">Yuklanmoqda…</li>}
          {list?.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-plaster/10 bg-[#071633] px-3 py-2 text-sm text-plaster">
              <span>
                <b>{s.device}</b>
                {s.current && <span className="ml-2 rounded bg-turq/20 px-1.5 py-0.5 text-xs text-turq-soft">shu qurilma</span>}
                <span className="block text-xs text-plaster/55">oxirgi faollik: {when(s.lastSeen)}</span>
              </span>
              {!s.current && (
                <Button variant="outline" size="sm" onClick={() => revoke(s.id)}>
                  Uzish
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AccountCard() {
  const { auth, sync, authActions } = useStore();
  const [oauthBanner, setOauthBanner] = useState(() => {
    const q = consumeOAuthQuery();
    if (q.linked === 'linked') return { ok: true, text: `${q.provider === 'github' ? 'GitHub' : 'Google'} hisobingizga ulandi.` };
    if (q.error) return { ok: false, text: OAUTH_ERROR_TEXT[q.error] || OAUTH_ERROR_TEXT.provider_error };
    return null;
  });
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(false);
  const [chg, setChg] = useState(false);
  const [mk, setMk] = useState(false);
  const [shownCode, setShownCode] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = mode === 'recover' ? await authActions.recover(username.trim(), codeInput, password) : await authActions.authenticate(mode, username.trim(), password);
      if (r.recoveryCode) setShownCode(r.recoveryCode);
      setPassword('');
      setCodeInput('');
    } catch (err) {
      setError(err.code === 'network' || err.code === 'noserver' ? 'Serverga ulanib bo\'lmadi.' : err.message);
    }
    setBusy(false);
  };

  if (auth.status === 'checking') return null;

  const linkedProviders = auth.user?.oauth || [];
  const linkedIds = linkedProviders.map((o) => o.provider);
  const canUnlink = Boolean(auth.user?.hasPassword || linkedProviders.length > 1);

  const unlink = async (provider) => {
    setOauthBanner(null);
    try {
      await authActions.unlinkOAuth(provider);
      setOauthBanner({ ok: true, text: `${provider === 'github' ? 'GitHub' : 'Google'} ulanishi uzildi.` });
    } catch (err) {
      setOauthBanner({ ok: false, text: err.message });
    }
  };

  return (
    <Card>
      <CardTitle icon={Server}>Hisob va server</CardTitle>

      {oauthBanner && (
        <p className={`mb-3 rounded-lg px-3 py-2 text-sm ${oauthBanner.ok ? 'bg-turq/15 text-turq-soft ring-1 ring-turq/30' : 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/25'}`}>
          {oauthBanner.text}
        </p>
      )}

      {auth.status === 'noserver' && (
        <div className="space-y-2 text-sm text-plaster/75">
          <p className="flex items-center gap-2 font-semibold text-plaster">
            <CloudOff className="size-4 text-ochre" /> Oflayn rejim
          </p>
          <p>
            Ilova hozir faqat shu qurilmada saqlanmoqda. Qurilmalar orasida sinxronlash va bulutli hisobdan foydalanish uchun asosiy sayt manzili orqali kiring.
          </p>
        </div>
      )}

      {auth.status === 'out' && (
        <div className="space-y-4">
          <OAuthButtons theme="app" mode="login" next="#sozlamalar" />
          <div className="flex items-center gap-3 text-xs text-plaster/45">
            <span className="h-px flex-1 bg-plaster/12" />
            <span>yoki nom va parol bilan</span>
            <span className="h-px flex-1 bg-plaster/12" />
          </div>
          <form onSubmit={submit} className="space-y-3">
            <Segmented
              value={mode}
              onChange={(m) => {
                setMode(m);
                setError('');
              }}
              options={[
                { value: 'login', label: 'Kirish' },
                { value: 'register', label: "Ro'yxatdan o'tish" },
                { value: 'recover', label: 'Parolni unutdim' },
              ]}
            />
            <p className="text-sm text-plaster/70">
              {mode === 'recover'
                ? "Ro'yxatdan o'tganda berilgan tiklash kodingizni kiriting va yangi parol qo'ying."
                : "Hisob ochsangiz, ma'lumotingiz serverdagi bazada saqlanadi va boshqa qurilmadan ham ochiladi. Faqat nom va parol kerak: pochta, telefon yoki hujjat so'ralmaydi."}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Foydalanuvchi nomi">
                <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="temur_01" />
              </Field>
              {mode === 'recover' && (
                <Field label="Tiklash kodi">
                  <input className={`${inputCls} font-mono`} value={codeInput} onChange={(e) => setCodeInput(e.target.value)} placeholder="XXXXX-XXXXX-XXXXX-XXXXX" autoComplete="off" />
                </Field>
              )}
              <Field label={mode === 'recover' ? 'Yangi parol' : 'Parol'} hint={mode !== 'login' ? 'Kamida 8 belgi' : undefined}>
                <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              </Field>
            </div>
            {mode === 'register' && (
              <p className="rounded-lg border border-ochre/30 bg-ochre/12 px-3 py-2 text-xs text-[#F2C46B]">Hisob ochilgach, sizga bir martalik tiklash kodi ko'rsatiladi. Uni saqlab qo'ying: parolni unutsangiz, faqat shu kod bilan tiklanadi.</p>
            )}
            {error && <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-300 ring-1 ring-rose-400/25">{error}</p>}
            <Button type="submit" disabled={busy || !username || !password || (mode === 'recover' && !codeInput)}>
              {mode === 'register' ? 'Hisob ochish' : mode === 'recover' ? 'Parolni tiklash' : 'Kirish'}
            </Button>
          </form>
        </div>
      )}

      {auth.status === 'in' && (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm text-plaster">
            <CloudCheck className="size-4 text-turq-soft" /> Kirilgan: <b>{auth.user.username}</b>
          </p>
          <p className="text-sm text-plaster/70">
            {sync.state === 'syncing' && 'Saqlanmoqda…'}
            {sync.state === 'saved' && `Serverga saqlandi${sync.at ? ` (${(() => { const d = new Date(sync.at); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; })()})` : ''}.`}
            {sync.state === 'error' && <span className="text-rose-300">{sync.error}</span>}
            {sync.state === 'idle' && "Har o'zgarishdan keyin ma'lumot avtomatik serverga saqlanadi."}
          </p>
          {linkedProviders.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {linkedProviders.map((o) => (
                <div key={o.provider} className="inline-flex items-center gap-2 rounded-xl border border-plaster/14 bg-[#071633] px-3 py-1.5 text-xs font-semibold text-plaster/90">
                  {o.provider === 'google' ? <GoogleMark className="size-4" /> : <GitHubMark className="size-4" />}
                  <span>{o.provider === 'google' ? 'Google' : 'GitHub'} ulangan{o.email ? ` (${o.email})` : ''}</span>
                  {canUnlink && (
                    <button type="button" onClick={() => unlink(o.provider)} title="Uzish" className="rounded p-0.5 text-plaster/50 hover:bg-rose-500/20 hover:text-rose-300">
                      <Link2Off className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {linkedIds.length < 2 && <OAuthButtons theme="app" mode="link" next="#sozlamalar" exclude={linkedIds} />}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={authActions.syncNow}>
              <RefreshCw className="size-3.5" /> Hozir saqlash
            </Button>
            <Button variant="outline" size="sm" onClick={authActions.logout}>
              <LogOut className="size-3.5" /> Chiqish
            </Button>
            <Button variant="outline" size="sm" onClick={() => setChg(true)}>
              {auth.user.hasPassword !== false ? 'Parolni almashtirish' : "Parol o'rnatish"}
            </Button>
            {auth.user.hasPassword !== false && (
              <Button variant="outline" size="sm" onClick={() => setMk(true)}>
                {auth.user.hasRecovery ? 'Yangi tiklash kodi' : 'Tiklash kodini yaratish'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={authActions.logoutAll}>
              Barcha qurilmadan chiqish
            </Button>
            <Button variant="danger" size="sm" onClick={() => setDel(true)}>
              <Trash2 className="size-3.5" /> Hisobni o'chirish
            </Button>
          </div>
          <Devices />
          <p className="text-xs text-plaster/55">Chiqsangiz ham shu qurilmadagi nusxa qoladi. Ikki qurilmada bir vaqtda o'zgartirsangiz, keyin saqlagani serverga yoziladi va ziddiyat bo'lsa, siz tanlaysiz.</p>
        </div>
      )}
      {del && <DeleteAccount onClose={() => setDel(false)} />}
      {chg && <ChangePassword onClose={() => setChg(false)} onCode={setShownCode} />}
      {mk && <MakeCode onClose={() => setMk(false)} onCode={setShownCode} />}
      {shownCode && <RecoveryCodeModal code={shownCode} onClose={() => setShownCode(null)} />}
    </Card>
  );
}
