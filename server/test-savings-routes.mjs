import assert from 'node:assert/strict';
import {test} from 'node:test';
import registerSavingsRoutes from './savingsRoutes.js';
class Snap {constructor(id,data){this.id=id;this.exists=data!==undefined;this.raw=data;}data(){return this.raw;}}
function firestoreStub(){
 const storage=new Map();const handlers=new Map();
 class Ref {constructor(id){this.id=id;}
   collection(name){return new Ref(`${this.id}/${name}`);}
   doc(id){return new Ref(`${this.id}/${id||'generated_test_goal_id'}`);}
   async get(){return new Snap(this.id.split('/').at(-1),storage.get(this.id));}
   async create(value){if(storage.has(this.id))throw new Error('exists');storage.set(this.id,value);}
 }
 const db={runTransaction:async callback=>{
   const writes=[];const tx={get:ref=>ref.get(),create:(ref,val)=>writes.push(()=>storage.set(ref.id,val)),update:(ref,val)=>writes.push(()=>storage.set(ref.id,{...storage.get(ref.id),...val})),set:(ref,val)=>writes.push(()=>storage.set(ref.id,{...storage.get(ref.id),...val}))};
   const result=await callback(tx);for(const commit of writes)commit();return result;
 }};
 const app={get:(path,fn)=>handlers.set(`GET ${path}`,fn),post:(path,fn)=>handlers.set(`POST ${path}`,fn),put:(path,fn)=>handlers.set(`PUT ${path}`,fn),delete:(path,fn)=>handlers.set(`DELETE ${path}`,fn)};
 registerSavingsRoutes(app,{db,FieldValue:{serverTimestamp:()=>({toDate:()=>new Date('2026-10-20T00:00:00Z')})},userRef:()=>new Ref('users/testuser'),isDate:s=>/^\d{4}-\d{2}-\d{2}$/.test(s),appToday:()=> '2026-10-20',respondError:(res,status,message)=>res.status(status).json({error:message})});
 async function request(method,path,body={},params={}){
   const fn=handlers.get(`${method} ${path}`);assert.ok(fn,`missing handler ${method} ${path}`);
   const response={statusCode:200,status(n){this.statusCode=n;return this;},json(data){this.body=data;return this;}};
   await fn({user:{uid:'testuser'},body,params},response,e=>{throw e});return response;
 }
 return {request,storage};
}
const id='11111111-2222-4333-8444-555555555555';
test('deposit idempotency and withdrawal safeguards',async()=>{
 const {request,storage}=firestoreStub();
 const deposit={type:'deposit',amountMinor:150000,effectiveDate:'2026-10-20',note:'October',requestId:id};
 assert.equal((await request('POST','/api/savings/entries',deposit)).statusCode,201);
 assert.equal((await request('POST','/api/savings/entries',deposit)).statusCode,200);
 assert.equal(storage.get('users/testuser/savingsMeta/balance').balanceMinor,150000);
 const bad=await request('POST','/api/savings/entries',{...deposit,requestId:'22222222-2222-4333-8444-555555555555',type:'withdrawal',amountMinor:160000});
 assert.equal(bad.statusCode,409);
 assert.equal(storage.get('users/testuser/savingsMeta/balance').balanceMinor,150000);
});
test('goal allocation prevents withdrawal and never changes total saved',async()=>{
 const {request,storage}=firestoreStub();
 const deposit={type:'deposit',amountMinor:300000,effectiveDate:'2026-10-20',note:'',requestId:id};
 await request('POST','/api/savings/entries',deposit);
 await request('POST','/api/savings/goals',{name:'Trip',targetMinor:100000,targetDate:null});
 const alloc=await request('POST','/api/savings/goals/:id/allocate',{direction:'allocate',amountMinor:70000,requestId:'22222222-2222-4333-8444-555555555555'},{id:'generated_test_goal_id'});
 assert.equal(alloc.statusCode,200);
 assert.deepEqual([storage.get('users/testuser/savingsMeta/balance').balanceMinor,storage.get('users/testuser/savingsMeta/balance').allocatedMinor],[300000,70000]);
 const over=await request('POST','/api/savings/goals/:id/allocate',{direction:'allocate',amountMinor:40000,requestId:'33333333-2222-4333-8444-555555555555'},{id:'generated_test_goal_id'});
 assert.equal(over.statusCode,409);
 const withdrawal=await request('POST','/api/savings/entries',{type:'withdrawal',amountMinor:250000,effectiveDate:'2026-10-20',note:'',requestId:'44444444-2222-4333-8444-555555555555'});
 assert.equal(withdrawal.statusCode,409);
});
