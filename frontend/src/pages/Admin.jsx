import { useCallback, useEffect, useState } from 'react';
import { Check, Clock, Database, ExternalLink, Info, KeyRound, MessageSquare, RefreshCw, Send, Server, ShieldAlert, Users } from 'lucide-react';
import { Badge, Button, Card, CardTitle, Empty, Stat, inputCls } from '../components/ui';
import { api } from '../lib/api';
import { DEPENDS_ON_DEVICE, NEXT_STAGE, WORKS_NOW } from '../lib/status';
import { useStore } from '../store';

const CAT_LABEL = { muammo: 'Muammo', shikoyat: 'Shikoyat', taklif: 'Taklif', savol: 'Savol' };
const STATUS_META = {
  open: ['Ochiq', 'amber'],
  answered: ['Javob berilgan', 'green'],
  closed: ['Yopilgan', 'slate'],
};

function fmtTime(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function Admin({ go }) {
  const { auth } = useStore();
  const isAdmin = auth.status === 'in' && Boolean(auth.user?.isAdmin);

  const [overview, setOverview] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [replyDraft, setReplyDraft] = useState({});
  const [busyId, setBusyId] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setErr('');
    try {
      const [ov, tk] = await Promise.all([api.adminOverview(), api.adminTickets()]);
      setOverview(ov);
      setTickets(tk.tickets || []);
    } catch (e) {
      setErr(e.message || "Admin ma'lumotlari yuklanmadi.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  if (!isAdmin) {
    return (
      <Card className="border-rose-400/35">
        <CardTitle icon={ShieldAlert}>Ruxsat yo'q</CardTitle>
        <p className="text-sm text-plaster/75">Bu bo'lim faqat tizim administratori uchun mo'ljallangan.</p>
      </Card>
    );
  }

  const sendReply = async (id, status) => {
    const reply = String(replyDraft[id] || '').trim();
    if (status === 'answered' && !reply) return;
    setBusyId(id);
    setErr('');
    try {
      await api.adminReply({ id, reply, status });
      setReplyDraft((s) => ({ ...s, [id]: '' }));
      await load();
    } catch (e) {
      setErr(e.message || 'Saqlanmadi.');
    } finally {
      setBusyId(0);
    }
  };

  const c = overview?.counts;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ochre">
            <KeyRound className="size-3.5" aria-hidden /> Faqat administrator ko'radi
          </span>
          <h1 className="font-display mt-0.5 text-2xl font-semibold tracking-[-0.02em] text-plaster">Tizim boshqaruvi va UAT</h1>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Yangilash
        </Button>
      </div>

      {err && <p className="rounded-xl bg-rose-500/15 px-3.5 py-2.5 text-sm text-rose-300 ring-1 ring-rose-400/30">{err}</p>}

      {overview && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Hisoblar" value={c.users} icon={Users} sub={`7 kunda faol: ${c.active7d}`} />
            <Stat label="Yozuvlar / Kartalar" value={`${c.transactions} / ${c.cards}`} icon={Database} sub={`Qarz: ${c.debts} · Maqsad: ${c.goals}`} />
            <Stat label="Telegram bot" value={c.telegramChats} icon={Send} tone={overview.telegram.configured ? 'green' : 'slate'} sub={overview.telegram.configured ? 'Ulangan chatlar' : "Bot o'chiq (.env)"} />
            <Stat label="Ochiq murojaat" value={c.openTickets} icon={MessageSquare} tone={c.openTickets > 0 ? 'red' : 'green'} sub={`Baza v${overview.schemaVersion} · Hamkor o'tish: ${c.partnerClicks || 0}`} />
          </div>

          <Card>
            <CardTitle icon={Server}>Muhit va maxfiy sozlamalar holati</CardTitle>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-plaster/12 bg-[#071633] px-3.5 py-2.5">
                <span className="text-plaster/80">Google OAuth</span>
                <Badge tone={overview.providers.google ? 'green' : 'amber'}>{overview.providers.google ? 'Sozlangan' : 'Kalit kiritilmagan'}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-plaster/12 bg-[#071633] px-3.5 py-2.5">
                <span className="text-plaster/80">GitHub OAuth</span>
                <Badge tone={overview.providers.github ? 'green' : 'amber'}>{overview.providers.github ? 'Sozlangan' : 'Kalit kiritilmagan'}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-plaster/12 bg-[#071633] px-3.5 py-2.5">
                <span className="text-plaster/80">Telegram bot ({overview.telegram.username ? `@${overview.telegram.username}` : 'BOT_TOKEN'})</span>
                <Badge tone={overview.telegram.configured ? 'green' : 'amber'}>{overview.telegram.configured ? 'Ishlayapti' : "O'chiq"}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-plaster/12 bg-[#071633] px-3.5 py-2.5">
                <span className="text-plaster/80">Demo kirish</span>
                <Badge tone={overview.demoEnabled ? 'blue' : 'slate'}>{overview.demoEnabled ? 'Yoqilgan' : "O'chirilgan"}</Badge>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-plaster/12 pt-3 text-xs text-plaster/60">
              <span>Manzil: {overview.host}:{overview.port} · Nusxa: {typeof __BUILD__ === 'string' ? __BUILD__ : 'dev'}</span>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => go('/film')} className="inline-flex items-center gap-1 rounded-lg border border-ochre/35 bg-plaster/5 px-2.5 py-1 font-semibold text-plaster hover:border-ochre">
                  Taqdimot rejimi <ExternalLink className="size-3" />
                </button>
                <button type="button" onClick={() => go('/reklama')} className="inline-flex items-center gap-1 rounded-lg border border-ochre/35 bg-plaster/5 px-2.5 py-1 font-semibold text-plaster hover:border-ochre">
                  Reklama roligi <ExternalLink className="size-3" />
                </button>
              </div>
            </div>
          </Card>
        </>
      )}

      <Card>
        <CardTitle icon={MessageSquare}>Foydalanuvchi murojaatlari ({tickets.length})</CardTitle>
        {tickets.length === 0 ? (
          <Empty icon={MessageSquare} title="Murojaatlar yo'q" text="Foydalanuvchilar Yordam sahifasidan yuborgan savol va shikoyatlar shu yerda ko'rinadi." />
        ) : (
          <ul className="space-y-3">
            {tickets.map((t) => {
              const st = STATUS_META[t.status] || STATUS_META.open;
              return (
                <li key={t.id} className="space-y-2.5 rounded-2xl border border-plaster/12 bg-[#071633] p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-plaster">
                      #{t.id} · {CAT_LABEL[t.category] || t.category} · {t.username ? `@${t.username}` : 'Mehmon'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-plaster/50">{fmtTime(t.createdAt)}</span>
                      <Badge tone={st[1]}>{st[0]}</Badge>
                    </div>
                  </div>
                  <p className="whitespace-pre-line text-plaster/85">{t.message}</p>
                  {t.contact && <p className="text-xs text-turq-soft">Aloqa: {t.contact}</p>}
                  {t.context && <p className="font-mono text-[11px] text-plaster/45">{t.context}</p>}
                  {t.reply && (
                    <p className="rounded-lg border border-turq/30 bg-turq/12 px-3 py-2 text-xs text-turq-soft">
                      <b>Javob:</b> {t.reply}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <input
                      className={`${inputCls} flex-1 py-2 text-sm`}
                      placeholder="Javob yozing..."
                      value={replyDraft[t.id] || ''}
                      onChange={(e) => setReplyDraft((s) => ({ ...s, [t.id]: e.target.value }))}
                    />
                    <Button size="sm" disabled={busyId === t.id || !(replyDraft[t.id] || '').trim()} onClick={() => sendReply(t.id, 'answered')}>
                      Javob yuborish
                    </Button>
                    {t.status !== 'closed' && (
                      <Button size="sm" variant="outline" disabled={busyId === t.id} onClick={() => sendReply(t.id, 'closed')}>
                        Yopish
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle icon={Info}>UAT — Texnik holat va yo'l xaritasi (faqat admin uchun)</CardTitle>
        <h3 className="mb-2 text-sm font-bold text-plaster">Hozir ishlaydigan imkoniyatlar</h3>
        <ul className="space-y-1.5 text-sm text-plaster/80">
          {WORKS_NOW.map((item) => (
            <li key={item} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-turq-soft" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <h3 className="mt-5 mb-2 text-sm font-bold text-plaster">Qurilma va brauzerga bog'liq</h3>
        <ul className="space-y-1.5 text-sm text-plaster/75">
          {DEPENDS_ON_DEVICE.map((item) => (
            <li key={item} className="flex gap-2">
              <Info className="mt-0.5 size-4 shrink-0 text-[#F2C46B]" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <h3 className="mt-5 mb-2 text-sm font-bold text-plaster">Keyingi bosqich (ichki reja)</h3>
        <ul className="space-y-1.5 text-sm text-plaster/65">
          {NEXT_STAGE.map((item) => (
            <li key={item} className="flex gap-2">
              <Clock className="mt-0.5 size-4 shrink-0 text-plaster/45" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
