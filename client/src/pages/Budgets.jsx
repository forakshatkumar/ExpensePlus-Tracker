import {useEffect,useState} from 'react';
import {Save,Target,ArrowUpRight} from 'lucide-react';
import {useAppData} from '../components/layout/AppLayout';
import {api} from '../lib/api';
import {useOnlineStatus} from '../components/pwa/PWAProvider';
import {dateToday,inr,getCategoryName} from '../lib/format';
export default function Budgets(){
  const online=useOnlineStatus();
  const {profile,transactions,categories,refreshProfile,refreshNotifications,notify}=useAppData();
  const [budget,setBudget]=useState(String(profile?.monthlyBudget??0));const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  useEffect(()=>setBudget(String(profile?.monthlyBudget??0)),[profile?.monthlyBudget]);
  const month=dateToday().slice(0,7);
  const monthly=transactions.filter(t=>t.date.startsWith(month));
  const spent=monthly.reduce((s,t)=>s+t.amountCents,0)/100;
  const limit=profile?.monthlyBudget??0;const percent=limit?Math.round(spent/limit*100):0;const left=limit-spent;
  const advice=limit===0?'Set a monthly budget to start tracking your pace.':percent>=100?"You've exceeded your monthly budget.":percent>=80?"You're approaching your monthly limit.":percent>=50?'Keep an eye on your spending.':"You're managing your budget well.";
  const grouped=Object.entries(monthly.reduce((acc,t)=>{acc[t.categoryId]=(acc[t.categoryId]||0)+t.amountCents;return acc;},{})).sort((a,b)=>b[1]-a[1]);
  async function save(e){e.preventDefault();setError('');const v=Number(budget);if(!Number.isInteger(v)||v<0||v>10000000){setError('Enter a whole number from ₹0 to ₹1,00,00,000.');return;}setBusy(true);try{await api('/api/user/profile',{method:'PUT',body:JSON.stringify({monthlyBudget:v})});await refreshProfile();await refreshNotifications?.();notify('Monthly budget updated across your devices.');}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <div className="space-y-6"><div><p className="eyebrow">Spend with intention</p><h1 className="page-heading">Monthly budgets <span className="text-terracotta">🎯</span></h1><p className="subtext">A friendly plan for the month ahead.</p></div>
    <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]"><section className="panel"><p className="stat-label">Spent this month</p><p className="stat-number">{inr(spent)}</p><p className="mt-2 text-sm text-muted">of {inr(limit)} planned</p><div className="progress-track mt-8"><div className={`progress-fill ${percent>=90?'!bg-terracotta':''}`} style={{width:`${Math.min(100,percent)}%`}}/></div><div className="mt-3 flex flex-wrap justify-between gap-2 text-sm"><span className="text-muted">{limit?`${percent}% used`:'No budget yet'}</span><span className={left<0?'text-terracotta':'text-sage'}>{left<0?`${inr(-left)} over budget`:`${inr(left)} remaining`}</span></div><div className="mt-7 rounded-2xl bg-sage/10 px-4 py-3 text-sm text-cream">{advice}</div></section>
    <section className="panel"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-sage/15 text-sage"><Target size={22}/></span><h2 className="font-display text-2xl">Your budget</h2></div><form onSubmit={save} className="mt-7 space-y-4"><label htmlFor="budget-input" className="field-label">Monthly budget (₹)</label><input id="budget-input" className="field" type="number" step="1" min="0" max="10000000" required value={budget} onChange={e=>setBudget(e.target.value)}/><p className="text-xs leading-5 text-muted">Saved in your secure Firestore profile. Your updated budget will be available on other devices.</p>{error&&<p role="alert" className="text-sm text-terracotta">{error}</p>}<button className="btn-primary" type="submit" disabled={busy||!online}><Save size={16}/>{busy?'Saving…':'Update budget'}</button></form></section></div>
    <section className="panel"><div className="mb-5 flex items-center justify-between"><div><p className="eyebrow">Where it went</p><h2 className="mt-1 font-display text-2xl">This month's categories</h2></div><ArrowUpRight className="text-sage"/></div>{grouped.length?grouped.map(([id,cents])=><div key={id} className="mb-5 last:mb-0"><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span>{getCategoryName(id,categories)}</span><span className="text-muted">{inr(cents/100)}</span></div><div className="progress-track !h-2"><div className="progress-fill" style={{width:`${spent?cents/(spent*100)*100:0}%`}}/></div></div>):<p className="py-8 text-center text-sm text-muted">No spending recorded this month.</p>}</section>
  </div>;
}
