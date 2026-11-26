import { useMemo, useState } from 'react';
import { Banknote, Check, CreditCard, Lock, Pencil, Plus, ShieldCheck, Sparkles, Trash2, Wallet } from 'lucide-react';
import { Badge, Button, Card, CardTitle, Empty, Field, IconButton, Modal, MoneyInput, Segmented, Stat, inputCls } from '../components/ui';
import { StarMark } from '../components/Girih';
import { formatDigitsInput, money, parseDigits } from '../lib/format';
import { useStore } from '../store';

const NETWORKS = [
  { id: 'uzcard', label: 'Uzcard', cardCls: 'from-[#0E2A5C] via-[#091C3E] to-[#061026]', chipCls: 'text-turq-soft' },
  { id: 'humo', label: 'Humo', cardCls: 'from-[#0A2F4A] via-[#081C33] to-[#051020]', chipCls: 'text-turq-soft' },
  { id: 'visa', label: 'Visa', cardCls: 'from-[#13295E] via-[#0A1A3B] to-[#061026]', chipCls: 'text-[#F2C46B]' },
  { id: 'mastercard', label: 'Mastercard', cardCls: 'from-[#291527] via-[#131932] to-[#071126]', chipCls: 'text-amber-300' },
  { id: 'naqd', label: 'Naqd hamyon', cardCls: 'from-[#1D1B14] via-[#0E182B] to-[#071126]', chipCls: 'text-[#F2C46B]' },
  { id: 'boshqa', label: 'Boshqa', cardCls: 'from-[#0C1D3A] via-[#071329] to-[#050C1B]', chipCls: 'text-plaster/80' },
];

const NET_MAP = Object.fromEntries(NETWORKS.map((n) => [n.id, n]));

const cleanLast4 = (v) => String(v || '').replace(/\D/g, '').slice(0, 4);

function CardTile({ item, onEdit, onDelete }) {
  const net = NET_MAP[item.network] || NET_MAP.boshqa;
  const isCash = item.network === 'naqd';

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border border-ochre/30 bg-gradient-to-br ${net.cardCls} p-5 text-plaster shadow-xl shadow-black/35 transition hover:border-ochre/65`}
    >
      <StarMark className="pointer-events-none absolute -top-3 -right-3 size-24 opacity-[0.09]" />
      <div className="relative flex items-start justify-between gap-2">
        <div>
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase ${net.chipCls}`}>
            {isCash ? <Banknote className="size-3.5" aria-hidden /> : <CreditCard className="size-3.5" aria-hidden />}
            {net.label}
          </span>
          <h3 className="font-display mt-1 text-base font-semibold tracking-[-0.02em] text-plaster">{item.label}</h3>
        </div>
        <div className="flex items-center gap-0.5">
          <IconButton label="Tahrirlash" icon={Pencil} onClick={() => onEdit(item)} />
          <IconButton label="O'chirish" icon={Trash2} onClick={() => onDelete(item.id)} className="hover:text-rose-300" />
        </div>
      </div>

      <div className="relative mt-5 font-mono text-sm tracking-[0.18em] text-plaster/75">
        {isCash ? (
          <span className="font-sans text-xs tracking-normal text-plaster/55">Naqd pul hamyoni</span>
        ) : (
          <span>•••• &nbsp;•••• &nbsp;•••• &nbsp;{item.last4 || '••••'}</span>
        )}
      </div>

      <div className="relative mt-4 flex items-end justify-between border-t border-plaster/12 pt-3">
        <div>
          <span className="block text-[11px] font-medium text-plaster/50">Qoldiq</span>
          <span className="font-display text-lg font-semibold tracking-[-0.02em] text-plaster tabular-nums">{money(item.balance)}</span>
        </div>
        {!isCash && (
          <span className="inline-flex items-center gap-1 rounded-full bg-plaster/8 px-2 py-0.5 text-[10px] font-medium text-plaster/60 ring-1 ring-plaster/12">
            <Lock className="size-2.5 text-turq-soft" aria-hidden /> CVV so'ralmaydi
          </span>
        )}
      </div>
    </article>
  );
}

function CardModal({ initial, onSave, onClose }) {
  const [label, setLabel] = useState(initial?.label || '');
  const [network, setNetwork] = useState(initial?.network || 'uzcard');
  const [last4, setLast4] = useState(initial?.last4 || '');
  const [balance, setBalance] = useState(initial?.balance ? formatDigitsInput(Math.round(initial.balance)) : '');

  const isCash = network === 'naqd';

  const submit = (e) => {
    e.preventDefault();
    const cleanLabel = label.trim() || (NET_MAP[network]?.label || 'Karta');
    onSave({
      label: cleanLabel,
      network,
      last4: isCash ? '' : cleanLast4(last4),
      balance: parseDigits(balance),
    });
  };

  return (
    <Modal title={initial ? 'Kartani tahrirlash' : "Yangi karta yoki hamyon qo'shish"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-xl border border-turq/25 bg-turq/10 px-3.5 py-2.5 text-xs leading-relaxed text-plaster/85">
          <span className="inline-flex items-center gap-1.5 font-semibold text-turq-soft">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden /> Xavfsizlik qoidasi:
          </span>{' '}
          Bu yerga to'liq 16 xonali karta raqami, amal qilish muddati (MM/YY), PIN yoki CVV/CVC kiritmang. Mizan maxfiy karta rekvizitlarini qabul qilmaydi va saqlamaydi.
        </div>

        <Field label="Turi">
          <div className="grid grid-cols-3 gap-2">
            {NETWORKS.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setNetwork(n.id)}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  network === n.id
                    ? 'border-ochre/65 bg-cobalt text-plaster ring-1 ring-ochre/35'
                    : 'border-plaster/12 bg-[#061228] text-plaster/65 hover:border-plaster/25 hover:text-plaster'
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Karta yoki hamyon nomi">
          <input
            autoFocus
            className={inputCls}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={isCash ? 'Masalan: Uy hamyoni' : 'Masalan: Asosiy Uzcard'}
            maxLength={40}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          {!isCash && (
            <Field label="Oxirgi 4 raqam (ixtiyoriy)" hint="Faqat 4 ta raqam — tanib olish uchun">
              <input
                className={`${inputCls} font-mono tracking-widest`}
                inputMode="numeric"
                maxLength={4}
                value={last4}
                onChange={(e) => setLast4(cleanLast4(e.target.value))}
                placeholder="4812"
              />
            </Field>
          )}
          <Field label="Hozirgi qoldiq (so'm)" className={isCash ? 'sm:col-span-2' : ''}>
            <MoneyInput
              className={`${inputCls} font-mono`}
              value={balance}
              onChange={setBalance}
              placeholder="1 250 000"
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Bekor
          </Button>
          <Button type="submit">{initial ? 'Saqlash' : "Qo'shish"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Cards() {
  const { cards = [], profile, actions } = useStore();
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [synced, setSynced] = useState(false);

  const totalBalance = useMemo(() => cards.reduce((s, c) => s + (Number(c.balance) || 0), 0), [cards]);
  const bankTotal = useMemo(() => cards.filter((c) => c.network !== 'naqd').reduce((s, c) => s + (Number(c.balance) || 0), 0), [cards]);
  const cashTotal = useMemo(() => cards.filter((c) => c.network === 'naqd').reduce((s, c) => s + (Number(c.balance) || 0), 0), [cards]);

  const visible = useMemo(() => {
    if (filter === 'card') return cards.filter((c) => c.network !== 'naqd');
    if (filter === 'naqd') return cards.filter((c) => c.network === 'naqd');
    return cards;
  }, [cards, filter]);

  const handleSave = (data) => {
    if (editing) actions.updateCard(editing.id, data);
    else actions.addCard(data);
    setModalOpen(false);
    setEditing(null);
  };

  const applyToPlan = () => {
    actions.setCash(totalBalance);
    setSynced(true);
    setTimeout(() => setSynced(false), 2400);
  };

  const diff = totalBalance - (Number(profile?.cash) || 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-plaster">Kartalar va hamyonlar</h1>
          <p className="text-sm text-plaster/65">Kartalaringiz qoldig'ini bitta joyda ko'ring va kunlik rejaga ulang</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus className="size-4" /> Karta qo'shish
        </Button>
      </div>

      <div className="app-glass flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-turq/25 px-4 py-3 text-xs text-plaster/80">
        <div className="flex items-start gap-2.5 sm:items-center">
          <ShieldCheck className="mt-0.5 size-4.5 shrink-0 text-turq-soft sm:mt-0" aria-hidden />
          <p className="leading-relaxed">
            <strong className="text-plaster">Xavfsizlik chegarasi:</strong> Mizan hech qachon to'liq karta raqami (16 xona), amal qilish muddati, PIN yoki CVV/CVC so'ramaydi. Faqat tanish uchun oxirgi 4 raqam va hisob qoldig'i saqlanadi.
          </p>
        </div>
        <Badge tone="green">CVV saqlanmaydi</Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Umumiy qoldiq" value={money(totalBalance)} icon={Wallet} tone="green" sub={`${cards.length} ta karta va hamyon`} />
        <Stat label="Kartalardagi pul" value={money(bankTotal)} icon={CreditCard} sub="Uzcard, Humo, Visa, Mastercard" />
        <Stat label="Naqd hamyonlar" value={money(cashTotal)} icon={Banknote} sub={`Kunlik rejada: ${money(profile?.cash || 0)}`} />
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 border border-ochre/25">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-plaster">
            <Sparkles className="size-4 text-ochre" aria-hidden /> Kunlik reja bilan sinxronlash
          </div>
          <p className="text-xs text-plaster/65">
            {diff === 0
              ? "Kunlik rejangizdagi naqd+karta qoldig'i kartalar yig'indisi bilan bir xil."
              : `Kartalar yig'indisi (${money(totalBalance)}) kunlik rejadagi qo'ldagi puldan (${money(profile?.cash || 0)}) ${diff > 0 ? `+${money(diff)}` : money(diff)} farq qiladi.`}
          </p>
        </div>
        <Button variant={synced ? 'outline' : 'primary'} size="sm" onClick={applyToPlan} disabled={cards.length === 0}>
          {synced ? (
            <>
              <Check className="size-4 text-turq-soft" /> Qo'llandi
            </>
          ) : (
            "Umumiy balansni kunlik rejaga qo'llash"
          )}
        </Button>
      </Card>

      <Card>
        <CardTitle
          icon={CreditCard}
          action={
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'Hammasi' },
                { value: 'card', label: 'Kartalar' },
                { value: 'naqd', label: 'Naqd' },
              ]}
            />
          }
        >
          Ro'yxat
        </CardTitle>

        {visible.length === 0 ? (
          <Empty
            icon={CreditCard}
            title="Hali karta yoki hamyon yo'q"
            text="Uzcard, Humo, Visa yoki naqd hamyoningizning taxminiy nomini, oxirgi 4 raqamini va qoldig'ini qo'shing."
          >
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              Birinchi kartani qo'shish
            </Button>
          </Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((c) => (
              <CardTile
                key={c.id}
                item={c}
                onEdit={(item) => {
                  setEditing(item);
                  setModalOpen(true);
                }}
                onDelete={(id) => actions.deleteCard(id)}
              />
            ))}
          </div>
        )}
      </Card>

      {modalOpen && (
        <CardModal
          initial={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
