import {Link} from 'react-router-dom';
import {ArrowUpRight,ArrowDownRight,CalendarDays,Flame,Plus,TrendingUp,Wallet,} from 'lucide-react';
import {Line} from 'react-chartjs-2';
import {Chart as ChartJS,CategoryScale,LinearScale,PointElement,LineElement,Filler,Tooltip} from 'chart.js';
import {useAppData} from '../components/layout/AppLayout';
import TransactionRow from '../components/TransactionRow';
import {dateToday,inr} from '../lib/format';
ChartJS.register(CategoryScale,LinearScale,PointElement,LineElement,Filler,Tooltip);
const tiers=[5,10,15,20,30];
export default function Dashboard(){
  const {profile,transactions,streak,categories,openExpense}=useAppData();
  const month=dateToday().slice(0,7);
  const monthly=transactions.filter(t=>t.date?.startsWith(month)).reduce((s,t)=>s+t.amountCents,0)/100;
  const lifetime=transactions.reduce((s,t)=>s+t.amountCents,0)/100;
  const budget=profile?.monthlyBudget??0;
  const percent=budget?Math.round(monthly/budget*100):0;
  const remaining=budget-monthly;
  const budgetStatus=!budget?'Set a budget':percent>100?'Budget exceeded':percent>=100?'Limit reached':percent>=90?'Critical':percent>=75?'Approaching limit':'On track';
  const name=(profile?.name||'friend').split(' ')[0];
  const today=new Date().toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata',weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const recent=[...transactions].sort((a,b)=>b.date.localeCompare(a.date)||(b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,4);
  const next=tiers.find(d=>d>(streak?.currentStreak||0));
  const last7=Array.from({length:7},(_,i)=>{const d=new Date(`${dateToday()}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+i-6);return d.toISOString().slice(0,10);});
  const daily=last7.map(date=>transactions.filter(t=>t.date===date).reduce((n,t)=>n+t.amountCents,0)/100);
  const chart={labels:last7.map(d=>new Date(`${d}T12:00:00Z`).toLocaleDateString('en-IN',{weekday:'short',timeZone:'UTC'})),datasets:[{data:daily,borderColor:'#8BA888',backgroundColor:'#8BA88830',fill:true,borderWidth:2.5,tension:.35,pointRadius:3,pointBackgroundColor:'#8BA888'}]};
  return <div className="space-y-6 sm:space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">{today}</p><h1 className="page-heading">Hello, {name}. <span className="text-terracotta">✦</span></h1><p className="subtext">A clearer picture of your money, one day at a time.</p></div><button className="btn-primary hidden sm:inline-flex" onClick={()=>openExpense()}><Plus size={17}/> New expense</button></div>
    <div className="grid gap-4 sm:gap-5 md:grid-cols-6">
      <section className="panel md:col-span-4 lg:col-span-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="stat-label">Spent this month</p><span className={`rounded-full px-3 py-1 text-xs font-semibold ${percent>=90?'bg-terracotta/15 text-terracotta':percent>=75?'bg-mustard/15 text-mustard':'bg-sage/15 text-sage'}`}>{budgetStatus}</span></div><p className="mt-4 font-display text-[clamp(2.7rem,5vw,4.4rem)] leading-tight">{inr(monthly)}</p><div className="mt-8 flex items-center justify-between gap-3 text-sm"><span className="text-muted">Monthly budget</span><Link className="inline-flex items-center gap-1 text-sage hover:underline" to="/budgets">{budget?inr(budget):'Set a budget'} <ArrowUpRight size={15}/></Link></div><div className="progress-track mt-3"><div className={`progress-fill ${percent>=90?'!bg-terracotta':''}`} style={{width:`${Math.max(0,Math.min(100,percent))}%`}}/></div><div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted"><span>{budget?`${percent}% of budget used`:'Add a budget to track your progress'}</span>{budget>0&&<span className={remaining<0?'text-terracotta':'text-sage'}>{remaining<0?`${inr(-remaining)} over budget`:`${inr(remaining)} left`}</span>}</div></section>
      <section className="panel flex flex-col justify-between md:col-span-2"><div className="flex items-center justify-between"><p className="stat-label">No-spend streak</p><span className="grid h-10 w-10 place-items-center rounded-2xl bg-terracotta/15 text-terracotta"><Flame size={22}/></span></div><p className="stat-number">{streak?.currentStreak??0}<span className="ml-2 font-sans text-base text-muted">days</span></p><p className="mt-1 text-xs text-muted">{next?`${Math.max(0,next-(streak?.currentStreak||0))} days to your next milestone`:'Every milestone reached!'}</p><Link to="/streaks" className="mt-4 inline-flex items-center gap-1 text-sm text-sage hover:underline">Your achievements <ArrowUpRight size={15}/></Link></section>
      <section className="panel md:col-span-3"><div className="flex items-center justify-between"><p className="stat-label">Lifetime spending</p><TrendingUp className="text-terracotta" size={21}/></div><p className="stat-number">{inr(lifetime)}</p><p className="mt-3 text-xs text-muted">Across your recorded expenses</p></section>
      <section className="panel md:col-span-3"><div className="flex items-center justify-between"><p className="stat-label">Transactions recorded</p><Wallet className="text-mustard" size={21}/></div><p className="stat-number">{transactions.length}</p><p className="mt-3 text-xs text-muted">Little entries, better awareness</p></section>
      <section className="panel min-w-0 md:col-span-3"><div className="flex items-center justify-between gap-3"><div><h2 className="font-display text-2xl">7-day spending</h2><p className="mt-1 text-xs text-muted">Your recent spending rhythm</p></div><CalendarDays size={19} className="text-sage"/></div><div className="ep-chart mt-5"><Line data={chart} options={{maintainAspectRatio:false,responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>inr(c.parsed.y)}}},scales:{x:{grid:{display:false},ticks:{color:'#A59B8D'}},y:{beginAtZero:true,grid:{color:'#403B3540'},ticks:{color:'#A59B8D',callback:v=>`₹${v}`}}}}}/></div></section>
      <section className="panel min-w-0 md:col-span-3"><div className="mb-2 flex items-center justify-between gap-3"><div><h2 className="font-display text-2xl">Recent activity</h2><p className="mt-1 text-xs text-muted">Your latest four transactions</p></div><Link className="inline-flex items-center gap-1 shrink-0 text-sm text-sage hover:underline" to="/history">View all <ArrowUpRight size={15}/></Link></div>{recent.length?recent.map(item=><TransactionRow key={item.id} item={item} categories={categories}/>):<div className="grid min-h-48 place-items-center text-center"><div><p className="mb-3 text-3xl">🌱</p><p className="text-sm text-muted">Your first expense will appear here.</p><button onClick={()=>openExpense()} className="mt-3 text-sm font-semibold text-sage">Add an expense ↗</button></div></div>}</section>
    </div>
  </div>;
}
