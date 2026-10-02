import test from 'node:test';
import assert from 'node:assert/strict';
import {createPendingSalary,isPendingSalaryDue,projectPendingSalary,applyPendingSalary} from '../lib/pending-salary.js';
import {getCurrentGiro} from '../lib/budget.js';
import {calculateCurrentCycleBudget} from '../lib/budget-ui.js';

const fixed=[{id:'f',name:'Fixkosten',amount:2100}];

test('Vormerkung nutzt automatisch den letzten Arbeitstag des Monats',()=>{
  const pending=createPendingSalary({id:'p1',amount:2700.70,text:'Lohn September',createdAt:new Date(2026,8,15)});
  assert.equal(pending.payoutDate,'2026-09-30');
  assert.equal(pending.amount,2700.70);
});

test('Vormerkung ist vor Auszahlungstag nicht fällig und verändert Transaktionen nicht',()=>{
  const pending=createPendingSalary({id:'p1',amount:2700.70,payoutDate:'2026-09-30',createdAt:new Date(2026,8,15)});
  const transactions=[{id:'base',type:'base',amount:100,date:'2026-09-01'}];
  const result=applyPendingSalary({pending,transactions,fixedCosts:fixed,today:new Date(2026,8,29,23,59)});
  assert.equal(isPendingSalaryDue(pending,new Date(2026,8,29,23,59)),false);
  assert.equal(result.posted,false);
  assert.deepEqual(result.transactions,transactions);
  assert.equal(getCurrentGiro(result.transactions,0),100);
});

test('Vormerkung verändert den laufenden Budgetabschnitt vor dem Lohntag nicht',()=>{
  const pending=createPendingSalary({id:'p-budget',amount:2700,payoutDate:'2026-09-30',createdAt:new Date(2026,8,15)});
  const transactions=[
    {id:'base',type:'base',amount:1000,date:'2026-08-31'},
    {id:'salary-old',type:'salary',amount:2500,date:'2026-08-31',cycle:'2026-08'}
  ];
  const before=calculateCurrentCycleBudget({giro:getCurrentGiro(transactions,0),transactions,savings:{positions:[],allocations:[]},today:new Date(2026,8,25)});
  const result=applyPendingSalary({pending,transactions,fixedCosts:fixed,today:new Date(2026,8,25)});
  const after=calculateCurrentCycleBudget({giro:getCurrentGiro(result.transactions,0),transactions:result.transactions,savings:{positions:[],allocations:[]},today:new Date(2026,8,25)});
  assert.equal(result.posted,false);
  assert.equal(after.dailyBudget,before.dailyBudget);
  assert.equal(after.weeklyBudget,before.weeklyBudget);
  assert.equal(after.daysToPayday,before.daysToPayday);
});

test('ab 00:00 Uhr am Auszahlungstag werden Lohn und Fixkosten gemeinsam gebucht',()=>{
  const pending=createPendingSalary({id:'p1',amount:2700.70,text:'Lohn September',payoutDate:'2026-09-30',createdAt:new Date(2026,8,15)});
  const transactions=[{id:'base',type:'base',amount:100,date:'2026-09-01'}];
  const result=applyPendingSalary({pending,transactions,fixedCosts:fixed,today:new Date(2026,8,30,0,0)});
  assert.equal(result.posted,true);
  assert.equal(result.transactions.filter(x=>x.type==='salary').length,1);
  assert.equal(result.transactions.filter(x=>x.type==='fixedcost').length,1);
  assert.equal(result.transactions.find(x=>x.type==='salary').date,'2026-09-30');
  assert.equal(result.transactions.find(x=>x.type==='fixedcost').date,'2026-09-30');
  assert.ok(Math.abs(getCurrentGiro(result.transactions,0)-700.70)<0.001);
});

test('späteres Öffnen bucht rückwirkend mit dem Auszahlungstag',()=>{
  const pending=createPendingSalary({id:'p2',amount:2800,payoutDate:'2026-09-30',createdAt:new Date(2026,8,15)});
  const result=applyPendingSalary({pending,transactions:[],fixedCosts:[],today:new Date(2026,9,2,8,0)});
  assert.equal(result.posted,true);
  assert.equal(result.transactions[0].date,'2026-09-30');
});

test('gleiche Vormerkung kann nicht doppelt gebucht werden',()=>{
  const pending=createPendingSalary({id:'p3',amount:2800,payoutDate:'2026-09-30',createdAt:new Date(2026,8,15)});
  const first=applyPendingSalary({pending,transactions:[],fixedCosts:[],today:new Date(2026,8,30)});
  const second=applyPendingSalary({pending,transactions:first.transactions,fixedCosts:[],today:new Date(2026,8,30)});
  assert.equal(second.posted,false);
  assert.equal(second.alreadyPosted,true);
  assert.equal(second.transactions.filter(x=>x.type==='salary').length,1);
});

test('Vorschau ist klar getrennt vom aktuellen Giro',()=>{
  const pending=createPendingSalary({id:'p4',amount:2700,payoutDate:'2026-09-30',createdAt:new Date(2026,8,15)});
  const projection=projectPendingSalary({pending,giro:100,cash:50,fixedCosts:[{amount:2000}]});
  assert.equal(projection.salaryAfterFixedCosts,700);
  assert.equal(projection.availableAfterPayout,850);
});


test('einmalige Fixkostenreduzierung wird nur beim vorgesehenen Auszahlungstag angewendet',()=>{
  const pending=createPendingSalary({id:'p5',amount:2700,payoutDate:'2026-09-30',createdAt:new Date(2026,8,15)});
  const overrides=[{id:'2026-09-30:f',fixedCostId:'f',payoutDate:'2026-09-30',amount:1500}];
  const result=applyPendingSalary({pending,transactions:[],fixedCosts:fixed,fixedCostOverrides:overrides,today:new Date(2026,8,30,0,0)});
  assert.equal(result.posted,true);
  assert.equal(result.fixedCosts,1500);
  assert.equal(getCurrentGiro(result.transactions,0),1200);
});
