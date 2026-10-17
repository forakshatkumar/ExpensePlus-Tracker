import {useCallback,useEffect,useRef,useState} from 'react';
import {X,WalletCards,CalendarDays,Tag} from 'lucide-react';
import {api} from '../../lib/api';
import {dateToday,categoryLabels,categoryEmoji} from '../../lib/format';
const defaults=Object.entries(categoryLabels).map(([id,name])=>({id,name,emoji:categoryEmoji[id]}));
export default function ExpenseModal({onClose,onSaved,notify,edit=null}){
  const [amount,setAmount]=useState(edit?String((edit.amountCents/100).toFixed(2)):'');
  const [description,setDescription]=useState(edit?.description||'');
  const [categoryId,setCategory]=useState(edit?.categoryId||'food');
  const [date,setDate]=useState(edit?.date||dateToday());
  const [note,setNote]=useState(edit?.note||'');
  const [isSubscription,setSubscription]=useState(Boolean(edit?.isSubscription));
  const [categories,setCategories]=useState(defaults);
  const [newCategory,setNewCategory]=useState('');
  const [newEmoji,setNewEmoji]=useState('✨');
  const [addingCategory,setAddingCategory]=useState(false);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const fieldRef=useRef(null);
  const dialogRef=useRef(null);
  const closeRef=useRef(null);
  const original=useRef({amount:edit?String((edit.amountCents/100).toFixed(2)):'',description:edit?.description||'',categoryId:edit?.categoryId||'food',date:edit?.date||dateToday(),note:edit?.note||'',isSubscription:Boolean(edit?.isSubscription)});
  const dirty=amount!==original.current.amount||description!==original.current.description||categoryId!==original.current.categoryId||date!==original.current.date||note!==original.current.note||isSubscription!==original.current.isSubscription;
  const requestClose=useCallback(()=>{if(busy)return;if(dirty&&!window.confirm('Discard your unsaved expense changes?'))return;onClose();},[busy,dirty,onClose]);
  closeRef.current=requestClose;
  useEffect(()=>{
    const prev=document.body.style.overflow;
    document.body.style.overflow='hidden';
    // Auto-focus on desktop; on phones avoid unexpectedly opening the keyboard.
    if(window.matchMedia('(min-width: 768px)').matches)fieldRef.current?.focus();
    else dialogRef.current?.querySelector('button')?.focus({preventScroll:true});
    const key=e=>{
      if(e.key==='Escape'){e.preventDefault();closeRef.current?.();}
      if(e.key==='Tab'&&dialogRef.current){
        const focusable=[...dialogRef.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')];
        if(!focusable.length)return;
        if(e.shiftKey&&document.activeElement===focusable[0]){e.preventDefault();focusable.at(-1).focus();}
        else if(!e.shiftKey&&document.activeElement===focusable.at(-1)){e.preventDefault();focusable[0].focus();}
      }
    };
    document.addEventListener('keydown',key);
    return ()=>{document.body.style.overflow=prev;document.removeEventListener('keydown',key);};
  },[]);
  useEffect(()=>{api('/api/categories').then(r=>setCategories(r.categories?.length?r.categories:defaults)).catch(()=>{});},[]);
  async function addCategory(){
    if(!newCategory.trim()||newCategory.trim().length>24){setError('Category name must be 1–24 characters.');return;}
    setAddingCategory(true);setError('');
    try{
      const r=await api('/api/categories',{method:'POST',body:JSON.stringify({name:newCategory.trim(),emoji:newEmoji.trim()||'✨'})});
      setCategories(previous=>[...previous,r.category]);setCategory(r.category.id);setNewCategory('');
      notify('Category added.');
    }catch(e){setError(e.message);}finally{setAddingCategory(false);}
  }
  async function save(e){
    e.preventDefault();if(busy)return;
    const parsed=amount.trim();
    if(!/^\d+(?:\.\d{1,2})?$/.test(parsed)){setError('Enter a positive amount with up to two decimal places.');return;}
    const cents=Math.round(Number(parsed)*100);
    if(!Number.isSafeInteger(cents)||cents<1||cents>100_000_000_000){setError('Enter a valid expense amount.');return;}
    if(!description.trim()||description.trim().length>100){setError('Description must be between 1 and 100 characters.');return;}
    if(note.length>500){setError('Notes must be within 500 characters.');return;}
    setBusy(true);setError('');
    try{
      const payload={amountCents:cents,description:description.trim(),categoryId,date,note:note.trim(),isSubscription};
      await api(edit?`/api/transactions/${edit.id}`:'/api/transactions',{method:edit?'PUT':'POST',body:JSON.stringify(payload)});
      notify(edit?'Expense updated.':'Expense added successfully.');
      onClose();
      Promise.resolve().then(onSaved).catch(e=>notify(`Saved, but couldn't refresh: ${e.message}`,'error'));
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <div className="ep-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)requestClose();}}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="expense-title" aria-describedby="expense-intro" className="ep-expense-dialog">
      <div className="ep-sheet-handle" aria-hidden="true"/>
      <div className="flex items-start justify-between gap-3 border-b border-line pb-5"><div><p className="eyebrow">A little clarity goes a long way</p><h2 id="expense-title" className="mt-2 font-display text-3xl">{edit?'Edit expense':'Add a new expense'} <span className="text-terracotta">✦</span></h2><p id="expense-intro" className="mt-2 text-sm text-muted">Capture the moment, keep your money in focus.</p></div><button type="button" onClick={requestClose} className="icon-button" aria-label="Close expense form"><X size={20}/></button></div>
      <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
        <div className="ep-dialog-scroll space-y-5 py-6">
          <div><label className="field-label" htmlFor="expense-amount">Amount</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-display text-3xl text-sage" aria-hidden="true">₹</span><input ref={fieldRef} id="expense-amount" inputMode="decimal" className="field !pl-12 !py-4 !text-2xl" placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)} required maxLength={15}/></div></div>
          <div><label className="field-label" htmlFor="expense-description">What was it for?</label><input id="expense-description" className="field" placeholder="e.g. Coffee and snacks" maxLength={100} required value={description} onChange={e=>setDescription(e.target.value)}/></div>
          <div><label className="field-label" htmlFor="expense-category"><Tag size={15} className="inline mr-1"/> Category</label><select id="expense-category" className="field" value={categoryId} onChange={e=>setCategory(e.target.value)}>{!categories.some(c=>c.id===categoryId)&&<option value={categoryId}>{categoryId}</option>}{categories.map(c=><option key={c.id} value={c.id}>{c.emoji||'✨'} {c.name}</option>)}</select><details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-sage">+ Create custom category</summary><div className="mt-3 grid grid-cols-[1fr_62px] gap-2"><input className="field" aria-label="New category name" value={newCategory} maxLength={24} placeholder="Category name" onChange={e=>setNewCategory(e.target.value)}/><input className="field !px-2 text-center" aria-label="New category emoji" maxLength={12} value={newEmoji} onChange={e=>setNewEmoji(e.target.value)}/></div><button type="button" className="btn-outline mt-2 !py-1.5" disabled={addingCategory} onClick={addCategory}>{addingCategory?'Creating…':'Add category'}</button></details></div>
          <div><label className="field-label" htmlFor="expense-date"><CalendarDays size={15} className="inline mr-1"/> Date</label><input id="expense-date" className="field" type="date" value={date} onChange={e=>setDate(e.target.value)} required/></div>
          <div><label className="field-label" htmlFor="expense-note">Note <span className="font-normal text-muted">(optional)</span></label><textarea id="expense-note" className="field min-h-20 resize-y" maxLength={500} placeholder="Anything you'd like to remember?" value={note} onChange={e=>setNote(e.target.value)}/></div>
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card-soft px-4 py-3"><span><span className="block text-sm font-semibold">Recurring / subscription</span><span className="mt-1 block text-xs text-muted">Tag it for your own records; no automatic charge is created.</span></span><input className="accent-sage h-5 w-5 shrink-0" type="checkbox" checked={isSubscription} onChange={e=>setSubscription(e.target.checked)}/></label>
          {error&&<p role="alert" className="rounded-xl border border-terracotta/40 bg-terracotta/10 p-3 text-sm text-terracotta">{error}</p>}
        </div>
        <div className="ep-modal-actions"><button type="button" className="btn-outline" onClick={requestClose} disabled={busy}>Cancel</button><button type="submit" className="btn-primary" disabled={busy}><WalletCards size={17}/>{busy?'Saving…':edit?'Save changes':'Save expense'}</button></div>
      </form>
    </section>
  </div>;
}
