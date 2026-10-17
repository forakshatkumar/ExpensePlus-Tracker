import {useMemo} from 'react';
import {Bar,Doughnut,Line} from 'react-chartjs-2';
import {Chart as ChartJS,ArcElement,BarElement,CategoryScale,LinearScale,PointElement,LineElement,Filler,Tooltip,Legend} from 'chart.js';
import {useAppData} from '../components/layout/AppLayout';
import {categoryLabels,dateToday,inr} from '../lib/format';
ChartJS.register(ArcElement,BarElement,CategoryScale,LinearScale,PointElement,LineElement,Filler,Tooltip,Legend);
const palette=['#D97A62','#8BA888','#E0B871','#C7A18C','#77968F','#B6B28B'];
const axis={grid:{color:'#403B3550'},ticks:{color:'#A59B8D',maxTicksLimit:5}};
const opts={responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#A59B8D',usePointStyle:true}},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label||ctx.label}: ${inr(ctx.parsed?.y??ctx.parsed)}`}}}};
export default function Analytics(){
  const {transactions}=useAppData();
  const now=dateToday();
  const monthly=transactions.filter(t=>t.date?.startsWith(now.slice(0,7)));
  const monthlyTotal=monthly.reduce((s,t)=>s+t.amountCents,0)/100;
  const categories=useMemo(()=>Object.entries(transactions.reduce((s,t)=>{s[t.categoryId]=(s[t.categoryId]||0)+t.amountCents/100;return s;},{})).sort((a,b)=>b[1]-a[1]),[transactions]);
  const monthlyMonths=Array.from({length:6},(_,i)=>{const d=new Date(`${now.slice(0,7)}-15T12:00:00Z`);d.setUTCMonth(d.getUTCMonth()+i-5);return d.toISOString().slice(0,7);});
  const monthValue=m=>transactions.filter(t=>t.date?.startsWith(m)).reduce((s,t)=>s+t.amountCents/100,0);
  const monthsData={labels:monthlyMonths.map(m=>new Date(m+'-15T12:00:00Z').toLocaleDateString('en-IN',{month:'short',year:'2-digit',timeZone:'UTC'})),datasets:[{label:'Spending',data:monthlyMonths.map(monthValue),backgroundColor:'#8BA888',borderRadius:7,maxBarThickness:42}]};
  const last14=Array.from({length:14},(_,i)=>{const d=new Date(`${now}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+i-13);return d.toISOString().slice(0,10);});
  const dailyData={labels:last14.map(d=>d.slice(5)),datasets:[{label:'Daily spending',data:last14.map(d=>transactions.filter(t=>t.date===d).reduce((s,t)=>s+t.amountCents/100,0)),borderColor:'#D97A62',backgroundColor:'#D97A6225',pointBackgroundColor:'#D97A62',pointRadius:2,tension:.35,fill:true}]};
  const pie={labels:categories.map(([id])=>categoryLabels[id]||id),datasets:[{label:'Spending',data:categories.map(([,n])=>n),backgroundColor:palette,borderWidth:3,borderColor:'#24221F'}]};
  const avg=monthlyTotal/Number(now.slice(8));
  const prior=monthlyMonths.at(-2);const prevMonth=monthValue(prior);
  const delta=prevMonth>0?Math.round((monthlyTotal-prevMonth)/prevMonth*100):null;
  return <div className="space-y-6"><div><p className="eyebrow">Patterns worth noticing</p><h1 className="page-heading">Spending insights <span className="text-mustard">✦</span></h1><p className="subtext">Your story, told through numbers.</p></div>
    <div className="grid gap-4 sm:grid-cols-3"><section className="panel"><p className="stat-label">This month</p><p className="stat-number">{inr(monthlyTotal)}</p></section><section className="panel"><p className="stat-label">Daily average this month</p><p className="stat-number">{inr(avg)}</p></section><section className="panel"><p className="stat-label">Compared with last month</p><p className="stat-number">{delta===null?'—':`${delta>0?'+':''}${delta}%`}</p><p className="mt-2 text-xs text-muted">{delta===null?'More data needed':'Current month to date vs full previous month'}</p></section></div>
    <div className="grid gap-5 lg:grid-cols-2"><section className="panel min-w-0"><h2 className="font-display text-2xl">By category</h2><p className="mt-2 text-sm text-muted">All recorded transactions</p><div className="mx-auto mt-5 h-72 max-w-sm">{categories.length?<Doughnut data={pie} options={{...opts,plugins:{...opts.plugins,tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${inr(ctx.parsed)}`}}}}}/>:<div className="grid h-full place-items-center text-center text-muted">Start adding expenses to see your categories.</div>}</div></section>
    <section className="panel min-w-0"><h2 className="font-display text-2xl">Six-month overview</h2><p className="mt-2 text-sm text-muted">Your spending, month by month</p><div className="mt-5 h-72"><Bar data={monthsData} options={{...opts,scales:{x:{...axis,grid:{display:false}},y:{...axis,beginAtZero:true}}}}/></div></section></div>
    <section className="panel min-w-0"><h2 className="font-display text-2xl">Last 14 days</h2><p className="mt-2 text-sm text-muted">A closer look at your daily spending</p><div className="mt-5 h-64"><Line data={dailyData} options={{...opts,plugins:{...opts.plugins,legend:{display:false}},scales:{x:{...axis,grid:{display:false}},y:{...axis,beginAtZero:true}}}}/></div></section>
    {categories.length>0&&<section className="panel"><p className="eyebrow">Biggest category</p><h2 className="mt-2 font-display text-2xl">{categoryLabels[categories[0][0]]||categories[0][0]}</h2><p className="mt-2 text-sm text-muted">{inr(categories[0][1])} recorded across your history.</p></section>}
  </div>;
}
