import { useState } from 'react';
import { Check, MessageSquareWarning, Send } from 'lucide-react';
import { api } from '../lib/api';
import { Button, Field, Modal, inputCls } from './ui';

export default function ComplaintModal({ open, onClose, initialReason = '' }) {
  const [category, setCategory] = useState('shikoyat');
  const [message, setMessage] = useState(initialReason ? `Mizan AI cheklovi/javobi bo'yicha murojaat: ${initialReason}\n\nIzohim: ` : '');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState({ phase: 'idle', id: null, error: '' });

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (message.trim().length < 10) return;
    setStatus({ phase: 'sending', id: null, error: '' });
    try {
      const r = await api.support({
        category,
        message: message.trim(),
        contact: contact.trim(),
        context: `sahifa: ${window.location.hash || '#yordamchi'}`,
      });
      setStatus({ phase: 'sent', id: r.id, error: '' });
    } catch (err) {
      setStatus({ phase: 'error', id: null, error: err.message || "Yuborib bo'lmadi." });
    }
  };

  return (
    <Modal title="Shikoyat va murojaat oynasi" onClose={onClose}>
      {status.phase === 'sent' ? (
        <div className="space-y-3 text-sm text-plaster/85">
          <div className="flex items-start gap-2 rounded-xl border border-turq/35 bg-turq/15 p-3 text-turq-soft">
            <Check className="mt-0.5 size-4 shrink-0" />
            <span>Murojaatingiz qabul qilindi (#{status.id}). Administrator ko'rib chiqadi.</span>
          </div>
          <Button className="w-full" onClick={onClose}>Yopish</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <p className="flex items-start gap-2 rounded-xl border border-ochre/30 bg-ochre/10 p-2.5 text-xs text-[#F2C46B]">
            <MessageSquareWarning className="mt-0.5 size-4 shrink-0" />
            Agar AI javobidan norozi bo'lsangiz, noto'g'ri ogohlantirish/ban berilgan deb hisoblasangiz yoki jiddiy muammo bo'lsa, shu yerdan shikoyat yuboring.
          </p>
          <Field label="Murojaat turi">
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="shikoyat">Shikoyat / Apellyatsiya</option>
              <option value="muammo">Texnik muammo</option>
              <option value="taklif">Taklif</option>
            </select>
          </Field>
          <Field label="Batafsil yozing" hint={`${message.trim().length}/2000 (kamida 10 ta belgi)`}>
            <textarea
              className={`${inputCls} min-h-28`}
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nimadan shikoyatingiz bor? Aniq yozing..."
            />
          </Field>
          <Field label="Aloqa (telefon yoki @username, ixtiyoriy)">
            <input className={inputCls} maxLength={120} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+998 90 ..." />
          </Field>
          {status.phase === 'error' && (
            <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-400/25">{status.error}</p>
          )}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Bekor qilish</Button>
            <Button type="submit" className="flex-1" disabled={message.trim().length < 10 || status.phase === 'sending'}>
              <Send className="size-3.5" /> {status.phase === 'sending' ? 'Yuborilmoqda...' : 'Yuborish'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
