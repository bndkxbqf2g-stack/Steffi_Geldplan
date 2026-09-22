import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTransaction,
  appendTransaction,
  getCurrentGiro,
  hasFixedCostForCycle
} from '../lib/budget.js';
import {
  maxAdditionalWithdrawal,
  isWithdrawalDay
} from '../lib/cycle.js';
import {
  createSavingsPosition,
  addSavingsPosition,
  createSavingsAllocation,
  addSavingsAllocation,
  savingsForSegment,
  maxSavingsForSegment
} from '../lib/savings.js';
import { calculateCurrentCycleBudget } from '../lib/budget-ui.js';

const near=(actual,expected,tolerance=0.01)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);
const tx=(list,amount,date,type,text,meta={})=>appendTransaction(list,createTransaction({id:`${date}-${type}-${list.length}`,amount,date,type,text,meta}));

function stateAt({transactions,savings,today}){
  const giro=getCurrentGiro(transactions,0);
  const budget=calculateCurrentCycleBudget({giro,transactions,savings,today});
  return {giro,budget};
}

test('kompletter Zyklus 30.09.–30.10.2026 bleibt rechnerisch konsistent',()=>{
  let transactions=[{id:'base',type:'base',amount:0,date:'2026-09-30',text:'Start'}];
  let cash=80;
  let savings={positions:[],allocations:[]};

  transactions=tx(transactions,3000,'2026-09-30','salary','Lohn',{cycle:'2026-09'});
  transactions=tx(transactions,-900,'2026-09-30','fixedcost','Fixkosten',{cycle:'2026-09'});
  assert.equal(hasFixedCostForCycle(transactions,'2026-09'),true);

  let state=stateAt({transactions,savings,today:'2026-09-30'});
  assert.equal(state.giro,2100);
  assert.equal(state.budget.remainingDays,30);
  assert.equal(state.budget.segmentDays,4);
  near(state.budget.dailyBudget,70);
  near(state.budget.weeklyBudget,280);
  assert.equal(maxAdditionalWithdrawal(state.budget.weeklyBudget,cash),200);
  assert.equal(isWithdrawalDay('2026-09-30',state.budget.payday,state.budget.nextPayday),false);

  // Restbargeld aus dem Vormonat wird bis zum ersten Sonntag verbraucht.
  cash=20;
  state=stateAt({transactions,savings,today:'2026-10-04'});
  assert.equal(state.budget.remainingDays,26);
  assert.equal(state.budget.segmentDays,7);
  near(state.budget.dailyBudget,2100/26);
  near(state.budget.weeklyBudget,(2100/26)*7);
  assert.equal(isWithdrawalDay('2026-10-04',state.budget.payday,state.budget.nextPayday),true);

  // Freiwillig weniger als das Maximum abheben.
  const maxFirst=maxAdditionalWithdrawal(state.budget.weeklyBudget,cash);
  assert.ok(maxFirst>450);
  transactions=tx(transactions,-450,'2026-10-04','withdrawal','Bargeldabhebung');
  cash+=450;
  const afterWithdrawal=stateAt({transactions,savings,today:'2026-10-04'});
  near(afterWithdrawal.budget.weeklyBudget,state.budget.weeklyBudget); // reine Umbuchung

  // 50 € aus dem nicht ausgeschöpften Wochenbudget für Urlaub reservieren.
  const position=createSavingsPosition('Urlaub','urlaub');
  savings=addSavingsPosition(savings,position);
  const segment='2026-10-04';
  const maxSave=maxSavingsForSegment(afterWithdrawal.budget.weeklyBudget,cash,savingsForSegment(savings,segment));
  assert.ok(maxSave>=50);
  savings=addSavingsAllocation(savings,createSavingsAllocation({
    id:'save-1',positionId:'urlaub',amount:50,date:'2026-10-04',sourceSegmentStart:segment,effectiveFrom:'2026-10-11'
  }));

  // Kartenausgabe in der Woche reduziert das Budget sofort.
  transactions=tx(transactions,-100,'2026-10-07','expense','Einkauf');
  const midWeek=stateAt({transactions,savings,today:'2026-10-07'});
  near(midWeek.budget.dailyBudget,2000/26);
  near(midWeek.budget.weeklyBudget,(2000/26)*7);

  // Am Folgesonntag wird die Sparreservierung aus dem Girobudget herausgerechnet.
  cash=30;
  state=stateAt({transactions,savings,today:'2026-10-11'});
  assert.equal(state.budget.remainingDays,19);
  assert.equal(state.budget.segmentDays,7);
  near(state.budget.dailyBudget,1500/19);
  near(state.budget.weeklyBudget,(1500/19)*7);
  near(maxAdditionalWithdrawal(state.budget.weeklyBudget,cash),state.budget.weeklyBudget-30);

  transactions=tx(transactions,-500,'2026-10-11','withdrawal','Bargeldabhebung');
  cash+=500;
  const secondAfterWithdrawal=stateAt({transactions,savings,today:'2026-10-11'});
  near(secondAfterWithdrawal.budget.weeklyBudget,state.budget.weeklyBudget);

  // Letzter Sonntag: exakt fünf Tage bis zum neuen Lohn.
  cash=10;
  state=stateAt({transactions,savings,today:'2026-10-25'});
  assert.equal(state.budget.remainingDays,5);
  assert.equal(state.budget.segmentDays,5);
  near(state.budget.weeklyBudget,state.budget.dailyBudget*5);
  assert.equal(isWithdrawalDay('2026-10-25',state.budget.payday,state.budget.nextPayday),true);

  // Neuer Lohn am 30.10. startet automatisch den nächsten Zyklus.
  transactions=tx(transactions,3000,'2026-10-30','salary','Lohn',{cycle:'2026-10'});
  transactions=tx(transactions,-900,'2026-10-30','fixedcost','Fixkosten',{cycle:'2026-10'});
  assert.equal(hasFixedCostForCycle(transactions,'2026-10'),true);
  state=stateAt({transactions,savings,today:'2026-10-30'});
  assert.equal(state.budget.segmentDays,2); // Freitag + Samstag
  assert.equal(state.budget.remainingDays,31); // bis 30.11.2026
  assert.equal(isWithdrawalDay('2026-10-30',state.budget.payday,state.budget.nextPayday),false);
});

test('Wochenabhebung ist nur am Sonntag eines aktiven Abschnitts erlaubt',()=>{
  assert.equal(isWithdrawalDay('2026-10-03','2026-09-30','2026-10-30'),false);
  assert.equal(isWithdrawalDay('2026-10-04','2026-09-30','2026-10-30'),true);
  assert.equal(isWithdrawalDay('2026-10-05','2026-09-30','2026-10-30'),false);
  assert.equal(isWithdrawalDay('2026-10-11','2026-09-30','2026-10-30'),true);
  assert.equal(isWithdrawalDay('2026-10-25','2026-09-30','2026-10-30'),true);
});
