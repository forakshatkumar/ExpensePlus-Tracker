import {useState} from 'react';
import {Flame,LockKeyhole,Trophy,CheckCircle2} from 'lucide-react';
import {useAppData} from '../components/layout/AppLayout';
import {api} from '../lib/api';
import {useOnlineStatus} from '../components/pwa/PWAProvider';
import {inr} from '../lib/format';
import PageHeader from '../components/ui/PageHeader';
import SectionTitle from '../components/finance/SectionTitle';
const tiers=[{emoji:'🥉',name:'Bronze',days:5},{emoji:'🥈',name:'Silver',days:10},{emoji:'🥇',name:'Gold',days:15},{emoji:'🩶',name:'Platinum',days:20},{emoji:'💎',name:'Diamond',days:30}];
const statusColors={mindful:'bg-sage',spent:'bg-mustard','high-spend':'bg-terracotta',unchecked:'bg-card-soft'};
export default function Streaks(){
  const online=useOnlineStatus();
  const {streak,refreshStreak,notify}=useAppData();
  const [busy,setBusy]=useState(false);
  const current=streak?.currentStreak||0;const highest=streak?.highestStreak||0;const next=tiers.find(x=>x.days>current);
  async function checkIn(){if(busy||streak?.checkedInToday||streak?.spentToday)return;setBusy(true);try{await api('/api/streaks',{method:'POST',body:JSON.stringify({})});await refreshStreak();notify('No-spend day checked in. Keep it going!');}catch(e){notify(e.message,'error');}finally{setBusy(false);}}
  return <div className="v3-page v3-streaks">
    <PageHeader eyebrow="BUILD BETTER HABITS" title="Your streaks" description="Celebrate the days you choose not to spend."/>
    <div className="v3-streak-grid">
      <section className="v3-surface v3-streak-main"><div className="v3-streak-icon"><Flame size={23}/></div><p className="v3-overline mt-6">CURRENT NO-SPEND STREAK</p><p className="v3-streak-number">{current}<span> days</span></p><p className="v3-section-subtitle">Your personal best is {highest} days.</p><button className="btn-primary mt-7 w-full" onClick={checkIn} disabled={!streak||streak.checkedInToday||streak.spentToday||busy||!online}>{streak?.checkedInToday?<><CheckCircle2 size={17}/> Checked in today</>:streak?.spentToday?'Spending recorded today':busy?'Checking in…':'Mark today no-spend'}</button><p className="v3-helper-text mt-4">Check in each day without purchases. Spending or missing a day pauses your streak; earned badges stay unlocked.</p></section>
      <section className="v3-surface"><SectionTitle title="The last 30 days" subtitle="A quiet overview of your daily habits"/><div role="list" aria-label="Spending activity, last 30 days" className="ep-activity-grid v3-streak-calendar">{streak?.calendar?.map(day=><div role="listitem" key={day.date} title={`${day.date} — ${day.status.replace('-',' ')}: ${inr(day.amountCents/100)}`} aria-label={`${day.date}: ${day.status.replace('-',' ')}`} className={`ep-grid-cell ${statusColors[day.status]||statusColors.unchecked}`}/>)}</div><div className="v3-streak-legend">{[['bg-sage','No spend'],['bg-mustard','Regular'],['bg-terracotta','High spend'],['bg-card-soft','Unmarked']].map(([color,label])=><span key={label}><i className={color}/>{label}</span>)}</div></section>
    </div>
    <section className="v3-surface"><SectionTitle title="Milestones" subtitle="A collection of your everyday wins" action={<Trophy size={19} className="text-sage"/>}/>
      {next?<div className="v3-next-milestone"><div className="flex flex-wrap justify-between gap-3 text-sm"><span>Next: <strong className="text-sage">{next.name}</strong></span><span className="text-muted">{current} / {next.days} days</span></div><div className="v3-progress" role="progressbar" aria-label={`Progress to ${next.name}`} aria-valuemin={0} aria-valuemax={next.days} aria-valuenow={current}><span style={{width:`${current/next.days*100}%`}}/></div><p>{next.days-current} consecutive no-spend days to go</p></div>:<p className="v3-next-milestone">Every milestone reached! 💎</p>}
      <div className="v3-achievements">{tiers.map(t=>{const unlocked=highest>=t.days;return <div key={t.days} className={`v3-achievement ${unlocked?'v3-achievement-earned':''}`}><span className={`v3-achievement-emoji ${unlocked?'':'grayscale opacity-35'}`}>{t.emoji}</span><h3>{t.name}</h3><p>{t.days} days</p><small>{unlocked?<><CheckCircle2 size={12}/> Unlocked</>:<><LockKeyhole size={12}/> Locked</>}</small></div>;})}</div>
    </section>
  </div>;
}
