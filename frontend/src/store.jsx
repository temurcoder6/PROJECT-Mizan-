import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './lib/api';
import { categoryLabel, methodLabel } from './lib/categories';
import { addDays, todayISO, uid } from './lib/format';
import { DEFAULT_PROFILE, normProfile, profileHasData } from './lib/plan';
import { downloadFile, toCSV, useStored } from './lib/storage';
import { cleanCards, cleanDebts, cleanGoals, cleanTransactions } from './lib/sanitize';

// ?demo=1 runs the real app on separate storage with sample data (used inside the phone on the website).
export const DEMO = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo');
const P = DEMO ? 'pulim.demo.' : 'pulim.v2.';

// ?demo=1&fresh=1 starts the sample from scratch (used by the scripted film so every run is identical).
if (DEMO && new URLSearchParams(window.location.search).has('fresh')) {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(P)).forEach((k) => localStorage.removeItem(k));
  } catch {
    // storage unavailable
  }
}

const KEYS = {
  tx: `${P}transactions`,
  debts: `${P}debts`,
  goals: `${P}goals`,
  cards: `${P}cards`,
  settings: `${P}settings`,
  profile: `${P}profile`,
  rev: `${P}rev`,
  dirty: `${P}dirty`,
  syncUser: `${P}syncUser`,
};

export const DEFAULT_SETTINGS = {
  animations: true,
  remindDays: 3,
  voiceConsent: false,
  voiceLang: 'uz-UZ',
  autoSpeak: true,
};

const StoreContext = createContext(null);

const lsGet = (k, d) => {
  try {
    const v = localStorage.getItem(k);
    return v === null ? d : JSON.parse(v);
  } catch {
    return d;
  }
};
const lsSet = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    // storage unavailable: the app keeps working in memory
  }
};

const sigOf = (d) => JSON.stringify([d.transactions, d.debts, d.goals, d.profile, d.cards || []]);

function unionById(a, b) {
  const m = new Map(a.map((x) => [x.id, x]));
  for (const x of b) if (!m.has(x.id)) m.set(x.id, x);
  return [...m.values()];
}

function mergeData(server, local) {
  const sp = normProfile(server.profile);
  const lp = local.profile;
  const base = profileHasData(sp) ? { ...lp, ...sp } : { ...sp, ...lp };
  return {
    transactions: unionById(server.transactions, local.transactions),
    debts: unionById(server.debts, local.debts),
    goals: unionById(server.goals, local.goals),
    cards: unionById(server.cards || [], local.cards || []),
    profile: normProfile({
      ...base,
      bills: unionById(sp.bills, lp.bills),
      noSpend: [...new Set([...sp.noSpend, ...lp.noSpend])].sort(),
    }),
  };
}

function buildSample(today) {
  const ago = (n) => addDays(today, -n);
  const tx = [];
  const add = (type, title, amount, category, daysAgo, method = 'naqd', planned = true) =>
    tx.push({ id: uid(), type, title, amount, category, date: ago(daysAgo), method, planned, note: '', sample: true, createdAt: Date.now() - daysAgo * 1000 });

  add('income', 'Maosh', 4500000, 'maosh', 20, 'karta');
  add('income', 'Buyurtma', 600000, 'savdo', 6);
  for (let i = 1; i <= 19; i += 2) add('expense', 'non', 6000, 'oziq', i);
  for (let i = 0; i <= 9; i++) add('expense', 'kofe', 12000, 'oziq', i, 'karta', false);
  for (let i = 1; i <= 19; i += 3) add('expense', 'taksi', 15000, 'transport', i);
  add('expense', 'svet', 120000, 'kommunal', 12, 'karta');
  add('expense', 'gaz', 85000, 'kommunal', 12, 'karta');
  add('expense', 'internet', 70000, 'aloqa', 15, 'karta');
  add('expense', 'bozor', 250000, 'bozor', 3);
  add('expense', 'bozor', 230000, 'bozor', 10);
  add('expense', 'bozor', 270000, 'bozor', 17);
  add('expense', "to'y", 300000, 'ijtimoiy', 8, 'naqd', false);
  add('expense', 'dori', 45000, 'salomatlik', 5, 'naqd', false);

  const debts = [
    { id: uid(), direction: 'lent', person: 'Alisher', amount: 200000, date: ago(10), dueDate: addDays(today, 3), note: "Telefon ta'miri uchun", remind: true, createdAt: Date.now() - 864e6, payments: [{ id: uid(), amount: 50000, date: ago(4), at: Date.now() - 4 * 864e5 }], sample: true },
    { id: uid(), direction: 'borrowed', person: "Do'kon (nasiya)", amount: 150000, date: ago(7), dueDate: addDays(today, 12), note: '', remind: true, createdAt: Date.now() - 7 * 864e5, payments: [], sample: true },
  ];
  const goals = [
    { id: uid(), name: 'Telefon', target: 3000000, saved: 600000, deadline: addDays(today, 90), createdAt: ago(20), adds: [], sample: true },
    { id: uid(), name: "O'qish kontrakti", target: 8000000, saved: 1500000, deadline: addDays(today, 240), createdAt: ago(30), adds: [], sample: true },
  ];
  const cards = [
    { id: uid(), label: 'Asosiy Uzcard', network: 'uzcard', last4: '4812', balance: 620000, createdAt: Date.now() - 5000 },
    { id: uid(), label: 'Humo maosh', network: 'humo', last4: '9034', balance: 430000, createdAt: Date.now() - 4000 },
    { id: uid(), label: 'Naqd hamyon', network: 'naqd', last4: '', balance: 150000, createdAt: Date.now() - 3000 },
  ];
  return { tx, debts, goals, cards };
}

// The sample is written before any state is created, so several demo frames on one page all see the same data.
if (DEMO && !lsGet(`${P}seeded`, false)) {
  const today = todayISO();
  const s = buildSample(today);
  lsSet(KEYS.tx, s.tx);
  lsSet(KEYS.debts, s.debts);
  lsSet(KEYS.goals, s.goals);
  lsSet(KEYS.cards, s.cards);
  lsSet(KEYS.profile, { ...DEFAULT_PROFILE, cash: 1200000, cashDate: today, cashSetAt: Date.now(), nextIncome: addDays(today, 9) });
  lsSet(`${P}seeded`, true);
}

export function StoreProvider({ children }) {
  const [transactions, setTransactions] = useStored(KEYS.tx, []);
  const [debts, setDebts] = useStored(KEYS.debts, []);
  const [goals, setGoals] = useStored(KEYS.goals, []);
  const [cards, setCards] = useStored(KEYS.cards, []);
  const [rawProfile, setRawProfile] = useStored(KEYS.profile, DEFAULT_PROFILE);
  const [rawSettings, setSettings] = useStored(KEYS.settings, DEFAULT_SETTINGS);
  const [chat, setChat] = useState([]);
  const [pending, setPending] = useState(null);

  const [auth, setAuth] = useState({ status: DEMO ? 'noserver' : 'checking', user: null });
  const [sync, setSync] = useState({ state: 'idle', at: null, error: '' });
  const [conflict, setConflict] = useState(null);

  const settings = useMemo(() => {
    const s = { ...DEFAULT_SETTINGS, ...rawSettings };
    if (rawSettings.autoSpeak === undefined) s.autoSpeak = true;
    return s;
  }, [rawSettings]);
  const profile = useMemo(() => normProfile(rawProfile), [rawProfile]);

  // ---------- server sync ----------

  const latest = useRef({});
  useEffect(() => {
    latest.current = { transactions, debts, goals, profile, cards };
  }, [transactions, debts, goals, profile, cards]);
  const dataSig = useMemo(() => sigOf({ transactions, debts, goals, profile, cards }), [transactions, debts, goals, profile, cards]);

  const revRef = useRef(Number(lsGet(KEYS.rev, 0)) || 0);
  const dirtyRef = useRef(Boolean(lsGet(KEYS.dirty, false)));
  const syncedSig = useRef(null);
  const ready = useRef(false);
  const booted = useRef(false);
  const retryTimer = useRef(null);
  const pushRef = useRef(null);

  const setDirty = (v) => {
    dirtyRef.current = v;
    lsSet(KEYS.dirty, v);
  };

  const apply = useCallback((s) => {
    const p = normProfile(s.profile);
    const c = Array.isArray(s.cards) ? s.cards : [];
    syncedSig.current = sigOf({ transactions: s.transactions, debts: s.debts, goals: s.goals, profile: p, cards: c });
    setTransactions(s.transactions);
    setDebts(s.debts);
    setGoals(s.goals);
    setCards(c);
    setRawProfile(p);
    revRef.current = s.revision;
    lsSet(KEYS.rev, s.revision);
    setDirty(false);
    setConflict(null);
    setSync({ state: 'saved', at: Date.now(), error: '' });
  }, [setTransactions, setDebts, setGoals, setCards, setRawProfile]);

  const pushNow = useCallback(async (force = false, baseRevision) => {
    const d = latest.current;
    const sig = sigOf(d);
    setSync((s) => ({ ...s, state: 'syncing' }));
    try {
      const r = await api.putData({ baseRevision: baseRevision ?? revRef.current, force, ...d });
      revRef.current = r.revision;
      lsSet(KEYS.rev, r.revision);
      syncedSig.current = sig;
      if (sigOf(latest.current) === sig) setDirty(false);
      setSync({ state: 'saved', at: Date.now(), error: '' });
    } catch (e) {
      if (e.status === 409) {
        setConflict(e.data.server);
        setSync({ state: 'error', at: null, error: "Boshqa qurilmada ma'lumot o'zgargan." });
      } else if (e.status === 401) {
        setAuth({ status: 'out', user: null });
        setSync({ state: 'idle', at: null, error: '' });
      } else {
        setSync({ state: 'error', at: null, error: e.code === 'network' ? "Internet yo'q. Ma'lumot qurilmada saqlangan, keyin qayta uriniladi." : e.message });
        clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(() => pushRef.current?.(), 20000);
      }
    }
  }, []);
  useEffect(() => {
    pushRef.current = pushNow;
  }, [pushNow]);

  const initialSync = useCallback(async (user) => {
    try {
      const s = await api.getData();
      const L = latest.current;
      const localHas = L.transactions.length > 0 || L.debts.length > 0 || L.goals.length > 0 || L.cards.length > 0 || profileHasData(L.profile);
      const sameUser = lsGet(KEYS.syncUser, null) === user.id;
      if (!s.hasData && localHas) {
        revRef.current = s.revision;
        await pushNow(false, s.revision);
      } else if (s.hasData && !localHas) {
        apply(s);
      } else if (s.hasData && localHas) {
        if (sameUser && !dirtyRef.current) apply(s);
        else if (sameUser && s.revision === revRef.current) await pushNow();
        else setConflict(s);
      } else {
        revRef.current = s.revision;
        lsSet(KEYS.rev, s.revision);
        setSync({ state: 'saved', at: Date.now(), error: '' });
      }
      lsSet(KEYS.syncUser, user.id);
    } catch (e) {
      setSync({ state: 'error', at: null, error: e.message });
    } finally {
      ready.current = true;
    }
  }, [apply, pushNow]);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    if (DEMO) return;
    api
      .me()
      .then((r) => {
        setAuth({ status: 'in', user: r.user });
        return initialSync(r.user);
      })
      .catch((e) => setAuth({ status: e.code ? 'noserver' : 'out', user: null }));
  }, [initialSync]);

  useEffect(() => {
    if (syncedSig.current === null) {
      syncedSig.current = dataSig;
      return;
    }
    if (dataSig !== syncedSig.current) setDirty(true);
  }, [dataSig]);

  useEffect(() => {
    if (auth.status !== 'in' || !ready.current || conflict) return undefined;
    if (dataSig === syncedSig.current) return undefined;
    const t = setTimeout(() => pushNow(), 1200);
    return () => clearTimeout(t);
  }, [dataSig, auth.status, conflict, pushNow]);

  // Picks up changes made elsewhere (for example by the Telegram bot) when there is nothing unsaved here.
  useEffect(() => {
    if (auth.status !== 'in') return undefined;
    const id = setInterval(async () => {
      if (!ready.current || dirtyRef.current || conflict || document.hidden) return;
      try {
        const { revision } = await api.revision();
        if (revision === revRef.current) return;
        const s = await api.getData();
        if (!dirtyRef.current) apply(s);
      } catch {
        // offline or signed out: the next normal sync handles it
      }
    }, 20000);
    return () => clearInterval(id);
  }, [auth.status, conflict, apply]);

  useEffect(() => {
    const onOnline = () => {
      if (auth.status === 'in' && ready.current && dirtyRef.current && !conflict) pushNow();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [auth.status, conflict, pushNow]);

  const authActions = useMemo(
    () => ({
      async authenticate(mode, username, password) {
        const r = mode === 'register' ? await api.register(username, password) : await api.login(username, password);
        setAuth({ status: 'in', user: r.user });
        ready.current = false;
        await initialSync(r.user);
        return r;
      },
      async recover(username, code, newPassword) {
        const r = await api.recover(username, code, newPassword);
        setAuth({ status: 'in', user: r.user });
        ready.current = false;
        await initialSync(r.user);
        return r;
      },
      markRecovery: () => setAuth((a) => (a.user ? { ...a, user: { ...a.user, hasRecovery: true } } : a)),
      setUser: (user) => setAuth({ status: 'in', user }),
      async unlinkOAuth(provider) {
        const r = await api.unlinkOAuth(provider);
        if (r.user) setAuth((a) => ({ ...a, user: r.user }));
        return r;
      },
      async logout() {
        await api.logout().catch(() => {});
        setAuth({ status: 'out', user: null });
        setSync({ state: 'idle', at: null, error: '' });
        ready.current = false;
      },
      async logoutAll() {
        await api.logoutAll().catch(() => {});
        setAuth({ status: 'out', user: null });
        setSync({ state: 'idle', at: null, error: '' });
        ready.current = false;
      },
      async deleteAccount(payload) {
        await api.deleteAccount(payload);
        setAuth({ status: 'out', user: null });
        setSync({ state: 'idle', at: null, error: '' });
        lsSet(KEYS.syncUser, null);
        revRef.current = 0;
        lsSet(KEYS.rev, 0);
        ready.current = false;
      },
      syncNow: () => pushNow(),
      async resolveConflict(choice) {
        const server = conflict;
        if (!server) return;
        if (choice === 'server') return apply(server);
        if (choice === 'local') {
          setConflict(null);
          return pushNow(true, server.revision);
        }
        const merged = mergeData(server, latest.current);
        try {
          const r = await api.putData({ baseRevision: server.revision, force: true, ...merged });
          apply({ ...merged, revision: r.revision });
        } catch (e) {
          setSync({ state: 'error', at: null, error: e.message });
        }
      },
    }),
    [conflict, apply, initialSync, pushNow],
  );

  // ---------- data actions ----------

  const actions = useMemo(() => {
    const patchList = (setter) => (id, patch) => setter((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const removeFrom = (setter) => (id) => setter((l) => l.filter((x) => x.id !== id));
    const patchProfile = (patch) => setRawProfile((p) => ({ ...normProfile(p), ...patch }));
    return {
      addTx: (tx) => {
        const id = uid();
        setTransactions((l) => [...l, { ...tx, id, createdAt: Date.now() }]);
        return id;
      },
      updateTx: patchList(setTransactions),
      deleteTx: removeFrom(setTransactions),

      addDebt: (d) => setDebts((l) => [...l, { ...d, id: uid(), createdAt: Date.now(), payments: [] }]),
      updateDebt: patchList(setDebts),
      deleteDebt: removeFrom(setDebts),
      addPayment: (debtId, p) =>
        setDebts((l) => l.map((d) => (d.id === debtId ? { ...d, payments: [...(d.payments || []), { ...p, id: uid(), at: Date.now() }] } : d))),
      deletePayment: (debtId, paymentId) =>
        setDebts((l) => l.map((d) => (d.id === debtId ? { ...d, payments: d.payments.filter((p) => p.id !== paymentId) } : d))),

      addGoal: (g) => setGoals((l) => [...l, { ...g, id: uid(), createdAt: todayISO(), adds: [] }]),
      updateGoal: patchList(setGoals),
      deleteGoal: removeFrom(setGoals),
      addCard: (c) => setCards((l) => [...l, { ...c, id: uid(), createdAt: Date.now() }]),
      updateCard: patchList(setCards),
      deleteCard: removeFrom(setCards),
      addToGoal: (id, amount) =>
        setGoals((l) =>
          l.map((g) => {
            if (g.id !== id) return g;
            const saved = Math.max(0, g.saved + amount);
            return { ...g, saved, adds: [...(g.adds || []), { amount: saved - g.saved, at: Date.now() }] };
          }),
        ),

      updateProfile: patchProfile,
      setCash: (cash) => patchProfile({ cash, cashDate: todayISO(), cashSetAt: Date.now() }),
      toggleNoSpend: (date) =>
        setRawProfile((p) => {
          const n = normProfile(p);
          return { ...n, noSpend: n.noSpend.includes(date) ? n.noSpend.filter((d) => d !== date) : [...n.noSpend, date].sort() };
        }),
      addBill: (b) => setRawProfile((p) => ({ ...normProfile(p), bills: [...normProfile(p).bills, { ...b, id: uid(), paidThrough: '' }] })),
      deleteBill: (id) => setRawProfile((p) => ({ ...normProfile(p), bills: normProfile(p).bills.filter((b) => b.id !== id) })),
      markBillPaid: (id, date) =>
        setRawProfile((p) => ({ ...normProfile(p), bills: normProfile(p).bills.map((b) => (b.id === id ? { ...b, paidThrough: date } : b)) })),

      setSetting: (key, value) => setSettings((s) => ({ ...DEFAULT_SETTINGS, ...s, [key]: value })),

      pushMessage: (msg) => setChat((c) => [...c, msg]),
      setDraftStatus: (msgId, draftId, status) =>
        setChat((c) => c.map((m) => (m.id === msgId ? { ...m, drafts: m.drafts.map((d) => (d.id === draftId ? { ...d, status } : d)) } : m))),
      clearChat: () => {
        setChat([]);
        setPending(null);
      },
      setPending,

      loadSample: () => {
        const s = buildSample(todayISO());
        setTransactions((l) => [...l.filter((x) => !x.sample), ...s.tx]);
        setDebts((l) => [...l.filter((x) => !x.sample), ...s.debts]);
        setGoals((l) => [...l.filter((x) => !x.sample), ...s.goals]);
      },
      removeSample: () => {
        setTransactions((l) => l.filter((x) => !x.sample));
        setDebts((l) => l.filter((x) => !x.sample));
        setGoals((l) => l.filter((x) => !x.sample));
      },
      importAll: (data) => {
        setTransactions(cleanTransactions(data.transactions));
        setDebts(cleanDebts(data.debts));
        setGoals(cleanGoals(data.goals));
        setCards(cleanCards(data.cards));
        setRawProfile(normProfile(data.profile));
      },
      clearAll: () => {
        setTransactions([]);
        setDebts([]);
        setGoals([]);
        setCards([]);
        setRawProfile(DEFAULT_PROFILE);
        setChat([]);
        setPending(null);
      },
    };
  }, [setTransactions, setDebts, setGoals, setCards, setRawProfile, setSettings]);

  const combinedActions = useMemo(
    () => ({ ...actions, ...authActions }),
    [actions, authActions],
  );

  const value = useMemo(
    () => ({ transactions, debts, goals, cards, profile, settings, chat, pending, actions: combinedActions, auth, sync, conflict, authActions: combinedActions }),
    [transactions, debts, goals, cards, profile, settings, chat, pending, combinedActions, auth, sync, conflict],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}

export function exportJSON({ transactions, debts, goals, cards, profile }) {
  const data = { app: 'pulim', version: 3, exportedAt: new Date().toISOString(), transactions, debts, goals, cards: cards || [], profile };
  downloadFile(`mizan-${todayISO()}.json`, JSON.stringify(data, null, 2), 'application/json');
}

export function exportCSV(transactions, name = `mizan-yozuvlar-${todayISO()}.csv`) {
  const rows = [['sana', 'turi', 'nomi', 'toifa', 'summa', "to'lov usuli", 'rejalangan', 'izoh']];
  for (const t of [...transactions].sort((a, b) => a.date.localeCompare(b.date))) {
    rows.push([
      t.date,
      t.type === 'income' ? 'daromad' : 'xarajat',
      t.title,
      categoryLabel(t.category),
      t.amount,
      methodLabel(t.method),
      t.type === 'income' ? '' : t.planned === false ? "yo'q" : 'ha',
      t.note || '',
    ]);
  }
  downloadFile(name, toCSV(rows), 'text/csv;charset=utf-8');
}
