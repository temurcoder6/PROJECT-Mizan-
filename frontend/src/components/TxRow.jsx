import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2 } from 'lucide-react';
import { categoryOf, methodLabel } from '../lib/categories';
import { dateLabel, money } from '../lib/format';
import { Badge, IconButton } from './ui';

export default function TxRow({ tx, onEdit, onDelete, showDate = true }) {
  const income = tx.type === 'income';
  const cat = categoryOf(tx.category);
  const Icon = income ? ArrowDownLeft : ArrowUpRight;
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${cat.color}1a`, color: cat.color }}>
        <Icon className="size-4.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-slate-900">{tx.title}</span>
          {!income && tx.planned === false && <Badge tone="amber">Kutilmagan</Badge>}
        </div>
        <div className="truncate text-xs text-slate-500">
          {cat.uz} · {methodLabel(tx.method)}
          {showDate && ` · ${dateLabel(tx.date)}`}
          {tx.note && ` · ${tx.note}`}
        </div>
      </div>
      <span className={`shrink-0 text-right font-bold tabular-nums ${income ? 'text-emerald-600' : 'text-slate-900'}`}>
        {income ? '+' : '−'}
        {money(tx.amount)}
      </span>
      {(onEdit || onDelete) && (
        <div className="flex shrink-0">
          {onEdit && <IconButton label="Tahrirlash" icon={Pencil} onClick={() => onEdit(tx)} />}
          {onDelete && <IconButton label="O'chirish" icon={Trash2} className="hover:bg-rose-50! hover:text-rose-600!" onClick={() => onDelete(tx)} />}
        </div>
      )}
    </li>
  );
}
