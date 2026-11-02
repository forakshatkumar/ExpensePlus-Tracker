import { Pencil, Trash2, RefreshCw } from 'lucide-react';
import { getCategoryEmoji, getCategoryName, inr } from '../lib/format';

export default function TransactionRow({ item, onDelete, onEdit, categories = [] }) {
  const categoryName = getCategoryName(item.categoryId, categories);
  const emoji = getCategoryEmoji(item.categoryId, categories);
  const amount = (item.amountCents || 0) / 100;

  return (
    <article className="v3-transaction-row" tabIndex={0} aria-label={`${item.description}, ${categoryName}, ${inr(amount)}`}>
      <span className="v3-transaction-icon" aria-hidden="true">
        {emoji}
      </span>
      <div className="v3-transaction-info">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="v3-transaction-name" title={item.description}>
            {item.description}
          </p>
          {item.isSubscription && (
            <span className="v31-entry-type-tag tag-deposit inline-flex items-center gap-1 text-[10px]" title="Recurring expense">
              <RefreshCw size={10} className="animate-spin-slow" /> Recurring
            </span>
          )}
        </div>
        <p className="v3-transaction-meta">
          <span>{categoryName}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={item.date}>{item.date}</time>
          {item.note && (
            <span className="v3-transaction-note-snippet" title={item.note}>
              <span aria-hidden="true">·</span> “{item.note}”
            </span>
          )}
        </p>
      </div>
      <div className="v3-transaction-actions">
        <strong className="v3-transaction-amount">−{inr(amount)}</strong>
        {onEdit && (
          <button
            type="button"
            aria-label={`Edit ${item.description}`}
            title="Edit expense"
            onClick={() => onEdit(item)}
            className="icon-button v3-row-action"
          >
            <Pencil size={15} />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            aria-label={`Delete ${item.description}`}
            title="Delete expense"
            onClick={() => onDelete(item)}
            className="icon-button v3-row-action v3-delete-action"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </article>
  );
}
