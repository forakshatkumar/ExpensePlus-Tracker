import assert from 'node:assert/strict';
import {test} from 'node:test';
import {monthlyHistory} from './savingsRoutes.js';
const records=[
 {id:'first',type:'deposit',amountMinor:150000,effectiveDate:'2026-10-12'},
 {id:'second',type:'deposit',amountMinor:150000,effectiveDate:'2026-11-04'},
 {id:'third',type:'withdrawal',amountMinor:50000,effectiveDate:'2027-01-10'},
];
test('savings persist across months, including skipped months',()=>{
 const rows=monthlyHistory(records,'2027-02-01');
 assert.deepEqual(rows.map(r=>[r.month,r.closingMinor]),[
 ['2027-02',250000],['2027-01',250000],['2026-12',300000],['2026-11',300000],['2026-10',150000]]);
 assert.equal(rows.find(r=>r.month==='2026-12').depositedMinor,0);
 assert.equal(rows.find(r=>r.month==='2027-01').withdrawnMinor,50000);
});
test('backdated entries change subsequent closing balances',()=>{
 const rows=monthlyHistory([...records,{id:'older',type:'deposit',amountMinor:2500,effectiveDate:'2026-10-01'}],'2027-01-20');
 assert.equal(rows[0].closingMinor,252500);
 assert.equal(rows.at(-1).closingMinor,152500);
});
test('empty savings history has an empty current month',()=>{
 assert.deepEqual(monthlyHistory([],'2026-10-20'),[{month:'2026-10',depositedMinor:0,withdrawnMinor:0,closingMinor:0}]);
});
