import {useMemo} from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight,ArrowRight,Flame,ReceiptText,CalendarDays,Wallet,Plus} from 'lucide-react';
import {Line} from 'react-chartjs-2';
import {Chart as ChartJS,CategoryScale,LinearScale,PointElement,LineElement,Filler,Tooltip} from 'chart.js';
import {useAppData} from '../components/layout/AppLayout';
import {useTheme} from '../context/ThemeContext';
import {getChartTheme} from '../themeConfig';
import TransactionRow from '../components/TransactionRow';
import SpendingHero from '../components/finance/SpendingHero';
import MetricTile from '../components/finance/MetricTile';
import SectionTitle from '../components/finance/SectionTitle';
import EmptyState from '../components/ui/EmptyState';
import {dateToday,inr} from '../lib/format';
ChartJS.register(CategoryScale,LinearScale,PointElement,LineElement,Filler,Tooltip);
const dateInUTC=d=>new Date(`${d}T12:00:00Z`);
export default function Dashboard(){
  const {profile,transactions,streak,categories,openExpense}=useAppData();
  const {themeId,mode}=useTheme();
  const colors=getChartTheme(themeId,mode);
  const month=dateToday().slice(0,7);
  const stats=useMemo(()=>{
    const recent=[...transactions].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,5);
    const monthly=transactions.filter(t=>t.date?.startsWith(month)).reduce((s,t)=>s+t.amountCents,0)/100;
    const lifetime=transactions.reduce((s,t)=>s+t.amountCents,0)/100;
    const last7=Array.from({length:7},(_,i)=>{const d=dateInUTC(dateToday());d.setUTCDate(d.getUTCDate()+i-6);return d.toISOString().slice(0,10)});
    const daily=last7.map(date=>transactions.filter(t=>t.date===date).reduce((n,t)=>n+t.amountCents,0)/100);
    return {recent,monthly,lifetime,last7,daily};
  },[transactions,month]);
  const first=(profile?.name||'there').trim().split(/\s+/)[0];
  const greeting=new Date().getHours()<12?'Good morning':new Date().getHours()<17?'Good afternoon':'Good evening';
  const chart={labels:stats.last7.map(d=>dateInUTC(d).toLocaleDateString('en-IN',{weekday:'short',timeZone:'UTC'})),datasets:[{data:stats.daily,borderColor:colors.accent,backgroundColor:colors.accent+'16',fill:true,borderWidth:2.6,tension:.35,pointRadius:0,pointHoverRadius:5,pointHitRadius:16,pointBackgroundColor:colors.accent}]};
  const chartOptions={responsive:true,maintainAspectRatio:false,animation:{duration:450},interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{backgroundColor:colors.surface,titleColor:colors.text,bodyColor:colors.text,padding:12,displayColors:false,callbacks:{label:c=>inr(c.parsed.y)}}},scales:{x:{border:{display:false},grid:{display:false},ticks:{color:colors.text,maxRotation:0}},y:{beginAtZero:true,border:{display:false},grid:{color:colors.grid},ticks:{color:colors.text,maxTicksLimit:4,callback:v=>`₹${v>=1000?(v/1000).toFixed(0)+'k':v}`}}}};
  return <div className="v3-dashboard">
    <header className="v3-dashboard-greeting"><div><p className="v3-overline">YOUR OVERVIEW</p><h1 className="v3-page-title">{greeting}, {first}<span className="v3-greeting-dot">.</span></h1><p className="v3-page-description">A little more clarity for every day.</p></div><p className="v3-date"><CalendarDays size={16}/>{new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</p></header>
    <div className="v3-dashboard-grid">
      <SpendingHero spent={stats.monthly} budget={profile?.monthlyBudget||0} onAdd={()=>openExpense()}/>
      <section className="v3-metrics" aria-label="Your finances in numbers">
        <MetricTile label="All-time spending" value={inr(stats.lifetime)} caption="Across your recorded expenses" icon={Wallet}/>
        <MetricTile label="Expenses tracked" value={transactions.length.toLocaleString('en-IN')} caption="Entries you've logged" icon={ReceiptText}/>
        <Link to="/streaks" className="v3-metric v3-metric-linked"><div className="v3-metric-label"><span>No-spend streak</span><Flame size={19} aria-hidden="true"/></div><p className="v3-metric-value">{streak?.currentStreak||0}<span className="v3-metric-unit"> days</span></p><p className="v3-metric-caption">View your milestones <ArrowUpRight size={13}/></p></Link>
      </section>
      <section className="v3-surface v3-trend"><SectionTitle title="Your spending rhythm" subtitle="Past 7 days" action={<Link className="v3-inline-link" to="/analytics">Insights <ArrowUpRight size={15}/></Link>}/><div className="v3-chart-container">{transactions.length?<Line data={chart} options={chartOptions}/>:<EmptyState icon={ReceiptText} title="Nothing to chart yet" description="Track your first expense to start seeing patterns."/>}</div></section>
      <section className="v3-surface v3-recent"><SectionTitle title="Recent activity" subtitle="Your latest transactions" action={<Link className="v3-inline-link" to="/history">View all <ArrowRight size={16}/></Link>}/>{stats.recent.length?<div className="v3-transaction-list">{stats.recent.map(item=><TransactionRow key={item.id} item={item} categories={categories}/>)}</div>:<EmptyState icon={ReceiptText} title="A fresh start" description="Expenses will appear here as soon as you add one." action={<button className="btn-primary" onClick={()=>openExpense()}><Plus size={16}/> Add your first expense</button>}/>}</section>
    </div>
  </div>;
}
