import {useEffect,useState} from 'react';
import {Save,Target,ArrowUpRight,AlertCircle,CheckCircle2} from 'lucide-react';
import {useAppData} from '../components/layout/AppLayout';
import {api} from '../lib/api';
import {useOnlineStatus} from '../components/pwa/PWAProvider';
import {dateToday,inr,getCategoryName} from '../lib/format';
import PageHeader from '../components/ui/PageHeader';
import SectionTitle from '../components/finance/SectionTitle';
import EmptyState from '../components/ui/EmptyState';
export default function Budgets(){
  const online=useOnlineStatus();
  const {profile,transactions,categories,refreshProfile,refreshNotifications,notify}=useAppData();
  const [budget,setBudget]=useState(String(profile?.monthlyBudget??0));const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  useEffect(()=>setBudget(String(profile?.monthlyBudget??0)),[profile?.monthlyBudget]);
  const month=dateToday().slice(0,7);
  const monthly=transactions.filter(t=>t.date?.startsWith(month));
  const spent=monthly.reduce((s,t)=>s+t.amountCents,0)/100;
  const limit=profile?.monthlyBudget??0;const percent=limit?Math.round(spent/limit*100):0;const left=limit-spent;
  const advice=limit===0?'Set a monthly limit to track your spending pace.':percent>=100?"You're over your monthly limit.":percent>=80?"You're nearing your monthly limit.":percent>=50?'You have used more than half of your budget.':"You're comfortably within your budget.";
  const grouped=Object.entries(monthly.reduce((acc,t)=>{acc[t.categoryId]=(acc[t.categoryId]||0)+t.amountCents;return acc;},{})).sort((a,b)=>b[1]-a[1]);
  async function save(e){e.preventDefault();setError('');const v=Number(budget);if(!Number.isInteger(v)||v<0||v>10000000){setError('Enter a whole number from ₹0 to ₹1,00,00,000.');return;}setBusy(true);try{await api('/api/user/profile',{method:'PUT',body:JSON.stringify({monthlyBudget:v})});await refreshProfile();await refreshNotifications?.();notify('Monthly budget updated across your devices.');}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <div className="v3-page v3-budgets">
    <PageHeader eyebrow="SPEND WITH INTENTION" title="Budgets" description="Make room for what matters."/>
    <div className="v3-budget-grid">
      <section className="v3-surface v3-budget-primary"><div className="v3-section-head"><div><p className="v3-overline">THIS MONTH</p><h2 className="v3-section-title">Your spending plan</h2></div><Target size={22} className="text-sage"/></div>
        <p className="v3-budget-number">{inr(spent)}</p><p className="v3-budget-description">{limit?`Spent of ${inr(limit)} planned`:'Spent so far · no limit set'}</p>
        <div className="v3-progress v3-progress-large" role="progressbar" aria-label="Budget utilization" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100,percent)}><span className={percent>=100?'v3-progress-danger':''} style={{width:`${Math.min(100,Math.max(0,percent))}%`}}/></div>
        <div className="v3-budget-math"><div><span>Used</span><strong>{limit?`${percent}%`:'—'}</strong></div><div><span>{left<0?'Over budget':'Remaining'}</span><strong className={left<0?'v3-negative':'v3-positive'}>{limit?inr(Math.abs(left)):'—'}</strong></div></div>
        <div className="v3-budget-advice">{limit>0&&percent>=80?<AlertCircle size={18}/>:<CheckCircle2 size={18}/>}<p>{advice}</p></div>
      </section>
      <section className="v3-surface v3-budget-edit"><SectionTitle title="Monthly limit" subtitle="Keep your target realistic and flexible."/>
        <form onSubmit={save} className="v3-budget-form"><label htmlFor="budget-input" className="field-label">Budget in rupees</label><div className="v3-input-prefix"><span aria-hidden="true">₹</span><input id="budget-input" className="field" type="number" step="1" min="0" max="10000000" required value={budget} onChange={e=>setBudget(e.target.value)}/></div><p className="v3-helper-text">Your limit is saved securely and synced across your devices.</p>{error&&<p role="alert" className="v3-form-error">{error}</p>}<button className="btn-primary" type="submit" disabled={busy||!online}><Save size={16}/>{busy?'Saving…':'Save monthly budget'}</button></form>
      </section>
    </div>
    <section className="v3-surface"><SectionTitle title="Where it went" subtitle="Your spending by category this month" action={<ArrowUpRight size={18} className="text-muted"/>}/>
      {grouped.length?<div className="v3-category-list">{grouped.map(([id,cents])=><div className="v3-category-item" key={id}><div className="v3-category-top"><strong>{getCategoryName(id,categories)}</strong><span>{inr(cents/100)}</span></div><div className="v3-progress v3-category-progress" role="progressbar" aria-label={`${getCategoryName(id,categories)} share of spending`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={spent?Math.round(cents/(spent*100)*100):0}><span style={{width:`${spent?cents/(spent*100)*100:0}%`}}/></div></div>)}</div>:<EmptyState icon={Target} title="No spending this month" description="Your category breakdown will appear as you log expenses."/>}
    </section>
  </div>;
}
