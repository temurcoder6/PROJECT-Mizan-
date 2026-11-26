import { useMemo, useState } from 'react';
import { Lightbulb, Volume2 } from 'lucide-react';
import { adviceText } from '../lib/assistant/advice';
import { buildAdvice } from '../lib/insights';
import { todayISO } from '../lib/format';
import { speak, voiceOutputSupported } from '../lib/voice';
import { useStore } from '../store';
import { Badge, Button, Card, CardTitle } from './ui';

export default function AdviceCard() {
  const { transactions, debts, goals, profile } = useStore();
  const [notice, setNotice] = useState('');
  const text = useMemo(() => adviceText(buildAdvice({ transactions, debts, goals, profile }, todayISO()), 'uz'), [transactions, debts, goals, profile]);

  return (
    <Card>
      <CardTitle icon={Lightbulb} action={<Badge tone="green">Hisobi ochiq</Badge>}>
        Bugungi maslahat
      </CardTitle>
      <p className="text-sm whitespace-pre-line text-slate-700">{text}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {voiceOutputSupported && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setNotice(speak(text, 'uz') ? '' : "Qurilmangizda o'zbek tili uchun ovoz o'rnatilmagan, shuning uchun o'qib bera olmayman.")}
          >
            <Volume2 className="size-3.5" /> O'qib berish
          </Button>
        )}
        {notice && <span className="text-xs text-amber-700">{notice}</span>}
      </div>
      <p className="mt-2 text-xs text-slate-500">Faqat siz kiritgan yozuvlardan. Majburiy emas: xohlasangiz, e'tibor bering.</p>
    </Card>
  );
}
