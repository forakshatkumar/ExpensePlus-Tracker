import {Pencil,Trash2} from 'lucide-react';
import {getCategoryEmoji,getCategoryName,inr} from '../lib/format';
export default function TransactionRow({item,onDelete,onEdit,categories=[]}){
  return <article className="v3-transaction-row">
    <span className="v3-transaction-icon" aria-hidden="true">{getCategoryEmoji(item.categoryId,categories)}</span>
    <div className="v3-transaction-info"><p className="v3-transaction-name" title={item.description}>{item.description}</p><p className="v3-transaction-meta">{getCategoryName(item.categoryId,categories)} <span aria-hidden="true">·</span> <time dateTime={item.date}>{item.date}</time>{item.isSubscription?' · Recurring':''}</p></div>
    <div className="v3-transaction-actions"><strong className="v3-transaction-amount">−{inr(item.amountCents/100)}</strong>{onEdit&&<button type="button" aria-label={`Edit ${item.description}`} title="Edit" onClick={()=>onEdit(item)} className="icon-button v3-row-action"><Pencil size={16}/></button>}{onDelete&&<button type="button" aria-label={`Delete ${item.description}`} title="Delete" onClick={()=>onDelete(item)} className="icon-button v3-row-action v3-delete-action"><Trash2 size={16}/></button>}</div>
  </article>;
}
