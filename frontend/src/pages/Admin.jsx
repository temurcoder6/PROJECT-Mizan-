import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Database,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  UserX,
  Wallet,
} from 'lucide-react';
import { Badge, Button, Card, CardTitle, Empty, Segmented, Stat, inputCls } from '../components/ui';
import { api } from '../lib/api';
import { money } from '../lib/format';
import { useStore } from '../store';

const TABS = [
  { id: 'growth', label: '📊 Rivojlanish va Daromad' },
  { id: 'tickets', label: '📩 Shikoyat va Murojaatlar' },
  { id: 'ads', label: '📢 Reklama va Hamkorlar' },
  { id: 'users', label: '👥 Foydalanuvchilar' },
];

const CAT_LABEL = {
  muammo: 'Texnik muammo',
  shikoyat: 'Shikoyat',
  taklif: 'Taklif',
  savol: 'Savol',
};

const STATUS_META = {
  open: ['Ochiq', 'amber'],
  answered: ['Javob berilgan', 'green'],
  closed: ['Yopilgan', 'slate'],
};

function fmtTime(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function Admin({ go }) {
  const { auth, actions } = useStore();
  const isAdmin = auth.status === 'in' && Boolean(auth.user?.isAdmin);

  const [activeTab, setActiveTab] = useState('growth');
  const [overview, setOverview] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [ticketFilter, setTicketFilter] = useState('all');
  const [replyDraft, setReplyDraft] = useState({});
  const [usersList, setUsersList] = useState([]);
  const [userQuery, setUserQuery] = useState('');
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState(0);

  // Admin Login / Passcode Gate State
  const [passcode, setPasscode] = useState('');
  const [adminUsername, setAdminUsername] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');

  // Reklama e'loni sozlash holati
  const [customAd, setCustomAd] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mizan_admin_ad') || 'null');
    } catch {
      return null;
    }
  });
  const [adTitle, setAdTitle] = useState(customAd?.title || '');
  const [adBody, setAdBody] = useState(customAd?.body || '');
  const [adLink, setAdLink] = useState(customAd?.link || '');

  const loadData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setErr('');
    try {
      const [ov, tk, us, bk] = await Promise.all([
        api.adminOverview().catch(() => null),
        api.adminTickets().catch(() => ({ tickets: [] })),
        api.adminUsers().catch(() => ({ users: [] })),
        api.adminBackups().catch(() => ({ backups: [] })),
      ]);
      if (ov) setOverview(ov);
      setTickets(tk?.tickets || []);
      setUsersList(us?.users || []);
      setBackups(bk?.backups || []);
    } catch (e) {
      setErr(e.message || "Ma'lumotlarni yuklashda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClaimAdmin = async (e) => {
    e.preventDefault();
    if (!passcode.trim()) return;
    setAuthBusy(true);
    setAuthError('');
    try {
      if (auth.status === 'in' && auth.user) {
        // Avtorizatsiyadan o'tgan foydalanuvchini admin qilish
        const res = await api.adminClaim(passcode.trim());
        if (res?.ok && res.user) {
          actions.setUser(res.user);
          setPasscode('');
        }
      } else {
        // Parol orqali to'g'ridan-to'g'ri admin hisobiga kirish
        const res = await api.adminDirectLogin(passcode.trim(), adminUsername.trim());
        if (res?.ok && res.user) {
          actions.setUser(res.user);
          setPasscode('');
        }
      }
    } catch (err) {
      setAuthError(err.message || 'Parol noto‘g‘ri yoki ruxsat berilmadi.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSearchUsers = async (q) => {
    setUserQuery(q);
    try {
      const res = await api.adminUsers(q);
      setUsersList(res.users || []);
    } catch {}
  };

  const handleToggleAdminRole = async (user) => {
    const nextRole = !user.isAdmin;
    setBusyId(user.id);
    setErr('');
    try {
      await api.adminSetRole(user.id, nextRole);
      setMsg(`@${user.username} hisobiga ${nextRole ? 'admin huquqi berildi' : 'oddiy huquq qaytarildi'}.`);
      setTimeout(() => setMsg(''), 3000);
      const res = await api.adminUsers(userQuery);
      setUsersList(res.users || []);
    } catch (e) {
      setErr(e.message || 'Rolni o‘zgartirib bo‘lmadi.');
    } finally {
      setBusyId(0);
    }
  };

  const handleSetPro = async (user, action) => {
    if (action === 'revoke' && !window.confirm(`@${user.username} hisobidan Pro olinsinmi?`)) return;
    setBusyId(user.id);
    setErr('');
    try {
      await api.adminSetPro(user.id, action, 30);
      setMsg(action === 'grant' ? `@${user.username} hisobiga +30 kun Pro berildi.` : `@${user.username} hisobidan Pro olindi.`);
      setTimeout(() => setMsg(''), 3000);
      const res = await api.adminUsers(userQuery);
      setUsersList(res.users || []);
    } catch (e) {
      setErr(e.message || "Pro holatini o'zgartirib bo'lmadi.");
    } finally {
      setBusyId(0);
    }
  };

  const handleReplyTicket = async (id, status) => {
    const reply = String(replyDraft[id] || '').trim();
    if (status === 'answered' && !reply) return;
    setBusyId(id);
    setErr('');
    try {
      await api.adminReply({ id, reply, status });
      setReplyDraft((prev) => ({ ...prev, [id]: '' }));
      setMsg("Murojaatga javob muvaffaqiyatli saqlandi!");
      setTimeout(() => setMsg(''), 3000);
      const tk = await api.adminTickets();
      setTickets(tk.tickets || []);
    } catch (e) {
      setErr(e.message || 'Javobni saqlab bo‘lmadi.');
    } finally {
      setBusyId(0);
    }
  };

  const handleCreateBackup = async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await api.adminBackupNow();
      if (res?.ok) {
        setMsg(`Zaxira nusxa yaratildi: ${res.file}`);
        setTimeout(() => setMsg(''), 3500);
        setBackups(res.backups || []);
      }
    } catch (e) {
      setErr(e.message || 'Zaxira nusxa yaratilmadi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomAd = (e) => {
    e.preventDefault();
    if (!adTitle.trim()) {
      localStorage.removeItem('mizan_admin_ad');
      setCustomAd(null);
      setMsg("E'lon o'chirildi.");
      setTimeout(() => setMsg(''), 3000);
      return;
    }
    const payload = { title: adTitle.trim(), body: adBody.trim(), link: adLink.trim(), updatedAt: Date.now() };
    localStorage.setItem('mizan_admin_ad', JSON.stringify(payload));
    setCustomAd(payload);
    setMsg("Reklama e'loni platformada faollashtirildi!");
    setTimeout(() => setMsg(''), 3000);
  };

  // Agar foydalanuvchi admin bo'lmasa, Maxfiy Kirish Oynasi (Gate) ko'rsatiladi
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md py-6 sm:py-12">
        <Card className="relative overflow-hidden border border-ochre/40 shadow-2xl">
          <div className="flex items-center gap-2.5 border-b border-plaster/12 pb-3.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-ochre/30 to-amber-700/20 text-ochre ring-1 ring-ochre/40">
              <Lock className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-plaster">Mizan Boshqaruv Markazi</h2>
              <p className="text-xs text-plaster/65">Ushbu bo‘lim faqat tizim administratori uchun maxfiydir</p>
            </div>
          </div>

          <form onSubmit={handleClaimAdmin} className="mt-5 space-y-4">
            {auth.status === 'in' && auth.user ? (
              <div className="rounded-xl border border-turq/30 bg-turq/10 p-3 text-xs text-turq-soft">
                Siz hozir <strong>@{auth.user.username}</strong> hisobidasiz. Ushbu hisobga administrator vakolatlarini ulash uchun maxfiy parolni tasdiqlang.
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-plaster/80 mb-1">Admin login (username)</label>
                <input
                  type="text"
                  className={inputCls}
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-plaster/80 mb-1">Maxfiy Admin Paroli</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  className={`${inputCls} pr-10 font-mono`}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Admin parolini kiriting"
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-plaster/50 hover:text-plaster"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/15 p-3 text-xs text-rose-300 ring-1 ring-rose-400/30">
                <AlertCircle className="size-4 shrink-0 text-rose-400" />
                <span>{authError}</span>
              </div>
            )}

            <Button type="submit" disabled={authBusy || !passcode.trim()} className="w-full">
              {authBusy ? (
                'Tekshirilmoqda...'
              ) : (
                <>
                  <KeyRound className="size-4" /> Admin sifatida kirish
                </>
              )}
            </Button>
          </form>

        </Card>
      </div>
    );
  }

  const c = overview?.counts || {};
  const partners = overview?.partners || [];
  const clicksMap = Object.fromEntries((overview?.partnerBreakdown || []).map((b) => [b.partner_id, b.clicks]));

  const filteredTickets = tickets.filter((t) => {
    if (ticketFilter === 'all') return true;
    return t.status === ticketFilter;
  });

  return (
    <div className="space-y-6">
      {/* Yuqori Panel Sarlavhasi */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-plaster/12 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ochre/45 bg-ochre/15 px-2.5 py-0.5 text-[11px] font-bold text-ochre uppercase tracking-wider">
              <ShieldCheck className="size-3.5" /> Administrator Paneli
            </span>
            <span className="text-xs text-plaster/50">(@{auth.user?.username})</span>
          </div>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-[-0.02em] text-plaster">
            Mizan Tizim Boshqaruvi
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Yangilash
          </Button>
          <Button variant="subtle" size="sm" onClick={() => go('bosh')}>
            Foydalanuvchi rejimiga qaytish
          </Button>
        </div>
      </div>

      {err && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-500/15 p-3.5 text-xs text-rose-300 ring-1 ring-rose-400/30">
          <AlertCircle className="size-4 shrink-0 text-rose-400" />
          <span>{err}</span>
        </div>
      )}

      {msg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 p-3.5 text-xs text-emerald-300 ring-1 ring-emerald-400/30">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
          <span>{msg}</span>
        </div>
      )}

      {/* 4 Ta Asosiy Bo'lim Tablari */}
      <div className="flex overflow-x-auto rounded-2xl border border-plaster/12 bg-[#061228] p-1.5 shadow-inner">
        {TABS.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                active
                  ? 'bg-gradient-to-r from-cobalt to-[#0E2A5C] text-plaster shadow-md ring-1 ring-ochre/45'
                  : 'text-plaster/65 hover:bg-plaster/5 hover:text-plaster'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: RIVOJLANISH VA DAROMAD */}
      {activeTab === 'growth' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Jami Foydalanuvchilar" value={c.users ?? 0} icon={Users} sub={`7 kunda faol: ${c.active7d ?? 0}`} tone="green" />
            <Stat label="Kiritilgan Yozuvlar" value={c.transactions ?? 0} icon={Database} sub={`Qarz: ${c.debts ?? 0} · Maqsad: ${c.goals ?? 0}`} />
            <Stat label="Ulangan Kartalar/Hamyonlar" value={c.cards ?? 0} icon={CreditCard} sub="Uzcard, Humo, Naqd" />
            <Stat label="Hamkorlik Bosishlari (CPA)" value={c.partnerClicks ?? 0} icon={TrendingUp} tone="green" sub="Bank & do'kon havolalari" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-turq/30">
              <CardTitle icon={Banknote}>Platforma Moliyaviy Aylanmasi</CardTitle>
              <div className="space-y-3 pt-2 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-[#071633] p-3 border border-plaster/10">
                  <span className="text-plaster/70">Foydalanuvchilar qayd etgan aylanma:</span>
                  <strong className="text-base text-ochre tabular-nums">{money(c.totalTxVolume ?? 0)}</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#071633] p-3 border border-plaster/10">
                  <span className="text-plaster/70">Kartalardagi jami hisoblangan mablag':</span>
                  <strong className="text-base text-turq-soft tabular-nums">{money(c.totalCardsVolume ?? 0)}</strong>
                </div>
                <p className="text-[11px] text-plaster/50 leading-relaxed">
                  Ushbu raqamlar agregatsiyalangan (shaxssizlantirilgan) statistika bo'lib, platforma o'sish sur'atlarini ko'rsatadi.
                </p>
              </div>
            </Card>

            <Card className="border-ochre/30">
              <CardTitle icon={TrendingUp}>CPA / Hamkorlik Daromadi Salohiyati</CardTitle>
              <div className="space-y-3 pt-2 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-[#071633] p-3 border border-plaster/10">
                  <span className="text-plaster/70">Jami CPA kliklari:</span>
                  <strong className="text-base text-plaster tabular-nums">{c.partnerClicks ?? 0} ta</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#071633] p-3 border border-plaster/10">
                  <span className="text-plaster/70">Taxminiy konversiya tushumi (lead ~50k):</span>
                  <strong className="text-base text-emerald-400 tabular-nums">
                    {money((c.partnerClicks ?? 0) * 50000)}
                  </strong>
                </div>
                <p className="text-[11px] text-plaster/50 leading-relaxed">
                  TBC Bank, Uzum Bank, AVO va boshqa hamkorlar orqali har bir ochilgan karta yoki xarid uchun Mizan'ga to'lanadigan tavsiya haqi.
                </p>
              </div>
            </Card>
          </div>

          {/* Zaxira Nusxalar Boshqaruvi */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-plaster/10 pb-3">
              <div>
                <CardTitle icon={Database}>Tizim Ma'lumotlar Bazasi Zaxiralari</CardTitle>
                <p className="text-xs text-plaster/65">Ma'lumotlar bazasidan avtomatik va qo'lda to'liq zaxira olish</p>
              </div>
              <Button size="sm" onClick={handleCreateBackup} disabled={loading}>
                <Database className="size-3.5" /> Hozir zaxira nusxa olish (Backup Now)
              </Button>
            </div>

            <div className="mt-3">
              {backups.length === 0 ? (
                <p className="text-xs text-plaster/50 py-2">Hozircha saqlangan backup fayllar yo'q.</p>
              ) : (
                <div className="divide-y divide-plaster/10">
                  {backups.slice(0, 5).map((b) => (
                    <div key={b.name} className="flex items-center justify-between py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Check className="size-3.5 text-turq-soft" />
                        <span className="font-mono text-plaster">{b.name}</span>
                        <span className="text-plaster/50">({(((b.sizeBytes || b.size || 0)) / 1024).toFixed(1)} KB)</span>
                      </div>
                      <span className="text-plaster/40">{fmtTime(b.createdAt || b.mtime)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: SHIKOYAT VA MUROJAATLAR */}
      {activeTab === 'tickets' && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-plaster/10 pb-3">
            <CardTitle icon={MessageSquare}>
              Foydalanuvchilar Shikoyat va Murojaatlari ({tickets.length})
            </CardTitle>

            <Segmented
              value={ticketFilter}
              onChange={setTicketFilter}
              options={[
                { value: 'all', label: `Hammasi (${tickets.length})` },
                { value: 'open', label: `Ochiq (${tickets.filter((t) => t.status === 'open').length})` },
                { value: 'answered', label: `Javob berilgan (${tickets.filter((t) => t.status === 'answered').length})` },
                { value: 'closed', label: `Yopilgan (${tickets.filter((t) => t.status === 'closed').length})` },
              ]}
            />
          </div>

          {filteredTickets.length === 0 ? (
            <Empty
              icon={MessageSquare}
              title="Murojaatlar topilmadi"
              text="Foydalanuvchilar shikoyat oynasi orqali yuborgan murojaatlar shu yerda jamlanadi."
            />
          ) : (
            <div className="mt-4 space-y-4">
              {filteredTickets.map((t) => {
                const meta = STATUS_META[t.status] || STATUS_META.open;
                return (
                  <article key={t.id} className="rounded-2xl border border-plaster/12 bg-[#071633] p-4 text-sm space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-plaster/8 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-plaster">
                          #{t.id} · {t.username ? `@${t.username}` : 'Mehmon'}
                        </span>
                        <Badge tone="blue">{CAT_LABEL[t.category] || t.category}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-plaster/45">{fmtTime(t.createdAt)}</span>
                        <Badge tone={meta[1]}>{meta[0]}</Badge>
                      </div>
                    </div>

                    <div className="text-plaster/90 whitespace-pre-line leading-relaxed">
                      {t.message}
                    </div>

                    {t.contact && (
                      <div className="flex items-center gap-1.5 text-xs text-turq-soft font-semibold">
                        <span>Aloqa ma'lumoti:</span> <code className="rounded bg-turq/10 px-2 py-0.5">{t.contact}</code>
                      </div>
                    )}

                    {t.context && (
                      <div className="text-[11px] font-mono text-plaster/40">
                        Kontekst: {t.context}
                      </div>
                    )}

                    {t.reply && (
                      <div className="rounded-xl border border-turq/30 bg-turq/10 p-3 text-xs text-turq-soft">
                        <div className="font-bold mb-1">Admin rasmiy javobi:</div>
                        <p className="whitespace-pre-line">{t.reply}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-plaster/8">
                      <input
                        className={`${inputCls} flex-1 text-xs`}
                        placeholder="Ushbu murojaatga admin javobini yozing..."
                        value={replyDraft[t.id] ?? ''}
                        onChange={(e) => setReplyDraft((prev) => ({ ...prev, [t.id]: e.target.value }))}
                      />
                      <Button
                        size="sm"
                        disabled={busyId === t.id || !(replyDraft[t.id] || '').trim()}
                        onClick={() => handleReplyTicket(t.id, 'answered')}
                      >
                        Javob yuborish
                      </Button>
                      {t.status !== 'closed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === t.id}
                          onClick={() => handleReplyTicket(t.id, 'closed')}
                        >
                          Yopish
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: REKLAMA VA HAMKORLAR */}
      {activeTab === 'ads' && (
        <div className="space-y-5">
          {/* Maxsus platforma e'loni sozlash */}
          <Card className="border-ochre/30">
            <CardTitle icon={Megaphone}>Platforma E'lonlari va Banner Boshqaruvi</CardTitle>
            <p className="text-xs text-plaster/65 mb-4">
              Mizan foydalanuvchilariga ko'rsatiladigan rasmiy e'lon yoki aksiya xabari
            </p>

            <form onSubmit={handleSaveCustomAd} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-plaster/80 mb-1">Sarlavha (Aksiya / E'lon)</label>
                  <input
                    className={inputCls}
                    value={adTitle}
                    onChange={(e) => setAdTitle(e.target.value)}
                    placeholder="Masalan: TBC Salom Card orqali 0% P2P o'tkazmalar!"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-plaster/80 mb-1">Havola URL (ixtiyoriy)</label>
                  <input
                    className={inputCls}
                    value={adLink}
                    onChange={(e) => setAdLink(e.target.value)}
                    placeholder="https://tbcbank.uz/..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-plaster/80 mb-1">Tavsif yoki reklama matni</label>
                <textarea
                  className={`${inputCls} h-18 resize-none`}
                  value={adBody}
                  onChange={(e) => setAdBody(e.target.value)}
                  placeholder="E'lon matnini yozing..."
                />
              </div>

              <div className="flex justify-end gap-2">
                {customAd && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAdTitle('');
                      setAdBody('');
                      setAdLink('');
                      localStorage.removeItem('mizan_admin_ad');
                      setCustomAd(null);
                    }}
                  >
                    E'lonni o'chirish
                  </Button>
                )}
                <Button type="submit">E'lonni saqlash va chiqarish</Button>
              </div>
            </form>
          </Card>

          {/* Hamkorlar ro'yxati va CPA bosishlari */}
          <Card>
            <CardTitle icon={TrendingUp}>B2B Hamkorlar Katalogi va CPA Statistika</CardTitle>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {partners.map((p) => {
                const clicks = clicksMap[p.id] || 0;
                return (
                  <div key={p.id} className="flex flex-col justify-between rounded-2xl border border-plaster/12 bg-[#071633] p-4 text-xs space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="font-bold text-plaster text-sm">{p.name}</span>
                        <Badge tone="green">{p.badge}</Badge>
                      </div>
                      <span className="text-turq-soft text-[11px] font-semibold">{p.category}</span>
                      <p className="mt-1.5 text-plaster/70 leading-relaxed">{p.tagline}</p>
                    </div>

                    <div className="border-t border-plaster/10 pt-2.5 flex items-center justify-between">
                      <span className="text-plaster/60">
                        O'tishlar: <strong className="text-ochre font-bold text-sm">{clicks}</strong>
                      </span>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-turq-soft hover:underline"
                      >
                        Hamkor sayti <ExternalLink className="size-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: FOYDALANUVCHILARNI TEKSHIRISH VA BOSHQARISH */}
      {activeTab === 'users' && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-plaster/10 pb-3">
            <div>
              <CardTitle icon={Users}>Foydalanuvchilar Tavsifi ({usersList.length})</CardTitle>
              <p className="text-xs text-plaster/65">Hisoblar ro'yxati, faollik va rollarni boshqarish</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-plaster/40" />
              <input
                className={`${inputCls} pl-8 text-xs`}
                placeholder="Login orqali qidirish..."
                value={userQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs text-plaster">
              <thead>
                <tr className="border-b border-plaster/12 text-plaster/50">
                  <th className="py-2.5 px-3">Foydalanuvchi</th>
                  <th className="py-2.5 px-3">Yozuvlar / Kartalar</th>
                  <th className="py-2.5 px-3">Ulanishlar</th>
                  <th className="py-2.5 px-3">Ro'yxatdan o'tgan</th>
                  <th className="py-2.5 px-3">Maqomi</th>
                  <th className="py-2.5 px-3 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-plaster/8">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-plaster/[0.02]">
                    <td className="py-3 px-3">
                      <div className="font-bold text-plaster">@{u.username}</div>
                      <div className="text-[10px] text-plaster/45 font-mono">ID: {u.id}</div>
                    </td>
                    <td className="py-3 px-3 tabular-nums">
                      <div>Tranzaksiyalar: <strong>{u.txCount}</strong></div>
                      <div className="text-plaster/60">Kartalar: <strong>{u.cardCount}</strong></div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {u.providers?.length > 0 ? (
                          u.providers.map((pr) => (
                            <Badge key={pr} tone="blue">{pr}</Badge>
                          ))
                        ) : (
                          <Badge tone="slate">Parol</Badge>
                        )}
                        {u.telegramLinked && <Badge tone="cyan">Telegram</Badge>}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-plaster/60">
                      <div>{fmtTime(u.createdAt)}</div>
                      <div className="text-[10px] text-plaster/40">Oxirgi kirish: {fmtTime(u.lastSeen)}</div>
                    </td>
                    <td className="py-3 px-3">
                      {u.isAdmin ? (
                        <Badge tone="amber">Administrator</Badge>
                      ) : (
                        <Badge tone="slate">Foydalanuvchi</Badge>
                      )}
                      <div className="mt-1">
                        {u.isPro ? (
                          <Badge tone="green">Pro: {fmtTime(u.proUntil)} gacha</Badge>
                        ) : (
                          <span className="text-[10px] text-plaster/40">Bepul</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="mb-1 flex justify-end gap-1">
                        <Button size="sm" variant="subtle" disabled={busyId === u.id} onClick={() => handleSetPro(u, 'grant')}>
                          Pro +30 kun
                        </Button>
                        {u.isPro && (
                          <Button size="sm" variant="outline" disabled={busyId === u.id} onClick={() => handleSetPro(u, 'revoke')}>
                            Pro ni olish
                          </Button>
                        )}
                      </div>
                      {u.id !== auth.user?.id && (
                        <Button
                          size="sm"
                          variant={u.isAdmin ? 'outline' : 'subtle'}
                          disabled={busyId === u.id}
                          onClick={() => handleToggleAdminRole(u)}
                        >
                          {u.isAdmin ? (
                            <>
                              <UserX className="size-3 text-rose-300" /> Bekor qilish
                            </>
                          ) : (
                            <>
                              <UserCheck className="size-3 text-ochre" /> Admin qilish
                            </>
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
