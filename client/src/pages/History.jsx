import {useMemo,useState} from 'react';
import {Download,Search,SlidersHorizontal} from 'lucide-react';
import {useAppData} from '../components/layout/AppLayout';
import TransactionRow from '../components/TransactionRow';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import {api} from '../lib/api';
import {getCategoryName, inr} from '../lib/format';
export default function History(){
  const {transactions,categories:categoryOptions,refreshAfterExpense,openExpense,notify}=useAppData();
  const [query,setQuery]=useState('');const [category,setCategory]=useState('all');const [month,setMonth]=useState('');const [sort,setSort]=useState('newest');
  const [deleting,setDeleting]=useState(null);const [busy,setBusy]=useState(false);
  const categories=[...new Set(transactions.map(t=>t.categoryId))];
  const shown=useMemo(()=>transactions.filter(t=>(category==='all'||t.categoryId===category)&&(!month||t.date.startsWith(month))&&t.description.toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>{
    if(sort==='oldest')return a.date.localeCompare(b.date);
    if(sort==='highest')return b.amountCents-a.amountCents;
    if(sort==='lowest')return a.amountCents-b.amountCents;
    return b.date.localeCompare(a.date)||(b.createdAt||'').localeCompare(a.createdAt||'');
  }),[transactions,category,month,query,sort]);
  const total=shown.reduce((n,t)=>n+t.amountCents,0)/100;
  function csv(){const escape=x=>{const raw=String(x??'');const safe=/^[\s]*[=+@-]/.test(raw)?`'${raw}`:raw;return `\"${safe.replaceAll('\"','\"\"')}\"`;};const rows=[['Date','Description','Category','Amount (INR)','Note','Recurring'],...shown.map(t=>[t.date,t.description,getCategoryName(t.categoryId,categoryOptions),(t.amountCents/100).toFixed(2),t.note||'',t.isSubscription?'Yes':'No'])];const content='\uFEFF'+rows.map(r=>r.map(escape).join(',')).join('\r\n');const blob=new Blob([content],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='expenseplus-transactions.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function remove(){if(!deleting)return;setBusy(true);try{await api(`/api/transactions/${deleting.id}`,{method:'DELETE'});await refreshAfterExpense();setDeleting(null);notify('Expense deleted.');}catch(e){notify(e.message,'error');}finally{setBusy(false);}}
  return <div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Every entry matters</p><h1 className="page-heading">Your history <span className="text-sage">✦</span></h1><p className="subtext">A clear record of where your money has gone.</p></div><button className="btn-outline" onClick={csv} disabled={!shown.length}><Download size={16}/> Export CSV</button></div>
    <section className="panel"><div className="flex items-center gap-2"><SlidersHorizontal size={17} className="text-sage"/><h2 className="font-display text-xl">Find an expense</h2></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="relative"><Search size={17} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted"/><input aria-label="Search descriptions" className="field !pl-10" placeholder="Search transactions" value={query} onChange={e=>setQuery(e.target.value)}/></div><select className="field" aria-label="Filter by category" value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All categories</option>{categories.map(id=><option key={id} value={id}>{getCategoryName(id,categoryOptions)}</option>)}</select><input className="field" aria-label="Filter by month" type="month" value={month} onChange={e=>setMonth(e.target.value)}/><select className="field" aria-label="Sort transactions" value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest amount</option><option value="lowest">Lowest amount</option></select></div></section>
    <section className="panel"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Transaction records</p><h2 className="mt-1 font-display text-2xl">{shown.length} entries</h2></div><p className="text-sm text-muted">Filtered total: <strong className="text-cream">{inr(total)}</strong></p></div>{shown.length?shown.map(t=><TransactionRow key={t.id} item={t} categories={categoryOptions} onEdit={openExpense} onDelete={setDeleting}/>):<div className="py-12 text-center"><p className="text-3xl">🗂️</p><p className="mt-3 text-sm text-muted">No matching expenses. Try changing the filters.</p><button className="mt-3 text-sm font-semibold text-sage" onClick={()=>{setQuery('');setMonth('');setCategory('all');}}>Clear filters ↗</button></div>}</section>
    {deleting&&<ConfirmDialog message={`Delete “${deleting.description}”? This cannot be undone.`} onCancel={()=>setDeleting(null)} onConfirm={remove} busy={busy}/>}
  </div>;
}
