/** Savings are a separate private ledger; moving money here never creates an expense. */
import {randomUUID} from 'node:crypto';
const LIMIT = 100_000_000_000; // minor units; backend owns all validation
const idOK = id => typeof id === 'string' && /^[a-zA-Z0-9_-]{8,100}$/.test(id);
const validMinor = n => Number.isSafeInteger(n) && n > 0 && n <= LIMIT;
const money = n => Number.isSafeInteger(n) && n >= 0 && n <= LIMIT;
const serialize = snap => ({id:snap.id,...snap.data(),createdAt:snap.data().createdAt?.toDate?.()?.toISOString()||null});
const summaryOf = data => ({balanceMinor:data?.balanceMinor||0,allocatedMinor:data?.allocatedMinor||0,currency:'INR'});
const yearMonth = date => date.slice(0,7);
function monthlyHistory(entries, today) {
  const months=new Map();
  const ascending=[...entries].sort((a,b)=>a.effectiveDate.localeCompare(b.effectiveDate)||(a.createdAt||'').localeCompare(b.createdAt||'')||a.id.localeCompare(b.id));
  let running=0;
  for(const e of ascending){
    const key=yearMonth(e.effectiveDate);
    const row=months.get(key)||{month:key,depositedMinor:0,withdrawnMinor:0,closingMinor:0};
    if(e.type==='deposit'){row.depositedMinor+=e.amountMinor;running+=e.amountMinor;}else{row.withdrawnMinor+=e.amountMinor;running-=e.amountMinor;}
    row.closingMinor=running;months.set(key,row);
  }
  const start=ascending.length?yearMonth(ascending[0].effectiveDate):yearMonth(today);
  let [yr,mo]=start.split('-').map(Number);
  const stop=yearMonth(today);const results=[];
  while(`${yr}-${String(mo).padStart(2,'0')}`<=stop && results.length<240){
    const key=`${yr}-${String(mo).padStart(2,'0')}`;
    const row=months.get(key)||{month:key,depositedMinor:0,withdrawnMinor:0,closingMinor:running===0?0:null};
    if(row.closingMinor===null)row.closingMinor=results.at(-1)?.closingMinor||0;
    results.push(row);
    if(++mo>12){mo=1;yr++;}
  }
  return results.reverse();
}
function isReasonableDate(date,isDate,today){return isDate(date)&&date<='9999-12-31'&&date<=today;}
export default function registerSavingsRoutes(app,{db,FieldValue,userRef,isDate,appToday,respondError}){
  const root=req=>userRef(req);
  const ledger=req=>root(req).collection('savingsEntries');
  const goals=req=>root(req).collection('savingsGoals');
  const state=req=>root(req).collection('savingsMeta').doc('balance');
  const opDocs=req=>root(req).collection('savingsOperations');
  const bad=(res,message)=>respondError(res,400,message);
  app.get('/api/savings',async(req,res,next)=>{try{
    const [stateSnap,entriesSnap,goalsSnap]=await Promise.all([state(req).get(),ledger(req).get(),goals(req).get()]);
    const entries=entriesSnap.docs.map(serialize).sort((a,b)=>b.effectiveDate.localeCompare(a.effectiveDate)||(b.createdAt||'').localeCompare(a.createdAt||''));
    const activeGoals=goalsSnap.docs.map(serialize).filter(g=>!g.archived).sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||''));
    res.json({summary:summaryOf(stateSnap.data()),entries,goals:activeGoals,months:monthlyHistory(entries,appToday())});
  }catch(e){next(e);}});
  app.post('/api/savings/entries',async(req,res,next)=>{try{
    const {type,amountMinor,effectiveDate,note='',requestId}=req.body||{};
    if(!['deposit','withdrawal'].includes(type))return bad(res,'Choose a deposit or withdrawal.');
    if(!validMinor(amountMinor))return bad(res,'Enter a positive valid amount.');
    if(!isReasonableDate(effectiveDate,isDate,appToday()))return bad(res,'Choose a valid date that is not in the future.');
    if(typeof note!=='string'||note.length>240)return bad(res,'Note must be at most 240 characters.');
    if(!idOK(requestId))return bad(res,'Invalid operation ID. Please try again.');
    const entryRef=ledger(req).doc(requestId), balanceRef=state(req);
    const result=await db.runTransaction(async tx=>{
      const [existing,balanceDoc]=await Promise.all([tx.get(entryRef),tx.get(balanceRef)]);
      if(existing.exists){
        const prior=existing.data();
        if(prior.type!==type||prior.amountMinor!==amountMinor||prior.effectiveDate!==effectiveDate||prior.note!==note.trim())return {error:'This operation ID was previously used for a different savings entry. Please start a new entry.'};
        return {entry:serialize(existing),alreadySaved:true};
      }
      const summary=summaryOf(balanceDoc.data());
      const delta=type==='deposit'?amountMinor:-amountMinor;
      const nextBalance=summary.balanceMinor+delta;
      if(nextBalance<0)return {error:'You cannot withdraw more than your total savings.'};
      if(!money(nextBalance))return {error:'This transaction would exceed the supported savings balance.'};
      if(nextBalance<summary.allocatedMinor)return {error:'Release funds from your savings goals before withdrawing this amount.'};
      const entry={type,amountMinor,effectiveDate,note:note.trim(),createdAt:FieldValue.serverTimestamp()};
      tx.create(entryRef,entry);
      tx.set(balanceRef,{balanceMinor:nextBalance,allocatedMinor:summary.allocatedMinor,updatedAt:FieldValue.serverTimestamp()},{merge:true});
      return {entry:{id:requestId,type,amountMinor,effectiveDate,note:note.trim()}};
    });
    if(result.error)return respondError(res,409,result.error);
    return res.status(result.alreadySaved?200:201).json({ok:true,alreadySaved:Boolean(result.alreadySaved),entry:result.entry});
  }catch(e){next(e);}});
  app.post('/api/savings/goals',async(req,res,next)=>{try{
    const {name,targetMinor,targetDate=null}=req.body||{};
    if(typeof name!=='string'||!name.trim()||name.trim().length>70)return bad(res,'Goal name must be 1–70 characters.');
    if(!validMinor(targetMinor))return bad(res,'Enter a valid goal target.');
    if(targetDate!==null&&!isDate(targetDate))return bad(res,'Choose a valid goal date.');
    const ref=goals(req).doc();
    await ref.create({name:name.trim(),targetMinor,targetDate,allocatedMinor:0,archived:false,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
    res.status(201).json({id:ref.id});
  }catch(e){next(e);}});
  app.put('/api/savings/goals/:id',async(req,res,next)=>{try{
    if(!idOK(req.params.id))return bad(res,'Invalid goal ID.');
    const {name,targetMinor,targetDate=null}=req.body||{};
    if(typeof name!=='string'||!name.trim()||name.trim().length>70)return bad(res,'Goal name must be 1–70 characters.');
    if(!validMinor(targetMinor))return bad(res,'Enter a valid goal target.');
    if(targetDate!==null&&!isDate(targetDate))return bad(res,'Choose a valid goal date.');
    const ref=goals(req).doc(req.params.id);
    const outcome=await db.runTransaction(async tx=>{const d=await tx.get(ref);if(!d.exists||d.data().archived)return 'missing';if(targetMinor<(d.data().allocatedMinor||0))return 'below';tx.update(ref,{name:name.trim(),targetMinor,targetDate,updatedAt:FieldValue.serverTimestamp()});return 'ok';});
    if(outcome==='missing')return respondError(res,404,'Goal not found.');
    if(outcome==='below')return respondError(res,409,'Target cannot be lower than the savings already allocated to this goal.');
    res.json({ok:true});
  }catch(e){next(e);}});
  app.delete('/api/savings/goals/:id',async(req,res,next)=>{try{
    if(!idOK(req.params.id))return bad(res,'Invalid goal ID.');
    const ref=goals(req).doc(req.params.id), bal=state(req);
    const result=await db.runTransaction(async tx=>{
      const [goalSnap,balSnap]=await Promise.all([tx.get(ref),tx.get(bal)]);
      if(!goalSnap.exists||goalSnap.data().archived)return false;
      const allocated=goalSnap.data().allocatedMinor||0;
      const summary=summaryOf(balSnap.data());
      tx.update(ref,{archived:true,allocatedMinor:0,updatedAt:FieldValue.serverTimestamp()});
      tx.set(bal,{allocatedMinor:summary.allocatedMinor-allocated,updatedAt:FieldValue.serverTimestamp()},{merge:true});
      return true;
    });
    if(!result)return respondError(res,404,'Goal not found.');
    res.json({ok:true});
  }catch(e){next(e);}});
  app.post('/api/savings/goals/:id/allocate',async(req,res,next)=>{try{
    if(!idOK(req.params.id))return bad(res,'Invalid goal ID.');
    const {direction,amountMinor,requestId}=req.body||{};
    if(!['allocate','release'].includes(direction)||!validMinor(amountMinor)||!idOK(requestId))return bad(res,'Invalid allocation details.');
    const ref=goals(req).doc(req.params.id), bal=state(req), op=opDocs(req).doc(requestId);
    const result=await db.runTransaction(async tx=>{
      const [old,goal,summarySnap]=await Promise.all([tx.get(op),tx.get(ref),tx.get(bal)]);
      if(old.exists){
        const prior=old.data();
        if(prior.goalId!==ref.id||prior.direction!==direction||prior.amountMinor!==amountMinor)return {error:'This operation ID was already used for different allocation details.'};
        return {ok:true,alreadySaved:true};
      }
      if(!goal.exists||goal.data().archived)return {error:'Goal not found.'};
      const previous=goal.data().allocatedMinor||0;
      const summary=summaryOf(summarySnap.data());
      const delta=direction==='allocate'?amountMinor:-amountMinor;
      if(direction==='allocate'&&summary.balanceMinor-summary.allocatedMinor<amountMinor)return {error:'Not enough unallocated savings.'};
      if(previous+delta<0)return {error:'You cannot release more than this goal has allocated.'};
      if(previous+delta>goal.data().targetMinor)return {error:'This allocation would exceed the goal target.'};
      if(!money(summary.allocatedMinor+delta))return {error:'Invalid allocation amount.'};
      tx.update(ref,{allocatedMinor:previous+delta,updatedAt:FieldValue.serverTimestamp()});
      tx.set(bal,{allocatedMinor:summary.allocatedMinor+delta,updatedAt:FieldValue.serverTimestamp()},{merge:true});
      tx.create(op,{goalId:ref.id,direction,amountMinor,createdAt:FieldValue.serverTimestamp()});
      return {ok:true};
    });
    if(result.error)return respondError(res,409,result.error);
    res.json(result);
  }catch(e){next(e);}});
}
export {monthlyHistory};
