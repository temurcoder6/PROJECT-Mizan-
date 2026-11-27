import { useMemo } from 'react';
import { Lightbulb } from 'lucide-react';
import { adviceText } from '../lib/assistant/advice';
import { buildAdvice } from '../lib/insights';
import { todayISO } from '../lib/format';
import { useStore } from '../store';
import { Badge, Card, CardTitle } from './ui';

export default function AdviceCard() {
  const { transactions, debts, goals, profile } = useStore();
  const text = useMemo(() => adviceText(buildAdvice({ transactions, debts, goals, profile }, todayISO()), 'uz'), [transactions, debts, goals, profile]);

  return (
    <Card>
      <CardTitle icon={Lightbulb} action={<Badge tone="green">Hisobi ochiq</Badge>}>
        Bugungi maslahat
      </CardTitle>
      <p className="text-sm whitespace-pre-line text-plaster/80">{text}</p>
      <p className="mt-3 text-xs text-plaster/55">Faqat siz kiritgan yozuvlardan. Majburiy emas: xohlasangiz, e'tibor bering.</p>
    </Card>
  );
}
