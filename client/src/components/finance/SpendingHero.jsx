import {ArrowUpRight, CheckCircle2, CircleAlert, Plus} from 'lucide-react';
import {Link} from 'react-router-dom';
import {inr} from '../../lib/format';

/** Expenses-only data model: this is spending, never a fabricated bank balance. */
export default function SpendingHero({spent,budget,onAdd}) {
  const progress=budget>0?spent/budget*100:0;
  const remaining=budget-spent;
  const exceeded=budget>0&&remaining<0;
  const status=budget===0?'Set a monthly budget':exceeded?'Over budget':progress>=90?'Near your limit':'On track';
  return <section className="v3-hero" aria-label="Monthly spending overview">
    <div className="v3-hero-top"><div><p className="v3-overline">Your monthly spending</p><p className="v3-hero-caption">Every expense, in one clear view.</p></div><span className={`v3-hero-status ${exceeded?'v3-status-alert':''}`}>{exceeded?<CircleAlert size={15}/>:<CheckCircle2 size={15}/>} {status}</span></div>
    <div className="v3-hero-value" aria-label={`Spent this month: ${inr(spent)}`}>{inr(spent)}</div>
    <div className="v3-hero-bottom">
      <div className="v3-budget-overview">
        <div className="v3-budget-head"><span>{budget>0?`Of ${inr(budget)} monthly budget`:'No monthly budget yet'}</span><Link to="/budgets">{budget>0?'Manage budget':'Set budget'} <ArrowUpRight size={14}/></Link></div>
        <div className="v3-progress" role="progressbar" aria-label="Monthly budget used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100,Math.round(progress))}><span className={exceeded?'v3-progress-danger':''} style={{width:`${Math.min(100,Math.max(0,progress))}%`}}/></div>
        <div className="v3-budget-foot"><span>{budget>0?`${Math.round(progress)}% used`:'Add a limit to see progress'}</span>{budget>0&&<span className={exceeded?'v3-negative':'v3-positive'}>{exceeded?`${inr(-remaining)} over`:`${inr(remaining)} remaining`}</span>}</div>
      </div>
      <button type="button" className="v3-hero-add" onClick={onAdd}><Plus size={19}/> <span>Add expense</span></button>
    </div>
    <span className="v3-hero-orb" aria-hidden="true"/>
  </section>;
}
