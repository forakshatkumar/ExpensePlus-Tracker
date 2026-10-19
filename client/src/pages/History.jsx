import {useEffect,useMemo,useState} from 'react';
import {useLocation} from 'react-router-dom';
import {Download,Search,SlidersHorizontal,X,ReceiptText,Plus} from 'lucide-react';
import {useAppData} from '../components/layout/AppLayout';
import TransactionRow from '../components/TransactionRow';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import {api} from '../lib/api';
import {useOnlineStatus} from '../components/pwa/PWAProvider';
import {getCategoryName,inr} from '../lib/format';
const PAGE_SIZE=40;
export default function History(){
  const online=useOnlineStatus();
  const location=useLocation();
  useEffect(()=>{if(location.state?.focusSearch)document.getElementById('transaction-search')?.focus();},[location.state]);
  const {transactions,categories:categoryOptions,refreshAfterExpense,openExpense,notify}=useAppData();
  const [query,setQuery]=useState('');const [category,setCategory]=useState('all');const [month,setMonth]=useState('');const [sort,setSort]=useState('newest');
  const [filtersOpen,setFiltersOpen]=useState(false);const [visibleCount,setVisibleCount]=useState(PAGE_SIZE);
  const [deleting,setDeleting]=useState(null);const [busy,setBusy]=useState(false);
  const categories=[...new Set(transactions.map(t=>t.categoryId))];
  const shown=useMemo(()=>transactions.filter(t=>(category==='all'||t.categoryId===category)&&(!month||t.date?.startsWith(month))&&(t.description||'').toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>{
    if(sort==='oldest')return a.date.localeCompare(b.date);
    if(sort==='highest')return b.amountCents-a.amountCents;
    if(sort==='lowest')return a.amountCents-b.amountCents;
    return b.date.localeCompare(a.date)||(b.createdAt||'').localeCompare(a.createdAt||'');
  }),[transactions,category,month,query,sort]);
  const total=shown.reduce((n,t)=>n+t.amountCents,0)/100;
  const reset=()=>{setQuery('');setCategory('all');setMonth('');setSort('newest');setVisibleCount(PAGE_SIZE);};
  const activeFilters=Boolean(month||category!=='all'||sort!=='newest');
  // Keep full filtered export even when the visual list is progressively rendered.
  function csv(){const escape=x=>{const raw=String(x??'');const safe=/^[\s]*[=+@-]/.test(raw)?`'${raw}`:raw;return `"${safe.replaceAll('"','""')}"`;};const rows=[['Date','Description','Category','Amount (INR)','Note','Recurring'],...shown.map(t=>[t.date,t.description,getCategoryName(t.categoryId,categoryOptions),(t.amountCents/100).toFixed(2),t.note||'',t.isSubscription?'Yes':'No'])];const content='\uFEFF'+rows.map(r=>r.map(escape).join(',')).join('\r\n');const blob=new Blob([content],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='expenseplus-transactions.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function remove(){if(!deleting||!online)return;setBusy(true);try{await api(`/api/transactions/${deleting.id}`,{method:'DELETE'});await refreshAfterExpense();setDeleting(null);notify('Expense deleted.');}catch(e){notify(e.message,'error');}finally{setBusy(false);}}
  const visible=shown.slice(0,visibleCount);
  return <div className="v3-page v3-history">
    <PageHeader eyebrow="YOUR RECORDS" title="Transactions" description="Every expense, easy to find." action={<button className="btn-outline" onClick={csv} disabled={!shown.length}><Download size={16}/> Export CSV</button>}/>
    <section className="v3-surface v3-filter-surface" aria-label="Search and filter transactions">
      <div className="v3-search-toolbar">
        <label className="v3-search-field"><Search size={18} aria-hidden="true"/><span className="sr-only">Search transactions</span><input id="transaction-search" type="search" placeholder="Search your transactions" value={query} onChange={e=>{setQuery(e.target.value);setVisibleCount(PAGE_SIZE)}}/></label>
        <button className={`btn-outline v3-filter-button ${filtersOpen||activeFilters?'v3-filter-active':''}`} onClick={()=>setFiltersOpen(v=>!v)} aria-expanded={filtersOpen} aria-controls="transaction-filters"><SlidersHorizontal size={17}/> Filters {activeFilters&&<span className="v3-filter-indicator"/>}</button>
      </div>
      {filtersOpen&&<div className="v3-filter-grid" id="transaction-filters">
        <label><span className="v3-field-caption">Category</span><select className="field" value={category} onChange={e=>{setCategory(e.target.value);setVisibleCount(PAGE_SIZE)}}><option value="all">All categories</option>{categories.map(id=><option key={id} value={id}>{getCategoryName(id,categoryOptions)}</option>)}</select></label>
        <label><span className="v3-field-caption">Month</span><input className="field" type="month" value={month} onChange={e=>{setMonth(e.target.value);setVisibleCount(PAGE_SIZE)}}/></label>
        <label><span className="v3-field-caption">Sort by</span><select className="field" value={sort} onChange={e=>{setSort(e.target.value);setVisibleCount(PAGE_SIZE)}}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest amount</option><option value="lowest">Lowest amount</option></select></label>
        <button type="button" className="v3-clear-filter" onClick={reset}><X size={15}/> Reset filters</button>
      </div>}
    </section>
    <section className="v3-surface v3-record-surface" aria-label="Transaction records">
      <div className="v3-record-heading"><div><p className="v3-overline">SPENDING LOG</p><h2 className="v3-section-title">{shown.length.toLocaleString('en-IN')} {shown.length===1?'transaction':'transactions'}</h2></div><div className="v3-record-total"><span>Filtered spending</span><strong>{inr(total)}</strong></div></div>
      {visible.length?<div className="v3-transaction-list v3-history-list">
        {visible.map(t=><TransactionRow key={t.id} item={t} categories={categoryOptions} onEdit={online?openExpense:null} onDelete={online?setDeleting:null}/>)}
      </div>:<EmptyState icon={ReceiptText} title={transactions.length?'No matching transactions':'Your history starts here'} description={transactions.length?'Try changing your search or filters.':'Add your first expense and it will show up here.'} action={transactions.length?<button className="btn-outline" onClick={reset}>Clear filters</button>:<button className="btn-primary" onClick={()=>openExpense()}><Plus size={16}/> Add expense</button>}/>}
      {visibleCount<shown.length&&<div className="v3-list-more"><span>Showing {visible.length} of {shown.length}</span><button className="btn-outline" onClick={()=>setVisibleCount(v=>v+PAGE_SIZE)}>Show more</button></div>}
    </section>
    {deleting&&<ConfirmDialog message={`Delete “${deleting.description}”? This cannot be undone.`} onCancel={()=>setDeleting(null)} onConfirm={remove} busy={busy}/>}</div>;
}
