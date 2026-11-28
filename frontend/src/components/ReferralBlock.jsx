import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Gift } from 'lucide-react';
import { api } from '../lib/api';
import { refLink } from '../lib/referral';
import { inputCls } from './ui';
import { DEMO, useStore } from '../store';

// "Do'stingizni taklif qiling": havola + nechta do'st qo'shilgani. Boshqa foydalanuvchining ismi yoki emaili ko'rsatilmaydi:
// server faqat sonlarni qaytaradi.
export default function ReferralBlock() {
  const { auth } = useStore();
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);
  const signedIn = auth.status === 'in';
  const userId = auth.user?.id;

  useEffect(() => {
    if (!signedIn || DEMO) return undefined;
    let off = false;
    api
      .referral()
      .then((r) => !off && setInfo(r))
      .catch((e) => !off && setErr(e.message || 'Yuklab bo\'lmadi.'));
    return () => {
      off = true;
    };
  }, [signedIn, userId]);

  if (DEMO) return <p className="text-xs text-plaster/60">Namuna oynasida taklif havolasi yo'q: u haqiqiy hisob uchun beriladi.</p>;
  if (!signedIn) {
    return <p className="text-sm text-plaster/70">Taklif havolasini olish uchun avval hisob oching (Sozlamalar bo'limida).</p>;
  }
  if (err) return <p className="text-sm text-rose-300">{err}</p>;
  if (!info) return <p className="text-sm text-plaster/60">Yuklanmoqda…</p>;

  const link = refLink(window.location.origin, info.code);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      inputRef.current?.select();
      try {
        document.execCommand('copy');
      } catch {
        // qo'lda nusxalash mumkin: matn belgilab qo'yildi
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-semibold text-plaster">
        <Gift className="size-4 text-ochre" aria-hidden /> Do'stingizni taklif qiling
      </div>
      <p className="mt-1 text-xs leading-relaxed text-plaster/70">
        Do'stingiz shu havola orqali yangi hisob ochsa, ikkalangizga ham {info.bonusDays} kunlik Mizan Pro beriladi. Faqat yangi hisob uchun va bir marta; bir oyda
        eng ko'pi bilan {info.monthlyMax} ta mukofot.
      </p>
      <div className="mt-3 flex gap-2">
        <input ref={inputRef} readOnly value={link} onFocus={(e) => e.target.select()} className={`${inputCls} min-w-0 flex-1 text-sm`} aria-label="Taklif havolasi" />
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-ochre px-3.5 py-2 text-sm font-semibold text-cobalt-night transition hover:opacity-90"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? 'Nusxalandi' : 'Nusxalash'}
        </button>
      </div>
      <p className="mt-2 text-xs text-plaster/65">
        Qo'shilgan do'stlar: <b className="text-plaster">{info.invited}</b> · Shu oy mukofot: <b className="text-plaster">{info.rewardedThisMonth}/{info.monthlyMax}</b>
        {info.joinedViaInvite ? ' · Siz ham taklif orqali kelgansiz' : ''}
      </p>
    </div>
  );
}
