import {Pencil,Trash2} from 'lucide-react';
import {getCategoryEmoji,getCategoryName,inr} from '../lib/format';
export default function TransactionRow({item,onDelete,onEdit,categories=[]}){
  return <div className="flex items-center justify-between gap-3 border-b border-line/70 py-3.5 last:border-b-0">
    <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-espresso text-lg">{getCategoryEmoji(item.categoryId,categories)}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-cream">{item.description}</p><p className="mt-1 truncate text-xs text-muted">{getCategoryName(item.categoryId,categories)} · {item.date}{item.isSubscription?' · Recurring':''}</p></div></div>
    <div className="flex shrink-0 items-center gap-2"><strong className="text-sm text-cream">−{inr(item.amountCents/100)}</strong>{onEdit&&<button aria-label={`Edit ${item.description}`} title="Edit" onClick={()=>onEdit(item)} className="icon-button !h-8 !w-8"><Pencil size={15}/></button>}{onDelete&&<button aria-label={`Delete ${item.description}`} title="Delete" onClick={()=>onDelete(item)} className="icon-button !h-8 !w-8 hover:!text-terracotta"><Trash2 size={15}/></button>}</div>
  </div>;
}
