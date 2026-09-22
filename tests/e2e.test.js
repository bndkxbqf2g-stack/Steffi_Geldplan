import test from 'node:test';
import assert from 'node:assert/strict';
import {createTransaction,appendTransaction,getCurrentGiro,hasFixedCostForCycle} from '../lib/budget.js';
import {calculateCurrentCycleBudget} from '../lib/budget-ui.js';
import {isWithdrawalDay,maxAdditionalWithdrawal} from '../lib/cycle.js';
import {createSavingsPosition,addSavingsPosition,createSavingsAllocation,addSavingsAllocation,totalSaved} from '../lib/savings.js';
import {monthlyStatistics} from '../lib/statistics.js';
import {parseTimeReportText} from '../lib/pdf.js';
import {calculateSalaryForecastCore} from '../lib/salary.js';
import {parsePayslipText,comparePayslip} from '../lib/payslip.js';

const near=(a,b,t=.01)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);
const tx=(list,amount,date,type,text,meta={})=>appendTransaction(list,createTransaction({id:`${date}-${type}-${list.length}`,amount,date,type,text,meta}));

test('E2E: kompletter Budgetmonat mit Fixkosten, Bargeld, Sparen und neuem Lohn',()=>{
  let transactions=[{id:'base',type:'base',amount:0,date:'2026-09-30',text:'Start'}];
  let savings={positions:[],allocations:[]};
  let cash=80;

  transactions=tx(transactions,3000,'2026-09-30','salary','Lohn',{cycle:'2026-09'});
  transactions=tx(transactions,-900,'2026-09-30','fixedcost','Fixkosten',{cycle:'2026-09'});
  assert.equal(hasFixedCostForCycle(transactions,'2026-09'),true);

  let giro=getCurrentGiro(transactions,0);
  let budget=calculateCurrentCycleBudget({giro,transactions,savings,today:'2026-10-04'});
  assert.equal(budget.remainingDays,26);
  assert.equal(budget.segmentDays,7);
  assert.equal(isWithdrawalDay('2026-10-04',budget.payday,budget.nextPayday),true);
  assert.ok(maxAdditionalWithdrawal(budget.weeklyBudget,cash)>0);

  transactions=tx(transactions,-450,'2026-10-04','withdrawal','Bargeldabhebung');
  cash+=450;
  giro=getCurrentGiro(transactions,0);
  const afterWithdrawal=calculateCurrentCycleBudget({giro,transactions,savings,today:'2026-10-04'});
  near(afterWithdrawal.weeklyBudget,budget.weeklyBudget);

  const pos=createSavingsPosition('Urlaub','urlaub');
  savings=addSavingsPosition(savings,pos);
  savings=addSavingsAllocation(savings,createSavingsAllocation({id:'save-1',positionId:'urlaub',amount:50,date:'2026-10-04',sourceSegmentStart:'2026-10-04',effectiveFrom:'2026-10-11'}));
  assert.equal(totalSaved(savings),50);

  transactions=tx(transactions,-100,'2026-10-07','expense','Einkauf');
  giro=getCurrentGiro(transactions,0);
  budget=calculateCurrentCycleBudget({giro,transactions,savings,today:'2026-10-11'});
  assert.equal(budget.segmentDays,7);
  near(budget.dailyBudget,1500/19);

  budget=calculateCurrentCycleBudget({giro,transactions,savings,today:'2026-10-25'});
  assert.equal(budget.remainingDays,5);
  assert.equal(budget.segmentDays,5);

  transactions=tx(transactions,3000,'2026-10-30','salary','Lohn',{cycle:'2026-10'});
  transactions=tx(transactions,-900,'2026-10-30','fixedcost','Fixkosten',{cycle:'2026-10'});
  assert.equal(hasFixedCostForCycle(transactions,'2026-10'),true);
  giro=getCurrentGiro(transactions,0);
  budget=calculateCurrentCycleBudget({giro,transactions,savings,today:'2026-10-30'});
  assert.equal(budget.segmentDays,2);
  assert.equal(budget.remainingDays,31);

  const stats=monthlyStatistics(transactions,savings,3);
  const oct=stats.find(x=>x.month==='2026-10');
  assert.equal(oct.income,3000);
  assert.equal(oct.expenses,100+900);
  assert.equal(oct.withdrawals,450);
  assert.equal(oct.saved,50);
});

test('E2E: Zeitnachweis -> Prognose -> Bezügemitteilung ohne Pfändung',()=>{
  const report=parseTimeReportText(`Z E I T N A C H W E I S 80030991 Test Apr 26\nZeitlohnarten (täglich)\nDatum von bis Zeitlohnart Anzahl\n13.04.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45\n14.04.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45\n15.04.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45\n30.04.2026 3C12 5212: SchiZ§43 1,00`);
  assert.equal(report.month.year,2026);
  assert.equal(report.month.month,4);
  assert.equal(report.payoutMonth,'2026-06');
  near(report.items.filter(i=>i.code==='5010').reduce((sum,i)=>sum+(i.hours||0),0),1.35);

  const forecast=calculateSalaryForecastCore({items:[],needsReview:false},{wageTax:250,churchTax:0,solidarity:0,churchBase:0});
  near(forecast.totalGross,2833.19);
  assert.equal(forecast.garnishment,0);
  near(forecast.payout,forecast.legalNet-forecast.vbl);

  const actual=parsePayslipText(`Aktuelle Abrechnungsperiode\nAbrechnungsmonat : 06/2026\nBezüge: KR8 / 6\nTabellenentgelt LSGZ 2.681,08\nPflegezulage (AT Uni WÜ) LSGZ 54,00\nUniversitätszulage Pflege LSGZ 98,11\nGesamtbrutto ${forecast.totalGross.toFixed(2).replace('.',',')}\nGesetzliches Netto ${forecast.legalNet.toFixed(2).replace('.',',')}\nZV-Uml. Regelentg. AN ${forecast.vbl.toFixed(2).replace('.',',')}-\nÜberweisung ${forecast.payout.toFixed(2).replace('.',',')} EUR`);
  const comparison=comparePayslip(forecast,actual);
  assert.equal(comparison.status,'ok');
  assert.equal(comparison.rows.some(r=>r.key==='garnishment'),false);
  near(comparison.maxAbsDiff,0);
});
