import test from 'node:test';
import assert from 'node:assert/strict';
import {transactionTotals,monthlyStatistics,savingsStatistics} from '../lib/statistics.js';

const tx=[
  {date:'2026-08-30',type:'salary',amount:2800},
  {date:'2026-08-30',type:'fixedcost',amount:-2100},
  {date:'2026-09-01',type:'expense',amount:-40},
  {date:'2026-09-06',type:'withdrawal',amount:-100},
  {date:'2026-09-10',type:'income',amount:50},
  {date:'2026-09-11',type:'correction',amount:12}
];
const savings={positions:[{id:'u',name:'Urlaub'}],allocations:[{id:'a',positionId:'u',amount:75,date:'2026-09-06'},{id:'b',positionId:'u',amount:25,date:'2026-09-13',reversedAt:'2026-09-14'}]};

test('totals exclude withdrawals and corrections from expenses',()=>{
  assert.deepEqual(transactionTotals(tx),{income:2850,expenses:2140,withdrawals:100});
});
test('monthly statistics separate consumption, withdrawals and savings',()=>{
  const rows=monthlyStatistics(tx,savings,6);
  assert.equal(rows.length,2);
  assert.deepEqual(rows[1],{month:'2026-09',income:50,expenses:40,withdrawals:100,saved:75,net:10});
});
test('reversed savings are excluded',()=>assert.equal(savingsStatistics(savings).total,75));
test('savings are grouped by position',()=>assert.deepEqual(savingsStatistics(savings).byPosition,[{id:'u',name:'Urlaub',deleted:false,amount:75}]));
test('statistics stay safe for empty data',()=>{
  assert.deepEqual(monthlyStatistics([],{},6),[]);
  assert.deepEqual(transactionTotals([]),{income:0,expenses:0,withdrawals:0});
});
