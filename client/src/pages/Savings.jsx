import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowDownLeft,ArrowUpRight,CalendarDays,Check,ChevronRight,Coins,Edit3,Minus,Plus,Target,Trash2,Wallet, X} from 'lucide-react';
import {api} from '../lib/api';
import {dateToday,inr} from '../lib/format';
import {useAppData} from '../components/layout/AppLayout';
import {useOnlineStatus} from '../components/pwa/PWAProvider';
import Overlay from '../components/ui/Overlay';
import PageHeader from '../components/ui/PageHeader';
const money=minor=>inr(minor/100);
const monthTitle=key=>new Date(`${key}-01T12:00:00Z`).toLocaleDateString('en-IN',{month:'long',year:'numeric',timeZone:'UTC'});
const parseMoney=value=>/^\d+(?:\.\d{1,2})?$/.test(value.trim())?Number(value.trim().split('.')[0])*100+Number((value.trim().split('.')[1]||'').padEnd(2,'0')):NaN;
const clean={summary:{balanceMinor:0,allocatedMinor:0},entries:[],goals:[],months:[]};
function Button({children,secondary=false,...props}){return <button type="button" className={secondary?'btn-outline':'btn-primary'} {...props}>{children}</button>;}
export default function Savings(){
  const {notify}=useAppData();const online=useOnlineStatus();
  const [data,setData]=useState(clean);const [loading,setLoading]=useState(true);const [fetchError,setFetchError]=useState('');
  const [dialog,setDialog]=useState(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [amount,setAmount]=useState('');const [date,setDate]=useState(dateToday());const [note,setNote]=useState('');
  const [goalName,setGoalName]=useState('');const [goalTarget,setGoalTarget]=useState('');const [targetDate,setTargetDate]=useState('');
  const [goalAmount,setGoalAmount]=useState('');const opRef=useRef(null);
  const load=useCallback(async()=>{const result=await api('/api/savings');setData(result);setFetchError('');},[]);
  useEffect(()=>{let active=true;setLoading(true);api('/api/savings').then(r=>{if(active){setData(r);setFetchError('');}}).catch(e=>{if(active)setFetchError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
  const free=Math.max(0,data.summary.balanceMinor-data.summary.allocatedMinor);
  const grouped=useMemo(()=>Object.groupBy?Object.groupBy(data.entries,e=>e.effectiveDate.slice(0,7)):data.entries.reduce((acc,e)=>{(acc[e.effectiveDate.slice(0,7)]||=[]).push(e);return acc;},{}),[data.entries]);
  function show(type,goal=null){setDialog({type,goal});setAmount('');setDate(dateToday());setNote('');setGoalAmount('');setGoalName(goal?.name||'');setGoalTarget(goal?String(goal.targetMinor/100):'');setTargetDate(goal?.targetDate||'');setError('');opRef.current=crypto.randomUUID();}
  function close(){if(busy)return;setDialog(null);}
  async function run(event){event.preventDefault();if(busy||!dialog)return;if(!online){setError('Reconnect before updating savings.');return;}
    const {type,goal}=dialog;let route='',method='POST',payload={};
    if(type==='deposit'||type==='withdrawal'){
      const amountMinor=parseMoney(amount);
      if(!Number.isSafeInteger(amountMinor)||amountMinor<1){setError('Enter a positive amount with up to two decimal places.');return;}
      route='/api/savings/entries';payload={type,amountMinor,effectiveDate:date,note,requestId:opRef.current};
    }else if(type==='goal'||type==='edit-goal'){
      const targetMinor=parseMoney(goalTarget);
      if(!goalName.trim()||!Number.isSafeInteger(targetMinor)||targetMinor<1){setError('Enter a goal name and valid target amount.');return;}
      route=type==='goal'?'/api/savings/goals':`/api/savings/goals/${goal.id}`;
      method=type==='goal'?'POST':'PUT';payload={name:goalName.trim(),targetMinor,targetDate:targetDate||null};
    }else if(type==='allocate'||type==='release'){
      const amountMinor=parseMoney(goalAmount);
      if(!Number.isSafeInteger(amountMinor)||amountMinor<1){setError('Enter a positive amount.');return;}
      route=`/api/savings/goals/${goal.id}/allocate`;payload={direction:type,amountMinor,requestId:opRef.current};
    }else if(type==='archive'){route=`/api/savings/goals/${goal.id}`;method='DELETE';}
    setBusy(true);setError('');
    try{await api(route,{method,...(method==='DELETE'?{}:{body:JSON.stringify(payload)})});await load();setDialog(null);notify(type==='deposit'?'Savings added.':type==='withdrawal'?'Withdrawal recorded.':'Savings goal updated.');}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  const type=dialog?.type;const editingGoal=dialog?.goal;
  return <div className="v3-page v31-savings">
    <PageHeader eyebrow="YOUR MONEY, YOUR FUTURE" title="Savings" description="A little set aside today goes a long way."/>
    {loading?<div className="skeleton h-60" role="status" aria-label="Loading savings"/>:fetchError?<section className="panel"><p role="alert">{fetchError}</p><Button onClick={()=>{setLoading(true);load().catch(e=>setFetchError(e.message)).finally(()=>setLoading(false));}}>Retry</Button></section>:<>
      <section className="v31-savings-hero"><div className="v31-savings-hero-copy"><span className="v31-overline">Your personal savings</span><h2>{money(data.summary.balanceMinor)}</h2><p>Money you've chosen to set aside, all in one place.</p><div className="v31-savings-hero-actions"><Button onClick={()=>show('deposit')} disabled={!online}><Plus size={17}/> Add savings</Button><Button secondary onClick={()=>show('withdrawal')} disabled={!online||free===0}><ArrowUpRight size={17}/> Withdraw</Button></div></div><div className="v31-savings-hero-detail"><div><span>Available to allocate or withdraw</span><strong>{money(free)}</strong></div><div><span>Set aside for goals</span><strong>{money(data.summary.allocatedMinor)}</strong></div></div></section>
      <div className="v31-savings-columns">
        <section className="panel v31-savings-goals"><div className="v31-section-heading"><div><span className="v31-overline">Make it meaningful</span><h2>Savings goals</h2></div><button type="button" className="v31-icon-action" onClick={()=>show('goal')} aria-label="Create savings goal" disabled={!online}><Plus size={19}/></button></div>
          {data.goals.length===0?<div className="v31-savings-empty"><Target size={25}/><h3>Save for something special.</h3><p>Create a goal for a trip, a gadget or anything that matters to you.</p><Button onClick={()=>show('goal')}>Create your first goal</Button></div>:<div className="v31-goals-list">{data.goals.map(goal=>{const progress=Math.min(100,Math.round(goal.allocatedMinor/goal.targetMinor*100));return <article className="v31-goal-card" key={goal.id}><div className="v31-goal-head"><span className="v31-goal-symbol"><Target size={19}/></span><div className="min-w-0 flex-1"><h3>{goal.name}</h3><p>{money(goal.allocatedMinor)} of {money(goal.targetMinor)}</p></div><span className="v31-goal-percent">{progress}%</span></div><div className="v31-progress"><span style={{width:`${progress}%`}}/></div>{goal.targetDate&&<p className="v31-goal-date"><CalendarDays size={13}/> Target: {new Date(`${goal.targetDate}T12:00:00Z`).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})}</p>}<div className="v31-goal-actions"><button onClick={()=>show('allocate',goal)} disabled={!online||!free}><Plus size={15}/> Allocate</button><button onClick={()=>show('release',goal)} disabled={!online||!goal.allocatedMinor}><Minus size={15}/> Release</button><button onClick={()=>show('edit-goal',goal)} aria-label={`Edit ${goal.name}`}><Edit3 size={15}/></button><button onClick={()=>show('archive',goal)} aria-label={`Archive ${goal.name}`}><Trash2 size={15}/></button></div></article>;})}</div>}
        </section>
        <section className="panel v31-savings-months"><div className="v31-section-heading"><div><span className="v31-overline">Month by month</span><h2>Savings timeline</h2></div><Coins size={20} className="text-sage"/></div><p className="text-xs text-muted mb-4">Your balance carries forward, even in months without new savings.</p><div className="v31-months-list">{data.months.map(row=><div className="v31-month-row" key={row.month}><div><strong>{monthTitle(row.month)}</strong><span>{row.depositedMinor?`+${money(row.depositedMinor)} saved`: 'No deposits'}{row.withdrawnMinor?` · −${money(row.withdrawnMinor)} withdrawn`:''}</span></div><strong>{money(row.closingMinor)}</strong></div>)}</div></section>
      </div>
      <section className="panel v31-savings-history"><div className="v31-section-heading"><div><span className="v31-overline">Every little step counts</span><h2>Savings history</h2></div><Wallet size={19} className="text-sage"/></div>{data.entries.length===0?<p className="v31-savings-empty text-sm">No entries yet. Add savings to start your journey.</p>:Object.entries(grouped).sort(([a],[b])=>b.localeCompare(a)).map(([key,entries])=><div className="v31-history-group" key={key}><h3>{monthTitle(key)}</h3>{entries.map(entry=><div className="v31-saving-entry" key={entry.id}><span className={`v31-saving-entry-icon ${entry.type==='deposit'?'is-deposit':'is-withdrawal'}`}>{entry.type==='deposit'?<ArrowDownLeft size={18}/>:<ArrowUpRight size={18}/>}</span><div className="min-w-0 flex-1"><strong>{entry.note|| (entry.type==='deposit'?'Savings added':'Savings withdrawn')}</strong><span>{new Date(`${entry.effectiveDate}T12:00:00Z`).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})}</span></div><strong className={entry.type==='deposit'?'text-sage':'text-terracotta'}>{entry.type==='deposit'?'+':'−'}{money(entry.amountMinor)}</strong></div>)}</div>)}
      </section>
      <p className="v31-savings-disclaimer">Savings is a record you manage in ExpensePlus, not a bank account or verified bank balance. Deposits and withdrawals don't alter expense totals. To correct an entry, record an offsetting deposit or withdrawal; your history stays intact.</p>
    </>}
    <Overlay title={type==='deposit'?'Add savings':type==='withdrawal'?'Withdraw savings':type==='goal'?'New savings goal':type==='edit-goal'?'Edit savings goal':type==='allocate'?'Allocate savings':type==='release'?'Release allocation':'Archive goal'} open={Boolean(dialog)} onClose={close} compact>
      <form onSubmit={run} className="v31-savings-form">
        {['deposit','withdrawal'].includes(type)&&<><label>Amount (₹)<input className="field" autoFocus inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" required/></label><label>Date<input className="field" type="date" max={dateToday()} value={date} onChange={e=>setDate(e.target.value)} required/></label><label>Note (optional)<input className="field" value={note} maxLength={240} onChange={e=>setNote(e.target.value)} placeholder="e.g. October savings"/></label>{type==='withdrawal'&&<p className="text-xs text-muted">Available to withdraw: {money(free)}</p>}</>}
        {['goal','edit-goal'].includes(type)&&<><label>Goal name<input className="field" autoFocus value={goalName} maxLength={70} onChange={e=>setGoalName(e.target.value)} placeholder="e.g. Mountain vacation" required/></label><label>Target amount (₹)<input className="field" value={goalTarget} inputMode="decimal" onChange={e=>setGoalTarget(e.target.value)} placeholder="10000" required/></label><label>Target date (optional)<input className="field" type="date" value={targetDate} onChange={e=>setTargetDate(e.target.value)}/></label></>}
        {['allocate','release'].includes(type)&&<><p className="text-sm text-muted">{type==='allocate'?`Available: ${money(free)}.`:`Allocated to ${editingGoal?.name}: ${money(editingGoal?.allocatedMinor||0)}.`}</p><label>Amount (₹)<input className="field" autoFocus inputMode="decimal" value={goalAmount} onChange={e=>setGoalAmount(e.target.value)} required/></label></>}
        {type==='archive'&&<p className="text-sm text-muted">Archive “{editingGoal?.name}”? Any allocated savings will become available again. Your deposit history will stay intact.</p>}
        {error&&<p role="alert" className="v31-form-error">{error}</p>}
        <div className="v31-form-actions"><button type="button" className="btn-outline" onClick={close} disabled={busy}>Cancel</button><button type="submit" className="btn-primary" disabled={busy||!online}>{busy?'Saving…':type==='archive'?'Archive goal':type==='withdrawal'?'Record withdrawal':type==='deposit'?'Add savings':'Save'}</button></div>
      </form>
    </Overlay>
  </div>;
}
